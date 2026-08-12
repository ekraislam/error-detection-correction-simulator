"""
=============================================================================
Dynamic Hamming(n,k) Code Module (Error Detection and Correction)
=============================================================================
Course: Data Communication Lab
Layer: Data Link Layer (Error Correction Technique)

Supports Dynamic Hamming(n,k) for ANY binary data payload length k >= 1:
- Automatically calculates minimum parity bits r satisfying: 2^r >= k + r + 1
- Total codeword length n = k + r
- Power-of-two parity bit placement (1, 2, 4, 8, 16, ...) numbered Right-to-Left (1..n)
- Binary syndrome calculation pinpointing 1-indexed error position (Right-to-Left)
- Automatic single-bit error correction
=============================================================================
"""

def calculate_hamming_r_and_n(k: int) -> tuple:
    """
    Given k data bits, calculates minimum parity bits r satisfying 2^r >= k + r + 1,
    total bits n = k + r, parity positions list, and data positions list (1-indexed Right-to-Left).
    """
    r = 1
    while (1 << r) < (k + r + 1):
        r += 1
    n = k + r

    parity_positions = []
    p = 1
    while p <= n:
        parity_positions.append(p)
        p <<= 1

    data_positions = [pos for pos in range(1, n + 1) if pos not in parity_positions]

    return r, n, parity_positions, data_positions


def calculate_r_from_n(n: int) -> tuple:
    """
    Given total codeword length n, calculates number of parity bits r (count of powers of 2 <= n),
    k = n - r, parity positions list, and data positions list.
    """
    parity_positions = []
    p = 1
    while p <= n:
        parity_positions.append(p)
        p <<= 1

    r = len(parity_positions)
    k = n - r
    data_positions = [pos for pos in range(1, n + 1) if pos not in parity_positions]

    return r, k, parity_positions, data_positions


def validate_hamming_input(data: str, mode: str = "auto") -> dict:
    """
    Validates binary payload length and binary format dynamically.
    Automatically calculates r and n for any input binary string of length k >= 1.
    """
    if data is None or len(str(data).strip()) == 0:
        return {"valid": False, "error": "Input binary data payload cannot be empty."}

    raw_data = str(data).replace(" ", "")
    for ch in raw_data:
        if ch not in ('0', '1'):
            return {"valid": False, "error": f"Invalid non-binary character '{ch}' in payload. Only '0' and '1' are allowed."}

    k = len(raw_data)
    if k < 1:
        return {"valid": False, "error": "Input binary payload must be at least 1 bit."}

    r, n, parity_positions, data_positions = calculate_hamming_r_and_n(k)
    norm_mode = f"{n},{k}"

    return {
        "valid": True,
        "raw_data": raw_data,
        "mode": norm_mode,
        "k": k,
        "r": r,
        "n": n,
        "parity_positions": parity_positions,
        "data_positions": data_positions
    }


def get_hamming_positions(mode: str = "auto", n: int = None, k: int = None) -> tuple:
    """
    Returns total bits n, parity position list, and data position list (1-indexed Right-to-Left).
    """
    if n is not None:
        r, k_calc, parity_positions, data_positions = calculate_r_from_n(n)
        return n, parity_positions, data_positions

    if k is not None:
        r, n, parity_positions, data_positions = calculate_hamming_r_and_n(k)
        return n, parity_positions, data_positions

    if mode and "," in str(mode):
        try:
            parts = str(mode).replace(" ", "").split(",")
            n_val = int(parts[0])
            r, k_calc, parity_positions, data_positions = calculate_r_from_n(n_val)
            return n_val, parity_positions, data_positions
        except Exception:
            pass

    return 7, [1, 2, 4], [3, 5, 6, 7]


def get_coverage_positions(p_pos: int, total_bits: int) -> list:
    """
    Returns list of 1-indexed positions covered by parity bit p_pos.
    A position is covered if (pos & p_pos) != 0.
    """
    return [pos for pos in range(1, total_bits + 1) if (pos & p_pos) != 0]


def calculate_parity_bit_val(ones_count: int, parity_type: str = "even") -> str:
    """Calculates parity bit value ('0' or '1') based on count of ones."""
    if parity_type.lower() == "even":
        return '0' if (ones_count % 2 == 0) else '1'
    else:
        return '1' if (ones_count % 2 == 0) else '0'


