-- DROP TABLE IF EXISTS user;
-- DROP TABLE IF EXISTS post;
DROP TABLE IF EXISTS comment;

-- status: updated, published
CREATE TABLE comment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key_value TEXT UNIQUE NOT NULL,
    body TEXT NOT NULL,
    comment_status TEXT NOT NULL
);

-- CREATE TABLE post (
--     id INTEGER PRIMARY KEY AUTOINCREMENT,
--     author_id INTEGER NOT NULL,
--     created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
--     title TEXT NOT NULL,
--     body TEXT NOT NULL,
--     FOREIGN KEY (author_id) REFERENCES user (id)
-- );