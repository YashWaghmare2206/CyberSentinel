def calculate_edge_weight(cvss_score: float) -> float:
    """
    Inverts the CVSS score to create a pathfinding weight.
    Because a lower numerical value represents a higher priority in Dijkstra's algorithm,
    we subtract the CVSS score from 10.0.
    High risk (CVSS 10.0) -> Low weight (0.1) -> Preferred attack path.
    """
    if cvss_score is None:
        cvss_score = 0.0

    # Clamp CVSS score between 0.0 and 10.0
    cvss_score = max(0.0, min(10.0, float(cvss_score)))

    # Invert score: High risk = low path resistance
    weight = 10.0 - cvss_score

    # Ensure weight is strictly positive for Dijkstra
    return max(0.1, weight)