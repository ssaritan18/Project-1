# Profile & Voice APIs - Additional Backend Infrastructure

from fastapi import APIRouter, HTTPException, Depends, File, UploadFile
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import base64
import uuid
import os
from datetime import datetime, timezone

# Models imported from main server.py
# class ProfileUpdate(BaseModel):
#     name: Optional[str] = None
#     bio: Optional[str] = None
#     location: Optional[str] = None
#     website: Optional[str] = None
#     birth_date: Optional[str] = None
#     privacy_settings: Optional[Dict[str, Any]] = None

# class ProfilePictureUpload(BaseModel):
#     image_data: str  # Base64 encoded image
#     filename: Optional[str] = None

# class VoiceMessageCreate(BaseModel):
#     chat_id: str
#     audio_data: str  # Base64 encoded audio
#     duration_ms: int
#     filename: Optional[str] = None

# class UserSettings(BaseModel):
#     notifications: Optional[Dict[str, bool]] = None
#     privacy: Optional[Dict[str, str]] = None
#     preferences: Optional[Dict[str, Any]] = None

def now_iso():
    return datetime.now(timezone.utc).isoformat()

# Profile Management APIs
async def update_profile(payload, user, db):
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
    return updated_user

async def upload_profile_picture(payload, user, db):
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
        upload_dir = "/app/backend/uploads/profiles"
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
        
        return {
            "success": True,
            "profile_image_url": profile_image_url,
            "filename": filename
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to upload image: {str(e)}")

async def get_user_settings(user, db):
    """Get user settings"""
    user_data = await db.users.find_one({"_id": user["_id"]})
    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")
    
    settings = user_data.get("settings", {
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
    })
    
    return {"settings": settings}

async def update_user_settings(payload, user, db):
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
    
    return await get_user_settings(user, db)

# Voice Message APIs
async def send_voice_message(payload, user, db, ws_broadcast_to_user):
    """Send voice message to chat"""
    try:
        # Validate chat access
        chat = await db.chats.find_one({"_id": payload.chat_id})
        if not chat:
            raise HTTPException(status_code=404, detail="Chat not found")
        
        if user["_id"] not in chat.get("members", []):
            raise HTTPException(status_code=403, detail="Not a member of this chat")
        
        # Decode audio data
        audio_data = base64.b64decode(payload.audio_data)
        
        # Generate filename
        file_extension = "wav"  # Default to wav
        if payload.filename:
            file_extension = payload.filename.split('.')[-1].lower()
        
        filename = f"voice_{uuid.uuid4().hex}.{file_extension}"
        
        # Create uploads directory
        upload_dir = "/app/backend/uploads/voices"
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
            "chat_id": payload.chat_id,
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
            "chat_id": payload.chat_id,
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
            "chat_id": payload.chat_id,
            "message": normalized_message
        }
        
        for member_id in chat.get("members", []):
            if member_id != user["_id"]:
                await ws_broadcast_to_user(member_id, websocket_payload)
        
        return normalized_message
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to send voice message: {str(e)}")

# Frontend API Functions for Community Posts
async def get_posts_feed_data(user, db, limit=50):
    """Get community feed data for frontend"""
    user_friends = user.get("friends", [])
    
    filter_query = {
        "$or": [
            {"author_id": {"$in": user_friends}},
            {"visibility": "public"},
            {"author_id": user["_id"]}
        ]
    }
    
    posts = await db.posts.find(filter_query).sort("created_at", -1).limit(limit).to_list(limit)
    
    # Enrich posts
    for post in posts:
        reactions = post.get("reactions", {})
        post["reaction_counts"] = {
            "like": reactions.get("like", 0),
            "heart": reactions.get("heart", 0), 
            "clap": reactions.get("clap", 0),
            "star": reactions.get("star", 0)
        }
        post["total_reactions"] = sum(post["reaction_counts"].values())
        
        comment_count = await db.comments.count_documents({"post_id": post["_id"]})
        post["comments_count"] = comment_count
        
    return posts