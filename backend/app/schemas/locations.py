from datetime import datetime

from pydantic import BaseModel, ConfigDict


class LocationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None = None
    building: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    created_at: datetime
    