from dataclasses import dataclass
from datetime import datetime

"""Class representing stored message"""
@dataclass
class Message:
    message_id: int
    role: str
    content: str
    created_at: datetime


