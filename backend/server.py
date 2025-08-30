from fastapi import FastAPI, APIRouter, HTTPException, Header, Depends, Request, Query, WebSocket, WebSocketDisconnect
from starlette.websockets import WebSocketState
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import time
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import json
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Set
import uuid
from datetime import datetime, timezone, timedelta, date
import base64
import requests
from jose import jwt, JWTError
from passlib.context import CryptContext
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import jinja2

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

# Email Configuration
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL", "noreply@adhders.com")
EMAIL_ENABLED = bool(SMTP_USERNAME and SMTP_PASSWORD)

# Email Templates
email_template = jinja2.Template("""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{{ subject }}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #A3C9FF; color: #0c0c0c; padding: 20px; text-align: center; }
        .content { padding: 30px; background: #f9f9f9; }
        .button { display: inline-block; background: #A3C9FF; color: #0c0c0c; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>ADHDers Social Club</h1>
        </div>
        <div class="content">
            {{ content | safe }}
        </div>
        <div class="footer">
            <p>This email was sent by ADHDers Social Club</p>
        </div>
    </div>
</body>
</html>
""")

# Email Functions
async def send_email(to_email: str, subject: str, content: str) -> bool:
    """Send email using SMTP"""
    if not EMAIL_ENABLED:
        logger.info(f"📧 [MOCK EMAIL] To: {to_email}")
        logger.info(f"📧 [MOCK EMAIL] Subject: {subject}")
        logger.info(f"📧 [MOCK EMAIL] Content: {content[:100]}...")
        return True  # Return success for mock emails
    
    try:
        logger.info(f"📧 Sending email to {to_email}: {subject}")
        
        # Create message
        message = MIMEMultipart("alternative")
        message["Subject"] = subject
        message["From"] = SMTP_FROM_EMAIL
        message["To"] = to_email
        
        # HTML content
        html_content = email_template.render(subject=subject, content=content)
        html_part = MIMEText(html_content, "html")
        message.attach(html_part)
        
        # Send email
        await aiosmtplib.send(
            message,
            hostname=SMTP_HOST,
            port=SMTP_PORT,
            start_tls=True,
            username=SMTP_USERNAME,
            password=SMTP_PASSWORD,
        )
        
        logger.info(f"✅ Email sent successfully to {to_email}")
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to send email to {to_email}: {e}")
        return False

async def send_verification_email(user_email: str, token: str) -> bool:
    """Send email verification email"""
    # Use environment variable for base URL
    base_url = os.getenv("BASE_URL", "http://localhost:3000")
    verify_url = f"{base_url}/api/auth/verify?token={token}"
    
    content = f"""
    <h2>Welcome to ADHDers Social Club! 🎉</h2>
    <p>Thanks for signing up! Please verify your email address to complete your registration.</p>
    <p>
        <a href="{verify_url}" class="button">Verify Email Address</a>
    </p>
    <p>Or copy and paste this link: <br><code>{verify_url}</code></p>
    <p>This link will expire in 24 hours.</p>
    """
    
    return await send_email(user_email, "Verify Your Email - ADHDers Social Club", content)

async def send_password_reset_email(user_email: str, token: str) -> bool:
    """Send password reset email"""
    base_url = os.getenv("BASE_URL", "http://localhost:3000")
    reset_url = f"{base_url}/auth/reset-password?token={token}"
    
    content = f"""
    <h2>Password Reset Request</h2>
    <p>We received a request to reset your password for ADHDers Social Club.</p>
    <p>
        <a href="{reset_url}" class="button">Reset Password</a>
    </p>
    <p>Or copy and paste this link: <br><code>{reset_url}</code></p>
    <p>This link will expire in 1 hour.</p>
    <p>If you didn't request this, you can safely ignore this email.</p>
    """
    
    return await send_email(user_email, "Reset Your Password - ADHDers Social Club", content)

# Simple rate limiting store
user_request_times: Dict[str, List[float]] = {}
REQUEST_LIMIT_PER_MINUTE = 30  # Allow 30 requests per minute per user
RATE_LIMIT_WINDOW = 60  # 60 seconds

