"""
=============================================================================
Hamming Code Module (Error Detection and Correction)
=============================================================================
Course: Data Communication Lab
Layer: Data Link Layer (Error Correction Technique)

Modes Supported:
1. Hamming (7,4): 4 data bits + 3 parity bits = 7 bits codeword.
2. Hamming (15,11): 11 data bits + 4 parity bits = 15 bits codeword.

Parity Schemes Supported:
- Even Parity
- Odd Parity

Features:
- Power-of-two parity bit placement (1, 2, 4, 8...).
- Binary syndrome calculation pinpointing 1-indexed error bit position.
- Automatic single-bit error correction.
=============================================================================
"""

def validate_hamming_input(data: str, mode: str = "7,4") -> dict:
    """
    Validates binary payload length and binary format according to Hamming mode.
    """
    if data is None or len(str(data).strip()) == 0:
        return {"valid": False, "error": "Input binary data payload cannot be empty."}

    raw_data = str(data).replace(" ", "")
    for ch in raw_data:
        if ch not in ('0', '1'):
            return {"valid": False, "error": f"Invalid non-binary character '{ch}' in payload. Only '0' and '1' are allowed."}

    norm_mode = str(mode).replace(" ", "")
    if norm_mode not in ("7,4", "15,11"):
        return {"valid": False, "error": f"Invalid Hamming mode '{mode}'. Supported modes are '7,4' and '15,11'."}

    req_len = 4 if norm_mode == "7,4" else 11
    if len(raw_data) != req_len:
        return {"valid": False, "error": f"Invalid payload length for Hamming ({norm_mode}). Required exactly {req_len} data bits, but received {len(raw_data)} bits."}

    return {"valid": True, "raw_data": raw_data, "mode": norm_mode, "req_len": req_len}


def get_hamming_positions(mode: str = "7,4") -> tuple:
    """
    Returns total bits count, parity position list, and data position list (1-indexed).
    """
    if mode == "7,4":
        total_bits = 7
        parity_positions = [1, 2, 4]
        data_positions = [3, 5, 6, 7]
    else:  # 15,11
        total_bits = 15
        parity_positions = [1, 2, 4, 8]
        data_positions = [3, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15]
    return total_bits, parity_positions, data_positions


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


def hamming_encode(data: str, mode: str = "7,4", parity_type: str = "even") -> dict:
    """
    Encodes binary data payload using Hamming (7,4) or Hamming (15,11).

    :param data: Binary data payload string (4 or 11 bits).
    :param mode: '7,4' or '15,11'.
    :param parity_type: 'even' or 'odd'.
    :return: Dictionary containing position map, parity bits, encoded codeword, and steps.
    """
    val = validate_hamming_input(data, mode=mode)
    if not val["valid"]:
        return {"success": False, "error": val["error"]}

    raw_data = val["raw_data"]
    norm_mode = val["mode"]
    p_type = parity_type.lower() if parity_type else "even"
    if p_type not in ("even", "odd"):
        return {"success": False, "error": f"Invalid parity type '{parity_type}'. Must be 'even' or 'odd'."}

    total_bits, parity_positions, data_positions = get_hamming_positions(norm_mode)
    codeword_arr = ['?'] * (total_bits + 1)  # 1-indexed

    # Map data bits to data positions
    for idx, data_pos in enumerate(data_positions):
        codeword_arr[data_pos] = raw_data[idx]

    steps = [
        f"Hamming ({norm_mode}) Encode Step 1: Input payload = '{raw_data}' ({len(raw_data)} bits), Scheme = '{p_type.upper()}' Parity",
        f"Hamming ({norm_mode}) Encode Step 2: Map data bits to non-power-of-2 positions: {dict(zip(data_positions, raw_data))}"
    ]

    parity_bits_calculated = {}

    # Calculate parity bits for each power of 2 position
    for p_pos in parity_positions:
        coverage = get_coverage_positions(p_pos, total_bits)
        # Covered data positions (excluding the parity bit itself)
        covered_data_positions = [pos for pos in coverage if pos in data_positions]
        covered_bits = [codeword_arr[pos] for pos in covered_data_positions]
        ones_count = covered_bits.count('1')

        p_val = calculate_parity_bit_val(ones_count, parity_type=p_type)
        codeword_arr[p_pos] = p_val
        parity_bits_calculated[f"P{p_pos}"] = p_val

        steps.append(f"Step 3 (P{p_pos}): Coverage positions = {coverage}. Data bits covered = {dict(zip(covered_data_positions, covered_bits))} (1s count = {ones_count}) -> P{p_pos} = '{p_val}'")

    encoded_codeword = "".join(codeword_arr[1:])
    steps.append(f"Hamming ({norm_mode}) Encode Step 4: Final Transmitted Codeword = '{encoded_codeword}'")

    # Build position map table for UI
    pos_table = []
    for pos in range(1, total_bits + 1):
        if pos in parity_positions:
            pos_table.append({"pos": pos, "type": f"P{pos}", "is_parity": True, "value": codeword_arr[pos]})
        else:
            d_idx = data_positions.index(pos) + 1
            pos_table.append({"pos": pos, "type": f"D{d_idx}", "is_parity": False, "value": codeword_arr[pos]})

    return {
        "success": True,
        "mode": norm_mode,
        "parity_type": p_type,
        "original_data": raw_data,
        "total_bits": total_bits,
        "parity_positions": parity_positions,
        "data_positions": data_positions,
        "parity_bits": parity_bits_calculated,
        "encoded_codeword": encoded_codeword,
        "pos_table": pos_table,
        "steps": steps
    }


