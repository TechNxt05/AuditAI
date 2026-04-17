import sys
import os

# Assuming you run this from the examples folder
_parent = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(_parent, "sdk", "python"))

try:
    from auditai import AuditAI
except ImportError:
    print("Please install the SDK first: pip install -e ../sdk/python")
    sys.exit(1)

def main():
    # Make sure your backend logic is running locally!
    client = AuditAI(api_key="mock_key_or_real_key_here", base_url="http://localhost:8000/api")

    # This example demonstrates sending a mock RAG pipeline trace
    # To AuditAI for ingestion.
    project_name = "Invoice Parser RAG"
    
    question = "What is the total amount due on invoice #1234?"
    retrieved_docs = [
        "Invoice #1234\nDate: 2024-04-10\nBill To: Acme Corp\nItem: Software License - $5,000\nTotal Due: $5,000",
    ]
    tool_calls = [
        {
            "name": "search_invoices",
            "arguments": {"query": "invoice #1234"}
        }
    ]
    tool_outputs = [
        {
            "result": "Found invoice #1234 for $5,000"
        }
    ]
    
    response = "Based on the retrieved invoice #1234, the total amount due is $5,000."
    
    print("🚀 Ingesting Trace...")
    try:
        result = client.log_execution(
            project_name=project_name,
            prompt=question,
            response=response,
            retrieval_docs=retrieved_docs,
            tools=tool_calls,
            tool_outputs=tool_outputs,
            model="gpt-4",
            total_tokens=210,
            latency_ms=850.0,
        )
        print(f"✅ Extracted Trace. Execution ID: {result.get('id')}")
        
        print("\n🧠 Triggering Evaluator Pipeline (including semantic grounding)...")
        evaluation = client.evaluate(result["id"])
        print(f"Overall Score: {evaluation.get('overall_score')}")
        print(f"Failure Taxonomy: {evaluation.get('failure_taxonomy')}")

    except Exception as e:
        print(f"Error communicating with backend: {e}")
        
if __name__ == "__main__":
    main()
