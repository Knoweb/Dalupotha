SELECT 'CREATE DATABASE auth_db' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'auth_db')\gexec
SELECT 'CREATE DATABASE collection_db' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'collection_db')\gexec
