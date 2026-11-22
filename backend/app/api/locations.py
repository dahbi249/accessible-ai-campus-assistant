from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.database.models import Location
from app.schemas.locations import LocationResponse

router = APIRouter(
    prefix="/api/v1/locations",
    tags=["Locations"],
)


@router.get("/", response_model=list[LocationResponse])
def get_locations(
    q: str | None = Query(default=None, min_length=1),
    building: str | None = None,
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    statement = select(Location)

    if q:
        search_term = f"%{q.strip()}%"
        statement = statement.where(
            Location.name.ilike(search_term)
            | Location.description.ilike(search_term)
        )

    if building:
        statement = statement.where(
            Location.building.ilike(f"%{building.strip()}%")
        )

    statement = statement.order_by(Location.name.asc()).limit(limit)

    return db.scalars(statement).all()