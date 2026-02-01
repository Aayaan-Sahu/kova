from fastapi import FastAPI
from routers.websocket import router as websocket_router
from routers.chat import router as chat_router

app = FastAPI(
    title="Kova API",
    description="Real-time scam call detection system",
    version="1.0.0",
)

# Include routers
app.include_router(websocket_router)
app.include_router(chat_router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)