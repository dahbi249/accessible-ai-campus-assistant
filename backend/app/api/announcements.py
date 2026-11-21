from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.database.models import Announcement
from app.schemas.announcements import AnnouncementResponse

router = APIRouter(
    prefix="/api/v1/announcements",
    tags=["Announcements"],
)


@router.get("/", response_model=list[AnnouncementResponse])
def get_announcements(
    q: str | None = Query(default=None, min_length=1),
    category: str | None = None,
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    statement = select(Announcement)

    if q:
        search_term = f"%{q.strip()}%"
        statement = statement.where(
            Announcement.title.ilike(search_term)
            | Announcement.content.ilike(search_term)
        )

    if category:
        statement = statement.where(
            Announcement.category == category
        )

    statement = statement.order_by(
        Announcement.created_at.desc()
    ).limit(limit)

    return db.scalars(statement).all()