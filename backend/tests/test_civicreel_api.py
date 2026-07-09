"""Comprehensive CivicReel backend API tests."""
import pytest
from conftest import BASE_URL, TEST_USER_ID, TEST_USER_ID_2, TEST_SESSION_TOKEN, TEST_USERNAME_2

# Small 1x1 PNG base64
TINY_IMG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="


def _no_underscore_id(obj):
    """Recursively assert no '_id' key present."""
    if isinstance(obj, dict):
        assert "_id" not in obj, f"Found _id in: {obj}"
        for v in obj.values():
            _no_underscore_id(v)
    elif isinstance(obj, list):
        for item in obj:
            _no_underscore_id(item)


# ---------- Health ----------
class TestHealth:
    def test_root(self, api):
        r = api.get(f"{BASE_URL}/api/")
        assert r.status_code == 200
        assert r.json() == {"message": "CivicReel API"}


# ---------- Categories ----------
class TestCategories:
    def test_categories_list(self, api):
        r = api.get(f"{BASE_URL}/api/categories")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) == 10
        keys = {c["key"] for c in data}
        expected = {"electricity", "water", "road", "pollution", "wastage",
                    "sanitation", "traffic", "safety", "corruption", "other"}
        assert keys == expected
        for c in data:
            assert "label" in c and "icon" in c


# ---------- Auth negative ----------
class TestAuthNegative:
    def test_invalid_session_id(self, api):
        r = api.post(f"{BASE_URL}/api/auth/session", json={"session_id": "totally-invalid-session-id"})
        assert r.status_code == 401

    def test_me_missing_header(self, api):
        r = api.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 401

    def test_me_invalid_bearer(self, api):
        r = api.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": "Bearer nonexistent_token_xyz"})
        assert r.status_code == 401