def check_rate_limit(user_id: str) -> bool:
    """Check if user has exceeded rate limit"""
    current_time = time.time()
    
    # Initialize user's request times if not exists
    if user_id not in user_request_times:
        user_request_times[user_id] = []
    
    # Clean old requests outside the window
    user_request_times[user_id] = [
        req_time for req_time in user_request_times[user_id] 
        if current_time - req_time < RATE_LIMIT_WINDOW
    ]
    
    # Check if user exceeds limit
    if len(user_request_times[user_id]) >= REQUEST_LIMIT_PER_MINUTE:
        return False
    
    # Add current request
    user_request_times[user_id].append(current_time)
    return True

# Create the main app without a prefix
app = FastAPI(title="ADHDers API", version="0.3.1")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# --- WebSocket connection store ---
CONNECTIONS: Dict[str, Set[WebSocket]] = {}
ONLINE: Set[str] = set()

async def ws_broadcast_to_user(user_id: str, payload: dict):
    """Broadcast WebSocket message to all connections of a specific user."""
    connections = CONNECTIONS.get(user_id, set())
    logger.info(f"📡 Attempting to broadcast to user {user_id}. Active connections: {len(connections)}")
    
    if not connections:
        logger.warning(f"❌ No WebSocket connections found for user {user_id}. Total users with connections: {len(CONNECTIONS)}")
        # Debug: Show all connected users
        connected_users = list(CONNECTIONS.keys())
        logger.info(f"🔍 Currently connected users: {connected_users}")
        return
    
    # Prepare message payload
    message = json.dumps(payload)
    
    # Send to all active connections for this user
    active_connections = set()
    for ws in list(connections):  # Create a copy to iterate safely
        try:
            if ws.client_state == WebSocketState.CONNECTED:
                await ws.send_text(message)
                active_connections.add(ws)
                logger.info(f"✅ Message sent to user {user_id} connection")
            else:
                logger.warning(f"🔌 Removing disconnected WebSocket for user {user_id}")
                connections.discard(ws)
        except Exception as e:
            logger.error(f"❌ Failed to send WebSocket message to user {user_id}: {e}")
            # Remove failed connection
            connections.discard(ws)
    
    # Update connections list with only active ones
    if active_connections:
        CONNECTIONS[user_id] = active_connections
        logger.info(f"📊 User {user_id} now has {len(active_connections)} active connections")
    else:
        # Remove user from connections if no active connections remain
        if user_id in CONNECTIONS:
            del CONNECTIONS[user_id]
            logger.info(f"🗑️ Removed user {user_id} from connections (no active connections)")
    
    logger.info(f"📡 Broadcast completed for user {user_id}. Message type: {payload.get('type', 'unknown')}")

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
    image_url: Optional[str] = None
    attachments: Optional[List[str]] = None  # URLs for images, videos, etc.
    tags: Optional[List[str]] = None
    visibility: str = "friends"  # "public", "friends", "private"

class PostUpdate(BaseModel):
    text: Optional[str] = None
    image_url: Optional[str] = None
    attachments: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    visibility: Optional[str] = None

class PostReaction(BaseModel):
    type: str  # "like", "heart", "clap", "star"

class CommentCreate(BaseModel):
    text: str
    post_id: str

class MessageCreate(BaseModel):
    text: str
    type: str = "text"  # "text" or "voice" 

class MessageReaction(BaseModel):
    type: str  # "like", "heart", "clap", "star"

class ReactionReq(BaseModel):
    type: str

class CreateChatReq(BaseModel):
    title: str

class ChatCreate(BaseModel):
    title: str

class JoinByCodeReq(BaseModel):
    code: str

class FriendRequestReq(BaseModel):
    to_email: str

class FriendAcceptReq(BaseModel):
    request_id: str

class FriendRejectReq(BaseModel):
    request_id: str

class EmailVerificationRequest(BaseModel):
    email: str

