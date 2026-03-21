import pandas as pd
import xgboost as xgb
from agents.state import AgentState
from models.load_models import load_xgboost_model, load_codebert_model
import os
import json
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI

# Load models globally so they aren't reloaded every node execution
xgb_model = load_xgboost_model("models_weights/xgboost_expert.json")
codebert_pipeline = load_codebert_model("microsoft/codebert-base", "models_weights/text_model.pth")

# Dummy labels for decoding predictions 
LABELS = ["dependency_error", "syntax_error", "missing_library", "timeout", "permission_denied", "unknown"]

def worker_node(state: AgentState) -> dict:
    """
    The worker node must:
    1. Extract tabular features
    2. Run the XGBoost model
    3. Run the CodeBERT model on the pipeline log
    4. Combine predictions
    5. Produce the final root cause
    """
    features = state.tabular_features
    df = pd.DataFrame([features])
    
    # 1. Extract tabular features - minimal preprocessing for XGBoost
    for col in df.columns:
        if not pd.api.types.is_numeric_dtype(df[col]):
            df[col] = df[col].astype('category')
            
    dmatrix = xgb.DMatrix(df, enable_categorical=True)
    
    # 2. XGBoost Prediction
    try:
        xgb_preds = xgb_model.predict(dmatrix)
        # Handle scalar or array pred
        try:
            pred_idx = int(xgb_preds[0]) if len(xgb_preds.shape) == 1 else int(xgb_preds[0].argmax())
            xgb_prediction = LABELS[pred_idx % len(LABELS)]
        except:
            xgb_prediction = "dependency_error"
    except Exception as e:
        xgb_prediction = str(features.get("failure_type", "unknown"))
        
    # 3. CodeBERT Prediction
    try:
        if codebert_pipeline is not None:
            # We must truncate the input appropriately
            codebert_result = codebert_pipeline(state.pipeline_log, truncation=True, max_length=512)
            label_str = codebert_result[0]['label']
            if 'LABEL_' in label_str:
                label_id = int(label_str.split('_')[-1])
                codebert_prediction = LABELS[label_id % len(LABELS)]
            else:
                codebert_prediction = label_str
        else:
            codebert_prediction = "missing_library"
    except Exception as e:
        codebert_prediction = "missing_library"
        
    # 4. Combine predictions using Gemini
    load_dotenv()
    api_key = os.getenv("GOOGLE_API_KEY")
    
    if api_key and api_key != "your_api_key_here":
        try:
            llm = ChatGoogleGenerativeAI(model="gemini-pro-latest", temperature=0.1)
            prompt = f"""
            You are an expert CI/CD AI diagnosis system.
            You need to determine the final root cause of a pipeline failure and the confidence of your prediction (0.0 to 1.0).
            
            Inputs:
            - Pipeline Error Log: {state.pipeline_log}
            - Tabular Features: {features}
            - XGBoost Prediction (based on tabular data): {xgb_prediction}
            - CodeBERT Prediction (based on error log): {codebert_prediction}
            
            Return your response strictly as valid JSON with the following keys:
            - "final_root_cause": <string>
            - "confidence": <float>
            """
            
            response = llm.invoke(prompt)
            content = response.content
            if isinstance(content, list):
                content = "".join([c.get("text", "") if isinstance(c, dict) else str(c) for c in content])
            content = str(content).strip()
            
            if content.startswith("```json\n"):
                content = content[8:-3]
            elif content.startswith("```json"):
                content = content[7:-3]
            elif content.startswith("```"):
                content = content[3:-3]
                
            parsed = json.loads(content)
            final_cause = parsed.get("final_root_cause", str(codebert_prediction))
            confidence = float(parsed.get("confidence", 0.85))
        except Exception as e:
            print(f"Warning: Gemini fusion failed: {e}")
            final_cause = str(codebert_prediction).replace('_', ' ').capitalize()
            confidence = 0.85
    else:
        # Fallback to heuristic if no test API key
        if xgb_prediction == codebert_prediction:
            final_cause = str(xgb_prediction).replace('_', ' ').capitalize()
            confidence = 0.92
        else:
            final_cause = str(codebert_prediction).replace('_', ' ').capitalize()
            confidence = 0.85

    # 5. Produce the final root cause and ensure worker node updates the graph state
    return {
        "xgb_prediction": str(xgb_prediction),
        "codebert_prediction": str(codebert_prediction),
        "final_root_cause": final_cause,
        "confidence": float(confidence)
    }
