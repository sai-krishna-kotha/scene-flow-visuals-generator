from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.services.semantic_search_service import SemanticSearchService
from app.schemas.semantic_search import SemanticSearchRequest, SemanticSearchResponse

router = APIRouter()

def get_semantic_search_service(db: Session = Depends(get_db)) -> SemanticSearchService:
    return SemanticSearchService(db)

@router.post("/semantic", response_model=SemanticSearchResponse)
def semantic_search(
    request: SemanticSearchRequest,
    service: SemanticSearchService = Depends(get_semantic_search_service)
):
    """
    Executes a semantic vector search across indexed assets and resolves them through PostgreSQL.
    """
    return service.search(request)
