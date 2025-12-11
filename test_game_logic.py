from app import BowlingGame
import pytest


def test_T05_strike_bonus():
    game = BowlingGame()
    p = game.add_player("A")

    # Strike
    game.record_roll(p.id, 10)
    game.record_roll(p.id, 3)
    game.record_roll(p.id, 4)

    score, _ = game.compute_frames_and_score(p)
    # Strike + Bonus + next frame = 24
    assert score == 10 + 3 + 4 + 3 + 4


def test_T06_spare_bonus():
    game = BowlingGame()
    p = game.add_player("A")

    game.record_roll(p.id, 6)
    # Spare
    game.record_roll(p.id, 4)
    game.record_roll(p.id, 5)

    score, _ = game.compute_frames_and_score(p)
    # spare (10+bonus) + next frame first roll
    assert score == 10 + 5 + 5


def test_T07_normal_frame():
    game = BowlingGame()
    p = game.add_player("A")

    game.record_roll(p.id, 3)
    game.record_roll(p.id, 4)

    score, _ = game.compute_frames_and_score(p)
    assert score == 7


def test_T08_winner_single_highest():
    game = BowlingGame()

    p1 = game.add_player("A")
    p2 = game.add_player("B")

    # Spieler A besser
    p1.rolls = [10, 10, 10]
    p2.rolls = [0, 0, 0]

    state = game.get_game_state()
    assert state["winners"] == [p1.id]


def test_T09_winner_tie():
    game = BowlingGame()

    p1 = game.add_player("A")
    p2 = game.add_player("B")

    # spare + bonus 5 = 15
    p1.rolls = [5, 5, 5]
    p2.rolls = [5, 5, 5]

    state = game.get_game_state()
    assert set(state["winners"]) == {p1.id, p2.id}
