import os
import pytest
import requests
from datetime import datetime, timezone, timedelta
from pymongo import MongoClient
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path("/app/backend/.env"))

BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/") if os.environ.get("EXPO_PUBLIC_BACKEND_URL") else None
if not BASE_URL:
    # fallback to frontend .env
    from dotenv import dotenv_values
    v = dotenv_values("/app/frontend/.env")
    BASE_URL = v["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]

TEST_USER_ID = "user_test_1"
TEST_SESSION_TOKEN = "test_token_abc"
TEST_USERNAME = "tester1"

TEST_USER_ID_2 = "user_test_2"
TEST_USERNAME_2 = "otheruser"


@pytest.fixture(scope="session")
def base_url():
    return BASE_URL


@pytest.fixture(scope="session")
def mongo_db():
    client = MongoClient(MONGO_URL)
    db = client[DB_NAME]
    yield db
    client.close()


@pytest.fixture(scope="session", autouse=True)
def seed_test_data(mongo_db):
    """Seed test user + session; cleanup afterwards."""
    now = datetime.now(timezone.utc)
    expires = now + timedelta(days=7)

    # Clean up any existing test data first
    mongo_db.users.delete_many({"user_id": {"$in": [TEST_USER_ID, TEST_USER_ID_2]}})
    mongo_db.user_sessions.delete_many({"session_token": TEST_SESSION_TOKEN})
    mongo_db.posts.delete_many({"author_id": {"$in": [TEST_USER_ID, TEST_USER_ID_2]}})

    mongo_db.users.insert_one({
        "user_id": TEST_USER_ID,
        "email": "TEST_tester1@example.com",
        "name": "Tester One",
        "username": TEST_USERNAME,
        "country": "India",
        "state": "Karnataka",
        "slogan": "Fix it now",
        "picture": None,
        "onboarded": True,
        "created_at": now,
        "last_login": now,
    })
    mongo_db.users.insert_one({
        "user_id": TEST_USER_ID_2,
        "email": "TEST_other@example.com",
        "name": "Other User",
        "username": TEST_USERNAME_2,
        "country": "India",
        "state": "Maharashtra",
        "slogan": "",
        "picture": None,
        "onboarded": True,
        "created_at": now,
        "last_login": now,
    })
    mongo_db.user_sessions.insert_one({
        "session_token": TEST_SESSION_TOKEN,
        "user_id": TEST_USER_ID,
        "created_at": now,
        "expires_at": expires,
    })

    yield

    # Teardown
    mongo_db.users.delete_many({"user_id": {"$in": [TEST_USER_ID, TEST_USER_ID_2]}})
    mongo_db.user_sessions.delete_many({"session_token": TEST_SESSION_TOKEN})
    mongo_db.posts.delete_many({"author_id": {"$in": [TEST_USER_ID, TEST_USER_ID_2]}})
    mongo_db.likes.delete_many({"user_id": {"$in": [TEST_USER_ID, TEST_USER_ID_2]}})
    mongo_db.comments.delete_many({"user_id": {"$in": [TEST_USER_ID, TEST_USER_ID_2]}})


@pytest.fixture
def auth_headers():
    return {"Authorization": f"Bearer {TEST_SESSION_TOKEN}", "Content-Type": "application/json"}


@pytest.fixture
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s
