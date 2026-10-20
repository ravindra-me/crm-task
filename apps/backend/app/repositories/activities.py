from collections.abc import Sequence
from typing import Any

from sqlalchemy import insert, select
from sqlalchemy.orm import Session

from app.models import ActivityType, ContactActivity


class ActivityRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def add(
        self, contact_ids: list[int], activity_type: ActivityType, details: dict[str, Any]
    ) -> None:
        if not contact_ids:
            return
        rows = [
            {"contact_id": contact_id, "type": activity_type, "details": details}
            for contact_id in contact_ids
        ]
        self.session.execute(insert(ContactActivity), rows)

    def recent(self, contact_id: int, limit: int) -> Sequence[ContactActivity]:
        statement = (
            select(ContactActivity)
            .where(ContactActivity.contact_id == contact_id)
            .order_by(ContactActivity.created_at.desc(), ContactActivity.id.desc())
            .limit(limit)
        )
        return self.session.scalars(statement).all()
