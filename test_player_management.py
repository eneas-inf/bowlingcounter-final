import pytest
from app import app, game


@pytest.fixture(autouse=True)
def reset_game():
    game.reset()
    yield
    game.reset()


def test_T01_add_player():
    client = app.test_client()
    res = client.post("/api/add_player", json={"name": "Alice"})
    assert res.json["ok"] is True

    state = client.get("/api/state").json
    assert len(state["players"]) == 1
    assert state["players"][0]["name"] == "Alice"


def test_T02_edit_player():
    client = app.test_client()
    # Spieler anlegen
    p = client.post("/api/add_player", json={"name": "OldName"}).json["player"]

    # Simulation eines Edit-Vorgangs:
    client.post("/api/remove_player", json={"id": p["id"]})
    client.post("/api/add_player", json={"name": "NewName"})

    state = client.get("/api/state").json
    assert state["players"][0]["name"] == "NewName"


def test_T03_delete_player():
    client = app.test_client()

    p = client.post("/api/add_player", json={"name": "ToDelete"}).json["player"]

    client.post("/api/remove_player", json={"id": p["id"]})

    state = client.get("/api/state").json
    assert len(state["players"]) == 0
