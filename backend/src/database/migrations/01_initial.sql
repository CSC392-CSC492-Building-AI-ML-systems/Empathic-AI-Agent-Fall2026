CREATE TABLE sessions (
    id UUID PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE messages (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    role TEXT NOT NULL,
    kind TEXT,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    session_id UUID NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(id)
        ON DELETE CASCADE,
);

CREATE INDEX messages_idx ON messages (session_id, id);
