"""Tests for new follow endpoints and expanded user profile schema (iteration 4)."""
import os
import pytest
import requests
from pathlib import Path
from dotenv import dotenv_values

_v = dotenv_values("/app/frontend/.env")
BASE_URL = _v["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")

# Seeded debug session
DBG_TOKEN = "dbg_tok"
U1 = "user_dbg1"  # Priya
U2 = "user_dbg2"  # Rajesh
U3 = "user_dbg3"  # Anita


def _hdr(token=DBG_TOKEN):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


def _no_id(o):
    if isinstance(o, dict):
        assert "_id" not in o
        for v in o.values():
            _no_id(v)
    elif isinstance(o, list):
        for v in o:
            _no_id(v)


class TestSelfProfileSchema:
    def test_get_self_profile_has_new_fields(self):
        r = requests.get(f"{BASE_URL}/api/users/{U1}", headers=_hdr())
        assert r.status_code == 200, r.text
        d = r.json()
        _no_id(d)
        assert d["user_id"] == U1
        assert d["username"] == "priya_s"
        assert d["name"] == "Priya Sharma"
        assert "email" not in d
        # New fields
        assert d.get("post_count") == 3
        assert d.get("follower_count") == 2
        assert d.get("following_count") == 0
        assert d.get("is_self") is True
        assert d.get("is_following") is False


class TestOtherUserProfile:
    def test_get_other_user_before_follow(self):
        r = requests.get(f"{BASE_URL}/api/users/{U3}", headers=_hdr())
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["user_id"] == U3
        assert d["username"] == "anita_m"
        assert d["is_self"] is False
        assert d["is_following"] is False  # not followed initially
        assert d.get("post_count") == 0

    def test_get_user_404(self):
        r = requests.get(f"{BASE_URL}/api/users/does_not_exist_xyz", headers=_hdr())
        assert r.status_code == 404


class TestFollowersFollowing:
    def test_followers_of_priya(self):
        r = requests.get(f"{BASE_URL}/api/users/{U1}/followers", headers=_hdr())
        assert r.status_code == 200
        users = r.json()
        _no_id(users)
        assert isinstance(users, list)
        ids = {u["user_id"] for u in users}
        assert ids == {U2, U3}
        # ensure email excluded
        for u in users:
            assert "email" not in u

    def test_following_of_priya_empty(self):
        r = requests.get(f"{BASE_URL}/api/users/{U1}/following", headers=_hdr())
        assert r.status_code == 200
        assert r.json() == []

    def test_following_of_rajesh_has_priya(self):
        r = requests.get(f"{BASE_URL}/api/users/{U2}/following", headers=_hdr())
        assert r.status_code == 200
        ids = {u["user_id"] for u in r.json()}
        assert U1 in ids


class TestFollowToggle:
    def test_cannot_follow_self(self):
        r = requests.post(f"{BASE_URL}/api/users/{U1}/follow", headers=_hdr())
        assert r.status_code == 400

    def test_follow_unfollow_anita(self):
        # Follow Anita
        r = requests.post(f"{BASE_URL}/api/users/{U3}/follow", headers=_hdr())
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["is_following"] is True
        assert d["follower_count"] == 1

        # Verify via user profile
        r2 = requests.get(f"{BASE_URL}/api/users/{U3}", headers=_hdr())
        assert r2.status_code == 200
        assert r2.json()["is_following"] is True
        assert r2.json()["follower_count"] == 1

        # Verify Priya's following list now contains Anita
        r3 = requests.get(f"{BASE_URL}/api/users/{U1}/following", headers=_hdr())
        assert r3.status_code == 200
        assert any(u["user_id"] == U3 for u in r3.json())

        # Unfollow (toggle)
        r4 = requests.post(f"{BASE_URL}/api/users/{U3}/follow", headers=_hdr())
        assert r4.status_code == 200
        d4 = r4.json()
        assert d4["is_following"] is False
        assert d4["follower_count"] == 0

        # Verify
        r5 = requests.get(f"{BASE_URL}/api/users/{U3}", headers=_hdr())
        assert r5.json()["is_following"] is False

    def test_follow_nonexistent_user(self):
        r = requests.post(f"{BASE_URL}/api/users/nope_xxx/follow", headers=_hdr())
        assert r.status_code == 404


class TestUnauthorized:
    def test_follow_requires_auth(self):
        r = requests.post(f"{BASE_URL}/api/users/{U3}/follow")
        assert r.status_code == 401

    def test_followers_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/users/{U1}/followers")
        assert r.status_code == 401


class TestSearchUsers:
    def test_search_priya(self):
        r = requests.get(f"{BASE_URL}/api/users/search?q=priya", headers=_hdr())
        assert r.status_code == 200
        users = r.json()
        assert any(u["user_id"] == U1 for u in users)
