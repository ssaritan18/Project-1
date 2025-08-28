from fastapi import FastAPI, APIRouter, HTTPException, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, date
import base64
import requests


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(title="Adhers Social Club API", version="0.1.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Utils

def today_str() -> str:
    return date.today().isoformat()

async def get_or_create_user_by_google(google_payload: Dict[str, Any]):
    # google_payload keys: sub, email, name, picture (url)
    sub = google_payload.get("sub")
    if not sub:
        raise HTTPException(status_code=400, detail="Invalid Google token: missing sub")

    user = await db.users.find_one({"google_sub": sub})
    if user:
        return user

    # Download avatar and convert to base64 if available
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
        # Personalization defaults (pastel palette)
        "palette": {
            "primary": "#A3C9FF",  # baby blue
            "secondary": "#FFCFE1",  # soft pink
            "accent": "#B8F1D9"  # mint
        },
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(new_user)
    return new_user


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
    photo_base64: Optional[str] = None  # must be base64 string
    palette: Optional[Dict[str, str]] = None  # {primary, secondary, accent}

class TaskCreate(BaseModel):
    title: str
    goal: int = Field(gt=0, le=1000)
    color: Optional[str] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    goal: Optional[int] = Field(default=None, gt=0, le=1000)
    color: Optional[str] = None
    progress: Optional[int] = Field(default=None, ge=0)

class ReactionCreate(BaseModel):
    to_user_id: str
    type: str  # like | clap | star
    comment: Optional[str] = None


# ROUTES
@api_router.get("/")
async def root():
    return {"message": "Adhers Social Club API running"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]


# --- Auth (Google) ---
@api_router.post("/auth/google")
async def auth_google(payload: GoogleAuthRequest):
    # Verify token with Google tokeninfo endpoint (simple server-side verification)
    tokeninfo_url = f"https://oauth2.googleapis.com/tokeninfo?id_token={payload.id_token}"
    r = requests.get(tokeninfo_url, timeout=10)
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid Google id_token")
    data = r.json()
    # Expect fields like: sub, email, name, picture, aud
    user = await get_or_create_user_by_google(data)
    return {"user_id": user["_id"], "name": user.get("name"), "email": user.get("email"), "photo_base64": user.get("photo_base64"), "palette": user.get("palette")}


# --- Users ---
@api_router.get("/me")
async def get_me(x_user_id: Optional[str] = Header(default=None)):
    if not x_user_id:
        raise HTTPException(status_code=401, detail="Missing x-user-id header")
    user = await db.users.find_one({"_id": x_user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    # Compute today summary
    t = today_str()
    tasks = await db.tasks.find({"user_id": x_user_id, "date": t}).to_list(500)
    total_goal = sum(int(task.get("goal", 0)) for task in tasks)
    total_progress = sum(int(task.get("progress", 0)) for task in tasks)
    daily_ratio = (total_progress / total_goal) if total_goal else 0
    # streak: number of consecutive days (including today) with at least one completed task
    streak = 0
    d = date.today()
    while True:
        ds = d.isoformat()
        any_completed = await db.tasks.find_one({"user_id": x_user_id, "date": ds, "$expr": {"$gte": ["$progress", "$goal"]}})
        if any_completed:
            streak += 1
            d = d.fromordinal(d.toordinal() - 1)
        else:
            break
    return {
        "_id": user["_id"],
        "name": user.get("name"),
        "email": user.get("email"),
        "photo_base64": user.get("photo_base64"),
        "palette": user.get("palette"),
        "today": {"total_goal": total_goal, "total_progress": total_progress, "ratio": daily_ratio},
        "streak": streak,
    }

@api_router.patch("/me")
async def update_me(update: UserProfileUpdate, x_user_id: Optional[str] = Header(default=None)):
    if not x_user_id:
        raise HTTPException(status_code=401, detail="Missing x-user-id header")
    updates: Dict[str, Any] = {k: v for k, v in update.model_dump().items() if v is not None}
    if not updates:
        return {"updated": False}
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.users.update_one({"_id": x_user_id}, {"$set": updates})
    user = await db.users.find_one({"_id": x_user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"updated": True, "user": user}

@api_router.get("/users/community")
async def community(limit: int = 20):
    # Return simple cards: name, photo, today progress ratio
    users = await db.users.find().limit(limit).to_list(length=limit)
    cards = []
    for u in users:
        uid = u["_id"]
        t = today_str()
        tasks = await db.tasks.find({"user_id": uid, "date": t}).to_list(200)
        total_goal = sum(int(task.get("goal", 0)) for task in tasks)
        total_progress = sum(int(task.get("progress", 0)) for task in tasks)
        ratio = (total_progress / total_goal) if total_goal else 0
        cards.append({
            "user_id": uid,
            "name": u.get("name"),
            "photo_base64": u.get("photo_base64"),
            "ratio": ratio,
            "total_progress": total_progress,
            "total_goal": total_goal,
        })
    return {"users": cards}


# --- Tasks ---
@api_router.get("/tasks/today")
async def get_tasks_today(x_user_id: Optional[str] = Header(default=None)):
    if not x_user_id:
        raise HTTPException(status_code=401, detail="Missing x-user-id header")
    tasks = await db.tasks.find({"user_id": x_user_id, "date": today_str()}).sort("created_at", 1).to_list(500)
    return {"tasks": tasks}

@api_router.post("/tasks")
async def create_task(task: TaskCreate, x_user_id: Optional[str] = Header(default=None)):
    if not x_user_id:
        raise HTTPException(status_code=401, detail="Missing x-user-id header")
    doc = {
        "_id": str(uuid.uuid4()),
        "user_id": x_user_id,
        "title": task.title,
        "goal": int(task.goal),
        "progress": 0,
        "color": task.color or "#A3C9FF",
        "date": today_str(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.tasks.insert_one(doc)
    return doc

@api_router.patch("/tasks/{task_id}")
async def update_task(task_id: str, task: TaskUpdate, x_user_id: Optional[str] = Header(default=None)):
    if not x_user_id:
        raise HTTPException(status_code=401, detail="Missing x-user-id header")
    updates: Dict[str, Any] = {k: v for k, v in task.model_dump().items() if v is not None}
    if "progress" in updates and "goal" in updates:
        # Make sure progress doesn't exceed goal
        updates["progress"] = min(int(updates["progress"]), int(updates["goal"]))
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    res = await db.tasks.update_one({"_id": task_id, "user_id": x_user_id}, {"$set": updates})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    task_doc = await db.tasks.find_one({"_id": task_id})
    return task_doc

@api_router.post("/tasks/{task_id}/increment")
async def increment_task(task_id: str, x_user_id: Optional[str] = Header(default=None)):
    if not x_user_id:
        raise HTTPException(status_code=401, detail="Missing x-user-id header")
    task = await db.tasks.find_one({"_id": task_id, "user_id": x_user_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    new_progress = min(int(task.get("progress", 0)) + 1, int(task.get("goal", 1)))
    await db.tasks.update_one({"_id": task_id}, {"$set": {"progress": new_progress, "updated_at": datetime.now(timezone.utc).isoformat()}})
    task = await db.tasks.find_one({"_id": task_id})
    return task

@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, x_user_id: Optional[str] = Header(default=None)):
    if not x_user_id:
        raise HTTPException(status_code=401, detail="Missing x-user-id header")
    res = await db.tasks.delete_one({"_id": task_id, "user_id": x_user_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"deleted": True}


# --- Reactions ---
@api_router.post("/reactions")
async def create_reaction(r: ReactionCreate, x_user_id: Optional[str] = Header(default=None)):
    if not x_user_id:
        raise HTTPException(status_code=401, detail="Missing x-user-id header")
    if r.type not in ["like", "clap", "star"]:
        raise HTTPException(status_code=400, detail="Invalid reaction type")
    doc = {
        "_id": str(uuid.uuid4()),
        "from_user_id": x_user_id,
        "to_user_id": r.to_user_id,
        "type": r.type,
        "comment": r.comment,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.reactions.insert_one(doc)
    return doc

@api_router.get("/reactions/recent")
async def recent_reactions(limit: int = 20):
    items = await db.reactions.find().sort("created_at", -1).limit(limit).to_list(limit)
    return {"reactions": items}


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