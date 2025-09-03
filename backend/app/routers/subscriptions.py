from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks, Header
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime
import logging

# Use server.py auth functions
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from app.services.billing_service import billing_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/subscriptions", tags=["subscriptions"])

# Import auth function from server
async def get_current_user_local(authorization: str = Header(default=None)):
    """Import auth from server.py - Mock for development"""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    
    # Mock user for development
    return {
        "id": "mock_user_id",
        "email": "test@adhders.com",
        "_id": "mock_user_id"
    }

# Pydantic models for request/response
class PurchaseValidationRequest(BaseModel):
    platform: str  # "ios" or "android"
    product_id: str
    purchase_token: str
    receipt_data: str
    transaction_id: Optional[str] = None

class SubscriptionStatusResponse(BaseModel):
    subscribed: bool
    platform: Optional[str] = None
    product_id: Optional[str] = None
    expires_at: Optional[datetime] = None
    auto_renewing: Optional[bool] = None
    subscription_tier: str = "free"

class ProductsResponse(BaseModel):
    products: Dict[str, Any]

@router.post("/validate")
async def validate_purchase(
    request: PurchaseValidationRequest,
    current_user: Dict[str, Any] = Depends(get_current_user_local)
):
    """Validate purchase and update user subscription status"""
    
    try:
        logger.info(f"Validating purchase for user {current_user['email']}")
        
        # Validate purchase with billing service
        validation_result = await billing_service.validate_purchase(
            platform=request.platform,
            product_id=request.product_id,
            purchase_token=request.purchase_token,
            receipt_data=request.receipt_data,
            transaction_id=request.transaction_id
        )
        
        if not validation_result.get("valid"):
            logger.warning(f"Purchase validation failed: {validation_result.get('error')}")
            raise HTTPException(
                status_code=400,
                detail={
                    "message": "Purchase validation failed",
                    "error": validation_result.get("error"),
                    "error_code": validation_result.get("error_code")
                }
            )
        
        # Update user subscription status in database
        subscription_data = await update_user_subscription(
            current_user, 
            request.platform, 
            validation_result
        )
        
        logger.info(f"✅ Purchase validated successfully for user {current_user['email']}")
        
        return {
            "success": True,
            "message": "Purchase validated successfully",
            "subscription": subscription_data,
            "validation_result": validation_result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Purchase validation error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={"message": "Internal server error", "error": str(e)}
        )

@router.get("/status", response_model=SubscriptionStatusResponse)
async def get_subscription_status(
    current_user: Dict[str, Any] = Depends(get_current_user_local)
):
    """Get current user's subscription status"""
    
    try:
        # Get user's subscription from database
        subscription = await get_user_subscription(current_user["id"])
        
        if subscription and subscription.get("active", False):
            return SubscriptionStatusResponse(
                subscribed=True,
                platform=subscription.get("platform"),
                product_id=subscription.get("product_id"),
                expires_at=subscription.get("expires_at"),
                auto_renewing=subscription.get("auto_renewing", True),
                subscription_tier="premium"
            )
        else:
            return SubscriptionStatusResponse(
                subscribed=False,
                subscription_tier="free"
            )
            
    except Exception as e:
        logger.error(f"Error getting subscription status: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={"message": "Failed to get subscription status", "error": str(e)}
        )

@router.post("/restore")
async def restore_purchases(
    platform: str,
    current_user: Dict[str, Any] = Depends(get_current_user_local)
):
    """Restore previous purchases for user"""
    
    try:
        logger.info(f"Restoring purchases for user {current_user['email']} on {platform}")
        
        # Get user's purchase history from database
        purchase_history = await get_user_purchase_history(current_user["id"], platform)
        
        # Validate each purchase with the store
        restored_purchases = []
        for purchase in purchase_history:
            validation_result = await billing_service.validate_purchase(
                platform=platform,
                product_id=purchase.get("product_id"),
                purchase_token=purchase.get("purchase_token"),
                receipt_data=purchase.get("receipt_data")
            )
            
            if validation_result.get("valid"):
                restored_purchases.append({
                    "product_id": purchase.get("product_id"),
                    "platform": platform,
                    "status": "active" if validation_result.get("auto_renewing") else "expired"
                })
        
        logger.info(f"✅ Restored {len(restored_purchases)} purchases")
        
        return {
            "success": True,
            "restored_purchases": restored_purchases,
            "count": len(restored_purchases)
        }
        
    except Exception as e:
        logger.error(f"Restore purchases error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={"message": "Failed to restore purchases", "error": str(e)}
        )

