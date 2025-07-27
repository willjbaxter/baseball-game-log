from fastapi import FastAPI

app = FastAPI(title="Baseball Game Log API")


@app.get("/health")
async def health_check():
    """Simple health check endpoint."""
    return {"status": "ok"}
