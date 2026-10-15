class Message:
    """Class representing an entry in the Message table"""

    def __init__(self, role: str, kind: str | None, content: str) -> None:
        self.role = role
        self.kind = kind
        self.content = content

    def get_role(self) -> str:
        """Return messenger role"""
        return self.role

    def get_kind(self) -> str | None:
        """Return type of message"""
        return self.kind

    def get_content(self) -> str:
        """Return message content"""
        return self.content
