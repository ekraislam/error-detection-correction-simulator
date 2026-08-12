"""
=============================================================================
Hamming Distance & Minimum Distance (d_min) Module
=============================================================================
Course: Data Communication Lab
Layer: Data Link Layer (Error Detection & Correction Theory)

Definitions:
1. Hamming Distance d(c1, c2): Number of bit positions where two equal-length
   binary codewords differ.
2. Minimum Hamming Distance d_min: The smallest pairwise Hamming distance
   between any two distinct valid codewords in a code set.
3. Error Detection Capability: s = d_min - 1
4. Error Correction Capability: t = floor((d_min - 1) / 2)
=============================================================================
"""

import math

def validate_codeword(cw: str, name: str = "Codeword") -> dict:
    """
    Validates a binary codeword string.
    """
    if cw is None or len(str(cw).strip()) == 0:
        return {"valid": False, "error": f"{name} cannot be empty."}

    raw_cw = str(cw).replace(" ", "")
    for ch in raw_cw:
        if ch not in ('0', '1'):
            return {"valid": False, "error": f"Invalid non-binary character '{ch}' in {name}. Only '0' and '1' are allowed."}

    return {"valid": True, "raw_cw": raw_cw}


def calculate_error_capabilities(d_min: int) -> dict:
    """
    Calculates maximum detectable (s) and correctable (t) errors from d_min.
    s = max(0, d_min - 1)
    t = max(0, floor((d_min - 1) / 2))
    """
    if d_min is None or d_min < 1:
        return {"detectable_s": 0, "correctable_t": 0}

    s = d_min - 1
    t = math.floor((d_min - 1) / 2)
    return {"detectable_s": s, "correctable_t": t}


def compare_codewords(c1: str, c2: str) -> dict:
    """
    Compares two binary codewords bit-by-bit and calculates Hamming distance.

    :param c1: First binary codeword.
    :param c2: Second binary codeword.
    :return: Dictionary containing XOR result, differing positions, distance, and trace steps.
    """
    val1 = validate_codeword(c1, "Codeword 1")
    if not val1["valid"]:
        return {"success": False, "error": val1["error"]}

    val2 = validate_codeword(c2, "Codeword 2")
    if not val2["valid"]:
        return {"success": False, "error": val2["error"]}

    raw_c1 = val1["raw_cw"]
    raw_c2 = val2["raw_cw"]

    if len(raw_c1) != len(raw_c2):
        return {"success": False, "error": f"Codeword length mismatch. Codeword 1 length ({len(raw_c1)}) != Codeword 2 length ({len(raw_c2)}). Both codewords must have identical lengths."}

    differing_positions = []
    comparison_trace = []
    xor_chars = []

    for idx, (bit1, bit2) in enumerate(zip(raw_c1, raw_c2)):
        pos = idx + 1
        is_match = (bit1 == bit2)
        xor_bit = '0' if is_match else '1'
        xor_chars.append(xor_bit)

        if not is_match:
            differing_positions.append(pos)

        comparison_trace.append({
            "pos": pos,
            "bit1": bit1,
            "bit2": bit2,
            "match": is_match,
            "xor_bit": xor_bit
        })

    distance = len(differing_positions)
    xor_result = "".join(xor_chars)

    steps = [
        f"Hamming Distance Calculation Setup: Codeword 1 = '{raw_c1}', Codeword 2 = '{raw_c2}' (Length = {len(raw_c1)})",
        f"Step 1: Perform Bitwise XOR: '{raw_c1}' ^ '{raw_c2}' = '{xor_result}'",
        f"Step 2: Count number of '1's in XOR result = {distance}",
        f"Step 3: Identified {distance} differing 1-indexed bit position(s): {differing_positions if differing_positions else 'None (Identical Codewords)'}",
        f"Step 4: Final Hamming Distance d(c1, c2) = {distance}"
    ]

    return {
        "success": True,
        "mode": "pair",
        "codeword1": raw_c1,
        "codeword2": raw_c2,
        "length": len(raw_c1),
        "xor_result": xor_result,
        "differing_positions": differing_positions,
        "comparison": comparison_trace,
        "distance": distance,
        "steps": steps
    }