def calculate_syndrome(received_codeword: str, mode: str = "7,4", parity_type: str = "even") -> dict:
    """
    Calculates syndrome bits and 1-indexed error position for a received codeword.

    :param received_codeword: Received binary codeword string (7 or 15 bits).
    :param mode: '7,4' or '15,11'.
    :param parity_type: 'even' or 'odd'.
    :return: Syndrome bits string, decimal error position, and check steps.
    """
    raw_cw = str(received_codeword).replace(" ", "")
    norm_mode = str(mode).replace(" ", "")
    p_type = parity_type.lower() if parity_type else "even"

    total_bits, parity_positions, data_positions = get_hamming_positions(norm_mode)
    if len(raw_cw) != total_bits:
        return {"success": False, "error": f"Invalid codeword length for Hamming ({norm_mode}). Required exactly {total_bits} bits, received {len(raw_cw)}."}

    for ch in raw_cw:
        if ch not in ('0', '1'):
            return {"success": False, "error": f"Invalid non-binary character '{ch}' in codeword."}

    cw_arr = ['?'] + list(raw_cw)  # 1-indexed

    syndrome_bits_dict = {}
    syndrome_bit_list = []
    steps = [
        f"Hamming ({norm_mode}) Decode Step 1: Received codeword = '{raw_cw}'",
        f"Hamming ({norm_mode}) Decode Step 2: Parity Check Syndrome Evaluation under '{p_type.upper()}' parity:"
    ]

    # Calculate syndrome bits in reverse order of parity positions for MSB to LSB (e.g. S4 S2 S1 or S8 S4 S2 S1)
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
    steps.append(f"Hamming ({norm_mode}) Decode Step 3: Combined Binary Syndrome S = '{syndrome_str}' (Decimal Position = {error_pos})")

    return {
        "success": True,
        "mode": norm_mode,
        "parity_type": p_type,
        "received_codeword": raw_cw,
        "syndrome_string": syndrome_str,
        "syndrome_dict": syndrome_bits_dict,
        "error_position": error_pos,
        "error_detected": (error_pos != 0),
        "steps": steps
    }


