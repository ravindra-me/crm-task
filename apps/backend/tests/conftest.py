import os
from collections.abc import Callable, Iterator
from typing import Any

import pytest

from app.config import Settings

os.environ["POSTGRES_DB"] = f"{Settings().postgres_db}_test"  # type: ignore[call-arg]

from alembic import command  # noqa: E402
from alembic.config import Config  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import insert, text  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402

from app.database import SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.models import Contact  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def schema() -> None:
    config = Config("alembic.ini")
    command.downgrade(config, "base")
    command.upgrade(config, "head")


@pytest.fixture(autouse=True)
def clean_tables() -> Iterator[None]:
    yield
    with engine.begin() as conn:
        conn.execute(
            text(
                "TRUNCATE contact_activities, contact_tags, contacts, tags RESTART IDENTITY CASCADE"
            )
        )


@pytest.fixture
def session() -> Iterator[Session]:
    with SessionLocal() as session:
        yield session


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def make_contact(session: Session) -> Callable[..., int]:
    counter = iter(range(1, 10_000))

    def create_contact(**fields: Any) -> int:
        number = next(counter)
        values = {
            "first_name": "Test",
            "last_name": f"Person{number}",
            "email": f"person{number}@example.com",
            "phone": None,
            "company": None,
            **fields,
        }
        contact_id = session.scalar(insert(Contact).values(**values).returning(Contact.id))
        session.commit()
        assert contact_id is not None
        return contact_id

    return create_contact
