import json
import base64
import requests
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
import logging
import os

logger = logging.getLogger(__name__)

# Mock settings for development
class MockSettings:
    ENVIRONMENT = "development"
    GOOGLE_PLAY_SERVICE_ACCOUNT_PATH = "/mock/path/service-account.json"

settings = MockSettings()

class BillingService:
    """Mock Billing Service for Development - Easy Production Transition"""
    
    def __init__(self):
        # Mock credentials - will be replaced with real ones in production
        self.google_play_bundle_id = "com.adhders.socialclub.dev"
        self.apple_bundle_id = "com.adhders.socialclub.dev"
        self.apple_shared_secret = "mock_shared_secret"
        
        # Mock products
        self.products = {
            "adhders_premium_monthly": {
                "price": 4.99,
                "currency": "USD",
                "duration_days": 30,
                "title": "ADHDers Premium Monthly"
            }
        }

    async def validate_purchase(
        self, 
        platform: str, 
        product_id: str, 
        purchase_token: str, 
        receipt_data: str,
        transaction_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Validate purchase - Mock implementation with real structure"""
        
        try:
            logger.info(f"Validating {platform} purchase for product: {product_id}")
            
            if platform.lower() == "ios":
                return await self._validate_ios_receipt(receipt_data, product_id)
            elif platform.lower() == "android":
                return await self._validate_android_purchase(product_id, purchase_token)
            else:
                return {
                    "valid": False,
                    "error": "Unsupported platform",
                    "error_code": "INVALID_PLATFORM"
                }
                
        except Exception as e:
            logger.error(f"Purchase validation error: {str(e)}")
            return {
                "valid": False,
                "error": str(e),
                "error_code": "VALIDATION_ERROR"
            }

    async def _validate_ios_receipt(self, receipt_data: str, product_id: str) -> Dict[str, Any]:
        """Mock iOS receipt validation - Production will use Apple's API"""
        
        # In production, this will call Apple's verifyReceipt API
        if settings.ENVIRONMENT == "development":
            logger.info("🔧 Development mode - mocking iOS receipt validation")
            
            # Mock successful validation
            return {
                "valid": True,
                "platform": "ios",
                "product_id": product_id,
                "transaction_id": f"mock_ios_txn_{datetime.now().timestamp()}",
                "original_transaction_id": f"mock_original_{datetime.now().timestamp()}",
                "purchase_date_ms": str(int(datetime.now().timestamp() * 1000)),
                "expires_date_ms": str(int((datetime.now() + timedelta(days=30)).timestamp() * 1000)),
                "is_trial_period": False,
                "is_intro_offer": False,
                "auto_renewing": True,
            }
        else:
            # Production iOS validation logic
            return await self._real_ios_validation(receipt_data)

    async def _validate_android_purchase(self, product_id: str, purchase_token: str) -> Dict[str, Any]:
        """Mock Android purchase validation - Production will use Google Play API"""
        
        if settings.ENVIRONMENT == "development":
            logger.info("🔧 Development mode - mocking Android purchase validation")
            
            # Mock successful validation
            return {
                "valid": True,
                "platform": "android",
                "product_id": product_id,
                "order_id": f"GPA.MOCK-{datetime.now().timestamp()}",
                "purchase_token": purchase_token,
                "purchase_time_millis": str(int(datetime.now().timestamp() * 1000)),
                "expiry_time_millis": str(int((datetime.now() + timedelta(days=30)).timestamp() * 1000)),
                "start_time_millis": str(int(datetime.now().timestamp() * 1000)),
                "auto_renewing": True,
                "acknowledgement_state": 1,
                "price_amount_micros": "4990000",  # $4.99 in micros
                "price_currency_code": "USD",
            }
        else:
            # Production Android validation logic
            return await self._real_android_validation(product_id, purchase_token)

    async def _real_ios_validation(self, receipt_data: str) -> Dict[str, Any]:
        """Real iOS validation for production"""
        try:
            # Apple's verifyReceipt API
            url = "https://buy.itunes.apple.com/verifyReceipt"
            sandbox_url = "https://sandbox.itunes.apple.com/verifyReceipt"
            
            payload = {
                "receipt-data": receipt_data,
                "password": self.apple_shared_secret,
                "exclude-old-transactions": True
            }
            
            # Try production first
            response = requests.post(url, json=payload, timeout=30)
            result = response.json()
            
            # If sandbox receipt, try sandbox
            if result.get("status") == 21007:
                response = requests.post(sandbox_url, json=payload, timeout=30)
                result = response.json()
            
            if result.get("status") == 0:
                # Parse successful response
                latest_receipt_info = result.get("latest_receipt_info", [])
                if latest_receipt_info:
                    transaction = latest_receipt_info[-1]
                    return {
                        "valid": True,
                        "platform": "ios",
                        "product_id": transaction.get("product_id"),
                        "transaction_id": transaction.get("transaction_id"),
                        "original_transaction_id": transaction.get("original_transaction_id"),
                        "purchase_date_ms": transaction.get("purchase_date_ms"),
                        "expires_date_ms": transaction.get("expires_date_ms"),
                        "is_trial_period": transaction.get("is_trial_period") == "true",
                        "auto_renewing": True,
                    }
            
            return {
                "valid": False,
                "error": f"Apple validation failed with status: {result.get('status')}",
                "error_code": "APPLE_VALIDATION_FAILED"
            }
            
        except Exception as e:
            logger.error(f"iOS validation error: {str(e)}")
            return {
                "valid": False,
                "error": str(e),
                "error_code": "IOS_VALIDATION_ERROR"
            }

    async def _real_android_validation(self, product_id: str, purchase_token: str) -> Dict[str, Any]:
        """Real Android validation for production"""
        try:
            from google.oauth2 import service_account
            from googleapiclient.discovery import build
            
            # Load service account credentials
            credentials = service_account.Credentials.from_service_account_file(
                settings.GOOGLE_PLAY_SERVICE_ACCOUNT_PATH,
                scopes=["https://www.googleapis.com/auth/androidpublisher"]
            )
            
            service = build("androidpublisher", "v3", credentials=credentials)
            
            # Validate subscription
            result = service.purchases().subscriptions().get(
                packageName=self.google_play_bundle_id,
                subscriptionId=product_id,
                token=purchase_token
            ).execute()
            
            return {
                "valid": True,
                "platform": "android",
                "product_id": product_id,
                "order_id": result.get("orderId"),
                "purchase_token": purchase_token,
                "start_time_millis": result.get("startTimeMillis"),
                "expiry_time_millis": result.get("expiryTimeMillis"),
                "auto_renewing": result.get("autoRenewing", False),
                "acknowledgement_state": result.get("acknowledgementState"),
                "price_amount_micros": result.get("priceAmountMicros"),
                "price_currency_code": result.get("priceCurrencyCode"),
            }
            
        except Exception as e:
            logger.error(f"Android validation error: {str(e)}")
            return {
                "valid": False,
                "error": str(e),
                "error_code": "ANDROID_VALIDATION_ERROR"
            }

    def get_product_info(self, product_id: str) -> Optional[Dict[str, Any]]:
        """Get product information"""
        return self.products.get(product_id)

    def get_all_products(self) -> Dict[str, Any]:
        """Get all available products"""
        return self.products

    async def process_webhook(self, platform: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Process webhook notifications from stores"""
        try:
            logger.info(f"Processing {platform} webhook")
            
            if platform == "android":
                return await self._process_google_play_webhook(payload)
            elif platform == "ios":
                return await self._process_app_store_webhook(payload)
            else:
                return {"success": False, "error": "Unsupported platform"}
                
        except Exception as e:
            logger.error(f"Webhook processing error: {str(e)}")
            return {"success": False, "error": str(e)}

    async def _process_google_play_webhook(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Process Google Play webhook - Mock for development"""
        
        if settings.ENVIRONMENT == "development":
            logger.info("🔧 Development mode - mocking Google Play webhook processing")
            return {"success": True, "processed": True, "mock": True}
        
        # Real webhook processing logic for production
        try:
            message = payload.get("message", {})
            data = message.get("data", "")
            
            if data:
                decoded_data = base64.b64decode(data).decode("utf-8")
                notification = json.loads(decoded_data)
                
                # Process notification based on type
                if "subscriptionNotification" in notification:
                    return await self._handle_subscription_notification(notification)
                
            return {"success": True, "processed": True}
            
        except Exception as e:
            logger.error(f"Google Play webhook error: {str(e)}")
            return {"success": False, "error": str(e)}

    async def _process_app_store_webhook(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Process App Store webhook - Mock for development"""
        
        if settings.ENVIRONMENT == "development":
            logger.info("🔧 Development mode - mocking App Store webhook processing")
            return {"success": True, "processed": True, "mock": True}
        
        # Real webhook processing logic for production
        return {"success": True, "processed": True}

    async def _handle_subscription_notification(self, notification: Dict[str, Any]) -> Dict[str, Any]:
        """Handle specific subscription notifications"""
        
        notification_type = notification.get("subscriptionNotification", {}).get("notificationType")
        
        logger.info(f"Handling subscription notification type: {notification_type}")
        
        # Map notification types to actions
        notification_map = {
            1: "SUBSCRIPTION_RECOVERED",
            2: "SUBSCRIPTION_RENEWED", 
            3: "SUBSCRIPTION_CANCELED",
            4: "SUBSCRIPTION_PURCHASED",
            5: "SUBSCRIPTION_ON_HOLD",
            6: "SUBSCRIPTION_IN_GRACE_PERIOD",
            7: "SUBSCRIPTION_RESTARTED",
            8: "SUBSCRIPTION_PRICE_CHANGE_CONFIRMED",
            9: "SUBSCRIPTION_DEFERRED",
            10: "SUBSCRIPTION_PAUSED",
            11: "SUBSCRIPTION_PAUSE_SCHEDULE_CHANGED",
            12: "SUBSCRIPTION_REVOKED",
            13: "SUBSCRIPTION_EXPIRED"
        }
        
        action = notification_map.get(notification_type, "UNKNOWN")
        logger.info(f"Subscription action: {action}")
        
        return {"success": True, "action": action, "processed": True}

# Singleton instance
billing_service = BillingService()