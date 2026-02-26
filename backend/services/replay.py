from sqlalchemy.orm import Session
from models import Execution, TraceStep
import copy


def replay_execution(db: Session, execution: Execution, new_model_name: str) -> Execution:
    """
    Replay an execution with a different model name.
    Creates a new execution with the same trace steps but updated model.
    In a production system, this would actually call the new model's API.
    """
    new_execution = Execution(
        project_id=execution.project_id,
        model_name=new_model_name,
        total_tokens=execution.total_tokens,
        latency_ms=execution.latency_ms,
        status=execution.status,
    )
    db.add(new_execution)
    db.flush()

    # Copy trace steps to new execution
    for step in execution.trace_steps:
        new_step = TraceStep(
            execution_id=new_execution.id,
            step_order=step.step_order,
            step_type=step.step_type,
            content=copy.deepcopy(step.content) if step.content else {},
            latency_ms=step.latency_ms,
        )
        db.add(new_step)

    db.commit()
    db.refresh(new_execution)
    return new_execution
