import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from api.routes import ingest, validate, forecast, simulate, summary, optimize, calibration, comparison, auth

app = FastAPI(title="Revenue Forecasting API", version="1.0.0")

allowed_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins or ["*"],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ingest.router,   prefix="/api")
app.include_router(validate.router, prefix="/api")
app.include_router(forecast.router, prefix="/api")
app.include_router(simulate.router, prefix="/api")
app.include_router(summary.router,  prefix="/api")
app.include_router(optimize.router, prefix="/api")
app.include_router(calibration.router, prefix="/api")
app.include_router(comparison.router, prefix="/api")
app.include_router(auth.router, prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok"}
