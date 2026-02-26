# AuditAI Python SDK

## Installation

```bash
pip install -e .
```

## Usage

```python
from auditai import AuditAI

# Initialize with your API key (JWT token)
client = AuditAI(api_key="your-jwt-token", base_url="http://localhost:8000")

# Log an execution trace
result = client.log_execution(
    project_name="my-rag-app",
    prompt="What is the capital of France?",
    response="The capital of France is Paris.",
    retrieval_docs=["France is a country in Europe. Its capital is Paris."],
    tools=[{"name": "search", "arguments": {"query": "capital of France"}}],
    tool_outputs=[{"result": "Paris is the capital of France"}],
    model="gpt-4",
    total_tokens=150,
    latency_ms=1200.0,
)

print(f"Execution ID: {result['id']}")

# Trigger evaluation
evaluation = client.evaluate(result['id'])
print(f"Overall Score: {evaluation['overall_score']}")

# Run adversarial tests
tests = client.run_adversarial(result['id'])
for test in tests:
    print(f"{test['test_type']}: {test['result_score']}")

# Get dashboard stats
stats = client.get_dashboard()
print(f"Total Executions: {stats['total_executions']}")
```
