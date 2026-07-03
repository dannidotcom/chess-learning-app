import logging
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from services.puzzle_service import PuzzleService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/puzzles", tags=["Puzzles"])
puzzle_service = PuzzleService()


class PuzzleCheckRequest(BaseModel):
    puzzle_id: int
    move: str


@router.get("/random")
async def random_puzzle(
    rating_min: int = Query(0, ge=0),
    rating_max: int = Query(4000, ge=0, le=4000),
):
    puzzle = puzzle_service.get_random_puzzle(rating_min, rating_max)
    if not puzzle:
        raise HTTPException(status_code=404, detail="Aucun puzzle trouvé")
    return puzzle


@router.post("/check")
async def check_puzzle(req: PuzzleCheckRequest):
    return puzzle_service.check_solution(req.puzzle_id, req.move)


@router.get("/{puzzle_id}")
async def get_puzzle(puzzle_id: int):
    puzzle = puzzle_service.get_puzzle_by_id(puzzle_id)
    if not puzzle:
        raise HTTPException(status_code=404, detail="Puzzle introuvable")
    return puzzle
