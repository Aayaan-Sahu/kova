from fastapi import FastAPI
from routers.websocket import router as websocket_router

app = FastAPI(
    title="Kova API",
    description="Real-time scam call detection system",
    version="1.0.0",
)

# Include routers
app.include_router(websocket_router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)