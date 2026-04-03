from typing import List, Annotated
from fastapi import APIRouter, Depends
from app.database import get_db
from app.auth.router import get_current_admin, check_permission, check_permission_any
from app.auth.schemas import AdminUser
from app.categories.schemas import CategoryResponse, CategoryCreate
from app.categories.service import get_all_categories, create_category, delete_category

router = APIRouter(prefix="/categories", tags=["categories"])

@router.get("", response_model=List[CategoryResponse])
async def read_categories(
    current_admin: Annotated[AdminUser, Depends(check_permission_any(["manage bank", "generate exam"]))],
    db = Depends(get_db)
):
    """Fetch all available question categories."""
    return await get_all_categories(db)

@router.post("", response_model=CategoryResponse)
async def add_category(
    category_in: CategoryCreate,
    current_admin: Annotated[AdminUser, Depends(check_permission("manage bank"))],
    db = Depends(get_db)
):
    """Create a new question category."""
    return await create_category(db, category_in.name)

@router.delete("/{name}")
async def remove_category(
    name: str,
    current_admin: Annotated[AdminUser, Depends(check_permission("manage bank"))],
    db = Depends(get_db)
):
    """Delete a question category."""
    await delete_category(db, name)
    return {"message": f"Category '{name}' deleted"}
