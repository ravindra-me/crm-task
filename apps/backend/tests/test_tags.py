URL = "/api/v1/contacts"


def tag_names(contact):
    return [tag["name"] for tag in contact["tags"]]


def test_add_tag_creates_it_once_and_reuses_existing_case(client, make_contact):
    first_id, second_id = make_contact(), make_contact()

    first = client.post(f"{URL}/{first_id}/tags", json={"name": "VIP"})
    second = client.post(f"{URL}/{second_id}/tags", json={"name": "vip"})

    assert first.status_code == 200
    assert tag_names(second.json()) == ["VIP"]
    assert [tag["name"] for tag in client.get("/api/v1/tags").json()] == ["VIP"]


def test_adding_same_tag_twice_is_harmless(client, make_contact):
    contact_id = make_contact()
    client.post(f"{URL}/{contact_id}/tags", json={"name": "Lead"})
    response = client.post(f"{URL}/{contact_id}/tags", json={"name": "Lead"})

    assert tag_names(response.json()) == ["Lead"]
    activity = client.get(f"{URL}/{contact_id}/activities").json()
    assert [item["type"] for item in activity] == ["TAG_ADDED"]


def test_tag_changes_do_not_bump_version(client, make_contact):
    contact_id = make_contact()
    contact = client.post(f"{URL}/{contact_id}/tags", json={"name": "Lead"}).json()
    assert contact["version"] == 1


def test_remove_tag(client, make_contact):
    contact_id = make_contact()
    tag = client.post(f"{URL}/{contact_id}/tags", json={"name": "Lead"}).json()["tags"][0]

    response = client.delete(f"{URL}/{contact_id}/tags/{tag['id']}")

    assert response.status_code == 200
    assert response.json()["tags"] == []
    activity = client.get(f"{URL}/{contact_id}/activities").json()
    assert [item["type"] for item in activity] == ["TAG_REMOVED", "TAG_ADDED"]
    assert activity[0]["details"]["tag"] == "Lead"


def test_remove_unknown_tag(client, make_contact):
    contact_id = make_contact()
    assert client.delete(f"{URL}/{contact_id}/tags/42").status_code == 404


def test_invalid_tag_name(client, make_contact):
    contact_id = make_contact()
    response = client.post(f"{URL}/{contact_id}/tags", json={"name": "   "})
    assert response.status_code == 422
    assert response.json()["error"]["details"][0]["field"] == "name"


def test_tag_on_missing_contact(client):
    assert client.post(f"{URL}/999/tags", json={"name": "Lead"}).status_code == 404


def test_bulk_assign(client, make_contact):
    contact_ids = [make_contact() for _ in range(3)]
    client.post(f"{URL}/{contact_ids[0]}/tags", json={"name": "Customer"})

    response = client.post(
        f"{URL}/bulk/tags",
        json={"contact_ids": [*contact_ids, contact_ids[1]], "names": ["customer"]},
    )

    assert response.status_code == 200
    assert response.json() == {
        "tags": [{"id": 1, "name": "Customer"}],
        "added": 2,
        "already_tagged": 1,
    }
    for contact_id in contact_ids:
        assert tag_names(client.get(f"{URL}/{contact_id}").json()) == ["Customer"]
    assert len(client.get(f"{URL}/{contact_ids[0]}/activities").json()) == 1


def test_bulk_assign_with_unknown_contact_changes_nothing(client, make_contact):
    contact_id = make_contact()

    response = client.post(
        f"{URL}/bulk/tags", json={"contact_ids": [contact_id, 9999], "names": ["Lead"]}
    )

    assert response.status_code == 404
    assert response.json()["error"]["details"] == {"missing_ids": [9999]}
    assert client.get(f"{URL}/{contact_id}").json()["tags"] == []


def test_bulk_assign_several_tags_at_once(client, make_contact):
    contact_ids = [make_contact() for _ in range(2)]
    client.post(f"{URL}/{contact_ids[0]}/tags", json={"name": "VIP"})

    response = client.post(
        f"{URL}/bulk/tags",
        json={"contact_ids": contact_ids, "names": ["VIP", "Lead", "lead"]},
    )

    assert response.status_code == 200
    body = response.json()
    assert [tag["name"] for tag in body["tags"]] == ["VIP", "Lead"]
    assert body["added"] == 3
    assert body["already_tagged"] == 1
    for contact_id in contact_ids:
        assert tag_names(client.get(f"{URL}/{contact_id}").json()) == ["Lead", "VIP"]


def test_bulk_assign_validation(client):
    def post(body):
        return client.post(f"{URL}/bulk/tags", json=body).status_code

    assert post({"contact_ids": [], "names": ["x"]}) == 422
    assert post({"contact_ids": list(range(1, 1002)), "names": ["x"]}) == 422
    assert post({"contact_ids": [1], "names": []}) == 422
    assert post({"contact_ids": [1], "names": [f"tag{n}" for n in range(11)]}) == 422
    assert post({"contact_ids": [1], "names": ["<bad>"]}) == 422


def test_activity_limit_and_missing_contact(client, make_contact):
    contact_id = make_contact()
    for name in ["A", "B", "C"]:
        client.post(f"{URL}/{contact_id}/tags", json={"name": name})

    recent = client.get(f"{URL}/{contact_id}/activities", params={"limit": 2}).json()
    assert [item["details"]["tag"] for item in recent] == ["C", "B"]
    assert client.get(f"{URL}/999/activities").status_code == 404