class PasswordResetRequest(BaseModel):
    email: str

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str

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
            
            # Handle simple ping-pong
            if msg == "ping":
                await ws.send_text("pong")
                logger.debug(f"🏓 Simple ping-pong with user {user_id}")
                continue
            
            # Handle JSON messages
            try:
                data = json.loads(msg)
                message_type = data.get("type")
                
                if message_type == "ping":
                    await ws.send_json({"type": "pong"})
                    logger.debug(f"💓 JSON heartbeat ping-pong with user {user_id}")
                else:
                    logger.info(f"📨 WebSocket JSON message from user {user_id}: {message_type}")
                    
            except json.JSONDecodeError:
                logger.debug(f"📨 WebSocket text message from user {user_id}: {msg[:50]}...")
                
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
@api_router.post("/auth/register")
async def auth_register(req: RegisterRequest):
    existing = await db.users.find_one({"email": req.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    uid = str(uuid.uuid4())
    
    # Create verification token (expires in 24 hours)
    verification_token = str(uuid.uuid4())
    expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
    
    doc = {
        "_id": uid,
        "email": req.email.lower(),
        "name": req.name,
        "password_hash": pwd_context.hash(req.password),
        "palette": {"primary": "#A3C9FF", "secondary": "#FFCFE1", "accent": "#B8F1D9"},
        "friends": [],
        "email_verified": False,
        "verification_token": verification_token,
        "verification_expires": expires_at.isoformat(),
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.users.insert_one(doc)
    
    # Send verification email
    email_sent = await send_verification_email(req.email.lower(), verification_token)
    
    if EMAIL_ENABLED and not email_sent:
        logger.warning(f"Failed to send verification email to {req.email}")
    
    return {
        "message": "Registration successful! Please check your email to verify your account.",
        "email_sent": email_sent,
        "user_id": uid
    }

@api_router.get("/auth/verify")
async def verify_email(token: str):
    """Verify email address using token"""
    user = await db.users.find_one({"verification_token": token})
    
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired verification token")
    
    # Check if token is expired
    expires_at = datetime.fromisoformat(user.get("verification_expires", ""))
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=400, detail="Verification token has expired")
    
    # Update user as verified
    await db.users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "email_verified": True,
                "updated_at": now_iso()
            },
            "$unset": {
                "verification_token": "",
                "verification_expires": ""
            }
        }
    )
    
    # Create access token
    access = create_access_token(sub=user["_id"], email=user["email"])
    
    return {
        "message": "Email verified successfully! You are now logged in.",
        "access_token": access,
        "token_type": "bearer"
    }

@api_router.post("/auth/forgot-password")
async def forgot_password(req: PasswordResetRequest):
    """Send password reset email"""
    user = await db.users.find_one({"email": req.email.lower()})
    
    # Always return success message for security (don't reveal if email exists)
    success_message = "If this email exists in our system, you will receive a password reset link shortly."
    
    if not user:
        logger.info(f"Password reset requested for non-existent email: {req.email}")
        return {"message": success_message}
    
    # Create reset token (expires in 1 hour)
    reset_token = str(uuid.uuid4())
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
    
    # Store reset token
    await db.users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "reset_token": reset_token,
                "reset_expires": expires_at.isoformat(),
                "updated_at": now_iso()
            }
        }
    )
    
    # Send reset email
    email_sent = await send_password_reset_email(req.email.lower(), reset_token)
    
    if EMAIL_ENABLED and not email_sent:
        logger.warning(f"Failed to send password reset email to {req.email}")
    
    return {"message": success_message, "email_sent": email_sent}

@api_router.post("/auth/reset-password")
async def reset_password(req: PasswordResetConfirm):
    """Reset password using token"""
    user = await db.users.find_one({"reset_token": req.token})
    
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    # Check if token is expired
    expires_at = datetime.fromisoformat(user.get("reset_expires", ""))
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=400, detail="Reset token has expired")
    
    # Update password and clear reset token
    new_password_hash = pwd_context.hash(req.new_password)
    await db.users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "password_hash": new_password_hash,
                "updated_at": now_iso()
            },
            "$unset": {
                "reset_token": "",
                "reset_expires": ""
            }
        }
    )
    
    logger.info(f"Password reset completed for user: {user['email']}")
    
    return {"message": "Password reset successful! You can now log in with your new password."}

