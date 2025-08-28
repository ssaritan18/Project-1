from fastapi import FastAPI, APIRouter, HTTPException, Header, Depends, Request, Query, WebSocket, WebSocketDisconnect
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Set
import uuid
from datetime import datetime, timezone, timedelta, date
import base64
import requests
from jose import jwt, JWTError
from passlib.context import CryptContext

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
JWT_SECRET = os.getenv("JWT_SECRET", "devsecret")
ALGO = "HS256"
ACCESS_EXPIRES_DAYS = 7
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Create the main app without a prefix
app = FastAPI(title="ADHDers API", version="0.3.1")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# --- WebSocket connection store ---
CONNECTIONS: Dict[str, Set[WebSocket]] = {}
ONLINE: Set[str] = set()

async def ws_broadcast_to_user(user_id: str, payload: Dict[str, Any]):
  conns = CONNECTIONS.get(user_id)
  logger.info(f"🔔 Broadcasting to user {user_id}: {payload}. Active connections: {len(conns) if conns else 0}")
  if not conns:
    logger.warning(f"❌ No WebSocket connections found for user {user_id}")
    return
  dead = []
  sent_count = 0
  for ws in list(conns):
    try:
      await ws.send_json(payload)
      sent_count += 1
      logger.info(f"✅ Message sent to WebSocket connection for user {user_id}")
    except Exception as e:
      logger.error(f"❌ Failed to send to WebSocket for user {user_id}: {e}")
      dead.append(ws)
  for d in dead:
    try:
      conns.remove(d)
    except Exception:
      pass
  logger.info(f"📊 Broadcast summary for user {user_id}: {sent_count} sent, {len(dead)} dead connections removed")

async def ws_broadcast_to_friends(user_id: str, payload: Dict[str, Any]):
  user = await db.users.find_one({"_id": user_id})
  if not user:
    return
  friends = user.get("friends", [])
  for fid in friends:
    await ws_broadcast_to_user(fid, payload)

async def ws_set_presence(user_id: str, online: bool):
  if online:
    ONLINE.add(user_id)
  else:
    if user_id in ONLINE:
      ONLINE.remove(user_id)
  await ws_broadcast_to_friends(user_id, {"type": "presence:update", "user_id": user_id, "online": online})

# Utils

def now_iso():
    return datetime.now(timezone.utc).isoformat()

def today_str() -> str:
    return date.today().isoformat()

async def get_or_create_user_by_google(google_payload: Dict[str, Any]):
    sub = google_payload.get("sub")
    if not sub:
        raise HTTPException(status_code=400, detail="Invalid Google token: missing sub")

    user = await db.users.find_one({"google_sub": sub})
    if user:
        return user

    photo_b64 = None
    picture_url = google_payload.get("picture")
    if picture_url:
        try:
            resp = requests.get(picture_url, timeout=10)
            if resp.status_code == 200:
                photo_b64 = base64.b64encode(resp.content).decode('utf-8')
        except Exception:
            photo_b64 = None

    new_user = {
        "_id": str(uuid.uuid4()),
        "google_sub": sub,
        "email": google_payload.get("email"),
        "name": google_payload.get("name") or "User",
        "photo_base64": photo_b64,
        "palette": {"primary": "#A3C9FF", "secondary": "#FFCFE1", "accent": "#B8F1D9"},
        "friends": [],
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.users.insert_one(new_user)
    return new_user

# JWT helpers
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

def create_access_token(sub: str, email: Optional[str] = None) -> str:
    payload = {
        "sub": sub,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=ACCESS_EXPIRES_DAYS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=ALGO)

async def get_current_user(authorization: str = Header(default=None)):
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = authorization.split(" ", 1)[1]
    try:
        data = jwt.decode(token, JWT_SECRET, algorithms=[ALGO])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user_id = data.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    user = await db.users.find_one({"_id": user_id})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

# MODELS
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

class GoogleAuthRequest(BaseModel):
    id_token: str

class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    photo_base64: Optional[str] = None
    palette: Optional[Dict[str, str]] = None

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class PostCreate(BaseModel):
    text: str

class ReactionReq(BaseModel):
    type: str

class CreateChatReq(BaseModel):
    title: str

class JoinByCodeReq(BaseModel):
    code: str

class FriendRequestReq(BaseModel):
    to_email: str

class FriendAcceptReq(BaseModel):
    request_id: str

class FriendRejectReq(BaseModel):
    request_id: str

# ROUTES
@api_router.get("/")
async def root():
    return {"message": "ADHDers API running"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_obj = StatusCheck(client_name=input.client_name)
    await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**sc) for sc in status_checks]

