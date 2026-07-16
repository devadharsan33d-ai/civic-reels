from fastapi import FastAPI, APIRouter, HTTPException, Header, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import httpx
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

EMERGENT_SESSION_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"

# ---------- Models ----------
class SessionRequest(BaseModel):
    session_id: str

class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    username: Optional[str] = None
    country: Optional[str] = None
    state: Optional[str] = None
    slogan: Optional[str] = None

class PostCreate(BaseModel):
    image_base64: str  # base64 data URI or raw base64
    description: str
    category: str
    tagged_usernames: List[str] = []

class CommentCreate(BaseModel):
    text: str

class UserPublic(BaseModel):
    user_id: str
    email: str
    name: str
    username: Optional[str] = None
    country: Optional[str] = None
    state: Optional[str] = None
    slogan: Optional[str] = None
    picture: Optional[str] = None
    onboarded: bool = False

# ---------- Helpers ----------
def now_utc() -> datetime:
    return datetime.now(timezone.utc)

def ensure_aware(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt

async def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = authorization.split(" ", 1)[1].strip()
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    expires_at = ensure_aware(session["expires_at"])
    if expires_at < now_utc():
        raise HTTPException(status_code=401, detail="Session expired")
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

async def enrich_post(post: dict, current_user_id: Optional[str] = None) -> dict:
    author = await db.users.find_one({"user_id": post["author_id"]}, {"_id": 0})
    like_count = await db.likes.count_documents({"post_id": post["post_id"]})
    comment_count = await db.comments.count_documents({"post_id": post["post_id"]})
    liked = False
    if current_user_id:
        liked = bool(await db.likes.find_one({"post_id": post["post_id"], "user_id": current_user_id}, {"_id": 0}))
    post["author"] = {
        "user_id": author.get("user_id") if author else post["author_id"],
        "username": author.get("username") if author else None,
        "name": author.get("name") if author else "Unknown",
        "picture": author.get("picture") if author else None,
    }
    post["like_count"] = like_count
    post["comment_count"] = comment_count
    post["liked"] = liked
    return post

# ---------- Auth ----------
@api_router.post("/auth/session")
async def create_session(payload: SessionRequest):
    """Exchange session_id from Emergent redirect for a persistent session token."""
    async with httpx.AsyncClient(timeout=15.0) as http:
        r = await http.get(EMERGENT_SESSION_URL, headers={"X-Session-ID": payload.session_id})
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid session_id")
    data = r.json()
    email = data["email"]
    name = data.get("name") or email.split("@")[0]
    picture = data.get("picture")
    session_token = data["session_token"]

    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": name, "picture": picture, "last_login": now_utc()}},
        )
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": name,
            "username": None,
            "country": None,
            "state": None,
            "slogan": None,
            "picture": picture,
            "onboarded": False,
            "created_at": now_utc(),
            "last_login": now_utc(),
        })

    await db.user_sessions.insert_one({
        "session_token": session_token,
        "user_id": user_id,
        "created_at": now_utc(),
        "expires_at": now_utc() + timedelta(days=7),
    })

    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return {"session_token": session_token, "user": user}

@api_router.get("/auth/me")
async def auth_me(authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization)
    return user

