import xgboost as xgb
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification, pipeline

def load_xgboost_model(model_path: str = "xgboost_expert.json") -> xgb.Booster:
    """
    Load pre-trained XGBoost model for tabular features.
    """
    booster = xgb.Booster()
    try:
        booster.load_model(model_path)
        print(f"Loaded XGBoost model from {model_path}")
    except Exception as e:
        print(f"Warning: Could not load XGBoost model from {model_path}. Returning dummy booster. Error: {e}")
    return booster

def load_codebert_model(model_name: str = "microsoft/codebert-base", model_path: str = "text_model.pth"):
    """
    Load CodeBERT model for textual error logs.
    """
    try:
        tokenizer = AutoTokenizer.from_pretrained(model_name)
        model = AutoModelForSequenceClassification.from_pretrained(model_name, num_labels=5, ignore_mismatched_sizes=True)
        try:
            model.load_state_dict(torch.load(model_path, map_location=torch.device('cpu')))
            print(f"Loaded CodeBERT weights from {model_path}")
        except Exception as e:
            print(f"Could not load weights from {model_path}. Using base model. Error: {e}")
            
        nlp_pipeline = pipeline("text-classification", model=model, tokenizer=tokenizer)
        return nlp_pipeline
    except Exception as e:
        print(f"Warning: Could not load CodeBERT model from {model_name}. Error: {e}")
        return None
