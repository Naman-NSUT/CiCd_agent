import os
import uuid
import datetime
import asyncio
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# Import our analyzer logic
from ci_cd_analyzer.observability import run_graph

load_dotenv()

app = FastAPI(title="PipelineIQ API")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Models ---
class Metadata(BaseModel):
    repo: str = "unknown/repo"
    branch: str = "main"
    stage: str = ""
    team: str = ""
    run_id: Optional[str] = None

class AnalysisRequest(BaseModel):
    log: str
    metadata: Metadata

# --- In-memory storage for runs (replace with DB for production) ---
runs_db = []

def _build_metadata(metadata: Metadata) -> dict:
    return {
        "repo":   metadata.repo,
        "branch": metadata.branch,
        "stage":  metadata.stage,
        "run_id": metadata.run_id or str(uuid.uuid4()),
        "team":   metadata.team or "",
    }

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/analyze")
async def analyze(request: AnalysisRequest):
    if not request.log.strip():
        raise HTTPException(status_code=400, detail="Empty log provided")
    
    metadata_dict = _build_metadata(request.metadata)
    
    # Run the LangGraph analysis
    try:
        result = await run_graph(request.log, metadata_dict)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    # Prepare the report
    report = result.get("final_report") or {
        "classification":  result.get("classification"),
        "severity":        result.get("severity"),
        "confidence":      result.get("confidence_score"),
        "root_cause":      result.get("root_cause"),
        "recommended_fix": result.get("recommended_fix"),
    }
    
    # Save a record of the run
    run_record = {
        "id": metadata_dict["run_id"],
        "timestamp": datetime.datetime.utcnow().isoformat(),
        "metadata": metadata_dict,
        "report": report,
        "status": "completed"
    }
    runs_db.append(run_record)
    
    return run_record

@app.get("/runs")
def get_runs():
    return runs_db[-20:] # Return last 20 runs

@app.get("/runs/{run_id}")
def get_run(run_id: str):
    for r in runs_db:
        if r["id"] == run_id:
            return r
    raise HTTPException(status_code=404, detail="Run not found")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
