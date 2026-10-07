-- TABLES
CREATE TABLE IF NOT EXISTS users (
    id TEXT NOT NULL PRIMARY KEY,
    email_address TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    username TEXT NOT NULL,
    sex TEXT,
    birthday TIMESTAMP,
    register_date TIMESTAMP NOT NULL,
    firebase_id_token TEXT NOT NULL,
    firebase_refresh_token TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_goals (
    user_id TEXT NOT NULL PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    height NUMERIC(3, 0) NOT NULL,
    starting_weight NUMERIC(4, 1) NOT NULL,
    goal_weight NUMERIC(4, 1) NOT NULL,
    activity_level TEXT NOT NULL,
    goal_calories INTEGER NOT NULL,
    goal_protein NUMERIC(3, 0) NOT NULL,
    goal_carbs NUMERIC(3, 0) NOT NULL,
    goal_fat NUMERIC(3, 0) NOT NULL,
    starting_date TIMESTAMP NOT NULL,
    goal_date TIMESTAMP,
    weekly_rate NUMERIC(10, 8),
    plan TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS weight_histories (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date TIMESTAMP NOT NULL,
    weight NUMERIC(4, 1) NOT NULL
);

CREATE TABLE IF NOT EXISTS foods (
    id SERIAL PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    barcode TEXT,
    image_uri TEXT,
    image_delete_uri TEXT,
    is_verified TEXT NOT NULL,
    nutri_score TEXT NOT NULL,
    kcal_per_100_g NUMERIC(6, 2) NOT NULL,
    protein_per_100_g NUMERIC(6, 2) NOT NULL,
    carbs_per_100_g NUMERIC(6, 2) NOT NULL,
    fat_per_100_g NUMERIC(6, 2) NOT NULL,
    sugar_per_100_g NUMERIC(6, 2) NOT NULL,
    added_sugar_per_100_g NUMERIC(6, 2) NOT NULL,
    recommended_serving_size NUMERIC(6, 2) NOT NULL
);

CREATE TABLE IF NOT EXISTS meals (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    kcal INTEGER NOT NULL,
    nutri_score TEXT NOT NULL,
    image_uri TEXT,
    image_delete_uri TEXT
);

CREATE TABLE IF NOT EXISTS meal_food_relations (
    id SERIAL PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    meal_id INTEGER NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
    food_id INTEGER NOT NULL REFERENCES foods(id) ON DELETE CASCADE,
    quantity NUMERIC(6, 0) NOT NULL
);

CREATE TABLE IF NOT EXISTS food_histories (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    food_id INTEGER NOT NULL REFERENCES foods(id) ON DELETE CASCADE,
    meal_category TEXT NOT NULL,
    quantity NUMERIC(6, 0) NOT NULL,
    date TIMESTAMP NOT NULL
);

-- INIT WITH BASE DATA FROM JSON FILES
DO $$
DECLARE
    record jsonb;
BEGIN
    FOR record IN
        SELECT jsonb_array_elements(
                   pg_read_file('/docker-entrypoint-initdb.d/data/users.json')::jsonb
               )
    LOOP
        INSERT INTO users (
            id,
            email_address,
            first_name,
            last_name,
            username,
            sex,
            birthday,
            register_date,
            firebase_id_token,
            firebase_refresh_token
        ) VALUES (
            record->>'id',
            record->>'email_address',
            record->>'first_name',
            record->>'last_name',
            record->>'username',
            record->>'sex',
            (record->>'birthday')::timestamp,
            (record->>'register_date')::timestamp,
            record->>'firebase_id_token',
            record->>'firebase_refresh_token'
        )
        ON CONFLICT (id) DO NOTHING;
    END LOOP;
END
$$;

DO $$
DECLARE
    record jsonb;
BEGIN
    FOR record IN
        SELECT jsonb_array_elements(
                   pg_read_file('/docker-entrypoint-initdb.d/data/user_goals.json')::jsonb
               )
    LOOP
        INSERT INTO user_goals (
            user_id,
            height,
            starting_weight,
            goal_weight,
            activity_level,
            goal_calories,
            goal_carbs,
            goal_fat,
            goal_protein,
            starting_date,
            goal_date,
            weekly_rate,
            plan
        ) VALUES (
            record->>'user_id',
            (record->>'height')::numeric(3, 0),
            (record->>'starting_weight')::numeric(4, 1),
            (record->>'goal_weight')::numeric(4, 1),
            record->>'activity_level',
            (record->>'goal_calories')::integer,
            (record->>'goal_carbs')::numeric(3, 0),
            (record->>'goal_fat')::numeric(3, 0),
            (record->>'goal_protein')::numeric(3, 0),
            (record->>'starting_date')::timestamp,
            (record->>'goal_date')::timestamp,
            (record->>'weekly_rate')::numeric(10, 8),
            record->>'plan'
        )
        ON CONFLICT (user_id) DO NOTHING;
    END LOOP;
END
$$;

DO $$
DECLARE
    record jsonb;
BEGIN
    FOR record IN
        SELECT jsonb_array_elements(
                   pg_read_file('/docker-entrypoint-initdb.d/data/weight_histories.json')::jsonb
               )
    LOOP
        INSERT INTO weight_histories (
            user_id,
            date,
            weight
        ) VALUES (
            record->>'user_id',
            (record->>'date')::timestamp,
            (record->>'weight')::numeric(4, 1)
        );
    END LOOP;

    PERFORM setval(
        pg_get_serial_sequence('weight_histories', 'id'),
        COALESCE((SELECT MAX(id) FROM weight_histories), 0)
    );
END
$$;

DO $$
DECLARE
    record jsonb;
BEGIN
    FOR record IN
        SELECT jsonb_array_elements(
                   pg_read_file('/docker-entrypoint-initdb.d/data/foods.json')::jsonb
               )
    LOOP
        INSERT INTO foods (
            id,
            user_id,
            name,
            barcode,
            image_uri,
            is_verified,
            nutri_score,
            kcal_per_100_g,
            carbs_per_100_g,
            fat_per_100_g,
            protein_per_100_g,
            sugar_per_100_g,
            added_sugar_per_100_g,
            recommended_serving_size
        ) VALUES (
            (record->>'id')::integer,
            record->>'user_id',
            record->>'name',
            record->>'barcode',
            record->>'image_uri',
            record->>'is_verified',
            record->>'nutri_score',
            (record->>'kcal_per_100_g')::numeric(6, 2),
            (record->>'carbs_per_100_g')::numeric(6, 2),
            (record->>'fat_per_100_g')::numeric(6, 2),
            (record->>'protein_per_100_g')::numeric(6, 2),
            (record->>'sugar_per_100_g')::numeric(6, 2),
            (record->>'added_sugar_per_100_g')::numeric(6, 2),
            (record->>'recommended_serving_size')::numeric(6, 2)
        )
        ON CONFLICT (id) DO NOTHING;
    END LOOP;

    PERFORM setval(
        pg_get_serial_sequence('foods', 'id'),
        COALESCE((SELECT MAX(id) FROM foods), 0)
    );
END
$$;

DO $$
DECLARE
    record jsonb;
BEGIN
    FOR record IN
        SELECT jsonb_array_elements(
                   pg_read_file('/docker-entrypoint-initdb.d/data/meals.json')::jsonb
               )
    LOOP
        INSERT INTO meals (
            id,
            name,
            kcal,
            nutri_score,
            user_id,
            image_uri
        ) VALUES (
            (record->>'id')::integer,
            record->>'name',
            (record->>'kcal')::integer,
            record->>'nutri_score',
            record->>'user_id',
            record->>'image_uri'
        )
        ON CONFLICT (id) DO NOTHING;
    END LOOP;

    PERFORM setval(
        pg_get_serial_sequence('meals', 'id'),
        COALESCE((SELECT MAX(id) FROM meals), 0)
    );
END
$$;

DO $$
DECLARE
    record jsonb;
BEGIN
    FOR record IN
        SELECT jsonb_array_elements(
                   pg_read_file('/docker-entrypoint-initdb.d/data/meal_food_relations.json')::jsonb
               )
    LOOP
        INSERT INTO meal_food_relations (
            user_id,
            meal_id,
            food_id,
            quantity
        ) VALUES (
            record->>'user_id',
            (record->>'meal_id')::integer,
            (record->>'food_id')::integer,
            (record->>'quantity')::numeric(6, 0)
        );
    END LOOP;

    PERFORM setval(
        pg_get_serial_sequence('meal_food_relations', 'id'),
        COALESCE((SELECT MAX(id) FROM meal_food_relations), 0)
    );
END
$$;

DO $$
DECLARE
    record jsonb;
BEGIN
    FOR record IN
        SELECT jsonb_array_elements(
                   pg_read_file('/docker-entrypoint-initdb.d/data/food_histories.json')::jsonb
               )
    LOOP
        INSERT INTO food_histories (
            id,
            user_id,
            food_id,
            meal_category,
            quantity,
            date
        ) VALUES (
            (record->>'id')::integer,
            record->>'user_id',
            (record->>'food_id')::integer,
            record->>'meal_category',
            (record->>'quantity')::numeric(6, 0),
            (record->>'date')::timestamp
        )
        ON CONFLICT (id) DO NOTHING;
    END LOOP;

    PERFORM setval(
        pg_get_serial_sequence('food_histories', 'id'),
        COALESCE((SELECT MAX(id) FROM food_histories), 0)
    );
END
$$;