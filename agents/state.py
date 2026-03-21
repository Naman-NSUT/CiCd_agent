from pydantic import BaseModel
from typing import Dict, Any, Optional

class AgentState(BaseModel):
    pipeline_log: str
    tabular_features: Dict[str, Any]
    xgb_prediction: Optional[str] = None
    codebert_prediction: Optional[str] = None
    final_root_cause: Optional[str] = None
    confidence: Optional[float] = None