def hamming_encode(data: str, mode: str = "auto", parity_type: str = "even") -> dict:
    """
    Encodes binary data payload dynamically for any length k under Right-to-Left positional convention.
    """
    val = validate_hamming_input(data, mode=mode)
    if not val["valid"]:
        return {"success": False, "error": val["error"]}

    raw_data = val["raw_data"]
    norm_mode = val["mode"]
    k = val["k"]
    r = val["r"]
    total_bits = val["n"]
    parity_positions = val["parity_positions"]
    data_positions = val["data_positions"]

    p_type = parity_type.lower() if parity_type else "even"
    if p_type not in ("even", "odd"):
        return {"success": False, "error": f"Invalid parity type '{parity_type}'. Must be 'even' or 'odd'."}

    cw_arr = ['?'] * (total_bits + 1)

    desc_data_positions = list(reversed(data_positions))
    for idx, data_pos in enumerate(desc_data_positions):
        cw_arr[data_pos] = raw_data[idx]

    steps = [
        f"Dynamic Hamming ({norm_mode}) Encode Step 1: Input payload = '{raw_data}' (Data Bits k = {k}, Parity Bits r = {r}, Total Bits n = {total_bits}), Scheme = '{p_type.upper()}' Parity",
        f"Dynamic Hamming ({norm_mode}) Encode Step 2: Map data bits to non-parity positions (Right-to-Left P={total_bits}..1): {dict(zip(desc_data_positions, raw_data))}"
    ]

    parity_bits_calculated = {}

    for p_pos in parity_positions:
        coverage = get_coverage_positions(p_pos, total_bits)
        covered_data_positions = [pos for pos in coverage if pos in data_positions]
        covered_bits = [cw_arr[pos] for pos in covered_data_positions]
        ones_count = covered_bits.count('1')

        p_val = calculate_parity_bit_val(ones_count, parity_type=p_type)
        cw_arr[p_pos] = p_val
        parity_bits_calculated[f"R{p_pos}"] = p_val

        steps.append(f"Step 3 (R{p_pos}): Coverage positions = {coverage}. Data bits covered = {dict(zip(covered_data_positions, covered_bits))} (1s count = {ones_count}) -> R{p_pos} = '{p_val}'")

    encoded_codeword = "".join(cw_arr[pos] for pos in range(total_bits, 0, -1))
    steps.append(f"Dynamic Hamming ({norm_mode}) Encode Step 4: Final Transmitted Codeword (Pos {total_bits}..1) = '{encoded_codeword}'")

    pos_table = []
    for pos in range(total_bits, 0, -1):
        if pos in parity_positions:
            pos_table.append({"pos": pos, "type": f"R{pos}", "is_parity": True, "value": cw_arr[pos]})
        else:
            d_idx = data_positions.index(pos) + 1
            pos_table.append({"pos": pos, "type": f"D{d_idx}", "is_parity": False, "value": cw_arr[pos]})

    return {
        "success": True,
        "mode": norm_mode,
        "parity_type": p_type,
        "original_data": raw_data,
        "k": k,
        "r": r,
        "total_bits": total_bits,
        "parity_positions": parity_positions,
        "data_positions": data_positions,
        "parity_bits": parity_bits_calculated,
        "encoded_codeword": encoded_codeword,
        "pos_table": pos_table,
        "steps": steps
    }


