from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from database import get_db
from models import Execution, Evaluation, Project, User, AdversarialTest
from schemas import AdversarialTestOut
from deps import get_current_user

router = APIRouter(prefix="/adversarial", tags=["Adversarial Tests"])


@router.post("/{execution_id}/run", response_model=List[AdversarialTestOut])
def run_adversarial_tests(
    execution_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    execution = (
        db.query(Execution)
        .join(Project)
        .filter(Execution.id == execution_id, Project.user_id == current_user.id)
        .first()
    )
    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")

    from services.adversarial import run_adversarial_suite
    tests = run_adversarial_suite(db, execution)
    return tests


@router.get("/{execution_id}", response_model=List[AdversarialTestOut])
def get_adversarial_tests(
    execution_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    execution = (
        db.query(Execution)
        .join(Project)
        .filter(Execution.id == execution_id, Project.user_id == current_user.id)
        .first()
    )
    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")

    return (
        db.query(AdversarialTest)
        .filter(AdversarialTest.execution_id == execution_id)
        .all()
    )
