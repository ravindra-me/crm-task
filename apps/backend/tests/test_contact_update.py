from concurrent.futures import ThreadPoolExecutor

from app.database import SessionLocal
from app.errors import VersionConflictError
from app.schemas.contact import ContactUpdate
from app.services.contacts import ContactService

URL = "/api/v1/contacts"


def test_update_bumps_version_and_logs_activity(client, make_contact):
    contact_id = make_contact(first_name="Ada", company=None)

    response = client.patch(
        f"{URL}/{contact_id}", json={"version": 1, "company": "Engines Ltd", "first_name": "Ada"}
    )

    assert response.status_code == 200
    body = response.json()
    assert body["company"] == "Engines Ltd"
    assert body["version"] == 2
    assert body["updated_at"] >= body["created_at"]

    activity = client.get(f"{URL}/{contact_id}/activities").json()
    assert len(activity) == 1
    assert activity[0]["type"] == "CONTACT_UPDATED"
    assert activity[0]["details"]["changes"] == {"company": {"from": None, "to": "Engines Ltd"}}


def test_stale_update_is_rejected_with_current_data(client, make_contact):
    contact_id = make_contact()
    client.patch(f"{URL}/{contact_id}", json={"version": 1, "company": "From user B"})

    response = client.patch(f"{URL}/{contact_id}", json={"version": 1, "company": "From user A"})

    assert response.status_code == 409
    error = response.json()["error"]
    assert error["code"] == "version_conflict"
    assert error["details"]["current"]["company"] == "From user B"
    assert error["details"]["current"]["version"] == 2
    assert client.get(f"{URL}/{contact_id}").json()["company"] == "From user B"


def test_simultaneous_updates_only_one_wins(make_contact):
    contact_id = make_contact()

    def save(company):
        with SessionLocal() as session:
            try:
                ContactService(session).update(
                    contact_id, ContactUpdate(version=1, company=company)
                )
                return "ok"
            except VersionConflictError:
                return "conflict"

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = sorted(pool.map(save, ["A", "B"]))

    assert results == ["conflict", "ok"]


def test_email_must_be_unique(client, make_contact):
    make_contact(email="taken@example.com")
    contact_id = make_contact(email="mine@example.com")

    response = client.patch(
        f"{URL}/{contact_id}", json={"version": 1, "email": "TAKEN@example.com"}
    )

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "email_taken"
    assert client.get(f"{URL}/{contact_id}").json()["version"] == 1


def test_contacts_can_share_an_empty_email(client, make_contact):
    make_contact(email=None)
    contact_id = make_contact(email="someone@example.com")

    response = client.patch(f"{URL}/{contact_id}", json={"version": 1, "email": ""})

    assert response.status_code == 200
    assert response.json()["email"] is None


def test_keeping_own_email_is_allowed(client, make_contact):
    contact_id = make_contact(email="me@example.com")
    response = client.patch(
        f"{URL}/{contact_id}", json={"version": 1, "email": "me@example.com", "last_name": "New"}
    )
    assert response.status_code == 200


def test_no_op_update_does_not_bump_version(client, make_contact):
    contact_id = make_contact(first_name="Same")

    response = client.patch(f"{URL}/{contact_id}", json={"version": 1, "first_name": "Same"})

    assert response.json()["version"] == 1
    assert client.get(f"{URL}/{contact_id}/activities").json() == []


def test_validation_errors_name_the_field(client, make_contact):
    contact_id = make_contact()

    response = client.patch(
        f"{URL}/{contact_id}", json={"version": 1, "email": "nope", "first_name": ""}
    )

    assert response.status_code == 422
    fields = {d["field"] for d in response.json()["error"]["details"]}
    assert fields == {"email", "first_name"}


def test_version_is_required(client, make_contact):
    contact_id = make_contact()
    response = client.patch(f"{URL}/{contact_id}", json={"company": "x"})
    assert response.status_code == 422


def test_update_missing_contact(client):
    response = client.patch(f"{URL}/999", json={"version": 1, "company": "x"})
    assert response.status_code == 404
