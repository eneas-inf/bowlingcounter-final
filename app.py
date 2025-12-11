from flask import Flask, render_template, jsonify, request
from dataclasses import dataclass, field
from typing import List, Dict

app = Flask(__name__, static_folder="static", template_folder="templates")

@dataclass
class Player:
    id: int
    name: str
    rolls: List[int] = field(default_factory=list)
    # For UI convenience we also store frames computed
    frames: List[List[int]] = field(default_factory=list)

class BowlingGame:
    def __init__(self):
        self.players: Dict[int, Player] = {}
        self.next_id = 1
        self.current_player_order: List[int] = []
        self.current_turn_index = 0  # index into current_player_order

    def reset(self):
        self.players = {}
        self.next_id = 1
        self.current_player_order = []
        self.current_turn_index = 0

    def add_player(self, name: str) -> Player:
        pid = self.next_id
        self.next_id += 1
        p = Player(id=pid, name=name)
        self.players[pid] = p
        self.current_player_order.append(pid)
        return p

    def remove_player(self, pid: int):
        if pid in self.players:
            del self.players[pid]
            if pid in self.current_player_order:
                self.current_player_order.remove(pid)
            if self.current_turn_index >= len(self.current_player_order):
                self.current_turn_index = 0

    def record_roll(self, pid: int, pins: int):
        # only accept 0..10
        if pid not in self.players:
            return
        player = self.players[pid]
        # Append roll
        player.rolls.append(int(pins))
        # After recording, advance turn index (simplified per-throw rotation)
        if len(self.current_player_order) > 0:
            self.current_turn_index = (self.current_turn_index + 1) % len(self.current_player_order)

    def compute_frames_and_score(self, player):
        rolls = player.rolls
        score = 0
        frames = []
        i = 0

        for frame in range(10):
            if i >= len(rolls):
                break

            # -------- 10th Frame Special Handling --------
            if frame == 9:
                r1 = rolls[i] if i < len(rolls) else 0
                r2 = rolls[i+1] if i+1 < len(rolls) else 0

                # Strike im 10. Frame
                if r1 == 10:
                    r3 = rolls[i+2] if i+2 < len(rolls) else 0
                    frames.append([r1, r2, r3])
                    score += r1 + r2 + r3
                    break

                # Spare im 10. Frame
                if r1 + r2 == 10:
                    r3 = rolls[i+2] if i+2 < len(rolls) else 0
                    frames.append([r1, r2, r3])
                    score += 10 + r3
                    break

                # Normaler Frame (keine 10)
                frames.append([r1, r2])
                score += r1 + r2
                break
            # -------- END 10th Frame --------

            # STRIKE (Frames 1–9)
            if rolls[i] == 10:
                bonus1 = rolls[i+1] if i+1 < len(rolls) else 0
                bonus2 = rolls[i+2] if i+2 < len(rolls) else 0
                frame_score = 10 + bonus1 + bonus2
                score += frame_score
                frames.append([10])
                i += 1

            else:
                # NORMAL FRAME
                first = rolls[i]
                second = rolls[i+1] if i+1 < len(rolls) else 0
                frame_total = first + second

                # SPARE
                if frame_total == 10:
                    bonus = rolls[i+2] if i+2 < len(rolls) else 0
                    frame_score = 10 + bonus
                    frames.append([first, second])
                    i += 2

                else:
                    # Normaler Frame
                    frame_score = frame_total
                    frames.append([first, second])
                    i += 2

                score += frame_score

        return score, frames

    def get_game_state(self):
        out = []
        for pid in self.current_player_order:
            p = self.players[pid]
            score, frames = self.compute_frames_and_score(p)
            out.append({
                "id": p.id,
                "name": p.name,
                "score": score,
                "frames": frames,
                "rolls": p.rolls
            })
        # determine winner(s) (highest score among players who have at least some rolls)
        max_score = None
        winners = []
        for s in out:
            # Only consider numeric scores; ties allowed
            sc = s["score"]
            if max_score is None or sc > max_score:
                max_score = sc
                winners = [s["id"]]
            elif sc == max_score:
                winners.append(s["id"])
        return {"players": out, "winners": winners, "current_turn": self.current_player_order[self.current_turn_index] if self.current_player_order else None}

game = BowlingGame()

# ---- Flask endpoints ----

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/state")
def api_state():
    return jsonify(game.get_game_state())

@app.route("/api/add_player", methods=["POST"])
def api_add_player():
    data = request.json or {}
    name = data.get("name", "").strip() or f"Player {game.next_id}"
    p = game.add_player(name)
    return jsonify({"ok": True, "player": {"id": p.id, "name": p.name}})

@app.route("/api/remove_player", methods=["POST"])
def api_remove_player():
    data = request.json or {}
    pid = int(data.get("id", 0))
    game.remove_player(pid)
    return jsonify({"ok": True})

@app.route("/api/roll", methods=["POST"])
def api_roll():
    data = request.json or {}
    pid = int(data.get("id"))
    pins = int(data.get("pins"))
    if pins < 0 or pins > 10:
        return jsonify({"ok": False, "error": "Pins must be between 0 and 10"}), 400
    game.record_roll(pid, pins)
    return jsonify({"ok": True})

@app.route("/api/reset", methods=["POST"])
def api_reset():
    game.reset()
    return jsonify({"ok": True})

if __name__ == "__main__":
    app.run(debug=True)
