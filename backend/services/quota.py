from fastapi import HTTPException
from models import User, PlanTier
from config import settings


TIER_LIMITS = {
    PlanTier.FREE: settings.FREE_TIER_EXECUTIONS,
    PlanTier.PRO: settings.PRO_TIER_EXECUTIONS,
    PlanTier.ENTERPRISE: settings.ENTERPRISE_TIER_EXECUTIONS,
}


def check_quota(user: User) -> None:
    """Check if user has remaining quota based on their plan tier."""
    limit = TIER_LIMITS.get(user.plan_tier, settings.FREE_TIER_EXECUTIONS)
    if user.execution_count >= limit:
        raise HTTPException(
            status_code=429,
            detail=f"Execution quota exceeded for {user.plan_tier.value} plan. "
                   f"Limit: {limit}. Current: {user.execution_count}. "
                   f"Upgrade your plan to continue.",
        )