@router.get("/products", response_model=ProductsResponse)
async def get_products():
    """Get available products/subscriptions"""
    
    try:
        products = billing_service.get_all_products()
        
        return ProductsResponse(products=products)
        
    except Exception as e:
        logger.error(f"Error getting products: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={"message": "Failed to get products", "error": str(e)}
        )

@router.post("/cancel")
async def cancel_subscription(
    platform: str,
    current_user: Dict[str, Any] = Depends(get_current_user_local)
):
    """Cancel user's subscription"""
    
    try:
        logger.info(f"Cancelling subscription for user {current_user['email']}")
        
        # Update subscription status in database
        await cancel_user_subscription(current_user["id"], platform)
        
        return {
            "success": True,
            "message": "Subscription cancelled successfully",
            "cancelled_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Cancel subscription error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={"message": "Failed to cancel subscription", "error": str(e)}
        )

# Webhook endpoints
@router.post("/webhooks/google-play")
async def google_play_webhook(
    request: Request,
    background_tasks: BackgroundTasks
):
    """Handle Google Play webhook notifications"""
    
    try:
        payload = await request.json()
        logger.info("Received Google Play webhook")
        
        # Process webhook in background
        background_tasks.add_task(
            process_webhook_background,
            "android",
            payload
        )
        
        return {"status": "acknowledged"}
        
    except Exception as e:
        logger.error(f"Google Play webhook error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/webhooks/app-store")
async def app_store_webhook(
    request: Request,
    background_tasks: BackgroundTasks
):
    """Handle App Store webhook notifications"""
    
    try:
        payload = await request.json()
        logger.info("Received App Store webhook")
        
        # Process webhook in background
        background_tasks.add_task(
            process_webhook_background,
            "ios",
            payload
        )
        
        return {"status": "acknowledged"}
        
    except Exception as e:
        logger.error(f"App Store webhook error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Background tasks
async def process_webhook_background(platform: str, payload: Dict[str, Any]):
    """Process webhook in background"""
    try:
        result = await billing_service.process_webhook(platform, payload)
        logger.info(f"Webhook processed: {result}")
    except Exception as e:
        logger.error(f"Background webhook processing error: {str(e)}")

# Database helper functions - Mock for development
async def update_user_subscription(user: Dict[str, Any], platform: str, validation_result: Dict[str, Any]) -> Dict[str, Any]:
    """Update user subscription in database - Mock implementation"""
    
    # In production, this would update MongoDB/PostgreSQL
    logger.info(f"🔧 Mock: Updating subscription for user {user['email']}")
    
    subscription_data = {
        "user_id": user["id"],
        "platform": platform,
        "product_id": validation_result.get("product_id"),
        "status": "active",
        "expires_at": validation_result.get("expires_date_ms") or validation_result.get("expiry_time_millis"),
        "auto_renewing": validation_result.get("auto_renewing", True),
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat()
    }
    
    return subscription_data

async def get_user_subscription(user_id: str) -> Optional[Dict[str, Any]]:
    """Get user subscription from database - Mock implementation"""
    
    # Mock active subscription for development
    logger.info(f"🔧 Mock: Getting subscription for user {user_id}")
    
    # Return None for free users, subscription data for premium users
    return None  # Change to subscription_data if user has premium

async def get_user_purchase_history(user_id: str, platform: str) -> list:
    """Get user purchase history - Mock implementation"""
    
    logger.info(f"🔧 Mock: Getting purchase history for user {user_id}")
    
    # Return empty list for now
    return []

async def cancel_user_subscription(user_id: str, platform: str) -> bool:
    """Cancel user subscription - Mock implementation"""
    
    logger.info(f"🔧 Mock: Cancelling subscription for user {user_id}")
    
    return True