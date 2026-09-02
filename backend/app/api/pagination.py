import math
from typing import TypeVar, Dict, Any

T = TypeVar("T")

def paginate_query(
    page: int, 
    page_size: int, 
    total: int, 
    items: list[T]
) -> Dict[str, Any]:
    if page < 1:
        page = 1
    if page_size < 1:
        page_size = 20
    if page_size > 100:
        page_size = 100
        
    total_pages = math.ceil(total / page_size) if total > 0 else 0
    
    return {
        "items": items,
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": total_pages
    }
