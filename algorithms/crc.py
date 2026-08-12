"""
=============================================================================
Cyclic Redundancy Check (CRC) Module
=============================================================================
Course: Data Communication Lab
Layer: Data Link Layer (Error Detection Technique)

Concept:
CRC uses polynomial-based modulo-2 division to calculate a checksum remainder
that is appended to the original data payload. The receiver repeats the division.
A non-zero remainder indicates that transmission errors occurred.
=============================================================================
"""

def validate_crc_inputs(data: str, polynomial: str) -> dict:
    """
    Validates binary data payload and generator polynomial inputs.
    """
    if data is None or len(str(data).strip()) == 0:
        return {"valid": False, "error": "Input binary data payload cannot be empty."}

    raw_data = str(data).replace(" ", "")
    for ch in raw_data:
        if ch not in ('0', '1'):
            return {"valid": False, "error": f"Invalid non-binary character '{ch}' in payload. Only '0' and '1' are allowed."}

    if polynomial is None or len(str(polynomial).strip()) == 0:
        return {"valid": False, "error": "Generator polynomial cannot be empty."}

    raw_poly = str(polynomial).replace(" ", "")
    for ch in raw_poly:
        if ch not in ('0', '1'):
            return {"valid": False, "error": f"Invalid non-binary character '{ch}' in generator polynomial. Only '0' and '1' are allowed."}

    if len(raw_poly) < 2:
        return {"valid": False, "error": f"Generator polynomial '{raw_poly}' is too short. Must be at least 2 bits long."}

    if not raw_poly.startswith('1'):
        return {"valid": False, "error": f"Invalid generator polynomial '{raw_poly}'. Polynomial must start with '1'."}

    if not raw_poly.endswith('1'):
        return {"valid": False, "error": f"Invalid generator polynomial '{raw_poly}'. Polynomial must end with '1'."}

    return {"valid": True, "raw_data": raw_data, "raw_poly": raw_poly}


def xor_bits(a: str, b: str) -> str:
    """Performs bitwise XOR between two binary strings of equal length."""
    return "".join('0' if bit_a == bit_b else '1' for bit_a, bit_b in zip(a, b))


def modulo2_division(dividend: str, divisor: str) -> tuple:
    """
    Performs modulo-2 XOR division of dividend by divisor.

    :param dividend: Binary dividend string (payload + appended zeros/remainder).
    :param divisor: Binary generator polynomial.
    :return: Tuple of (remainder_string, list_of_step_trace_strings).
    """
    pick = len(divisor)
    curr = dividend[0:pick]
    steps = []
    step_num = 1

    steps.append(f"Modulo-2 Division Setup: Dividend = '{dividend}', Generator = '{divisor}' (Length = {pick})")
    steps.append(f"Step {step_num}: Initial dividend segment = '{curr}'")

    while pick < len(dividend):
        if curr[0] == '1':
            xor_res = xor_bits(curr, divisor)
            next_bit = dividend[pick]
            new_curr = xor_res[1:] + next_bit
            steps.append(f"Step {step_num+1}: MSB is '1' -> XOR '{curr}' ^ '{divisor}' = '{xor_res}'. Drop MSB & bring down '{next_bit}' -> '{new_curr}'")
            curr = new_curr
        else:
            zero_div = '0' * len(divisor)
            xor_res = xor_bits(curr, zero_div)
            next_bit = dividend[pick]
            new_curr = xor_res[1:] + next_bit
            steps.append(f"Step {step_num+1}: MSB is '0' -> XOR '{curr}' ^ '{zero_div}' = '{xor_res}'. Drop MSB & bring down '{next_bit}' -> '{new_curr}'")
            curr = new_curr

        pick += 1
        step_num += 1

    # Final step for remaining segment
    if curr[0] == '1':
        xor_res = xor_bits(curr, divisor)
        remainder = xor_res[1:]
        steps.append(f"Step {step_num+1}: Final segment MSB is '1' -> XOR '{curr}' ^ '{divisor}' = '{xor_res}'. Final Remainder = '{remainder}'")
    else:
        zero_div = '0' * len(divisor)
        xor_res = xor_bits(curr, zero_div)
        remainder = xor_res[1:]
        steps.append(f"Step {step_num+1}: Final segment MSB is '0' -> XOR '{curr}' ^ '{zero_div}' = '{xor_res}'. Final Remainder = '{remainder}'")

    return remainder, steps


def crc_encode(data: str, polynomial: str = "1101") -> dict:
    """
    Performs CRC encoding on input binary data payload using generator polynomial.

    :param data: Binary payload string.
    :param polynomial: Generator polynomial string (default '1101').
    :return: Dictionary containing appended data, CRC remainder, transmitted codeword, and steps.
    """
    val = validate_crc_inputs(data, polynomial)
    if not val["valid"]:
        return {"success": False, "error": val["error"]}

    raw_data = val["raw_data"]
    raw_poly = val["raw_poly"]

    degree = len(raw_poly) - 1
    appended_zeros = '0' * degree
    appended_dividend = raw_data + appended_zeros

    remainder, div_steps = modulo2_division(appended_dividend, raw_poly)
    transmitted_codeword = raw_data + remainder

    steps = [
        f"CRC Encode Step 1: Original payload = '{raw_data}', Generator Polynomial = '{raw_poly}' (Degree r = {degree})",
        f"CRC Encode Step 2: Append {degree} zeros to payload -> Appended Dividend = '{appended_dividend}'",
        f"CRC Encode Step 3: Perform Modulo-2 Division of '{appended_dividend}' by '{raw_poly}'"
    ]
    steps.extend(div_steps)
    steps.append(f"CRC Encode Step 4: Calculated CRC Remainder = '{remainder}'")
    steps.append(f"CRC Encode Step 5: Replace appended zeros with CRC Remainder -> Final Transmitted Codeword = '{transmitted_codeword}'")

    return {
        "success": True,
        "original_data": raw_data,
        "generator": raw_poly,
        "generator_degree": degree,
        "appended_data": appended_dividend,
        "crc_remainder": remainder,
        "transmitted_codeword": transmitted_codeword,
        "steps": steps
    }


