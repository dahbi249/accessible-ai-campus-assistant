from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AnnouncementResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    content: str
    category: str | None = None
    source_url: str | None = None
    published_at: datetime | None = None
    created_at: datetime