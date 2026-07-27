from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(
    title="InstaScope AI Service",
    description="Sosyal Medya Analiz Platformu - AI & NLP Servisi",
    version="0.1.0"
)

class HealthResponse(BaseModel):
    status: str
    service: str
    version: str

@app.get("/health", response_model=HealthResponse)
def health_check():
    """
    Servis sağlık kontrolü ucu (Health Check).
    Docker ve orkestrasyon araçları servisin ayakta olup olmadığını buradan denetler.
    """
    return HealthResponse(
        status="ok",
        service="instascope-ai",
        version="0.1.0"
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)