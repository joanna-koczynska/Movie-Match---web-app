DROP TABLE IF EXISTS stg_links;
DROP TABLE IF EXISTS stg_tags;
DROP TABLE IF EXISTS stg_ratings;
DROP TABLE IF EXISTS stg_movies;


DROP TABLE IF EXISTS rating CASCADE;
DROP TABLE IF EXISTS watched CASCADE;
DROP TABLE IF EXISTS to_watch CASCADE;
DROP TABLE IF EXISTS movie_genres CASCADE;
DROP TABLE IF EXISTS genres CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS movie CASCADE;
DROP TABLE IF EXISTS links CASCADE;
DROP TABLE IF EXISTS tags CASCADE;


CREATE TABLE stg_movies (
    movieId INT,
    title TEXT,
    genres TEXT
);

CREATE TABLE stg_ratings (
    userId INT,
    movieId INT,
    rating NUMERIC,
    timestamp BIGINT
);

CREATE TABLE stg_tags (
    userId INT,
    movieId INT,
    tag TEXT,
    timestamp BIGINT
);

CREATE TABLE stg_links (
    movieId INT,
    imdbId INT,
    tmdbId INT
);


CREATE TABLE USERS (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_id INT UNIQUE,
    name TEXT,
    surname TEXT,
    username TEXT UNIQUE,
    password TEXT,
    email TEXT UNIQUE
);

CREATE TABLE MOVIE (
    id INT PRIMARY KEY, 
    title TEXT,
    poster_path TEXT,
    overview TEXT,
    release_year INTEGER
);

CREATE TABLE GENRES (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE
);


CREATE TABLE MOVIE_GENRES (
    id_movie INT REFERENCES MOVIE(id),
    id_genre UUID REFERENCES GENRES(id),
    PRIMARY KEY (id_movie, id_genre)
);


CREATE TABLE RATING (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_movie INT REFERENCES MOVIE(id),
    id_user UUID REFERENCES USERS(id),
    rating NUMERIC
);

CREATE TABLE WATCHED (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_movie INT REFERENCES MOVIE(id),
    id_user UUID REFERENCES USERS(id),
    rating INTEGER DEFAULT 0
);

CREATE TABLE TO_WATCH (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_movie INT REFERENCES MOVIE(id),
    id_user UUID REFERENCES USERS(id)
);

CREATE TABLE TAGS (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_user UUID REFERENCES USERS(id),
    id_movie INT REFERENCES MOVIE(id),
    tag TEXT,
    timestamp BIGINT
);

CREATE TABLE LINKS (
    movieId INT PRIMARY KEY REFERENCES MOVIE(id),
    imdbId INT,
    tmdbId INT
);




-- 4. Ładowanie danych do stagingu (bez zmian)
COPY stg_movies FROM '/movies.csv' DELIMITER ',' CSV HEADER;
COPY stg_ratings FROM '/ratings.csv' DELIMITER ',' CSV HEADER;
COPY stg_links FROM '/links.csv' DELIMITER ',' CSV HEADER;
COPY stg_tags FROM '/tags.csv' DELIMITER ',' CSV HEADER;

-- 5. Migracja danych z mapowaniem ID -> UUID

-- Filmy:
INSERT INTO MOVIE (id, title)
SELECT DISTINCT movieId, title FROM stg_movies
ON CONFLICT (id) DO NOTHING;

-- Użytkownicy:
INSERT INTO USERS (legacy_id, name, surname, username, password, email)
SELECT DISTINCT userId, 
       'User ' || userId, 
       'Surname ' || userId, 
       'user' || userId, 
       'pass' || userId, 
       'user' || userId || '@example.com'
FROM stg_ratings
ON CONFLICT (legacy_id) DO NOTHING;



-- Gatunki:
INSERT INTO GENRES (name)
SELECT DISTINCT unnest(string_to_array(genres, '|'))
FROM stg_movies
ON CONFLICT (name) DO NOTHING;

-- 6. Łączenie relacji 
-- Zamiast wstawiać ID z pliku, musimy "zapytać" tabele o nowe UUID na podstawie starego ID

-- MOVIE_GENRES:
INSERT INTO MOVIE_GENRES (id_movie, id_genre)
SELECT sm.movieId, g.id
FROM stg_movies sm
CROSS JOIN GENRES g
WHERE g.name = ANY(string_to_array(sm.genres, '|'))
ON CONFLICT DO NOTHING;

-- RATING:
INSERT INTO RATING (id_movie, id_user, rating)
SELECT sr.movieId, u.id, sr.rating
FROM stg_ratings sr
JOIN USERS u ON sr.userId = u.legacy_id;

-- Linki
INSERT INTO LINKS (movieId, imdbId, tmdbId)
SELECT movieId, imdbId, tmdbId FROM stg_links
ON CONFLICT (movieId) DO NOTHING;

-- Tagi
INSERT INTO TAGS (id_user, id_movie, tag, timestamp)
SELECT u.id, st.movieId, st.tag, st.timestamp 
FROM stg_tags st
JOIN USERS u ON st.userId = u.legacy_id;