@api_router.post("/auth/logout")
async def logout(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        return {"ok": True}
    token = authorization.split(" ", 1)[1].strip()
    await db.user_sessions.delete_one({"session_token": token})
    return {"ok": True}

# ---------- Users ----------
@api_router.put("/users/profile")
async def update_profile(payload: UserProfileUpdate, authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization)
    update = {k: v for k, v in payload.dict().items() if v is not None}
    if "username" in update:
        uname = update["username"].strip().lower().replace(" ", "_")
        if not uname:
            raise HTTPException(status_code=400, detail="Username cannot be empty")
        existing = await db.users.find_one({"username": uname, "user_id": {"$ne": user["user_id"]}}, {"_id": 0})
        if existing:
            raise HTTPException(status_code=409, detail="Username already taken")
        update["username"] = uname
    if update.get("username") and not user.get("onboarded"):
        update["onboarded"] = True
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": update})
    updated = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return updated

@api_router.get("/users/search")
async def search_users(q: str = Query(""), authorization: Optional[str] = Header(None)):
    await get_current_user(authorization)
    if not q.strip():
        return []
    pattern = {"$regex": q.strip(), "$options": "i"}
    cursor = db.users.find(
        {"$or": [{"username": pattern}, {"name": pattern}]},
        {"_id": 0, "email": 0}
    ).limit(30)
    results = await cursor.to_list(30)
    return results

@api_router.get("/users/{user_id}")
async def get_user(user_id: str, authorization: Optional[str] = Header(None)):
    current = await get_current_user(authorization)
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "email": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    post_count = await db.posts.count_documents({"author_id": user_id})
    follower_count = await db.follows.count_documents({"followee_id": user_id})
    following_count = await db.follows.count_documents({"follower_id": user_id})
    is_following = False
    if current["user_id"] != user_id:
        is_following = bool(
            await db.follows.find_one(
                {"follower_id": current["user_id"], "followee_id": user_id}, {"_id": 0}
            )
        )
    user["post_count"] = post_count
    user["follower_count"] = follower_count
    user["following_count"] = following_count
    user["is_following"] = is_following
    user["is_self"] = current["user_id"] == user_id
    return user

@api_router.post("/users/{user_id}/follow")
async def follow_user(user_id: str, authorization: Optional[str] = Header(None)):
    current = await get_current_user(authorization)
    if current["user_id"] == user_id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")
    target = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    existing = await db.follows.find_one(
        {"follower_id": current["user_id"], "followee_id": user_id}, {"_id": 0}
    )
    if existing:
        await db.follows.delete_one({"follower_id": current["user_id"], "followee_id": user_id})
        is_following = False
    else:
        await db.follows.insert_one({
            "follower_id": current["user_id"],
            "followee_id": user_id,
            "created_at": now_utc(),
        })
        is_following = True
    follower_count = await db.follows.count_documents({"followee_id": user_id})
    return {"is_following": is_following, "follower_count": follower_count}

@api_router.get("/users/{user_id}/followers")
async def list_followers(user_id: str, authorization: Optional[str] = Header(None)):
    await get_current_user(authorization)
    cursor = db.follows.find({"followee_id": user_id}, {"_id": 0}).sort("created_at", -1)
    rows = await cursor.to_list(500)
    ids = [r["follower_id"] for r in rows]
    users = await db.users.find(
        {"user_id": {"$in": ids}}, {"_id": 0, "email": 0}
    ).to_list(500)
    return users

@api_router.get("/users/{user_id}/following")
async def list_following(user_id: str, authorization: Optional[str] = Header(None)):
    await get_current_user(authorization)
    cursor = db.follows.find({"follower_id": user_id}, {"_id": 0}).sort("created_at", -1)
    rows = await cursor.to_list(500)
    ids = [r["followee_id"] for r in rows]
    users = await db.users.find(
        {"user_id": {"$in": ids}}, {"_id": 0, "email": 0}
    ).to_list(500)
    return users

# ---------- Posts ----------
@api_router.post("/posts")
async def create_post(payload: PostCreate, authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization)
    if not user.get("onboarded"):
        raise HTTPException(status_code=400, detail="Please complete your profile first")
    post_id = f"post_{uuid.uuid4().hex[:12]}"
    doc = {
        "post_id": post_id,
        "author_id": user["user_id"],
        "image_base64": payload.image_base64,
        "description": payload.description,
        "category": payload.category.lower(),
        "tagged_usernames": [t.lower().lstrip("@") for t in payload.tagged_usernames],
        "created_at": now_utc(),
    }
    await db.posts.insert_one(doc)
    doc.pop("_id", None)
    doc = await enrich_post(doc, user["user_id"])
    return doc

@api_router.get("/posts/feed")
async def get_feed(skip: int = 0, limit: int = 20, authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization)
    cursor = db.posts.find({}, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit)
    posts = await cursor.to_list(limit)
    enriched = [await enrich_post(p, user["user_id"]) for p in posts]
    return enriched

@api_router.get("/posts/search")
async def search_posts(
    q: str = Query(""),
    category: str = Query(""),
    authorization: Optional[str] = Header(None),
):
    user = await get_current_user(authorization)
    query = {}
    if category.strip():
        query["category"] = category.strip().lower()
    if q.strip():
        query["description"] = {"$regex": q.strip(), "$options": "i"}
    cursor = db.posts.find(query, {"_id": 0}).sort("created_at", -1).limit(60)
    posts = await cursor.to_list(60)
    enriched = [await enrich_post(p, user["user_id"]) for p in posts]
    return enriched

@api_router.get("/posts/user/{user_id}")
async def user_posts(user_id: str, authorization: Optional[str] = Header(None)):
    current = await get_current_user(authorization)
    cursor = db.posts.find({"author_id": user_id}, {"_id": 0}).sort("created_at", -1).limit(100)
    posts = await cursor.to_list(100)
    enriched = [await enrich_post(p, current["user_id"]) for p in posts]
    return enriched

@api_router.get("/posts/{post_id}")
async def get_post(post_id: str, authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization)
    post = await db.posts.find_one({"post_id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return await enrich_post(post, user["user_id"])

@api_router.delete("/posts/{post_id}")
async def delete_post(post_id: str, authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization)

    post = await db.posts.find_one({"post_id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    if post["author_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="You can only delete your own posts")

    await db.posts.delete_one({"post_id": post_id})
    await db.likes.delete_many({"post_id": post_id})
    await db.comments.delete_many({"post_id": post_id})

    return {"message": "Post deleted successfully"}

@api_router.post("/posts/{post_id}/like")
async def toggle_like(post_id: str, authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization)
    existing = await db.likes.find_one({"post_id": post_id, "user_id": user["user_id"]}, {"_id": 0})
    if existing:
        await db.likes.delete_one({"post_id": post_id, "user_id": user["user_id"]})
        liked = False
    else:
        await db.likes.insert_one({
            "post_id": post_id,
            "user_id": user["user_id"],
            "created_at": now_utc(),
        })
        liked = True
    count = await db.likes.count_documents({"post_id": post_id})
    return {"liked": liked, "like_count": count}

@api_router.post("/posts/{post_id}/comments")
async def add_comment(post_id: str, payload: CommentCreate, authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization)
    text = payload.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Empty comment")
    comment = {
        "comment_id": f"cmt_{uuid.uuid4().hex[:12]}",
        "post_id": post_id,
        "user_id": user["user_id"],
        "username": user.get("username"),
        "name": user.get("name"),
        "picture": user.get("picture"),
        "text": text,
        "created_at": now_utc(),
    }
    await db.comments.insert_one(comment)
    comment.pop("_id", None)
    return comment

@api_router.get("/posts/{post_id}/comments")
async def get_comments(post_id: str, authorization: Optional[str] = Header(None)):
    await get_current_user(authorization)
    cursor = db.comments.find({"post_id": post_id}, {"_id": 0}).sort("created_at", -1).limit(200)
    comments = await cursor.to_list(200)
    return comments

@api_router.get("/categories")
async def categories():
    return [
        {"key": "electricity", "label": "Electricity", "icon": "flash"},
        {"key": "water", "label": "Water", "icon": "water"},
        {"key": "road", "label": "Road", "icon": "car"},
        {"key": "pollution", "label": "Pollution", "icon": "cloud"},
        {"key": "wastage", "label": "Waste", "icon": "trash"},
        {"key": "sanitation", "label": "Sanitation", "icon": "medkit"},
        {"key": "traffic", "label": "Traffic", "icon": "warning"},
        {"key": "safety", "label": "Safety", "icon": "shield"},
        {"key": "corruption", "label": "Corruption", "icon": "alert-circle"},
        {"key": "other", "label": "Other", "icon": "ellipsis-horizontal"},
    ]

@api_router.get("/")
async def root():
    return {"message": "CivicReel API"}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.users.create_index("username")
    await db.user_sessions.create_index("session_token", unique=True)
    await db.user_sessions.create_index("expires_at", expireAfterSeconds=0)
    await db.posts.create_index("post_id", unique=True)
    await db.posts.create_index("author_id")
    await db.posts.create_index("category")
    await db.posts.create_index("created_at")
    await db.likes.create_index([("post_id", 1), ("user_id", 1)], unique=True)
    await db.comments.create_index("post_id")
    await db.follows.create_index([("follower_id", 1), ("followee_id", 1)], unique=True)
    await db.follows.create_index("followee_id")
    await db.follows.create_index("follower_id")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