# ---------- Auth me ----------
class TestAuthMe:
    def test_me_with_valid_token(self, api, auth_headers):
        r = api.get(f"{BASE_URL}/api/auth/me", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        _no_underscore_id(data)
        assert data["user_id"] == TEST_USER_ID
        assert data["username"] == "tester1"
        assert data["onboarded"] is True


# ---------- Profile update ----------
class TestProfile:
    def test_update_profile(self, api, auth_headers):
        payload = {
            "name": "Tester Updated",
            "username": "tester_new",
            "country": "India",
            "state": "Kerala",
            "slogan": "Better civic life",
        }
        r = api.put(f"{BASE_URL}/api/users/profile", json=payload, headers=auth_headers)
        assert r.status_code == 200, r.text
        data = r.json()
        _no_underscore_id(data)
        assert data["name"] == "Tester Updated"
        assert data["username"] == "tester_new"
        assert data["state"] == "Kerala"
        assert data["slogan"] == "Better civic life"

    def test_username_uniqueness_conflict(self, api, auth_headers):
        # Try to take user 2's username
        r = api.put(f"{BASE_URL}/api/users/profile",
                    json={"username": TEST_USERNAME_2},
                    headers=auth_headers)
        assert r.status_code == 409, f"Expected 409, got {r.status_code}: {r.text}"


# ---------- Posts ----------
_state = {}


class TestPosts:
    def test_create_post(self, api, auth_headers):
        payload = {
            "image_base64": TINY_IMG,
            "description": "Massive pothole on MG Road causing accidents daily",
            "category": "road",
            "tagged_usernames": ["mayor"],
        }
        r = api.post(f"{BASE_URL}/api/posts", json=payload, headers=auth_headers)
        assert r.status_code == 200, r.text
        data = r.json()
        _no_underscore_id(data)
        assert data["category"] == "road"
        assert data["author"]["user_id"] == TEST_USER_ID
        assert data["like_count"] == 0
        assert data["comment_count"] == 0
        assert data["liked"] is False
        assert "post_id" in data
        _state["post_id"] = data["post_id"]

    def test_feed_contains_post(self, api, auth_headers):
        r = api.get(f"{BASE_URL}/api/posts/feed", headers=auth_headers)
        assert r.status_code == 200
        posts = r.json()
        _no_underscore_id(posts)
        assert isinstance(posts, list)
        ids = [p["post_id"] for p in posts]
        assert _state["post_id"] in ids
        p = next(x for x in posts if x["post_id"] == _state["post_id"])
        assert "author" in p and p["author"]["user_id"] == TEST_USER_ID
        assert p["like_count"] == 0
        assert p["comment_count"] == 0
        assert p["liked"] is False

    def test_like_toggle_on(self, api, auth_headers):
        pid = _state["post_id"]
        r = api.post(f"{BASE_URL}/api/posts/{pid}/like", headers=auth_headers)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["liked"] is True
        assert d["like_count"] == 1

    def test_like_toggle_off(self, api, auth_headers):
        pid = _state["post_id"]
        r = api.post(f"{BASE_URL}/api/posts/{pid}/like", headers=auth_headers)
        assert r.status_code == 200
        d = r.json()
        assert d["liked"] is False
        assert d["like_count"] == 0

    def test_add_comment(self, api, auth_headers):
        pid = _state["post_id"]
        r = api.post(f"{BASE_URL}/api/posts/{pid}/comments",
                     json={"text": "This needs fixing urgently"},
                     headers=auth_headers)
        assert r.status_code == 200, r.text
        d = r.json()
        _no_underscore_id(d)
        assert d["text"] == "This needs fixing urgently"
        assert d["user_id"] == TEST_USER_ID

    def test_list_comments(self, api, auth_headers):
        pid = _state["post_id"]
        r = api.get(f"{BASE_URL}/api/posts/{pid}/comments", headers=auth_headers)
        assert r.status_code == 200
        comments = r.json()
        _no_underscore_id(comments)
        assert len(comments) >= 1
        assert any(c["text"] == "This needs fixing urgently" for c in comments)

    def test_search_posts_by_category(self, api, auth_headers):
        r = api.get(f"{BASE_URL}/api/posts/search?category=road", headers=auth_headers)
        assert r.status_code == 200
        posts = r.json()
        _no_underscore_id(posts)
        assert any(p["post_id"] == _state["post_id"] for p in posts)
        for p in posts:
            assert p["category"] == "road"

    def test_search_posts_by_text(self, api, auth_headers):
        r = api.get(f"{BASE_URL}/api/posts/search?q=pothole", headers=auth_headers)
        assert r.status_code == 200
        posts = r.json()
        assert any(p["post_id"] == _state["post_id"] for p in posts)


# ---------- User search / profile ----------
class TestUsers:
    def test_search_users(self, api, auth_headers):
        r = api.get(f"{BASE_URL}/api/users/search?q=tester", headers=auth_headers)
        assert r.status_code == 200
        users = r.json()
        _no_underscore_id(users)
        # Should find tester_new (previously updated) or fallback name
        assert any(u.get("username") in ("tester_new", "tester1") or "test" in (u.get("name","").lower())
                   for u in users)

    def test_get_user_profile(self, api, auth_headers):
        r = api.get(f"{BASE_URL}/api/users/{TEST_USER_ID}", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        _no_underscore_id(data)
        assert data["user_id"] == TEST_USER_ID
        assert "post_count" in data
        assert data["post_count"] >= 1
        # email should be excluded
        assert "email" not in data

    def test_user_posts(self, api, auth_headers):
        r = api.get(f"{BASE_URL}/api/posts/user/{TEST_USER_ID}", headers=auth_headers)
        assert r.status_code == 200
        posts = r.json()
        _no_underscore_id(posts)
        assert len(posts) >= 1
        assert all(p["author_id"] == TEST_USER_ID for p in posts)


# ---------- Logout (must run last) ----------
class TestLogoutLast:
    def test_zzz_logout(self, api, auth_headers):
        r = api.post(f"{BASE_URL}/api/auth/logout", headers=auth_headers)
        assert r.status_code == 200
        assert r.json().get("ok") is True

    def test_zzz_me_after_logout(self, api, auth_headers):
        r = api.get(f"{BASE_URL}/api/auth/me", headers=auth_headers)
        assert r.status_code == 401
