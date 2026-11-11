from fastapi import FastAPI
app = FastAPI(
         title="Accessible AI Campus Assistant",
         description="backend for hwa compitition from the engineering students",
         version="1.0.0"
         )
@app.get("/")
def root():
    return {"message": "accessible ai campus assistant backend is running"}

@app.get("/health")
def health():
    return {"status": "healthy"}