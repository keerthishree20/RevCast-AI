from fastapi import APIRouter, HTTPException

from core.validate import run_validation
from state import session as session_store
from api.models import ValidateRequest, ValidateResponse, CheckResult

router = APIRouter()


@router.post("/validate", response_model=ValidateResponse)
async def validate(req: ValidateRequest):
    try:
        data = session_store.require(req.session_id)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))

    checks = run_validation(data["ingest_result"])
    overall_passed = all(c.passed for c in checks)

    return ValidateResponse(
        passed=overall_passed,
        checks=[CheckResult(name=c.name, passed=c.passed, message=c.message, detail=c.detail) for c in checks],
    )