# --- DEV: Seed demo users and requests ---
@api_router.post("/dev/seed-demo")
async def seed_demo(user=Depends(get_current_user)):
    async def ensure_user(name: str, email: str, password: str) -> str:
        u = await db.users.find_one({"email": email.lower()})
        if u:
            return u["_id"]
        uid = str(uuid.uuid4())
        doc = {
            "_id": uid,
            "email": email.lower(),
            "name": name,
            "password_hash": pwd_context.hash(password),
            "palette": {"primary": "#A3C9FF", "secondary": "#FFCFE1", "accent": "#B8F1D9"},
            "friends": [],
            "created_at": now_iso(),
            "updated_at": now_iso(),
        }
        await db.users.insert_one(doc)
        return uid

    a_id = await ensure_user("ssaritan", "ssaritan@example.com", "Passw0rd!")
    b_id = await ensure_user("ssaritan2", "ssaritan2@example.com", "Passw0rd!")
    c_id = await ensure_user("TestUser456", "testuser456@example.com", "Passw0rd!")

    # Create pending requests: A -> B, C -> A
    async def mk_req(from_id: str, to_id: str):
        existing = await db.friend_requests.find_one({"from_user_id": from_id, "to_user_id": to_id, "status": "pending"})
        if existing:
            return existing["_id"]
        rid = str(uuid.uuid4())
        fr = {"_id": rid, "from_user_id": from_id, "to_user_id": to_id, "status": "pending", "created_at": now_iso()}
        await db.friend_requests.insert_one(fr)
        # Push realtime to recipient
        fu = await db.users.find_one({"_id": from_id})
        await ws_broadcast_to_user(to_id, {"type": "friend_request:incoming", "request_id": rid, "from": {"id": from_id, "name": fu.get("name"), "email": fu.get("email")}})
        return rid

    r1 = await mk_req(a_id, b_id)
    r2 = await mk_req(c_id, a_id)

    return {
        "seeded": True,
        "users": [
            {"name": "ssaritan", "email": "ssaritan@example.com", "password": "Passw0rd!"},
            {"name": "ssaritan2", "email": "ssaritan2@example.com", "password": "Passw0rd!"},
            {"name": "TestUser456", "email": "testuser456@example.com", "password": "Passw0rd!"},
        ],
        "requests": [r1, r2],
    }

# --- DEV: List all users for debugging ---
@api_router.get("/dev/users")
async def list_users():
    users = await db.users.find({}, {"password_hash": 0}).to_list(100)
    return {"users": users}

# --- WebSocket endpoint ---
@api_router.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    token = ws.query_params.get("token")
    logger.info(f"🔌 New WebSocket connection attempt. Token provided: {bool(token)}")
    if not token:
        logger.warning("❌ WebSocket rejected: No token provided")
        await ws.close(code=4401)
        return
    try:
        data = jwt.decode(token, JWT_SECRET, algorithms=[ALGO])
        user_id = data.get("sub")
        if not user_id:
            logger.warning("❌ WebSocket rejected: No user_id in token")
            await ws.close(code=4401)
            return
    except JWTError as e:
        logger.warning(f"❌ WebSocket rejected: JWT error - {e}")
        await ws.close(code=4401)
        return
    
    logger.info(f"✅ WebSocket accepted for user {user_id}")
    await ws.accept()
    
    if user_id not in CONNECTIONS:
        CONNECTIONS[user_id] = set()
        logger.info(f"🆕 Created new connection set for user {user_id}")
    
    CONNECTIONS[user_id].add(ws)
    logger.info(f"📊 User {user_id} now has {len(CONNECTIONS[user_id])} active WebSocket connections")
    
    await ws_set_presence(user_id, True)
    user = await db.users.find_one({"_id": user_id})
    friends = user.get("friends", []) if user else []
    online_map = {fid: (fid in ONLINE) for fid in friends}
    try:
        await ws.send_json({"type": "presence:bulk", "online": online_map})
        logger.info(f"📨 Sent initial presence:bulk to user {user_id}")
    except Exception as e:
        logger.error(f"❌ Failed to send initial presence:bulk to user {user_id}: {e}")
    
    try:
        while True:
            msg = await ws.receive_text()
            if msg == "ping":
                await ws.send_text("pong")
                logger.debug(f"🏓 Ping-pong with user {user_id}")
    except WebSocketDisconnect:
        logger.info(f"🔌 WebSocket disconnected for user {user_id}")
        try:
            CONNECTIONS.get(user_id, set()).discard(ws)
            remaining = len(CONNECTIONS.get(user_id, set()))
            logger.info(f"📊 User {user_id} now has {remaining} active WebSocket connections")
        except Exception as e:
            logger.error(f"❌ Error removing WebSocket for user {user_id}: {e}")
        await ws_set_presence(user_id, False)

