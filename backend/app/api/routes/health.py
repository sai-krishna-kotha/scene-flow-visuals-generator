from fastapi import APIRouter

router = APIRouter()

@router.get("/health")
def health_check():
    """
    Health check endpoint.
    """
    return {
        "status": "ok",
        "service": "semantic-visual-asset-generator"
    }
