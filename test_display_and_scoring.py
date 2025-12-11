from app import app, game
import pytest


@pytest.fixture(autouse=True)
def reset_game():
    game.reset()
    yield
    game.reset()


def test_T04_score_updates_after_rolls():
    client = app.test_client()

    # Spieler hinzufügen
    p = client.post("/api/add_player", json={"name": "Alice"}).json["player"]

    # Erster Wurf
    client.post("/api/roll", json={"id": p["id"], "pins": 4})
    state = client.get("/api/state").json
    assert state["players"][0]["score"] == 4

    # Zweiter Wurf
    client.post("/api/roll", json={"id": p["id"], "pins": 3})
    state = client.get("/api/state").json
    assert state["players"][0]["score"] == 7
