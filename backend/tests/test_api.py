"""Integration tests for the FastAPI endpoints."""

import io
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from main import app

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "generated"


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def csv_files():
    files = {}
    for name in ("google_ads", "meta_ads", "microsoft_ads", "ga4_sessions", "shopify_orders"):
        key = name.split("_")[0] if name != "ga4_sessions" and name != "shopify_orders" else (
            "ga4" if name == "ga4_sessions" else "shopify"
        )
        fp = DATA_DIR / f"{name}.csv"
        if not fp.exists():
            pytest.skip(f"Missing {fp}. Run: python data/generate_synthetic.py")
        files[key] = fp
    return files


def test_health(client):
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}


def test_ingest(client, csv_files):
    files = {
        k: (f"{k}.csv", open(v, "rb"), "text/csv")
        for k, v in csv_files.items()
    }
    res = client.post("/api/ingest", files=files)
    assert res.status_code == 200
    data = res.json()
    assert "session_id" in data
    assert data["summary"]["weeks_available"] > 0
    for fh in files.values():
        fh[1].close()


def test_full_flow(client, csv_files):
    """End-to-end: ingest → validate → forecast → simulate."""
    # Ingest
    files = {
        k: (f"{k}.csv", open(v, "rb"), "text/csv")
        for k, v in csv_files.items()
    }
    ingest_res = client.post("/api/ingest", files=files)
    assert ingest_res.status_code == 200
    session_id = ingest_res.json()["session_id"]
    for fh in files.values():
        fh[1].close()

    # Validate
    val_res = client.post("/api/validate", json={"session_id": session_id})
    assert val_res.status_code == 200

    # Forecast
    budget = {"google": 150000, "meta": 60000, "microsoft": 25000}
    fc_res = client.post("/api/forecast", json={
        "session_id": session_id,
        "budget_inputs": budget,
        "horizon_days": 90,
        "n_bootstrap": 500,
    })
    assert fc_res.status_code == 200
    fc = fc_res.json()
    assert fc["forecast"]["revenue"]["p10"] < fc["forecast"]["revenue"]["p50"] < fc["forecast"]["revenue"]["p90"]
    assert len(fc["channel_breakdown"]) == 3

    # Simulate
    sim_res = client.post("/api/simulate", json={
        "session_id": session_id,
        "base_budget": budget,
        "horizon_days": 90,
    })
    assert sim_res.status_code == 200
    sim = sim_res.json()
    assert len(sim["results"]) >= 3

    # Calibration
    cal_res = client.post("/api/calibration", json={
        "session_id": session_id,
        "holdout_weeks": 8,
    })
    assert cal_res.status_code == 200
    cal = cal_res.json()
    assert cal["overall_coverage_pct"] > 50


def test_forecast_without_ingest_fails(client):
    res = client.post("/api/forecast", json={
        "session_id": "nonexistent",
        "budget_inputs": {"google": 10000, "meta": 5000, "microsoft": 3000},
        "horizon_days": 30,
    })
    assert res.status_code in (400, 404, 500)
