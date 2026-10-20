from collections.abc import Sequence

from sqlalchemy import delete, func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.models import ContactTag, Tag


class TagRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def all(self) -> Sequence[Tag]:
        return self.session.scalars(select(Tag).order_by(func.lower(Tag.name))).all()

    def get(self, tag_id: int) -> Tag | None:
        return self.session.get(Tag, tag_id)

    def find_by_name(self, name: str) -> Tag | None:
        return self.session.scalars(select(Tag).where(func.lower(Tag.name) == name.lower())).first()

    def get_or_create(self, name: str) -> Tag:
        tag = self.find_by_name(name)
        if tag is None:
            self.session.execute(insert(Tag).values(name=name).on_conflict_do_nothing())
            tag = self.find_by_name(name)
        if tag is None:
            raise RuntimeError(f"Tag {name!r} could not be created")
        return tag

    def attach(self, contact_ids: list[int], tag_id: int) -> list[int]:
        rows = [{"contact_id": contact_id, "tag_id": tag_id} for contact_id in contact_ids]
        statement = (
            insert(ContactTag)
            .values(rows)
            .on_conflict_do_nothing()
            .returning(ContactTag.contact_id)
        )
        return list(self.session.scalars(statement))

    def detach(self, contact_id: int, tag_id: int) -> bool:
        statement = delete(ContactTag).where(
            ContactTag.contact_id == contact_id, ContactTag.tag_id == tag_id
        )
        result = self.session.execute(statement)
        return bool(result.rowcount)  # type: ignore[attr-defined]