def crc_check(received_codeword: str, polynomial: str = "1101") -> dict:
    """
    Performs receiver-side CRC check on a received binary codeword.

    :param received_codeword: Received codeword string.
    :param polynomial: Generator polynomial string.
    :return: Receiver remainder, error detection status, and steps.
    """
    if received_codeword is None or len(str(received_codeword).strip()) == 0:
        return {"success": False, "error": "Received codeword cannot be empty."}

    raw_cw = str(received_codeword).replace(" ", "")
    for ch in raw_cw:
        if ch not in ('0', '1'):
            return {"success": False, "error": f"Invalid non-binary character '{ch}' in received codeword."}

    val_poly = validate_crc_inputs("0", polynomial)
    if not val_poly["valid"]:
        return {"success": False, "error": val_poly["error"]}

    raw_poly = val_poly["raw_poly"]
    degree = len(raw_poly) - 1

    if len(raw_cw) <= degree:
        return {"success": False, "error": f"Received codeword length ({len(raw_cw)}) must be greater than generator polynomial degree ({degree})."}

    remainder, div_steps = modulo2_division(raw_cw, raw_poly)
    is_zero_remainder = all(ch == '0' for ch in remainder)

    steps = [
        f"CRC Check Step 1: Received Codeword = '{raw_cw}', Generator = '{raw_poly}'",
        f"CRC Check Step 2: Perform Modulo-2 Division of '{raw_cw}' by '{raw_poly}'"
    ]
    steps.extend(div_steps)

    if is_zero_remainder:
        steps.append(f"CRC Check Step 3: Receiver Remainder = '{remainder}' (All zeros) -> STATUS: NO ERROR DETECTED")
    else:
        steps.append(f"CRC Check Step 3: Receiver Remainder = '{remainder}' (Non-zero) -> STATUS: ERROR DETECTED")

    return {
        "success": True,
        "received_codeword": raw_cw,
        "generator": raw_poly,
        "received_remainder": remainder,
        "error_detected": not is_zero_remainder,
        "steps": steps
    }


def process_crc(data_stream: str, polynomial: str = "1101", action: str = "full_cycle", injected_error: str = None, error_pos: int = None) -> dict:
    """
    Main entry point for CRC encoding, bit-flipping error injection, and receiver verification.

    :param data_stream: Binary payload data string.
    :param polynomial: Generator polynomial string (default '1101').
    :param action: 'encode', 'check', or 'full_cycle'.
    :param injected_error: Explicit corrupted codeword string.
    :param error_pos: 1-indexed bit position in codeword to flip.
    :return: Comprehensive result dictionary.
    """
    poly = polynomial if (polynomial is not None and len(str(polynomial).strip()) > 0) else "1101"

    if action == "check":
        return crc_check(data_stream, polynomial=poly)

    encode_res = crc_encode(data_stream, polynomial=poly)
    if not encode_res["success"]:
        return encode_res

    if action == "encode":
        return encode_res

    # Full Cycle mode (Encode -> Optional Error Injection -> Receiver Check)
    transmitted_cw = encode_res["transmitted_codeword"]
    received_cw = transmitted_cw
    error_applied = False
    error_details = None

    if error_pos is not None and str(error_pos).isdigit():
        pos = int(error_pos)
        if 1 <= pos <= len(transmitted_cw):
            idx = pos - 1
            cw_chars = list(transmitted_cw)
            orig_bit = cw_chars[idx]
            flipped_bit = '1' if orig_bit == '0' else '0'
            cw_chars[idx] = flipped_bit
            received_cw = "".join(cw_chars)
            error_applied = True
            error_details = f"Flipped bit at 1-indexed position {pos} ('{orig_bit}' -> '{flipped_bit}')"
        else:
            return {"success": False, "error": f"Invalid error position {error_pos}. Must be between 1 and codeword length ({len(transmitted_cw)})."}
    elif injected_error and len(str(injected_error).strip()) > 0:
        received_cw = str(injected_error).strip()
        error_applied = True
        error_details = f"Corrupted codeword provided: '{received_cw}'"

    check_res = crc_check(received_cw, polynomial=poly)

    combined_steps = list(encode_res["steps"])
    if error_applied:
        combined_steps.append(f"[ERROR INJECTION]: {error_details}")
        combined_steps.append(f"[CORRUPTED CODEWORD]: Received Codeword = '{received_cw}'")

    if check_res["success"]:
        combined_steps.extend(check_res["steps"])

    return {
        "success": True,
        "action": "full_cycle",
        "original_data": encode_res["original_data"],
        "generator": encode_res["generator"],
        "generator_degree": encode_res["generator_degree"],
        "appended_data": encode_res["appended_data"],
        "crc_remainder": encode_res["crc_remainder"],
        "transmitted_codeword": transmitted_cw,
        "received_codeword": received_cw,
        "received_remainder": check_res.get("received_remainder"),
        "error_injected": error_applied,
        "error_details": error_details,
        "error_detected": check_res.get("error_detected", False),
        "integrity_match": not check_res.get("error_detected", False),
        "steps": combined_steps
    }
