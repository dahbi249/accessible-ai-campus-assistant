from fastapi import FastAPI

from app.api.announcements import router as announcements_router
from app.api.locations import router as locations_router

app = FastAPI(
    title="Accessible AI Campus Assistant",
    description="Backend API for the AI Campus Assistant",
    version="1.0.0",
)

app.include_router(announcements_router)
app.include_router(locations_router)


@app.get("/")
def root():
    return {
        "message": "Accessible AI Campus Assistant API is running"
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}