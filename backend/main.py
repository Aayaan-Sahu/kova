from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers.websocket import router as websocket_router
<<<<<<< HEAD
from routers.chat import router as chat_router
=======
from routers.api import router as api_router
>>>>>>> 45c549db95e2b0a50dd8434ec0652408de002d64

app = FastAPI(
    title="Kova API",
    description="Real-time scam call detection system",
    version="1.0.0",
)

# Add CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(websocket_router)
<<<<<<< HEAD
app.include_router(chat_router)
=======
app.include_router(api_router)
>>>>>>> 45c549db95e2b0a50dd8434ec0652408de002d64


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)