def calculate_minimum_distance(codewords: list) -> dict:
    """
    Calculates minimum Hamming distance (d_min) across a set of multiple codewords.

    :param codewords: List of binary codeword strings.
    :return: Pairwise distance matrix, d_min, detectable errors s, correctable errors t, and steps.
    """
    if not codewords or len(codewords) == 0:
        return {"success": False, "error": "Codeword list cannot be empty."}

    # Clean & validate list
    clean_cws = [str(cw).replace(" ", "") for cw in codewords if cw is not None and len(str(cw).strip()) > 0]

    if len(clean_cws) < 2:
        return {"success": False, "error": f"At least 2 valid codewords are required to calculate minimum Hamming distance (d_min). Received {len(clean_cws)} codeword."}

    req_len = len(clean_cws[0])
    for idx, cw in enumerate(clean_cws):
        val = validate_codeword(cw, f"Codeword {idx+1}")
        if not val["valid"]:
            return {"success": False, "error": val["error"]}

        if len(cw) != req_len:
            return {"success": False, "error": f"Codeword length mismatch. Codeword {idx+1} ('{cw}', length {len(cw)}) differs from Codeword 1 ('{clean_cws[0]}', length {req_len}). All codewords must have identical lengths."}

    num_cw = len(clean_cws)
    matrix = [[0] * num_cw for _ in range(num_cw)]
    pairwise_pairs = []

    has_duplicates = False
    duplicate_pairs = []
    min_dist = float('inf')

    steps = [
        f"Minimum Hamming Distance (d_min) Setup: {num_cw} Codewords of length {req_len}",
        f"Codewords Set = {clean_cws}",
        f"Step 1: Calculate Pairwise Hamming Distances across all {num_cw * (num_cw - 1) // 2} unique pairs:"
    ]

    for i in range(num_cw):
        for j in range(num_cw):
            if i == j:
                matrix[i][j] = 0
            elif i < j:
                comp = compare_codewords(clean_cws[i], clean_cws[j])
                dist = comp["distance"]
                matrix[i][j] = dist
                matrix[j][i] = dist
                pairwise_pairs.append({
                    "c1_idx": i + 1,
                    "c2_idx": j + 1,
                    "c1": clean_cws[i],
                    "c2": clean_cws[j],
                    "distance": dist
                })

                steps.append(f"  d(C{i+1}, C{j+1}) = d('{clean_cws[i]}', '{clean_cws[j]}') = {dist}")

                if dist == 0:
                    has_duplicates = True
                    duplicate_pairs.append((i + 1, j + 1))
                else:
                    if dist < min_dist:
                        min_dist = dist

    if has_duplicates:
        min_dist = 0
        steps.append(f"Notice: Duplicate codeword(s) detected in set at pairs {duplicate_pairs} -> d_min = 0 (Set is not uniquely separated).")
    elif min_dist == float('inf'):
        min_dist = 0

    caps = calculate_error_capabilities(min_dist)

    steps.append(f"Step 2: Minimum Pairwise Hamming Distance d_min = {min_dist}")
    steps.append(f"Step 3: Theoretical Error Detection Capability: s = d_min - 1 = {caps['detectable_s']} error(s)")
    steps.append(f"Step 4: Theoretical Error Correction Capability: t = floor((d_min - 1) / 2) = {caps['correctable_t']} error(s)")

    return {
        "success": True,
        "mode": "multi",
        "codewords": clean_cws,
        "num_codewords": num_cw,
        "codeword_length": req_len,
        "pairwise_matrix": matrix,
        "pairwise_pairs": pairwise_pairs,
        "has_duplicates": has_duplicates,
        "duplicate_pairs": duplicate_pairs,
        "d_min": min_dist,
        "detectable_errors_s": caps["detectable_s"],
        "correctable_errors_t": caps["correctable_t"],
        "steps": steps
    }


def process_hamming_distance(c1_or_list, c2: str = None, mode: str = "pair") -> dict:
    """
    Main entry point for Hamming Distance processing.

    :param c1_or_list: Codeword 1 string (if mode='pair') or List of Codewords (if mode='multi').
    :param c2: Codeword 2 string (if mode='pair').
    :param mode: 'pair' or 'multi'.
    :return: Structured result dictionary.
    """
    if mode == "multi" or isinstance(c1_or_list, list):
        if isinstance(c1_or_list, str):
            # Parse line or comma-separated string
            raw_list = [item.strip() for item in c1_or_list.replace("\n", ",").split(",") if item.strip()]
            return calculate_minimum_distance(raw_list)
        return calculate_minimum_distance(c1_or_list)

    # Mode A: Pairwise comparison
    return compare_codewords(str(c1_or_list), str(c2) if c2 is not None else "")
