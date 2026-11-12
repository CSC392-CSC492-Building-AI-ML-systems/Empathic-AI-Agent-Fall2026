from dataclasses import dataclass
from uuid import UUID

"""Class representing a stored user"""
@dataclass
class User:
    user_id: UUID
    email: str
    password: str
    name: str | None


