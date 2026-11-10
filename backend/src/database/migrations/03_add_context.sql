ALTER TABLE session
    ADD context TEXT,
    ADD tool_context TEXT,
    ADD terminated BOOLEAN DEFAULT false;
