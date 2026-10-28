from datetime import datetime


class Message:
    """Class representing an entry in the Message table"""

    def __init__(self, message_id: int, role: str, content: str, created_at: datetime) -> None:
        self.id = message_id
        self.role = role
        self.content = content
        self.created_at = created_at

    def get_id(self) -> int:
        """Return message ID"""
        return self.id

    def get_role(self) -> str:
        """Return messenger role"""
        return self.role

    def get_content(self) -> str:
        """Return message content"""
        return self.content

    def get_created_at(self) -> datetime:
        """Return the creation timestamp saved by the database."""
        return self.created_at