def hamming_decode(received_codeword: str, mode: str = "7,4", parity_type: str = "even") -> dict:
    """
    Decodes received codeword, pinpoints error position, auto-corrects single-bit error, and extracts original payload data.
    """
    syn_res = calculate_syndrome(received_codeword, mode=mode, parity_type=parity_type)
    if not syn_res["success"]:
        return syn_res

    raw_cw = syn_res["received_codeword"]
    norm_mode = syn_res["mode"]
    p_type = syn_res["parity_type"]
    err_pos = syn_res["error_position"]

    total_bits, parity_positions, data_positions = get_hamming_positions(norm_mode)
    cw_arr = ['?'] + list(raw_cw)  # 1-indexed

    steps = list(syn_res["steps"])
    original_bit = None
    corrected_bit = None
    corrected_cw = raw_cw

    if err_pos == 0:
        steps.append("Hamming Decode Step 4: Syndrome S = 000 -> STATUS: NO ERROR DETECTED")
    elif 1 <= err_pos <= total_bits:
        original_bit = cw_arr[err_pos]
        corrected_bit = '1' if original_bit == '0' else '0'
        cw_arr[err_pos] = corrected_bit
        corrected_cw = "".join(cw_arr[1:])
        steps.append(f"Hamming Decode Step 4: Syndrome S = {syn_res['syndrome_string']} -> ERROR DETECTED at Position {err_pos} (Array Index {err_pos - 1})")
        steps.append(f"Hamming Decode Step 5: AUTO-CORRECTING bit at Position {err_pos} ('{original_bit}' -> '{corrected_bit}')")
        steps.append(f"Hamming Decode Step 6: Corrected Codeword = '{corrected_cw}'")
    else:
        steps.append(f"Hamming Decode Step 4: Syndrome S = {syn_res['syndrome_string']} (Position {err_pos}) is outside codeword length {total_bits} -> Multi-bit / invalid corruption!")

    # Extract original payload data from data positions
    extracted_data_bits = "".join(cw_arr[pos] for pos in data_positions)
    steps.append(f"Hamming Decode Step 7: Extracted Payload Data Bits from positions {data_positions} = '{extracted_data_bits}'")

    # Position Table for visualization
    pos_table = []
    for pos in range(1, total_bits + 1):
        is_err = (pos == err_pos)
        val = cw_arr[pos]
        if pos in parity_positions:
            pos_table.append({"pos": pos, "type": f"P{pos}", "is_parity": True, "value": val, "is_error": is_err})
        else:
            d_idx = data_positions.index(pos) + 1
            pos_table.append({"pos": pos, "type": f"D{d_idx}", "is_parity": False, "value": val, "is_error": is_err})

    return {
        "success": True,
        "mode": norm_mode,
        "parity_type": p_type,
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


def process_hamming(data_bits: str, mode: str = "7,4", parity_type: str = "even", action: str = "full_cycle", injected_error: str = None, error_pos: int = None) -> dict:
    """
    Main entry point for Hamming Code encoding, bit flipping error injection, syndrome evaluation, and error correction.

    :param data_bits: Binary data payload string (4 bits for 7,4 or 11 bits for 15,11).
    :param mode: '7,4' or '15,11'.
    :param parity_type: 'even' or 'odd'.
    :param action: 'encode', 'decode', or 'full_cycle'.
    :param injected_error: Explicit corrupted codeword string.
    :param error_pos: 1-indexed bit position in codeword to flip.
    :return: Comprehensive result dictionary.
    """
    norm_mode = str(mode).replace(" ", "") if mode else "7,4"
    p_type = parity_type.lower() if parity_type else "even"

    if action == "decode":
        return hamming_decode(data_bits, mode=norm_mode, parity_type=p_type)

    encode_res = hamming_encode(data_bits, mode=norm_mode, parity_type=p_type)
    if not encode_res["success"]:
        return encode_res

    if action == "encode":
        return encode_res

    # Full Cycle Mode (Encode -> Optional Error Injection -> Decode & Correct)
    transmitted_cw = encode_res["encoded_codeword"]
    received_cw = transmitted_cw
    error_applied = False
    error_details = None

    if error_pos is not None and str(error_pos).isdigit():
        pos = int(error_pos)
        if 1 <= pos <= encode_res["total_bits"]:
            idx = pos - 1
            cw_chars = list(transmitted_cw)
            orig_bit = cw_chars[idx]
            flipped_bit = '1' if orig_bit == '0' else '0'
            cw_chars[idx] = flipped_bit
            received_cw = "".join(cw_chars)
            error_applied = True
            error_details = f"Flipped bit at 1-indexed Position {pos} (Array Index {idx}) ('{orig_bit}' -> '{flipped_bit}')"
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