def calculate_syndrome(received_codeword: str, mode: str = "auto", parity_type: str = "even") -> dict:
    """
    Calculates syndrome bits and 1-indexed error position dynamically for a received codeword.
    """
    raw_cw = str(received_codeword).replace(" ", "")
    p_type = parity_type.lower() if parity_type else "even"

    for ch in raw_cw:
        if ch not in ('0', '1'):
            return {"success": False, "error": f"Invalid non-binary character '{ch}' in codeword."}

    total_bits = len(raw_cw)
    if total_bits < 3:
        return {"success": False, "error": f"Codeword length {total_bits} is too short for Hamming decoding (minimum 3 bits required)."}

    r, k, parity_positions, data_positions = calculate_r_from_n(total_bits)
    norm_mode = f"{total_bits},{k}"

    cw_arr = ['?'] * (total_bits + 1)
    for pos in range(1, total_bits + 1):
        cw_arr[pos] = raw_cw[total_bits - pos]

    syndrome_bits_dict = {}
    syndrome_bit_list = []
    steps = [
        f"Dynamic Hamming ({norm_mode}) Decode Step 1: Received codeword = '{raw_cw}' (Total Bits n = {total_bits}, Data Bits k = {k}, Parity Bits r = {r})",
        f"Dynamic Hamming ({norm_mode}) Decode Step 2: Parity Check Syndrome Evaluation under '{p_type.upper()}' parity:"
    ]

    for p_pos in reversed(parity_positions):
        coverage = get_coverage_positions(p_pos, total_bits)
        covered_bits = [cw_arr[pos] for pos in coverage]
        ones_count = covered_bits.count('1')

        if p_type == "even":
            s_val = '0' if (ones_count % 2 == 0) else '1'
        else:
            s_val = '0' if (ones_count % 2 != 0) else '1'

        syndrome_bits_dict[f"S{p_pos}"] = s_val
        syndrome_bit_list.append(s_val)
        steps.append(f"  Check S{p_pos} over positions {coverage} (bits: {''.join(covered_bits)}, 1s count = {ones_count}) -> S{p_pos} = '{s_val}'")

    syndrome_str = "".join(syndrome_bit_list)
    error_pos = int(syndrome_str, 2)
    steps.append(f"Dynamic Hamming ({norm_mode}) Decode Step 3: Combined Binary Syndrome S = '{syndrome_str}' (Decimal Position = {error_pos})")

    return {
        "success": True,
        "mode": norm_mode,
        "parity_type": p_type,
        "k": k,
        "r": r,
        "total_bits": total_bits,
        "received_codeword": raw_cw,
        "syndrome_string": syndrome_str,
        "syndrome_dict": syndrome_bits_dict,
        "error_position": error_pos,
        "error_detected": (error_pos != 0),
        "steps": steps
    }


def hamming_decode(received_codeword: str, mode: str = "auto", parity_type: str = "even") -> dict:
    """
    Decodes received codeword dynamically, pinpoints error position, auto-corrects single-bit error, and extracts original payload data.
    """
    syn_res = calculate_syndrome(received_codeword, mode=mode, parity_type=parity_type)
    if not syn_res["success"]:
        return syn_res

    raw_cw = syn_res["received_codeword"]
    norm_mode = syn_res["mode"]
    p_type = syn_res["parity_type"]
    err_pos = syn_res["error_position"]
    total_bits = syn_res["total_bits"]
    k = syn_res["k"]
    r = syn_res["r"]

    r_calc, k_calc, parity_positions, data_positions = calculate_r_from_n(total_bits)
    cw_arr = ['?'] * (total_bits + 1)
    for pos in range(1, total_bits + 1):
        cw_arr[pos] = raw_cw[total_bits - pos]

    steps = list(syn_res["steps"])
    original_bit = None
    corrected_bit = None
    corrected_cw = raw_cw

    if err_pos == 0:
        steps.append("Dynamic Hamming Decode Step 4: Syndrome S = 0 -> STATUS: NO ERROR DETECTED")
    elif 1 <= err_pos <= total_bits:
        original_bit = cw_arr[err_pos]
        corrected_bit = '1' if original_bit == '0' else '0'
        cw_arr[err_pos] = corrected_bit
        corrected_cw = "".join(cw_arr[pos] for pos in range(total_bits, 0, -1))
        steps.append(f"Dynamic Hamming Decode Step 4: Syndrome S = {syn_res['syndrome_string']} -> ERROR DETECTED at Right-to-Left Position {err_pos}")
        steps.append(f"Dynamic Hamming Decode Step 5: AUTO-CORRECTING bit at Position {err_pos} ('{original_bit}' -> '{corrected_bit}')")
        steps.append(f"Dynamic Hamming Decode Step 6: Corrected Codeword = '{corrected_cw}'")
    else:
        steps.append(f"Dynamic Hamming Decode Step 4: Syndrome S = {syn_res['syndrome_string']} (Position {err_pos}) is outside codeword length {total_bits} -> Multi-bit / invalid corruption!")

    desc_data_positions = list(reversed(data_positions))
    extracted_data_bits = "".join(cw_arr[pos] for pos in desc_data_positions)
    steps.append(f"Dynamic Hamming Decode Step 7: Extracted Payload Data Bits ({k} bits) from positions {desc_data_positions} = '{extracted_data_bits}'")

    pos_table = []
    for pos in range(total_bits, 0, -1):
        is_err = (pos == err_pos)
        val = cw_arr[pos]
        if pos in parity_positions:
            pos_table.append({"pos": pos, "type": f"R{pos}", "is_parity": True, "value": val, "is_error": is_err})
        else:
            d_idx = data_positions.index(pos) + 1
            pos_table.append({"pos": pos, "type": f"D{d_idx}", "is_parity": False, "value": val, "is_error": is_err})

    return {
        "success": True,
        "mode": norm_mode,
        "parity_type": p_type,
        "k": k,
        "r": r,
        "total_bits": total_bits,
        "received_codeword": raw_cw,
        "syndrome_string": syn_res["syndrome_string"],
        "error_position": err_pos,
        "error_detected": (err_pos != 0),
        "original_bit": original_bit,
        "corrected_bit": corrected_bit,
        "corrected_codeword": corrected_cw,
        "extracted_data": extracted_data_bits,
        "pos_table": pos_table,
        "steps": steps
    }


