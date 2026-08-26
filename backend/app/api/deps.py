from fastapi import Depends
import uuid
from app.config import settings

# This is a temporary placeholder for Phase 4/5 development.
# In Phase 6 (Authentication), this module will be replaced with real JWT validation
# and database user lookup.

def get_development_user() -> uuid.UUID:
    """
    Development-only helper to resolve a predictable user identity without real authentication.
    Returns the DEV_USER_ID from configuration.
    """
    return settings.DEV_USER_ID

def get_current_user(user_id: uuid.UUID = Depends(get_development_user)) -> uuid.UUID:
    """
    Core dependency for resolving the current authenticated user's ID.
    Currently routes to the development user helper.
    Future: Will decode JWT, validate against the DB, and return the real user.
    """
    return user_id
