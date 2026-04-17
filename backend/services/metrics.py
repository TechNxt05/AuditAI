def calculate_cost(model_name: str, total_tokens: int) -> float:
    """Calculate an estimated cost for the execution based on token counts."""
    if not model_name:
        return 0.0
        
    model = model_name.lower()
    # Simple approx: assuming a rough mix of 1/3 input, 2/3 output, or just a blended rate
    if "gpt-4" in model:
        # User defined: gpt4_input_cost_per_1k = 0.01, output = 0.03
        # We'll use a blended rate of roughly $0.02 per 1k if we don't know the exact split
        return float((total_tokens / 1000.0) * 0.02)
    elif "gpt-3.5" in model:
        return float((total_tokens / 1000.0) * 0.002)
    elif "claude-3-opus" in model:
        return float((total_tokens / 1000.0) * 0.03)
    elif "claude-3-sonnet" in model:
        return float((total_tokens / 1000.0) * 0.006)
    elif "claude-3-haiku" in model:
        return float((total_tokens / 1000.0) * 0.001)
    
    return 0.0