def process_hamming(data_bits: str, mode: str = "auto", parity_type: str = "even", action: str = "full_cycle", injected_error: str = None, error_pos: int = None) -> dict:
    """
    Main entry point for Dynamic Hamming Code encoding, bit flipping error injection, syndrome evaluation, and error correction.
    """
    norm_mode = str(mode).replace(" ", "") if mode else "auto"
    p_type = parity_type.lower() if parity_type else "even"

    if action == "decode":
        return hamming_decode(data_bits, mode=norm_mode, parity_type=p_type)

    encode_res = hamming_encode(data_bits, mode=norm_mode, parity_type=p_type)
    if not encode_res["success"]:
        return encode_res

    norm_mode = encode_res["mode"]

    if action == "encode":
        return encode_res

    transmitted_cw = encode_res["encoded_codeword"]
    received_cw = transmitted_cw
    error_applied = False
    error_details = None

    if error_pos is not None and str(error_pos).isdigit():
        pos = int(error_pos)
        if 1 <= pos <= encode_res["total_bits"]:
            idx = encode_res["total_bits"] - pos
            cw_chars = list(transmitted_cw)
            orig_bit = cw_chars[idx]
            flipped_bit = '1' if orig_bit == '0' else '0'
            cw_chars[idx] = flipped_bit
            received_cw = "".join(cw_chars)
            error_applied = True
            error_details = f"Flipped bit at 1-indexed Right-to-Left Position {pos} (String Index {idx}) ('{orig_bit}' -> '{flipped_bit}')"
        else:
            return {"success": False, "error": f"Invalid error position {error_pos}. Must be between 1 and codeword length ({encode_res['total_bits']})."}
    elif injected_error and len(str(injected_error).strip()) > 0:
        received_cw = str(injected_error).strip()
        error_applied = True
        error_details = f"Corrupted codeword provided: '{received_cw}'"

    decode_res = hamming_decode(received_cw, mode=norm_mode, parity_type=p_type)

    combined_steps = list(encode_res["steps"])
    if error_applied:
        combined_steps.append(f"[ERROR INJECTION]: {error_details}")
        combined_steps.append(f"[CORRUPTED CODEWORD]: Received Codeword = '{received_cw}'")

    if decode_res["success"]:
        combined_steps.extend(decode_res["steps"])

    return {
        "success": True,
        "action": "full_cycle",
        "mode": norm_mode,
        "parity_type": p_type,
        "k": encode_res["k"],
        "r": encode_res["r"],
        "total_bits": encode_res["total_bits"],
        "original_data": encode_res["original_data"],
        "parity_bits": encode_res["parity_bits"],
        "encoded_codeword": transmitted_cw,
        "received_codeword": received_cw,
        "syndrome_string": decode_res.get("syndrome_string"),
        "error_position": decode_res.get("error_position"),
        "original_bit": decode_res.get("original_bit"),
        "corrected_bit": decode_res.get("corrected_bit"),
        "corrected_codeword": decode_res.get("corrected_codeword"),
        "extracted_data": decode_res.get("extracted_data"),
        "pos_table": decode_res.get("pos_table"),
        "error_injected": error_applied,
        "error_details": error_details,
        "error_detected": decode_res.get("error_detected", False),
        "integrity_match": (decode_res.get("extracted_data") == encode_res["original_data"]),
        "steps": combined_steps
    }