@api_router.post("/auth/login", response_model=Token)
async def auth_login(req: LoginRequest):
    user = await db.users.find_one({"email": req.email.lower()})
    if not user or not user.get("password_hash"):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not pwd_context.verify(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # TEMPORARY: Skip email verification for development
    # TODO: Re-enable email verification when SMTP is configured
    # if not user.get("email_verified", False):
    #     raise HTTPException(status_code=403, detail="Please verify your email before logging in")
    
    access = create_access_token(sub=user["_id"], email=user.get("email"))
    return Token(access_token=access)

# --- Users ---
@api_router.get("/auth/me")
async def get_me_auth(user=Depends(get_current_user)):
    """Get current user profile (alternative endpoint)"""
    return {
        "_id": str(user["_id"]),
        "name": user.get("name"),
        "email": user.get("email"),
        "photo_base64": user.get("photo_base64")
    }

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

    # Create automatic 1-to-1 chat for these friends
    participants = sorted([user["_id"], fr["from_user_id"]])  # Sort for consistent chat_id
    chat_id = f"chat_{participants[0][:8]}_{participants[1][:8]}"
    
    # Check if chat already exists
    existing_chat = await db.chats.find_one({"_id": chat_id})
    if not existing_chat:
        chat_doc = {
            "_id": chat_id,
            "type": "direct",  # Mark as direct message
            "title": f"Chat between {user.get('name', 'User')} and friend",
            "members": participants,
            "invite_code": None,  # No invite code for direct chats
            "created_by": user["_id"],
            "created_at": now_iso(),
        }
        await db.chats.insert_one(chat_doc)
        logger.info(f"✅ Created automatic 1-to-1 chat {chat_id} for users {participants}")

    await ws_broadcast_to_user(fr["from_user_id"], {"type": "friend_request:accepted", "by": {"id": user["_id"], "name": user.get("name"), "email": user.get("email")}})
    await ws_broadcast_to_friends(user["_id"], {"type": "friends:list:update"})
    await ws_broadcast_to_friends(fr["from_user_id"], {"type": "friends:list:update"})
    return {"accepted": True, "chat_id": chat_id}

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

@api_router.post("/chats/group")
async def create_group_chat(payload: ChatCreate, user=Depends(get_current_user)):
    """Create a new group chat with invitation code"""
    code = uuid.uuid4().hex[:6].upper()
    doc = {
        "_id": str(uuid.uuid4()),
        "type": "group",
        "title": payload.title,
        "members": [user["_id"]],
        "invite_code": code,
        "created_by": user["_id"],
        "created_at": now_iso(),
    }
    await db.chats.insert_one(doc)
    logger.info(f"✅ Created group chat: {payload.title} with invite code: {code}")
    return doc

@api_router.post("/chats/direct/{friend_id}")
async def open_direct_chat(friend_id: str, user=Depends(get_current_user)):
    """Open or get existing 1-to-1 chat with a friend"""
    
    # Verify friendship
    friend = await db.users.find_one({"_id": friend_id})
    if not friend:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Check if they are friends
    user_friends = user.get("friends", [])
    if friend_id not in user_friends:
        raise HTTPException(status_code=403, detail="You must be friends to start a chat")
    
    # Generate consistent chat ID
    participants = sorted([user["_id"], friend_id])
    chat_id = f"chat_{participants[0][:8]}_{participants[1][:8]}"
    
    # Check if chat already exists
    existing_chat = await db.chats.find_one({"_id": chat_id})
    if existing_chat:
        logger.info(f"📱 Returning existing direct chat {chat_id}")
        return existing_chat
    
    # Create new direct chat
    friend_name = friend.get("name", "Friend")
    user_name = user.get("name", "User")
    
    chat_doc = {
        "_id": chat_id,
        "type": "direct",
        "title": f"{user_name} & {friend_name}",
        "members": participants,
        "invite_code": None,
        "created_by": user["_id"],
        "created_at": now_iso(),
    }
    
    await db.chats.insert_one(chat_doc)
    logger.info(f"✅ Created new direct chat {chat_id} between {user_name} and {friend_name}")
    
    return chat_doc

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
async def send_message(chat_id: str, payload: MessageCreate, user=Depends(get_current_user)):
    """Send a message to a chat - WhatsApp-style backend processing"""
    logger.info(f"📤 Processing message from user {user['_id']} to chat {chat_id}")
    
    # Check rate limiting
    user_id = user["_id"]
    if not check_rate_limit(user_id):
        logger.warning(f"🚫 Rate limit exceeded for user {user_id}")
        raise HTTPException(status_code=429, detail="Too many requests. Please slow down.")
    
    try:
        # 1. Validate chat exists and user is a member
        chat = await db.chats.find_one({"_id": chat_id})
        if not chat:
            logger.error(f"❌ Chat not found: {chat_id}")
            raise HTTPException(status_code=404, detail="Chat not found")
        
        user_id = user["_id"]
        if user_id not in chat.get("members", []):
            logger.error(f"❌ User {user_id} not a member of chat {chat_id}")
            raise HTTPException(status_code=403, detail="Not a member of this chat")
        
        # 2. Generate unique backend message ID
        message_id = str(uuid.uuid4())
        current_timestamp = now_iso()
        
        logger.info(f"✅ Creating message with ID: {message_id}")
        
        # 3. Create normalized message document (WhatsApp-style)
        message_doc = {
            "_id": message_id,
            "chat_id": chat_id,
            "author_id": user_id,
            "author_name": user.get("name", "Unknown User"),
            "text": payload.text.strip() if payload.text else "",
            "type": payload.type or "text",
            "status": "sent",  # WhatsApp-style status
            "reactions": {"like": 0, "heart": 0, "clap": 0, "star": 0},
            "created_at": current_timestamp,
            "updated_at": current_timestamp,
            "server_timestamp": current_timestamp
        }
        
        # 4. Validate required fields
        if not message_doc["text"] and message_doc["type"] == "text":
            logger.error("❌ Empty text message not allowed")
            raise HTTPException(status_code=400, detail="Message text cannot be empty")
        
        if not message_doc["author_id"]:
            logger.error("❌ Missing author ID")
            raise HTTPException(status_code=400, detail="Invalid author")
        
        # 5. Insert message to database
        result = await db.messages.insert_one(message_doc)
        if not result.inserted_id:
            logger.error("❌ Failed to insert message to database")
            raise HTTPException(status_code=500, detail="Failed to save message")
        
        logger.info(f"✅ Message saved to database: {message_id}")
        
        # 6. Create normalized response payload (same shape for all clients)
        normalized_message = {
            "id": message_id,
            "_id": message_id,  # Backup field for compatibility
            "chat_id": chat_id,
            "author_id": user_id,
            "author_name": message_doc["author_name"],
            "text": message_doc["text"],
            "type": message_doc["type"],
            "status": message_doc["status"],
            "reactions": message_doc["reactions"],
            "created_at": current_timestamp,
            "server_timestamp": current_timestamp
        }
        
        # 7. Broadcast to other chat members via WebSocket (WhatsApp-style)
        websocket_payload = {
            "type": "chat:new_message",
            "chat_id": chat_id,
            "message": normalized_message
        }
        
        # Send to all chat members except sender
        broadcast_count = 0
        for member_id in chat.get("members", []):
            if member_id != user_id:  # Don't send to the sender
                try:
                    await ws_broadcast_to_user(member_id, websocket_payload)
                    broadcast_count += 1
                    logger.info(f"📨 Sent new message notification to user {member_id} for chat {chat_id}")
                except Exception as e:
                    logger.error(f"❌ Failed to broadcast to user {member_id}: {e}")
        
        logger.info(f"✅ Message broadcast to {broadcast_count} members")
        
        # 8. Return normalized message to sender (same shape as WebSocket)
        return normalized_message
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Unexpected error processing message: {e}")
        raise HTTPException(status_code=500, detail="Internal server error while processing message")

@api_router.post("/chats/{chat_id}/messages/{message_id}/react")
async def react_chat_message(chat_id: str, message_id: str, payload: MessageReaction, user=Depends(get_current_user)):
    # Verify user has access to the chat
    chat = await db.chats.find_one({"_id": chat_id, "members": user["_id"]})
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    # Verify message exists and belongs to the chat
    msg = await db.messages.find_one({"_id": message_id, "chat_id": chat_id})
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    
    # Validate reaction type
    if payload.type not in ["like", "heart", "clap", "star"]:
        raise HTTPException(status_code=400, detail="Invalid reaction type")
    
    # Update reaction count
    await db.messages.update_one(
        {"_id": message_id}, 
        {"$inc": {f"reactions.{payload.type}": 1}}
    )
    
    # Get updated message
    updated_msg = await db.messages.find_one({"_id": message_id})
    
    # Broadcast reaction to all chat members via WebSocket
    reaction_payload = {
        "type": "chat:message_reaction",
        "chat_id": chat_id,
        "message_id": message_id,
        "reaction_type": payload.type,
        "user_name": user.get("name"),
        "new_count": updated_msg["reactions"][payload.type]
    }
    
    # Send to all chat members
    for member_id in chat.get("members", []):
        await ws_broadcast_to_user(member_id, reaction_payload)
        logger.info(f"📨 Sent message reaction to user {member_id} for chat {chat_id}")
    
    return updated_msg

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