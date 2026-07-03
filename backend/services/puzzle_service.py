import json
import random
import logging
from pathlib import Path
import chess

logger = logging.getLogger(__name__)


class PuzzleService:
    def __init__(self, puzzles_path: Path = Path("data/puzzles.json")):
        self._puzzles_path = puzzles_path
        self._puzzles = self._load_puzzles()

    def _load_puzzles(self) -> list[dict]:
        try:
            with open(self._puzzles_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError) as exc:
            logger.warning("Impossible de charger les puzzles: %s", exc)
            return []

    def get_random_puzzle(self, rating_min: int = 0, rating_max: int = 4000) -> dict | None:
        filtered = [
            p for p in self._puzzles
            if rating_min <= p.get("rating", 0) <= rating_max
        ]
        if not filtered:
            return None
        puzzle = random.choice(filtered)
        return {
            "id": puzzle["id"],
            "fen": puzzle["fen"],
            "moves": puzzle["moves"],
            "rating": puzzle.get("rating", 0),
            "theme": puzzle.get("theme", ""),
            "description": puzzle.get("description", ""),
        }

    def check_solution(self, puzzle_id: int, move: str) -> dict:
        puzzle = next((p for p in self._puzzles if p["id"] == puzzle_id), None)
        if not puzzle:
            return {"correct": False, "message": "Puzzle introuvable"}

        board = chess.Board(puzzle["fen"])
        expected_first = puzzle["moves"][0]

        try:
            board.parse_san(move)
            is_correct = move.strip() == expected_first.strip()
            return {
                "correct": is_correct,
                "message": "Bravo !" if is_correct else f"Non, essayez {expected_first}",
                "expected": expected_first if not is_correct else None,
            }
        except ValueError:
            return {"correct": False, "message": "Coup invalide"}

    def get_puzzle_by_id(self, puzzle_id: int) -> dict | None:
        puzzle = next((p for p in self._puzzles if p["id"] == puzzle_id), None)
        if not puzzle:
            return None
        return {
            "id": puzzle["id"],
            "fen": puzzle["fen"],
            "moves": puzzle["moves"],
            "rating": puzzle.get("rating", 0),
            "theme": puzzle.get("theme", ""),
            "description": puzzle.get("description", ""),
        }
