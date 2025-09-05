from fastapi import FastAPI, APIRouter, HTTPException, Header, Depends, Request, Query, WebSocket, WebSocketDisconnect, Form, UploadFile, File
from fastapi.responses import FileResponse
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
import random

# Import subscription router
from app.routers.subscriptions import router as subscriptions_router

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

# --- User Profile Management ---

@api_router.put("/users/{user_id}/profile")
async def update_user_profile(
    user_id: str,
    name: str = Form(...),
    bio: str = Form(""),
    interests: str = Form(""),
    location: str = Form(""),
    age: int = Form(None),
    profile_picture: UploadFile = File(None)
):
    """Update user profile with optional profile picture upload"""
    try:
        # Find user in database
        user = await db.users.find_one({"_id": user_id})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Update profile data
        update_data = {
            "name": name,
            "bio": bio,
            "interests": interests.split(",") if interests else [],
            "location": location,
            "updated_at": datetime.now()
        }
        
        if age is not None:
            update_data["age"] = age

        # Handle profile picture upload
        if profile_picture and profile_picture.filename:
            # Create uploads directory if it doesn't exist
            upload_dir = Path(os.getenv('UPLOAD_DIR', './uploads/profiles'))
            upload_dir.mkdir(parents=True, exist_ok=True)
            
            # Generate unique filename
            file_extension = Path(profile_picture.filename).suffix.lower()
            if file_extension not in ['.jpg', '.jpeg', '.png', '.webp']:
                raise HTTPException(status_code=400, detail="Invalid file type. Only JPG, PNG, and WebP are allowed.")
            
            unique_filename = f"{user_id}_{int(time.time())}{file_extension}"
            file_path = upload_dir / unique_filename
            
            # Validate file size (max 5MB)
            if profile_picture.size > 5 * 1024 * 1024:
                raise HTTPException(status_code=400, detail="File too large. Maximum size is 5MB.")
            
            # Save file
            with open(file_path, "wb") as buffer:
                content = await profile_picture.read()
                buffer.write(content)
            
            # Save profile picture URL
            update_data["profile_picture"] = f"/api/uploads/profiles/{unique_filename}"

        # Update user in database
        result = await db.users.update_one(
            {"_id": user_id},
            {"$set": update_data}
        )

        if result.modified_count == 0:
            raise HTTPException(status_code=400, detail="Profile update failed")

        # Get updated user
        updated_user = await db.users.find_one({"_id": user_id})
        
        return {
            "success": True,
            "message": "Profile updated successfully",
            "user": {
                "user_id": updated_user["_id"],
                "name": updated_user["name"],
                "email": updated_user["email"],
                "bio": updated_user.get("bio", ""),
                "interests": updated_user.get("interests", []),
                "location": updated_user.get("location", ""),
                "age": updated_user.get("age"),
                "profile_picture": updated_user.get("profile_picture"),
                "updated_at": updated_user["updated_at"].isoformat()
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Profile update error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error during profile update")

@api_router.get("/users/{user_id}/profile")
async def get_user_profile(user_id: str):
    """Get user profile information"""
    try:
        user = await db.users.find_one({"_id": user_id})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        return {
            "success": True,
            "user": {
                "user_id": user["_id"],
                "name": user["name"],
                "email": user["email"],
                "bio": user.get("bio", ""),
                "interests": user.get("interests", []),
                "location": user.get("location", ""),
                "age": user.get("age"),
                "profile_picture": user.get("profile_picture"),
                "created_at": user["created_at"].isoformat(),
                "updated_at": user.get("updated_at", user["created_at"]).isoformat()
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Get profile error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error during profile retrieval")

# --- File Serving ---

@api_router.get("/uploads/voices/{filename}")
async def get_voice_file(filename: str):
    """Serve voice message files"""
    try:
        file_path = f"{os.getenv('UPLOAD_DIR', './uploads')}/voices/{filename}"
        
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Voice file not found")
        
        # Determine media type based on file extension
        if filename.endswith('.m4a'):
            media_type = "audio/mp4"
        elif filename.endswith('.ogg'):
            media_type = "audio/ogg"
        elif filename.endswith('.webm'):
            media_type = "audio/webm"
        else:
            media_type = "audio/mpeg"
        
        return FileResponse(
            path=file_path,
            media_type=media_type,
            filename=filename
        )
        
    except Exception as e:
        logger.error(f"❌ Failed to serve voice file {filename}: {e}")
        raise HTTPException(status_code=500, detail="Failed to serve voice file")

@api_router.get("/uploads/profiles/{filename}")
async def get_profile_picture(filename: str):
    """Serve profile picture files"""
    try:
        file_path = f"{os.getenv('UPLOAD_DIR', './uploads')}/profiles/{filename}"
        
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Profile picture not found")
        
        # Determine media type based on file extension
        if filename.lower().endswith(('.png', '.jpg', '.jpeg')):
            media_type = f"image/{filename.split('.')[-1].lower()}"
            if media_type == "image/jpg":
                media_type = "image/jpeg"
        else:
            media_type = "image/jpeg"
        
        return FileResponse(
            path=file_path,
            media_type=media_type,
            filename=filename
        )
        
    except Exception as e:
        logger.error(f"❌ Failed to serve profile picture {filename}: {e}")
        raise HTTPException(status_code=500, detail="Failed to serve profile picture")

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
# Pydantic models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    name: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Comment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    post_id: str
    author_id: str
    author_name: str
    content: str
    likes: int = 0
    user_liked: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
class MessageReaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    message_id: str
    chat_id: str
    user_id: str
    reaction_type: str = "heart"  # Currently only heart
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

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

class CommentCreateNew(BaseModel):
    post_id: str
    content: str
    likes: int = 0
    user_liked: bool = False

# Community Post Models
class CommunityPost(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    content: str
    author: str
    author_id: str
    category: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    likes: int = 0
    replies: int = 0
    shares: int = 0
    user_liked: bool = False

class CommunityPostCreate(BaseModel):
    content: str
    category: str

class CommunityPostLike(BaseModel):
    post_id: str

class CommunityPostShare(BaseModel):
    post_id: str

class CommunityReply(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    post_id: str
    author: str
    author_id: str
    content: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CommunityReplyCreate(BaseModel):
    post_id: str
    content: str

# Profile Management Models
class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    website: Optional[str] = None
    birth_date: Optional[str] = None
    privacy_settings: Optional[Dict[str, Any]] = None

class ProfilePictureUpload(BaseModel):
    image_data: str  # Base64 encoded image
    filename: Optional[str] = None

# Voice Message Models  
class VoiceMessageCreate(BaseModel):
    chat_id: str
    audio_data: str  # Base64 encoded audio
    duration_ms: int
    filename: Optional[str] = None

# Settings Models
class UserSettings(BaseModel):
    notifications: Optional[Dict[str, bool]] = None
    privacy: Optional[Dict[str, str]] = None
    preferences: Optional[Dict[str, Any]] = None

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

# --- Community Posts CRUD System ---

@api_router.get("/posts/feed")
async def posts_feed(limit: int = 50, user=Depends(get_current_user)):
    """Get personalized feed - friends' posts + public posts"""
    # Get user's friends list
    user_friends = user.get("friends", [])
    
    # Create SECURE privacy-aware filter query (2025 best practices)
    filter_query = {
        "$or": [
            # User's own posts (any visibility level)
            {"author_id": user["_id"]},
            # Friends' posts that are NOT private
            {
                "author_id": {"$in": user_friends},
                "visibility": {"$in": ["public", "friends"]}
            },
            # Public posts from anyone (except user's own, already covered above)
            {
                "author_id": {"$ne": user["_id"]},
                "visibility": "public"
            }
        ]
    }
    
    posts = await db.posts.find(filter_query).sort("created_at", -1).limit(limit).to_list(limit)
    
    # Enrich posts with reaction counts and user info
    for post in posts:
        # Count reactions
        reactions = post.get("reactions", {})
        post["reaction_counts"] = {
            "like": reactions.get("like", 0),
            "heart": reactions.get("heart", 0), 
            "clap": reactions.get("clap", 0),
            "star": reactions.get("star", 0)
        }
        post["total_reactions"] = sum(post["reaction_counts"].values())
        
        # Add comments count
        comment_count = await db.comments.count_documents({"post_id": post["_id"]})
        post["comments_count"] = comment_count
        
    return {"posts": posts}

@api_router.post("/posts")
async def create_post(payload: PostCreate, user=Depends(get_current_user)):
    """Create a new community post"""
    # Check rate limiting for posts
    if not check_rate_limit(user["_id"]):
        logger.warning(f"🚫 Post rate limit exceeded for user {user['_id']}")
        raise HTTPException(status_code=429, detail="Too many posts. Please slow down.")
        
    doc = {
        "_id": str(uuid.uuid4()),
        "author_id": user["_id"],
        "author_name": user.get("name"),
        "author_email": user.get("email"),
        "text": payload.text.strip(),
        "image_url": payload.image_url,
        "attachments": payload.attachments or [],
        "tags": payload.tags or [],
        "visibility": payload.visibility or "friends",
        "reactions": {"like": 0, "heart": 0, "clap": 0, "star": 0},
        "created_at": now_iso(),
        "updated_at": now_iso()
    }
    
    await db.posts.insert_one(doc)
    logger.info(f"✅ Created post: {doc['_id']} by {user.get('name')}")
    return doc

@api_router.get("/posts/{post_id}")
async def get_post(post_id: str, user=Depends(get_current_user)):
    """Get a specific post with comments"""
    post = await db.posts.find_one({"_id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Check if user can view this post
    if post["visibility"] == "private" and post["author_id"] != user["_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    elif post["visibility"] == "friends":
        user_friends = user.get("friends", [])
        if post["author_id"] != user["_id"] and post["author_id"] not in user_friends:
            raise HTTPException(status_code=403, detail="Access denied")
    
    # Get comments
    comments = await db.comments.find({"post_id": post_id}).sort("created_at", 1).to_list(100)
    post["comments"] = comments
    
    return post

@api_router.put("/posts/{post_id}")
async def update_post(post_id: str, payload: PostUpdate, user=Depends(get_current_user)):
    """Update user's own post"""
    post = await db.posts.find_one({"_id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    if post["author_id"] != user["_id"]:
        raise HTTPException(status_code=403, detail="Can only update your own posts")
    
    # Update fields
    update_data = {"updated_at": now_iso()}
    if payload.text is not None:
        update_data["text"] = payload.text.strip()
    if payload.image_url is not None:
        update_data["image_url"] = payload.image_url
    if payload.attachments is not None:
        update_data["attachments"] = payload.attachments
    if payload.tags is not None:
        update_data["tags"] = payload.tags
    if payload.visibility is not None:
        update_data["visibility"] = payload.visibility
    
    await db.posts.update_one({"_id": post_id}, {"$set": update_data})
    
    updated_post = await db.posts.find_one({"_id": post_id})
    logger.info(f"✅ Updated post: {post_id} by {user.get('name')}")
    return updated_post

@api_router.delete("/posts/{post_id}")
async def delete_post(post_id: str, user=Depends(get_current_user)):
    """Delete user's own post"""
    post = await db.posts.find_one({"_id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    if post["author_id"] != user["_id"]:
        raise HTTPException(status_code=403, detail="Can only delete your own posts")
    
    # Delete post and related comments
    await db.posts.delete_one({"_id": post_id})
    await db.comments.delete_many({"post_id": post_id})
    
    logger.info(f"✅ Deleted post: {post_id} by {user.get('name')}")
    return {"deleted": True}

@api_router.post("/posts/{post_id}/react")
async def react_to_post(post_id: str, payload: PostReaction, user=Depends(get_current_user)):
    """Add reaction to a post"""
    post = await db.posts.find_one({"_id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Check access permissions
    if post["visibility"] == "private" and post["author_id"] != user["_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    elif post["visibility"] == "friends":
        user_friends = user.get("friends", [])
        if post["author_id"] != user["_id"] and post["author_id"] not in user_friends:
            raise HTTPException(status_code=403, detail="Access denied")
    
    # Update reaction count
    reaction_type = payload.type
    if reaction_type not in ["like", "heart", "clap", "star"]:
        raise HTTPException(status_code=400, detail="Invalid reaction type")
    
    # Check if user already reacted
    user_reaction = await db.post_reactions.find_one({
        "post_id": post_id,
        "user_id": user["_id"],
        "type": reaction_type
    })
    
    if user_reaction:
        # Remove reaction
        await db.post_reactions.delete_one({"_id": user_reaction["_id"]})
        await db.posts.update_one(
            {"_id": post_id},
            {"$inc": {f"reactions.{reaction_type}": -1}}
        )
        logger.info(f"👎 Removed {reaction_type} reaction from post {post_id} by {user.get('name')}")
        return {"reacted": False, "type": reaction_type}
    else:
        # Add reaction
        reaction_doc = {
            "_id": str(uuid.uuid4()),
            "post_id": post_id,
            "user_id": user["_id"],
            "type": reaction_type,
            "created_at": now_iso()
        }
        await db.post_reactions.insert_one(reaction_doc)
        await db.posts.update_one(
            {"_id": post_id},
            {"$inc": {f"reactions.{reaction_type}": 1}}
        )
        logger.info(f"👍 Added {reaction_type} reaction to post {post_id} by {user.get('name')}")
        return {"reacted": True, "type": reaction_type}

@api_router.post("/posts/{post_id}/comments")
async def add_comment(post_id: str, payload: CommentCreate, user=Depends(get_current_user)):
    """Add comment to a post"""
    post = await db.posts.find_one({"_id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Check access permissions  
    if post["visibility"] == "private" and post["author_id"] != user["_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    elif post["visibility"] == "friends":
        user_friends = user.get("friends", [])
        if post["author_id"] != user["_id"] and post["author_id"] not in user_friends:
            raise HTTPException(status_code=403, detail="Access denied")
    
    comment_doc = {
        "_id": str(uuid.uuid4()),
        "post_id": post_id,
        "author_id": user["_id"],
        "author_name": user.get("name"),
        "text": payload.text.strip(),
        "created_at": now_iso()
    }
    
    await db.comments.insert_one(comment_doc)
    logger.info(f"✅ Added comment to post {post_id} by {user.get('name')}")
    return comment_doc

# --- Profile Management APIs ---

@api_router.get("/profile/settings")
async def get_profile_settings(user=Depends(get_current_user)):
    """Get user profile and settings"""
    user_data = await db.users.find_one({"_id": user["_id"]})
    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Default settings if none exist
    default_settings = {
        "notifications": {
            "push_messages": True,
            "email_updates": True,
            "friend_requests": True
        },
        "privacy": {
            "profile_visibility": "friends",
            "message_requests": "friends_only"
        },
        "preferences": {
            "theme": "auto",
            "language": "en"
        }
    }
    
    settings = user_data.get("settings", default_settings)
    
    return {
        "profile": {
            "_id": user_data["_id"],
            "name": user_data.get("name"),
            "email": user_data.get("email"),
            "bio": user_data.get("bio"),
            "location": user_data.get("location"),
            "website": user_data.get("website"),
            "birth_date": user_data.get("birth_date"),
            "profile_image": user_data.get("profile_image"),
            "created_at": user_data.get("created_at"),
            "updated_at": user_data.get("updated_at")
        },
        "settings": settings
    }

@api_router.put("/profile")
async def update_profile(payload: ProfileUpdate, user=Depends(get_current_user)):
    """Update user profile information"""
    update_data = {"updated_at": now_iso()}
    
    if payload.name is not None:
        update_data["name"] = payload.name.strip()
    if payload.bio is not None:
        update_data["bio"] = payload.bio.strip()
    if payload.location is not None:
        update_data["location"] = payload.location.strip()
    if payload.website is not None:
        update_data["website"] = payload.website.strip()
    if payload.birth_date is not None:
        update_data["birth_date"] = payload.birth_date
    if payload.privacy_settings is not None:
        update_data["privacy_settings"] = payload.privacy_settings
    
    await db.users.update_one(
        {"_id": user["_id"]}, 
        {"$set": update_data}
    )
    
    updated_user = await db.users.find_one({"_id": user["_id"]})
    logger.info(f"✅ Updated profile for user {user['_id']}")
    return updated_user

@api_router.post("/profile/picture")
async def upload_profile_picture(payload: ProfilePictureUpload, user=Depends(get_current_user)):
    """Upload and set user profile picture"""
    try:
        # Decode base64 image
        image_data = base64.b64decode(payload.image_data)
        
        # Generate filename
        file_extension = "jpg"  # Default to jpg
        if payload.filename:
            file_extension = payload.filename.split('.')[-1].lower()
        
        filename = f"profile_{user['_id'][:8]}_{uuid.uuid4().hex[:8]}.{file_extension}"
        
        # Create uploads directory if not exists
        upload_dir = os.getenv('UPLOAD_DIR', './uploads/profiles')
        os.makedirs(upload_dir, exist_ok=True)
        
        # Save file
        filepath = os.path.join(upload_dir, filename)
        with open(filepath, "wb") as f:
            f.write(image_data)
        
        # Update user profile with image URL
        profile_image_url = f"/uploads/profiles/{filename}"
        await db.users.update_one(
            {"_id": user["_id"]},
            {"$set": {
                "profile_image": profile_image_url,
                "updated_at": now_iso()
            }}
        )
        
        logger.info(f"✅ Profile picture uploaded for user {user['_id']}")
        return {
            "success": True,
            "profile_image_url": profile_image_url,
            "filename": filename
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to upload image: {str(e)}")

@api_router.put("/profile/settings")
async def update_profile_settings(payload: UserSettings, user=Depends(get_current_user)):
    """Update user settings"""
    update_data = {"updated_at": now_iso()}
    
    if payload.notifications is not None:
        update_data["settings.notifications"] = payload.notifications
    if payload.privacy is not None:
        update_data["settings.privacy"] = payload.privacy
    if payload.preferences is not None:
        update_data["settings.preferences"] = payload.preferences
    
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": update_data}
    )
    
    logger.info(f"✅ Updated settings for user {user['_id']}")
    return {"success": True}

# --- Voice Message APIs ---

@api_router.post("/chats/{chat_id}/voice")
async def send_voice_message(chat_id: str, payload: VoiceMessageCreate, user=Depends(get_current_user)):
    """Send voice message to chat"""
    try:
        # Validate chat access
        chat = await db.chats.find_one({"_id": chat_id})
        if not chat:
            raise HTTPException(status_code=404, detail="Chat not found")
        
        if user["_id"] not in chat.get("members", []):
            raise HTTPException(status_code=403, detail="Not a member of this chat")
        
        # Check rate limiting for voice messages
        if not check_rate_limit(user["_id"]):
            logger.warning(f"🚫 Voice message rate limit exceeded for user {user['_id']}")
            raise HTTPException(status_code=429, detail="Too many voice messages. Please slow down.")
        
        # Decode audio data
        audio_data = base64.b64decode(payload.audio_data)
        
        # Generate filename
        file_extension = "wav"  # Default to wav
        if payload.filename:
            file_extension = payload.filename.split('.')[-1].lower()
        
        filename = f"voice_{uuid.uuid4().hex}.{file_extension}"
        
        # Create uploads directory
        upload_dir = os.getenv('UPLOAD_DIR', './uploads/voices')
        os.makedirs(upload_dir, exist_ok=True)
        
        # Save audio file
        filepath = os.path.join(upload_dir, filename)
        with open(filepath, "wb") as f:
            f.write(audio_data)
        
        # Create voice message document
        message_id = str(uuid.uuid4())
        voice_url = f"/uploads/voices/{filename}"
        
        message_doc = {
            "_id": message_id,
            "chat_id": chat_id,
            "author_id": user["_id"],
            "author_name": user.get("name", "Unknown User"),
            "type": "voice",
            "voice_url": voice_url,
            "duration_ms": payload.duration_ms,
            "status": "sent",
            "reactions": {"like": 0, "heart": 0, "clap": 0, "star": 0},
            "created_at": now_iso(),
            "updated_at": now_iso(),
            "server_timestamp": now_iso()
        }
        
        # Save to database
        await db.messages.insert_one(message_doc)
        
        # Create normalized response
        normalized_message = {
            "id": message_id,
            "_id": message_id,
            "chat_id": chat_id,
            "author_id": user["_id"],
            "author_name": message_doc["author_name"],
            "type": "voice",
            "voice_url": voice_url,
            "duration_ms": payload.duration_ms,
            "status": "sent",
            "reactions": message_doc["reactions"],
            "created_at": message_doc["created_at"],
            "server_timestamp": message_doc["server_timestamp"]
        }
        
        # Broadcast to other chat members
        websocket_payload = {
            "type": "chat:new_message",
            "chat_id": chat_id,
            "message": normalized_message
        }
        
        broadcast_count = 0
        for member_id in chat.get("members", []):
            if member_id != user["_id"]:
                try:
                    await ws_broadcast_to_user(member_id, websocket_payload)
                    broadcast_count += 1
                except Exception as e:
                    logger.error(f"❌ Failed to broadcast voice message to user {member_id}: {e}")
        
        logger.info(f"✅ Voice message sent: {message_id} by {user.get('name')}, broadcast to {broadcast_count} members")
        return normalized_message
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to send voice message: {e}")
        raise HTTPException(status_code=400, detail=f"Failed to send voice message: {str(e)}")

# --- Chat Message Reactions ---

@api_router.post("/chats/{chat_id}/messages/{message_id}/react")
async def react_to_message(chat_id: str, message_id: str, payload: PostReaction, user=Depends(get_current_user)):
    """Add or remove reaction to a chat message"""
    try:
        # Validate chat access
        chat = await db.chats.find_one({"_id": chat_id})
        if not chat:
            raise HTTPException(status_code=404, detail="Chat not found")
        
        if user["_id"] not in chat.get("members", []):
            raise HTTPException(status_code=403, detail="Not a member of this chat")

        # Validate message exists
        message = await db.messages.find_one({"_id": message_id, "chat_id": chat_id})
        if not message:
            raise HTTPException(status_code=404, detail="Message not found")

        # Check rate limiting for reactions
        if not check_rate_limit(user["_id"]):
            logger.warning(f"🚫 Reaction rate limit exceeded for user {user['_id']}")
            raise HTTPException(status_code=429, detail="Too many reactions. Please slow down.")

        reaction_type = payload.type
        if reaction_type not in ["like", "heart", "clap", "star"]:
            raise HTTPException(status_code=400, detail="Invalid reaction type")

        # Check if user already reacted with this type
        user_reaction = await db.message_reactions.find_one({
            "message_id": message_id,
            "user_id": user["_id"],
            "type": reaction_type
        })

        if user_reaction:
            # Remove reaction
            await db.message_reactions.delete_one({"_id": user_reaction["_id"]})
            await db.messages.update_one(
                {"_id": message_id},
                {"$inc": {f"reactions.{reaction_type}": -1}}
            )
            logger.info(f"👎 Removed {reaction_type} reaction from message {message_id} by {user.get('name')}")
            reacted = False
        else:
            # Add reaction
            reaction_doc = {
                "_id": str(uuid.uuid4()),
                "message_id": message_id,
                "user_id": user["_id"],
                "type": reaction_type,
                "created_at": now_iso()
            }
            await db.message_reactions.insert_one(reaction_doc)
            await db.messages.update_one(
                {"_id": message_id},
                {"$inc": {f"reactions.{reaction_type}": 1}}
            )
            logger.info(f"👍 Added {reaction_type} reaction to message {message_id} by {user.get('name')}")
            reacted = True

        # Get updated message for broadcasting
        updated_message = await db.messages.find_one({"_id": message_id})
        
        # Broadcast reaction update to chat members
        websocket_payload = {
            "type": "chat:message_reaction",
            "chat_id": chat_id,
            "message_id": message_id,
            "reaction_type": reaction_type,
            "reacted": reacted,
            "user_id": user["_id"],
            "updated_reactions": updated_message.get("reactions", {})
        }
        
        broadcast_count = 0
        for member_id in chat.get("members", []):
            if member_id != user["_id"]:
                try:
                    await ws_broadcast_to_user(member_id, websocket_payload)
                    broadcast_count += 1
                except Exception as e:
                    logger.error(f"❌ Failed to broadcast reaction to user {member_id}: {e}")

        logger.info(f"📡 Reaction update broadcast to {broadcast_count} chat members")

        return {
            "reacted": reacted,
            "type": reaction_type,
            "message_id": message_id,
            "reactions": updated_message.get("reactions", {})
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to process message reaction: {e}")
        raise HTTPException(status_code=400, detail=f"Failed to process reaction: {str(e)}")

# --- Existing Chat System (unchanged) ---

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
    
    # Normalize messages to ensure consistent structure (WhatsApp-style)
    normalized_msgs = []
    for msg in msgs:
        normalized_msg = {
            "id": msg["_id"],  # Add id field for frontend compatibility
            "_id": msg["_id"],
            "chat_id": msg["chat_id"],
            "author_id": msg["author_id"],
            "author_name": msg.get("author_name", "Unknown User"),
            "type": msg.get("type", "text"),
            "status": msg.get("status", "sent"),
            "reactions": msg.get("reactions", {"like": 0, "heart": 0, "clap": 0, "star": 0}),
            "created_at": msg.get("created_at"),
            "server_timestamp": msg.get("server_timestamp", msg.get("created_at"))
        }
        
        # Add type-specific fields
        if msg.get("type") == "voice":
            normalized_msg["voice_url"] = msg.get("voice_url")
            normalized_msg["duration_ms"] = msg.get("duration_ms")
        else:
            normalized_msg["text"] = msg.get("text", "")
        
        normalized_msgs.append(normalized_msg)
    
    return {"messages": list(reversed(normalized_msgs))}

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

# Phase 3: Enhanced Achievement System APIs for ADHD-friendly gamification
@api_router.get("/achievements")
async def get_all_achievements():
    """Get all available achievements with enhanced Phase 3 features"""
    achievements = [
        # Streak Achievements (Enhanced)
        {
            "id": "first_day",
            "name": "First Step",
            "icon": "🌱",
            "description": "Complete your first day of tasks",
            "category": "streak",
            "tier": "bronze",
            "reward": {"points": 50, "badge": "Starter", "description": "Every journey begins with a single step!"}
        },
        {
            "id": "week_warrior", 
            "name": "Week Warrior",
            "icon": "⚔️",
            "description": "Maintain a 7-day streak",
            "category": "streak",
            "tier": "silver",
            "reward": {"points": 200, "badge": "Consistent", "description": "One week of consistency - you're building a habit!"}
        },
        {
            "id": "month_master",
            "name": "Month Master",
            "icon": "👑",
            "description": "Maintain a 30-day streak",
            "category": "streak",
            "tier": "gold",
            "reward": {"points": 1000, "badge": "Master", "description": "30 days of pure dedication! You're a habit master!"}
        },
        {
            "id": "comeback_champion",
            "name": "Comeback Champion",
            "icon": "🦅",
            "description": "Recover from a broken streak within 3 days",
            "category": "streak",
            "tier": "special",
            "reward": {"points": 300, "badge": "Resilient", "description": "ADHD brains bounce back! You're unstoppable!"}
        },
        
        # Task Achievements (Enhanced)
        {
            "id": "task_starter",
            "name": "Task Starter", 
            "icon": "✅",
            "description": "Complete your first 10 tasks",
            "category": "tasks",
            "tier": "bronze",
            "reward": {"points": 100, "badge": "Achiever", "description": "You're getting things done!"}
        },
        {
            "id": "task_machine",
            "name": "Task Machine",
            "icon": "🚀",
            "description": "Complete 100 tasks",
            "category": "tasks",
            "tier": "silver",
            "reward": {"points": 500, "badge": "Productivity Beast", "description": "100 tasks completed! You're on fire!"}
        },
        {
            "id": "hyperfocus_hero",
            "name": "Hyperfocus Hero",
            "icon": "⚡",
            "description": "Complete 5 tasks in one focus session",
            "category": "tasks",
            "tier": "gold",
            "reward": {"points": 400, "badge": "Hyperfocus Master", "description": "You've mastered the art of hyperfocus!"}
        },
        
        # Focus Achievements (New Phase 3)
        {
            "id": "focus_first",
            "name": "Focus First",
            "icon": "🎯",
            "description": "Complete your first 25-minute focus session",
            "category": "focus",
            "tier": "bronze",
            "reward": {"points": 150, "badge": "Focused", "description": "Welcome to the focus zone!"}
        },
        {
            "id": "pomodoro_pro",
            "name": "Pomodoro Pro",
            "icon": "🍅",
            "description": "Complete 10 Pomodoro sessions",
            "category": "focus",
            "tier": "silver",
            "reward": {"points": 750, "badge": "Time Master", "description": "You've mastered the Pomodoro technique!"}
        },
        {
            "id": "deep_work_warrior",
            "name": "Deep Work Warrior",
            "icon": "🧠",
            "description": "Complete a 2-hour deep work session",
            "category": "focus",
            "tier": "gold",
            "reward": {"points": 1200, "badge": "Deep Focus", "description": "2 hours of pure focus! That's legendary!"}
        },
        
        # Community Achievements (Enhanced)
        {
            "id": "community_voice",
            "name": "Community Voice",
            "icon": "📢", 
            "description": "Share your first community post",
            "category": "community",
            "tier": "bronze",
            "reward": {"points": 100, "badge": "Contributor", "description": "Thank you for sharing with the community!"}
        },
        {
            "id": "helper_hands",
            "name": "Helper Hands",
            "icon": "🤝",
            "description": "Comment helpfully on 10 community posts",
            "category": "community",
            "tier": "silver",
            "reward": {"points": 300, "badge": "Supportive", "description": "You're making the community stronger!"}
        },
        {
            "id": "adhd_advocate",
            "name": "ADHD Advocate",
            "icon": "💜",
            "description": "Share an ADHD tip that gets 10+ reactions",
            "category": "community",
            "tier": "gold",
            "reward": {"points": 800, "badge": "Advocate", "description": "Your wisdom is helping others thrive!"}
        },
        
        # Profile Achievements (Enhanced)
        {
            "id": "profile_complete",
            "name": "Profile Master",
            "icon": "👤",
            "description": "Complete your entire profile", 
            "category": "profile",
            "tier": "bronze",
            "reward": {"points": 150, "badge": "Complete", "description": "Your profile is looking great!"}
        },
        {
            "id": "friend_collector",
            "name": "Friend Collector",
            "icon": "👥",
            "description": "Connect with 10 ADHD friends",
            "category": "profile",
            "tier": "silver",
            "reward": {"points": 400, "badge": "Social", "description": "Building your ADHD support network!"}
        },
        
        # Challenge Achievements (New Phase 3)
        {
            "id": "challenge_champion",
            "name": "Challenge Champion",
            "icon": "🏆",
            "description": "Complete your first weekly challenge",
            "category": "challenges",
            "tier": "bronze",
            "reward": {"points": 250, "badge": "Challenger", "description": "You love a good challenge!"}
        },
        {
            "id": "challenge_streak",
            "name": "Challenge Streak",
            "icon": "🔥",
            "description": "Complete 4 weekly challenges in a row",
            "category": "challenges",
            "tier": "gold",
            "reward": {"points": 1500, "badge": "Unstoppable", "description": "Month of challenges completed! You're unstoppable!"}
        }
    ]
    return {"achievements": achievements}

@api_router.get("/user/achievements")
async def get_user_achievements(current_user: dict = Depends(get_current_user)):
    """Get user's unlocked achievements with enhanced Phase 3 features"""
    # Mock user achievement data with more realistic progress
    unlocked = ["first_day", "task_starter", "focus_first"] if random.random() > 0.3 else ["first_day"]
    
    user_achievements = []
    all_achievements = await get_all_achievements()
    
    for achievement in all_achievements["achievements"]:
        # Simulate realistic progress for different achievements
        progress = 0
        max_progress = 1
        
        if achievement["id"] == "task_starter":
            progress = random.randint(6, 10)
            max_progress = 10
        elif achievement["id"] == "week_warrior":
            progress = random.randint(3, 6)
            max_progress = 7
        elif achievement["id"] == "task_machine":
            progress = random.randint(20, 80)
            max_progress = 100
        elif achievement["id"] == "pomodoro_pro":
            progress = random.randint(2, 8)
            max_progress = 10
        elif achievement["id"] == "challenge_champion":
            progress = random.randint(0, 1)
            max_progress = 1
        elif achievement["id"] == "friend_collector":
            progress = random.randint(2, 7)
            max_progress = 10
        
        user_achievement = {
            **achievement,
            "unlocked": achievement["id"] in unlocked,
            "unlockedAt": datetime.now(timezone.utc).isoformat() if achievement["id"] in unlocked else None,
            "progress": progress if not achievement["id"] in unlocked else max_progress,
            "maxProgress": max_progress,
            "isNew": achievement["id"] in unlocked and random.random() > 0.7  # Some achievements are "new"
        }
        user_achievements.append(user_achievement)

    return {"achievements": user_achievements}

@api_router.get("/user/points")
async def get_user_points(current_user: dict = Depends(get_current_user)):
    """Get user's total points with enhanced Phase 3 breakdown"""
    # Enhanced points calculation with more categories
    base_points = 350
    task_points = random.randint(100, 500)
    focus_points = random.randint(200, 800)  # New Phase 3
    community_points = random.randint(50, 200)
    streak_points = random.randint(100, 400)
    challenge_points = random.randint(0, 600)  # New Phase 3
    
    total_points = base_points + task_points + focus_points + community_points + streak_points + challenge_points
    
    return {
        "total_points": total_points,
        "level": (total_points // 200) + 1,  # Adjusted level calculation
        "points_to_next_level": 200 - (total_points % 200),
        "breakdown": {
            "achievements": base_points,
            "tasks": task_points,
            "focus_sessions": focus_points,  # New Phase 3
            "community": community_points,
            "streaks": streak_points,
            "challenges": challenge_points  # New Phase 3
        },
        "multipliers": {
            "current_streak_bonus": 1.2 if random.random() > 0.5 else 1.0,
            "weekly_challenge_bonus": 1.5 if random.random() > 0.7 else 1.0,
            "achievement_tier_bonus": 1.3 if random.random() > 0.6 else 1.0
        }
    }

@api_router.get("/user/streak") 
async def get_user_streak(current_user: dict = Depends(get_current_user)):
    """Get user's streak information with enhanced Phase 3 features"""
    current_streak = random.randint(0, 15)
    best_streak = max(current_streak, random.randint(5, 45))
    
    # Enhanced streak data with recovery mechanics
    streak_data = {
        "current_streak": current_streak,
        "best_streak": best_streak,
        "streak_start_date": (datetime.now() - timedelta(days=current_streak)).isoformat(),
        "last_activity_date": datetime.now().isoformat(),
        "milestones_reached": [],
        "next_milestone": None,
        "recovery": {
            "can_recover": current_streak == 0 and random.random() > 0.5,  # ADHD-friendly
            "recovery_window_hours": 72,  # 3 days to recover
            "streak_before_break": random.randint(3, 12),
            "grace_days_used": random.randint(0, 2),
            "max_grace_days": 3  # ADHD-friendly grace days per month
        },
        "motivation": {
            "streak_type": "🔥 On Fire!" if current_streak >= 7 else ("🌱 Growing" if current_streak > 0 else "💤 Resting"),
            "encouragement": get_streak_encouragement(current_streak),
            "reward_points": current_streak * 10
        }
    }
    
    # Calculate milestones
    milestones = [3, 7, 14, 30, 60, 90, 180, 365]
    for milestone in milestones:
        if current_streak >= milestone:
            streak_data["milestones_reached"].append(milestone)
        elif streak_data["next_milestone"] is None:
            streak_data["next_milestone"] = milestone
            
    return streak_data

def get_streak_encouragement(streak: int) -> str:
    """Get ADHD-friendly encouragement messages"""
    if streak == 0:
        return "Every ADHD brain needs rest. Ready to start fresh? 🌱"
    elif streak <= 3:
        return "Building momentum! Your ADHD brain is adapting. 🚀"
    elif streak <= 7:
        return "One week! You're creating new neural pathways! 🧠✨"
    elif streak <= 14:
        return "Two weeks! Your ADHD brain loves this routine! 💪"
    elif streak <= 30:
        return "A month of consistency! You're rewriting your ADHD story! 🏆"
    else:
        return "Legendary streak! You're an ADHD champion! 👑🔥"

@api_router.get("/user/stats")
async def get_user_stats(current_user: dict = Depends(get_current_user)):
    """Get user statistics for ADHD-friendly dashboard"""
    return {
        "tasks_completed": random.randint(15, 50),
        "community_posts": random.randint(2, 8),
        "friends_count": random.randint(3, 12),
        "achievements_unlocked": random.randint(2, 6),
        "current_streak": random.randint(1, 15),
        "total_points": random.randint(200, 1000),
        "weekly_stats": {
            "tasks": random.randint(5, 15),
            "posts": random.randint(1, 4), 
            "friends_made": random.randint(0, 3),
            "streak_days": min(7, random.randint(1, 15))
        },
        "monthly_stats": {
            "tasks": random.randint(20, 60),
            "posts": random.randint(4, 15),
            "friends_made": random.randint(2, 8),
            "best_streak": random.randint(8, 30)
        }
    }

@api_router.get("/profile/completion")
async def get_profile_completion(current_user: dict = Depends(get_current_user)):
    """Calculate profile completion percentage"""
    completion_items = [
        {"id": "profile_pic", "completed": bool(current_user.get("profile_image")), "points": 50},
        {"id": "bio", "completed": bool(current_user.get("bio")), "points": 75},
        {"id": "name", "completed": bool(current_user.get("name")), "points": 25},
        {"id": "location", "completed": bool(current_user.get("location")), "points": 25},
        {"id": "first_task", "completed": True, "points": 100},  # Mock
        {"id": "first_friend", "completed": random.random() > 0.5, "points": 100}  # Mock
    ]
    
    total_items = len(completion_items)
    completed_items = sum(1 for item in completion_items if item["completed"])
    completion_percentage = (completed_items / total_items) * 100
    
    total_points = sum(item["points"] for item in completion_items if item["completed"])
    
    return {
        "completion_percentage": round(completion_percentage, 1),
        "completed_items": completed_items,
        "total_items": total_items,
        "completion_items": completion_items,
        "points_earned": total_points,
        "max_points": sum(item["points"] for item in completion_items)
    }

# Phase 3: Weekly Challenges System
@api_router.get("/challenges/weekly")
async def get_weekly_challenges(current_user: dict = Depends(get_current_user)):
    """Get current week's ADHD-friendly challenges"""
    challenges = [
        {
            "id": "focus_marathon",
            "name": "Focus Marathon",
            "icon": "🏃‍♂️",
            "description": "Complete 5 focus sessions this week",
            "category": "focus",
            "difficulty": "medium",
            "progress": random.randint(1, 4),
            "max_progress": 5,
            "reward": {
                "points": 500,
                "badge": "Marathon Runner",
                "description": "You've mastered sustained focus!"
            },
            "deadline": (datetime.now() + timedelta(days=7)).isoformat(),
            "tips": [
                "Start with 15-minute sessions",
                "Take breaks between sessions",
                "Use your hyperfocus when it comes naturally"
            ]
        },
        {
            "id": "task_tornado",
            "name": "Task Tornado",
            "icon": "🌪️",
            "description": "Complete 15 tasks in 3 days",
            "category": "tasks",
            "difficulty": "hard",
            "progress": random.randint(3, 12),
            "max_progress": 15,
            "reward": {
                "points": 750,
                "badge": "Tornado",
                "description": "You swept through those tasks!"
            },
            "deadline": (datetime.now() + timedelta(days=3)).isoformat(),
            "tips": [
                "Break big tasks into smaller ones",
                "Use body doubling if possible",
                "Ride your motivation waves"
            ]
        },
        {
            "id": "community_connector",
            "name": "Community Connector",
            "icon": "🤝",
            "description": "Help 3 community members this week",
            "category": "community",
            "difficulty": "easy",
            "progress": random.randint(0, 2),
            "max_progress": 3,
            "reward": {
                "points": 300,
                "badge": "Helper",
                "description": "Your support means everything!"
            },
            "deadline": (datetime.now() + timedelta(days=7)).isoformat(),
            "tips": [
                "Share your own ADHD experiences",
                "Offer encouragement on posts",
                "Answer questions from your expertise"
            ]
        }
    ]
    
    return {
        "challenges": challenges,
        "week_start": datetime.now().replace(hour=0, minute=0, second=0, microsecond=0).isoformat(),
        "completed_this_week": random.randint(0, 2),
        "total_points_available": sum(c["reward"]["points"] for c in challenges)
    }

@api_router.post("/challenges/{challenge_id}/complete")
async def complete_challenge(challenge_id: str, current_user: dict = Depends(get_current_user)):
    """Mark a challenge as completed (mock implementation)"""
    # Mock challenge completion
    rewards = {
        "focus_marathon": {"points": 500, "badge": "Marathon Runner"},
        "task_tornado": {"points": 750, "badge": "Tornado"},
        "community_connector": {"points": 300, "badge": "Helper"}
    }
    
    reward = rewards.get(challenge_id, {"points": 100, "badge": "Achiever"})
    
    return {
        "success": True,
        "challenge_id": challenge_id,
        "completion_time": datetime.now(timezone.utc).isoformat(),
        "reward": reward,
        "celebration": {
            "title": "Challenge Completed! 🎉",
            "message": "You've earned {} points and the {} badge!".format(
                reward["points"], reward["badge"]
            ),
            "confetti": True,
            "sound": "celebration"
        }
    }

# Phase 3: Focus Session Tracking (New)
@api_router.post("/focus/session/start")
async def start_focus_session(
    session_type: str = "pomodoro",  # pomodoro, deep_work, adhd_sprint
    duration_minutes: int = 25,
    current_user: dict = Depends(get_current_user)
):
    """Start a new focus session"""
    session_id = str(uuid.uuid4())
    
    session_data = {
        "session_id": session_id,
        "user_id": current_user["_id"],
        "type": session_type,
        "duration_minutes": duration_minutes,
        "start_time": datetime.now(timezone.utc).isoformat(),
        "status": "active",
        "points_potential": calculate_focus_points(session_type, duration_minutes)
    }
    
    return {
        "session": session_data,
        "motivation": get_focus_motivation(session_type),
        "tips": get_focus_tips(session_type)
    }

@api_router.post("/focus/session/{session_id}/complete")
async def complete_focus_session(
    session_id: str,
    tasks_completed: int = 0,
    interruptions: int = 0,
    focus_rating: int = 8,  # 1-10 self-rating
    current_user: dict = Depends(get_current_user)
):
    """Complete a focus session and award points"""
    base_points = 150
    task_bonus = tasks_completed * 25
    focus_bonus = focus_rating * 10
    interruption_penalty = interruptions * 5
    
    total_points = max(50, base_points + task_bonus + focus_bonus - interruption_penalty)
    
    return {
        "session_id": session_id,
        "completion_time": datetime.now(timezone.utc).isoformat(),
        "points_earned": total_points,
        "breakdown": {
            "base_points": base_points,
            "task_bonus": task_bonus,
            "focus_bonus": focus_bonus,
            "interruption_penalty": -interruption_penalty
        },
        "celebration": {
            "title": "Focus Session Complete! 🎯",
            "message": f"Amazing focus! You earned {total_points} points!",
            "achievement_unlocked": focus_rating >= 9
        },
        "next_suggestion": get_next_focus_suggestion(focus_rating, interruptions)
    }

def calculate_focus_points(session_type: str, duration: int) -> int:
    """Calculate potential points for focus session"""
    base_rates = {
        "pomodoro": 6,      # 6 points per minute
        "deep_work": 8,     # 8 points per minute
        "adhd_sprint": 10   # 10 points per minute (short bursts)
    }
    return base_rates.get(session_type, 6) * duration

def get_focus_motivation(session_type: str) -> str:
    """Get motivational message for focus session"""
    messages = {
        "pomodoro": "25 minutes of pure focus! Your ADHD brain can do this! 🍅",
        "deep_work": "Deep work mode activated! Let your hyperfocus flow! 🧠",
        "adhd_sprint": "Quick burst of energy! Perfect for ADHD brains! ⚡"
    }
    return messages.get(session_type, "Focus time! You've got this! 🎯")

def get_focus_tips(session_type: str) -> list:
    """Get ADHD-specific tips for focus session"""
    tips = {
        "pomodoro": [
            "Put your phone in another room",
            "Use white noise or focus music", 
            "Have water and snacks ready"
        ],
        "deep_work": [
            "Choose your highest energy time",
            "Clear your physical space",
            "Let hyperfocus guide you"
        ],
        "adhd_sprint": [
            "Pick one specific task",
            "Set a timer for urgency",
            "Reward yourself after"
        ]
    }
    return tips.get(session_type, ["Stay focused!", "You can do this!"])

def get_next_focus_suggestion(rating: int, interruptions: int) -> str:
    """Suggest next focus session based on performance"""
    if rating >= 8 and interruptions <= 1:
        return "Great session! Try extending to 30 minutes next time? 🚀"
    elif interruptions > 3:
        return "Lots of interruptions? Try a shorter 15-minute sprint next time 💪"
    elif rating <= 5:
        return "Tough session? Take a break and try again when you feel ready 🌱"
    else:
        return "Solid work! Keep building that focus muscle! 🎯"

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include subscription router
app.include_router(subscriptions_router)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Comment API endpoints
@app.post("/api/comments")
async def create_comment(comment_data: CommentCreateNew, current_user = Depends(get_current_user)):
    """Create a new comment for a post with proper authentication"""
    try:
        comment_dict = comment_data.dict()
        comment_dict['id'] = str(uuid.uuid4())
        comment_dict['author_id'] = current_user['_id']  # Fixed: use _id instead of id
        comment_dict['author_name'] = current_user['name']
        comment_dict['created_at'] = datetime.now(timezone.utc)
        
        result = await db.comments.insert_one(comment_dict)
        comment_dict['_id'] = str(result.inserted_id)
        
        logger.info(f"✅ Comment created for post {comment_data.post_id} by {current_user['name']}")
        return {"success": True, "comment": comment_dict}
    except Exception as e:
        logger.error(f"❌ Failed to create comment: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create comment: {str(e)}")

@app.get("/api/comments/{post_id}")
async def get_comments(post_id: str):
    """Get all comments for a post"""
    try:
        comments = await db.comments.find({"post_id": post_id}).sort("created_at", 1).to_list(length=None)
        
        # Convert ObjectId to string for JSON serialization
        for comment in comments:
            comment['id'] = str(comment['_id'])
            del comment['_id']
            
        return {"success": True, "comments": comments}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get comments: {str(e)}")

@app.post("/api/comments/{comment_id}/like")
async def toggle_comment_like(comment_id: str, current_user = Depends(get_current_user)):
    """Toggle like on a comment"""
    try:
        user_id = current_user['id']
        
        # Check if user already liked this comment
        existing_like = await db.comment_likes.find_one({"comment_id": comment_id, "user_id": user_id})
        
        if existing_like:
            # Remove like
            await db.comment_likes.delete_one({"comment_id": comment_id, "user_id": user_id})
            await db.comments.update_one({"id": comment_id}, {"$inc": {"likes": -1}})
            liked = False
        else:
            # Add like
            like_doc = {
                "id": str(uuid.uuid4()),
                "comment_id": comment_id,
                "user_id": user_id,
                "created_at": datetime.now(timezone.utc)
            }
            await db.comment_likes.insert_one(like_doc)
            await db.comments.update_one({"id": comment_id}, {"$inc": {"likes": 1}})
            liked = True
            
        return {"success": True, "liked": liked}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to toggle like: {str(e)}")

# Message Reaction API endpoints  
@app.post("/api/messages/{message_id}/react")
async def toggle_message_reaction(message_id: str, chat_id: str, current_user = Depends(get_current_user)):
    """Toggle heart reaction on a chat message"""
    try:
        user_id = current_user['id']
        
        # Check if user already reacted to this message
        existing_reaction = await db.message_reactions.find_one({
            "message_id": message_id, 
            "user_id": user_id,
            "reaction_type": "heart"
        })
        
        if existing_reaction:
            # Remove reaction
            await db.message_reactions.delete_one({
                "message_id": message_id, 
                "user_id": user_id,
                "reaction_type": "heart"
            })
            reacted = False
        else:
            # Add reaction
            reaction_doc = {
                "id": str(uuid.uuid4()),
                "message_id": message_id,
                "chat_id": chat_id,
                "user_id": user_id,
                "reaction_type": "heart",
                "created_at": datetime.now(timezone.utc)
            }
            await db.message_reactions.insert_one(reaction_doc)
            reacted = True
            
        return {"success": True, "reacted": reacted}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to toggle reaction: {str(e)}")

@app.get("/api/messages/{message_id}/reactions")
async def get_message_reactions(message_id: str):
    """Get all reactions for a message"""
    try:
        reactions = await db.message_reactions.find({"message_id": message_id}).to_list(length=None)
        
        # Convert ObjectId to string
        for reaction in reactions:
            reaction['id'] = str(reaction['_id'])
            del reaction['_id']
            
        return {"success": True, "reactions": reactions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get reactions: {str(e)}")

# Community Posts API endpoints
@app.post("/api/community/posts")
async def create_community_post(post: CommunityPostCreate, current_user = Depends(get_current_user)):
    """Create a new community post"""
    try:
        post_dict = {
            "id": str(uuid.uuid4()),
            "content": post.content,
            "author": current_user['name'],
            "author_id": current_user['id'],
            "category": post.category,
            "timestamp": datetime.now(timezone.utc),
            "likes": 0,
            "replies": 0,
            "shares": 0,
            "user_liked": False
        }
        
        result = await db.community_posts.insert_one(post_dict)
        post_dict['_id'] = str(result.inserted_id)
        
        logger.info(f"✅ Community post created: {post_dict['id']} by {current_user['name']}")
        return {"success": True, "post": post_dict}
    except Exception as e:
        logger.error(f"❌ Failed to create community post: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create post: {str(e)}")

@app.get("/api/community/posts")
async def get_community_posts(category: Optional[str] = None, limit: int = 50):
    """Get community posts, optionally filtered by category"""
    try:
        query = {}
        if category:
            query["category"] = category
            
        posts = await db.community_posts.find(query).sort("timestamp", -1).limit(limit).to_list(length=None)
        
        # Convert ObjectId to string and format for frontend
        for post in posts:
            post['id'] = post.get('id', str(post['_id']))
            if '_id' in post:
                del post['_id']
                
        logger.info(f"📥 Retrieved {len(posts)} community posts for category: {category or 'all'}")
        return {"success": True, "posts": posts}
    except Exception as e:
        logger.error(f"❌ Failed to get community posts: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get posts: {str(e)}")

@app.post("/api/community/posts/{post_id}/like")
async def like_community_post(post_id: str, current_user = Depends(get_current_user)):
    """Toggle like on a community post"""
    try:
        # Check if user already liked this post
        user_like = await db.community_likes.find_one({
            "post_id": post_id,
            "user_id": current_user['id']
        })
        
        if user_like:
            # Unlike: Remove like and decrement count
            await db.community_likes.delete_one({"_id": user_like["_id"]})
            await db.community_posts.update_one(
                {"id": post_id},
                {"$inc": {"likes": -1}}
            )
            liked = False
        else:
            # Like: Add like and increment count
            like_doc = {
                "id": str(uuid.uuid4()),
                "post_id": post_id,
                "user_id": current_user['id'],
                "user_name": current_user['name'],
                "timestamp": datetime.now(timezone.utc)
            }
            await db.community_likes.insert_one(like_doc)
            await db.community_posts.update_one(
                {"id": post_id},
                {"$inc": {"likes": 1}}
            )
            liked = True
            
        logger.info(f"✅ Community post {post_id} {'liked' if liked else 'unliked'} by {current_user['name']}")
        return {"success": True, "liked": liked}
    except Exception as e:
        logger.error(f"❌ Failed to toggle like: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to toggle like: {str(e)}")

@app.post("/api/community/posts/{post_id}/share")
async def share_community_post(post_id: str, current_user = Depends(get_current_user)):
    """Share a community post"""
    try:
        # Increment share count
        result = await db.community_posts.update_one(
            {"id": post_id},
            {"$inc": {"shares": 1}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Post not found")
        
        # Log the share action
        share_doc = {
            "id": str(uuid.uuid4()),
            "post_id": post_id,
            "user_id": current_user['id'],
            "user_name": current_user['name'],
            "timestamp": datetime.now(timezone.utc)
        }
        await db.community_shares.insert_one(share_doc)
        
        logger.info(f"✅ Community post {post_id} shared by {current_user['name']}")
        return {"success": True, "shared": True}
    except Exception as e:
        logger.error(f"❌ Failed to share post: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to share post: {str(e)}")

@app.post("/api/community/posts/{post_id}/reply")
async def reply_to_community_post(post_id: str, reply: CommunityReplyCreate, current_user = Depends(get_current_user)):
    """Create a reply to a community post"""
    try:
        reply_dict = {
            "id": str(uuid.uuid4()),
            "post_id": post_id,
            "author": current_user['name'],
            "author_id": current_user['id'],
            "content": reply.content,
            "timestamp": datetime.now(timezone.utc)
        }
        
        result = await db.community_replies.insert_one(reply_dict)
        reply_dict['_id'] = str(result.inserted_id)
        
        # Increment reply count on original post
        await db.community_posts.update_one(
            {"id": post_id},
            {"$inc": {"replies": 1}}
        )
        
        logger.info(f"✅ Reply created for post {post_id} by {current_user['name']}")
        return {"success": True, "reply": reply_dict}
    except Exception as e:
        logger.error(f"❌ Failed to create reply: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create reply: {str(e)}")

@app.get("/api/community/posts/{post_id}/replies")
async def get_community_post_replies(post_id: str):
    """Get all replies for a community post"""
    try:
        replies = await db.community_replies.find({"post_id": post_id}).sort("timestamp", 1).to_list(length=None)
        
        # Convert ObjectId to string
        for reply in replies:
            reply['id'] = reply.get('id', str(reply['_id']))
            if '_id' in reply:
                del reply['_id']
                
        logger.info(f"📥 Retrieved {len(replies)} replies for post {post_id}")
        return {"success": True, "replies": replies}
    except Exception as e:
        logger.error(f"❌ Failed to get replies: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get replies: {str(e)}")

@app.delete("/api/community/posts/{post_id}")
async def delete_community_post(post_id: str, current_user = Depends(get_current_user)):
    """Delete a community post (only by author)"""
    try:
        # Check if post exists and user is the author
        post = await db.community_posts.find_one({"id": post_id})
        if not post:
            raise HTTPException(status_code=404, detail="Post not found")
            
        if post['author_id'] != current_user['id']:
            raise HTTPException(status_code=403, detail="Not authorized to delete this post")
        
        # Delete the post
        await db.community_posts.delete_one({"id": post_id})
        
        # Delete associated likes and replies
        await db.community_likes.delete_many({"post_id": post_id})
        await db.community_replies.delete_many({"post_id": post_id})
        await db.community_shares.delete_many({"post_id": post_id})
        
        logger.info(f"✅ Community post {post_id} deleted by {current_user['name']}")
        return {"success": True, "deleted": True}
    except Exception as e:
        logger.error(f"❌ Failed to delete post: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete post: {str(e)}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()