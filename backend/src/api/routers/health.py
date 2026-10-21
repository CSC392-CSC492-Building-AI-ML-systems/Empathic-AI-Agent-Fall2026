from fastapi import APIRouter, Depends, HTTPException

# from ..dependencies import get_token_header

router = APIRouter(
    prefix="/health",
    tags=["health"],
    # dependencies=[Depends(get_token_header)],
    responses={404: {"description": "Not found"}},
)

@router.get("/")
async def health():
    return {"status": "healthy"}