# --- Auth (Google) ---
@api_router.post("/auth/google")
async def auth_google(payload: GoogleAuthRequest):
    tokeninfo_url = f"https://oauth2.googleapis.com/tokeninfo?id_token={payload.id_token}"
    r = requests.get(tokeninfo_url, timeout=10)
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid Google id_token")
    data = r.json()
    user = await get_or_create_user_by_google(data)
    access = create_access_token(sub=user["_id"], email=user.get("email"))
    return {"access_token": access, "token_type": "bearer"}

# --- Auth (Email+Password) ---
@api_router.post("/auth/register", response_model=Token)
async def auth_register(req: RegisterRequest):
    existing = await db.users.find_one({"email": req.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    uid = str(uuid.uuid4())
    doc = {
        "_id": uid,
        "email": req.email.lower(),
        "name": req.name,
        "password_hash": pwd_context.hash(req.password),
        "palette": {"primary": "#A3C9FF", "secondary": "#FFCFE1", "accent": "#B8F1D9"},
        "friends": [],
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.users.insert_one(doc)
    access = create_access_token(sub=uid, email=doc["email"])
    return Token(access_token=access)

@api_router.post("/auth/login", response_model=Token)
async def auth_login(req: LoginRequest):
    user = await db.users.find_one({"email": req.email.lower()})
    if not user or not user.get("password_hash"):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not pwd_context.verify(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    access = create_access_token(sub=user["_id"], email=user.get("email"))
    return Token(access_token=access)

# --- Users ---
@api_router.get("/me")
async def get_me(user=Depends(get_current_user)):
    uid = user["_id"]
    t = today_str()
    tasks = await db.tasks.find({"user_id": uid, "date": t}).to_list(500)
    total_goal = sum(int(task.get("goal", 0)) for task in tasks)
    total_progress = sum(int(task.get("progress", 0)) for task in tasks)
    daily_ratio = (total_progress / total_goal) if total_goal else 0
    return {
        "_id": uid,
        "name": user.get("name"),
        "email": user.get("email"),
        "photo_base64": user.get("photo_base64"),
        "palette": user.get("palette"),
        "today": {"total_goal": total_goal, "total_progress": total_progress, "ratio": daily_ratio},
    }

@api_router.patch("/me")
async def update_me(update: UserProfileUpdate, user=Depends(get_current_user)):
    updates: Dict[str, Any] = {k: v for k, v in update.model_dump().items() if v is not None}
    if not updates:
        return {"updated": False}
    updates["updated_at"] = now_iso()
    await db.users.update_one({"_id": user["_id"]}, {"$set": updates})
    user = await db.users.find_one({"_id": user["_id"]})
    return {"updated": True, "user": user}

# --- Friends (unchanged endpoints below) ---
@api_router.get("/friends/find")
async def friends_find(q: str = Query(..., min_length=1), user=Depends(get_current_user)):
    query = q.strip()
    if "@" in query:
        u = await db.users.find_one({"email": query.lower()})
        if not u:
            raise HTTPException(status_code=404, detail="User not found")
        return {"user": {"_id": u["_id"], "name": u.get("name"), "email": u.get("email")}}
    cursor = db.users.find({"name": {"$regex": query, "$options": "i"}}).limit(2)
    items = await cursor.to_list(2)
    if not items:
        raise HTTPException(status_code=404, detail="User not found")
    if len(items) > 1:
        u = items[0]
        return {"user": {"_id": u["_id"], "name": u.get("name"), "email": u.get("email")}, "ambiguous": True}
    u = items[0]
    return {"user": {"_id": u["_id"], "name": u.get("name"), "email": u.get("email")}}

@api_router.post("/friends/request")
async def create_friend_request(payload: FriendRequestReq, user=Depends(get_current_user)):
    to = await db.users.find_one({"email": payload.to_email.lower()})
    if not to:
        raise HTTPException(status_code=404, detail="User not found")
    if to["_id"] == user["_id"]:
        raise HTTPException(status_code=400, detail="Cannot add yourself")
    existing = await db.friend_requests.find_one({"from_user_id": user["_id"], "to_user_id": to["_id"], "status": "pending"})
    if existing:
        return existing
    fr = {
        "_id": str(uuid.uuid4()),
        "from_user_id": user["_id"],
        "to_user_id": to["_id"],
        "status": "pending",
        "created_at": now_iso(),
    }
    await db.friend_requests.insert_one(fr)
    logger.info(f"📤 Friend request created: {user['_id']} -> {to['_id']} (request_id: {fr['_id']})")
    
    fu = await db.users.find_one({"_id": user["_id"]})
    payload_data = {"type": "friend_request:incoming", "request_id": fr["_id"], "from": {"id": user["_id"], "name": fu.get("name"), "email": fu.get("email")}}
    logger.info(f"📡 About to broadcast friend request to user {to['_id']}: {payload_data}")
    await ws_broadcast_to_user(to["_id"], payload_data)
    logger.info(f"✅ Friend request broadcast completed for user {to['_id']}")
    
    return fr

@api_router.post("/friends/accept")
async def accept_friend_request(payload: FriendAcceptReq, user=Depends(get_current_user)):
    fr = await db.friend_requests.find_one({"_id": payload.request_id})
    if not fr or fr.get("to_user_id") != user["_id"]:
        raise HTTPException(status_code=404, detail="Request not found")
    await db.friend_requests.update_one({"_id": fr["_id"]}, {"$set": {"status": "accepted", "updated_at": now_iso()}})
    await db.users.update_one({"_id": user["_id"]}, {"$addToSet": {"friends": fr["from_user_id"]}})
    await db.users.update_one({"_id": fr["from_user_id"]}, {"$addToSet": {"friends": user["_id"]}})
    await ws_broadcast_to_user(fr["from_user_id"], {"type": "friend_request:accepted", "by": {"id": user["_id"], "name": user.get("name"), "email": user.get("email")}})
    await ws_broadcast_to_friends(user["_id"], {"type": "friends:list:update"})
    await ws_broadcast_to_friends(fr["from_user_id"], {"type": "friends:list:update"})
    return {"accepted": True}

@api_router.post("/friends/reject")
async def reject_friend_request(payload: FriendRejectReq, user=Depends(get_current_user)):
    fr = await db.friend_requests.find_one({"_id": payload.request_id})
    if not fr or fr.get("to_user_id") != user["_id"]:
        raise HTTPException(status_code=404, detail="Request not found")
    await db.friend_requests.update_one({"_id": fr["_id"]}, {"$set": {"status": "rejected", "updated_at": now_iso()}})
    await ws_broadcast_to_user(fr["from_user_id"], {"type": "friend_request:rejected", "by": {"id": user["_id"], "name": user.get("name"), "email": user.get("email")}})
    return {"rejected": True}

@api_router.get("/friends/list")
async def friends_list(user=Depends(get_current_user)):
    ids = user.get("friends", [])
    items = []
    if ids:
        items = await db.users.find({"_id": {"$in": ids}}).to_list(200)
    return {"friends": [{"_id": u["_id"], "name": u.get("name"), "email": u.get("email") } for u in items]}

@api_router.get("/friends/requests")
async def friends_requests(user=Depends(get_current_user)):
    reqs = await db.friend_requests.find({"to_user_id": user["_id"], "status": "pending"}).sort("created_at", -1).to_list(200)
    results = []
    for r in reqs:
        fu = await db.users.find_one({"_id": r["from_user_id"]})
        results.append({
            "_id": r["_id"],
            "from_user_id": r["from_user_id"],
            "from_name": fu.get("name") if fu else None,
            "from_email": fu.get("email") if fu else None,
            "created_at": r.get("created_at"),
        })
    return {"requests": results}

# --- Posts, Chats unchanged below ---
@api_router.get("/posts/feed")
async def posts_feed(limit: int = 50, user=Depends(get_current_user)):
    posts = await db.posts.find().sort("created_at", -1).limit(limit).to_list(limit)
    return {"posts": posts}

@api_router.post("/posts")
async def create_post(payload: PostCreate, user=Depends(get_current_user)):
    doc = {
        "_id": str(uuid.uuid4()),
        "author_id": user["_id"],
        "author_name": user.get("name"),
        "text": payload.text,
        "reactions": {"like": 0, "heart": 0, "clap": 0, "star": 0},
        "created_at": now_iso(),
    }
    await db.posts.insert_one(doc)
    return doc

@api_router.post("/posts/{post_id}/react")
async def react_post(post_id: str, payload: ReactionReq, user=Depends(get_current_user)):
    if payload.type not in ["like", "heart", "clap", "star"]:
        raise HTTPException(status_code=400, detail="Invalid reaction type")
    await db.posts.update_one({"_id": post_id}, {"$inc": {f"reactions.{payload.type}": 1}})
    post = await db.posts.find_one({"_id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post

@api_router.post("/chats")
async def create_chat(payload: CreateChatReq, user=Depends(get_current_user)):
    code = uuid.uuid4().hex[:6].upper()
    doc = {
        "_id": str(uuid.uuid4()),
        "title": payload.title,
        "members": [user["_id"]],
        "invite_code": code,
        "created_at": now_iso(),
    }
    await db.chats.insert_one(doc)
    return doc

@api_router.post("/chats/join")
async def join_chat(payload: JoinByCodeReq, user=Depends(get_current_user)):
    chat = await db.chats.find_one({"invite_code": payload.code.upper()})
    if not chat:
        raise HTTPException(status_code=404, detail="Invalid code")
    await db.chats.update_one({"_id": chat["_id"]}, {"$addToSet": {"members": user["_id"]}})
    chat = await db.chats.find_one({"_id": chat["_id"]})
    return chat

@api_router.get("/chats")
async def list_chats(user=Depends(get_current_user)):
    chats = await db.chats.find({"members": user["_id"]}).sort("created_at", -1).to_list(200)
    return {"chats": chats}

@api_router.get("/chats/{chat_id}/messages")
async def list_messages(chat_id: str, limit: int = 50, user=Depends(get_current_user)):
    chat = await db.chats.find_one({"_id": chat_id, "members": user["_id"]})
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    msgs = await db.messages.find({"chat_id": chat_id}).sort("created_at", -1).limit(limit).to_list(limit)
    return {"messages": list(reversed(msgs))}

@api_router.post("/chats/{chat_id}/messages")
async def send_message(chat_id: str, payload: PostCreate, user=Depends(get_current_user)):
    chat = await db.chats.find_one({"_id": chat_id, "members": user["_id"]})
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    msg = {
        "_id": str(uuid.uuid4()),
        "chat_id": chat_id,
        "author_id": user["_id"],
        "author_name": user.get("name"),
        "text": payload.text,
        "reactions": {"like": 0, "heart": 0, "clap": 0, "star": 0},
        "created_at": now_iso(),
    }
    await db.messages.insert_one(msg)
    return msg

@api_router.post("/chats/messages/{message_id}/react")
async def react_message(message_id: str, payload: ReactionReq, user=Depends(get_current_user)):
    if payload.type not in ["like", "heart", "clap", "star"]:
        raise HTTPException(status_code=400, detail="Invalid reaction type")
    msg = await db.messages.find_one({"_id": message_id})
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    chat = await db.chats.find_one({"_id": msg["chat_id"], "members": user["_id"]})
    if not chat:
        raise HTTPException(status_code=403, detail="No access to chat")
    await db.messages.update_one({"_id": message_id}, {"$inc": {f"reactions.{payload.type}": 1}})
    msg = await db.messages.find_one({"_id": message_id})
    return msg

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()