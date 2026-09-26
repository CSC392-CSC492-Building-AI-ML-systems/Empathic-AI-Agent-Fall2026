class Message:

    def __init__(self, role: str, kind: str | None, content: str) -> None:
        self.role = role
        self.kind = kind
        self.content = content

    def get_role(self) -> str:
        return self.role

    def get_kind(self) -> str | None:
        return self.kind

    def get_content(self) -> str:
        return self.content
