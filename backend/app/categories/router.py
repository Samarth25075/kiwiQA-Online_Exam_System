from typing import List, Annotated
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.router import get_current_admin, check_permission, check_permission_any
from app.auth.schemas import AdminUser
from app.categories.schemas import CategoryResponse, CategoryCreate
from app.categories.service import get_all_categories, create_category

router = APIRouter(prefix="/categories", tags=["categories"])

@router.get("", response_model=List[CategoryResponse])
async def read_categories(
    current_admin: Annotated[AdminUser, Depends(check_permission_any(["manage bank", "generate exam"]))],
    db: Session = Depends(get_db)
):
    """Fetch all available question categories."""
    return get_all_categories(db)

@router.post("", response_model=CategoryResponse)
async def add_category(
    category_in: CategoryCreate,
    current_admin: Annotated[AdminUser, Depends(check_permission("manage bank"))],
    db: Session = Depends(get_db)
):
    """Create a new question category."""
    return create_category(db, category_in)

@router.delete("/{name}")
async def remove_category(
    name: str,
    current_admin: Annotated[AdminUser, Depends(check_permission("manage bank"))],
    db: Session = Depends(get_db)
):
    """Delete a question category."""
    from app.categories.service import delete_category
    delete_category(db, name)
    return {"message": f"Category '{name}' deleted"}
