CREATE TABLE users (
    id UUID PRIMARY KEY,
    name TEXT,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL
);

CREATE TABLE sessions (
    id UUID PRIMARY KEY,
    name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    user_id UUID NOT NULL,
    terminated BOOLEAN DEFAULT false,

    FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE TABLE messages (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    session_id UUID NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(id)
        ON DELETE CASCADE
);

CREATE TABLE user_memories (
    user_id UUID NOT NULL,
    memory_key TEXT NOT NULL,
    content TEXT NOT NULL,

    PRIMARY KEY (user_id, memory_key),
    FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE TABLE message_context (
    session_id UUID NOT NULL,
    context TEXT,

    PRIMARY KEY (session_id),
    FOREIGN KEY (session_id) REFERENCES sessions(id)
        ON DELETE CASCADE
);

CREATE TABLE tool_context (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    session_id UUID NOT NULL,
    context TEXT,

    FOREIGN KEY (session_id) REFERENCES sessions(id)
        ON DELETE CASCADE
);

CREATE INDEX sessions_user_id_idx ON sessions (user_id);
CREATE INDEX messages_idx ON messages (session_id, id);
CREATE INDEX tool_context_session_id_idx ON tool_context (session_id, id);
