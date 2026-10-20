from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class ActivityOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    contact_id: int
    type: str
    details: dict[str, Any]
    created_at: datetime
