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
        frames = []
        score = 0
        i = 0

        # Iterate frames 1..10
        for frame_index in range(1, 11):
            # if we've consumed all rolls, append empty frame (for UI) and continue
            if i >= len(rolls):
                frames.append([])
                continue

            # Frames 1..9
            if frame_index < 10:
                # Strike
                if rolls[i] == 10:
                    bonus1 = rolls[i+1] if i+1 < len(rolls) else 0
                    bonus2 = rolls[i+2] if i+2 < len(rolls) else 0
                    frames.append([10])
                    score += 10 + bonus1 + bonus2
                    i += 1
                else:
                    first = rolls[i]
                    second = rolls[i+1] if i+1 < len(rolls) else None

                    # only first roll available (incomplete frame)
                    if second is None:
                        frames.append([first])
                        score += first  # include partial frame's pins immediately
                        i += 1
                    else:
                        frames.append([first, second])
                        frame_sum = first + second
                        if frame_sum == 10:
                            # spare: add 10 + next roll as bonus (0 if missing)
                            bonus = rolls[i+2] if i+2 < len(rolls) else 0
                            score += 10 + bonus
                        else:
                            # open frame
                            score += frame_sum
                        i += 2
            else:
                # 10th frame: can have 1..3 rolls
                r1 = rolls[i] if i < len(rolls) else None
                r2 = rolls[i+1] if i+1 < len(rolls) else None
                r3 = rolls[i+2] if i+2 < len(rolls) else None

                tenth = []
                if r1 is not None:
                    tenth.append(r1)
                if r2 is not None:
                    tenth.append(r2)
                # determine if a third roll is allowed and present
                if r1 is not None and (r1 == 10 or (r2 is not None and r1 + r2 == 10)):
                    if r3 is not None:
                        tenth.append(r3)

                frames.append(tenth)

                # score what is available in 10th (partial allowed)
                score += sum(tenth)
                # after 10th frame we're done
                break

        player.frames = frames
        return score, frames

    def is_game_finished(self):
        """Check if all players have completed all 10 frames"""
        if not self.current_player_order:
            return False
        for pid in self.current_player_order:
            p = self.players[pid]
            score, frames = self.compute_frames_and_score(p)
            # Check if 10th frame is complete (should have 1, 2, or 3 rolls)
            if len(frames) < 10:
                return False
            tenth_frame = frames[9]
            if len(tenth_frame) == 0:
                return False
            # Check if 10th frame is fully complete
            if tenth_frame[0] == 10 or (len(tenth_frame) >= 2 and tenth_frame[0] + tenth_frame[1] == 10):
                # Need 3 rolls
                if len(tenth_frame) < 3:
                    return False
            else:
                # Need 2 rolls
                if len(tenth_frame) < 2:
                    return False
        return True

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
        
        # Determine if game is finished
        game_finished = self.is_game_finished()
        
        # Only show winners if game is finished
        winners = []
        if game_finished:
            max_score = None
            for s in out:
                sc = s["score"]
                if max_score is None or sc > max_score:
                    max_score = sc
                    winners = [s["id"]]
                elif sc == max_score:
                    winners.append(s["id"])
        
        return {
            "players": out, 
            "winners": winners, 
            "game_finished": game_finished,
            "current_turn": self.current_player_order[self.current_turn_index] if self.current_player_order else None
        }

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
