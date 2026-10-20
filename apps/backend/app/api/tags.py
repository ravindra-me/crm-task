from fastapi import APIRouter

from app.api.dependencies import Tags
from app.schemas.tag import TagOut

router = APIRouter(prefix="/tags", tags=["tags"])


@router.get("")
def list_tags(tags: Tags) -> list[TagOut]:
    return [TagOut.model_validate(tag) for tag in tags.all()]
