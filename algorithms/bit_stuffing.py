"""
=============================================================================
Bit Stuffing and De-stuffing Module
=============================================================================
Course: Data Communication Lab
Layer: Data Link Layer (Framing Technique)

Rules:
1. Operates on binary payload streams ('0' and '1's).
2. Default delimiter flag pattern is "01111110".
3. After every sequence of FIVE consecutive 1s in the payload, a '0' bit is automatically inserted.
4. The delimiter FLAG itself wraps the frame (FLAG + stuffed_payload + FLAG) and is NEVER stuffed.
5. De-stuffing validates starting/ending FLAGs, locates five consecutive 1s, verifies & removes
   the trailing stuffed '0' bit, and recovers the exact original payload.
=============================================================================
"""

def bit_stuff(data_stream: str, flag_pattern: str = "01111110") -> dict:
    """
    Performs bit stuffing on input binary data stream.

    :param data_stream: Binary payload data string (e.g. '111110').
    :param flag_pattern: Delimiter flag pattern (default '01111110').
    :return: Dictionary containing status, stuffed payload, transmitted frame, tokens, and step trace.
    """
    # Validation checks
    if data_stream is None or len(str(data_stream).strip()) == 0:
        return {
            "success": False,
            "error": "Input binary data stream cannot be empty."
        }

    raw_data = str(data_stream).replace(" ", "")
    
    # Check binary validity of payload
    for ch in raw_data:
        if ch not in ('0', '1'):
            return {
                "success": False,
                "error": f"Invalid non-binary character '{ch}' in input payload. Only '0' and '1' are allowed."
            }

    if not flag_pattern or len(str(flag_pattern).strip()) == 0:
        return {
            "success": False,
            "error": "Delimiter flag pattern cannot be empty."
        }

    flag = str(flag_pattern).strip()
    for ch in flag:
        if ch not in ('0', '1'):
            return {
                "success": False,
                "error": f"Invalid non-binary character '{ch}' in delimiter flag pattern. FLAG must contain only '0' and '1'."
            }

    steps = []
    tokens = []

    steps.append(f"Step 1: Original input binary payload = '{raw_data}'")
    steps.append(f"Step 2: Configured Delimiter Flag Pattern = '{flag}'")
    steps.append(f"Step 3: Start frame with starting FLAG ('{flag}')")

    # Add starting FLAG token
    tokens.append({"value": flag, "type": "flag", "label": "START_FLAG"})

    stuffed_payload_chars = []
    ones_count = 0
    inserted_bits_count = 0
    step_num = 4

    for idx, bit in enumerate(raw_data):
        pos = idx + 1
        if bit == '1':
            ones_count += 1
            stuffed_payload_chars.append('1')
            tokens.append({"value": "1", "type": "data", "label": "DATA_BIT"})
            steps.append(f"Step {step_num}: Position {pos}: Read '1' -> consecutive ones count = {ones_count}")
            step_num += 1

            if ones_count == 5:
                # Insert stuffed 0 bit
                stuffed_payload_chars.append('0')
                tokens.append({"value": "0", "type": "stuffed_zero", "label": "STUFFED_ZERO"})
                inserted_bits_count += 1
                steps.append(f"Step {step_num}: Five consecutive 1s detected -> INSERTED STUFFED '0'")
                step_num += 1
                ones_count = 0
        else:
            ones_count = 0
            stuffed_payload_chars.append('0')
            tokens.append({"value": "0", "type": "data", "label": "DATA_BIT"})
            steps.append(f"Step {step_num}: Position {pos}: Read '0' -> reset consecutive ones count to 0")
            step_num += 1

    stuffed_payload = "".join(stuffed_payload_chars)
    
    # Add ending FLAG token
    tokens.append({"value": flag, "type": "flag", "label": "END_FLAG"})
    stuffed_frame = f"{flag}{stuffed_payload}{flag}"

    steps.append(f"Step {step_num}: Append ending FLAG ('{flag}')")
    step_num += 1
    steps.append(f"Step {step_num}: Final Stuffed Payload = '{stuffed_payload}'")
    step_num += 1
    steps.append(f"Step {step_num}: Final Transmitted Frame = '{stuffed_frame}'")

    return {
        "success": True,
        "original_data": raw_data,
        "flag": flag,
        "stuffed_payload": stuffed_payload,
        "stuffed_frame": stuffed_frame,
        "tokens": tokens,
        "inserted_bits": inserted_bits_count,
        "steps": steps
    }


def bit_destuff(frame: str, flag_pattern: str = "01111110") -> dict:
    """
    Performs bit de-stuffing on a transmitted binary frame.

    :param frame: Transmitted binary frame string (FLAG + stuffed_payload + FLAG).
    :param flag_pattern: Delimiter flag pattern (default '01111110').
    :return: Dictionary containing status, recovered payload, removed bits count, and step trace.
    """
    if frame is None or len(str(frame).strip()) == 0:
        return {
            "success": False,
            "error": "Transmitted frame to de-stuff cannot be empty."
        }

    raw_frame = str(frame).replace(" ", "")
    for ch in raw_frame:
        if ch not in ('0', '1'):
            return {
                "success": False,
                "error": f"Invalid non-binary character '{ch}' in frame. Frame must contain only '0' and '1'."
            }

    flag = str(flag_pattern).strip()
    steps = []
    steps.append(f"De-stuff Step 1: Received binary frame = '{raw_frame}'")

    if len(raw_frame) < 2 * len(flag):
        return {
            "success": False,
            "error": f"Invalid frame length: Frame length ({len(raw_frame)}) is smaller than two FLAG delimiters ({2 * len(flag)})."
        }

    # Verify starting FLAG
    if not raw_frame.startswith(flag):
        return {
            "success": False,
            "error": f"Invalid frame: Frame does not start with delimiter FLAG ('{flag}'). Starts with '{raw_frame[:len(flag)]}'."
        }

    # Verify ending FLAG
    if not raw_frame.endswith(flag):
        return {
            "success": False,
            "error": f"Invalid frame: Frame does not end with delimiter FLAG ('{flag}'). Ends with '{raw_frame[-len(flag):]}'."
        }

    steps.append(f"De-stuff Step 2: Validated starting FLAG ('{flag}') and ending FLAG ('{flag}').")

    # Extract stuffed payload
    stuffed_payload = raw_frame[len(flag) : len(raw_frame) - len(flag)]
    steps.append(f"De-stuff Step 3: Extracted stuffed frame payload = '{stuffed_payload}'")

    destuffed_chars = []
    ones_count = 0
    removed_bits_count = 0
    step_num = 4
    i = 0

    while i < len(stuffed_payload):
        bit = stuffed_payload[i]
        pos = i + 1

        if bit == '1':
            ones_count += 1
            destuffed_chars.append('1')
            steps.append(f"De-stuff Step {step_num}: Payload position {pos}: Read '1' -> consecutive ones count = {ones_count}")
            step_num += 1

            if ones_count == 5:
                # Check next bit in payload frame
                if i + 1 < len(stuffed_payload):
                    next_bit = stuffed_payload[i + 1]
                    if next_bit == '0':
                        steps.append(f"De-stuff Step {step_num}: Five consecutive 1s detected -> REMOVED stuffed '0' bit at payload position {pos + 1}")
                        step_num += 1
                        removed_bits_count += 1
                        i += 1  # Skip stuffed '0'
                        ones_count = 0
                    else:
                        return {
                            "success": False,
                            "error": f"Invalid bit stream framing: Five consecutive 1s at position {pos}, but missing required stuffed '0' bit (found '{next_bit}')."
                        }
                else:
                    return {
                        "success": False,
                        "error": f"Invalid bit stream framing: Five consecutive 1s at end of payload without required trailing stuffed '0' bit."
                    }
        else:
            ones_count = 0
            destuffed_chars.append('0')
            steps.append(f"De-stuff Step {step_num}: Payload position {pos}: Read '0' -> reset consecutive ones count to 0")
            step_num += 1

        i += 1

    destuffed_data = "".join(destuffed_chars)
    steps.append(f"De-stuff Step {step_num}: De-stuffing complete. Recovered original payload = '{destuffed_data}'")

    return {
        "success": True,
        "destuffed_data": destuffed_data,
        "removed_bits": removed_bits_count,
        "steps": steps
    }


def process_bit_stuffing(data_stream: str, flag_pattern: str = "01111110", action: str = "full_cycle", injected_error: str = None, error_pos: int = None) -> dict:
    """
    Main entry point for Bit Stuffing and De-stuffing processing.

    :param data_stream: Input binary payload string or frame string.
    :param flag_pattern: Flag pattern (default '01111110').
    :param action: 'stuff', 'destuff', or 'full_cycle'.
    :param injected_error: Explicitly provided corrupted frame string.
    :param error_pos: 1-indexed bit position in transmitted frame to flip (0 -> 1 or 1 -> 0).
    :return: Comprehensive result dictionary.
    """
    flag = flag_pattern if (flag_pattern is not None and len(str(flag_pattern).strip()) > 0) else "01111110"

    if action == "destuff":
        return bit_destuff(data_stream, flag_pattern=flag)

    if action == "stuff":
        return bit_stuff(data_stream, flag_pattern=flag)

    # Full Cycle mode (Stuff -> Optional Error Injection -> De-stuff)
    stuff_result = bit_stuff(data_stream, flag_pattern=flag)
    if not stuff_result["success"]:
        return stuff_result

    transmitted_frame = stuff_result["stuffed_frame"]
    received_frame = transmitted_frame
    error_applied = False
    error_details = None

    # Handle error injection by position or explicit frame string
    if error_pos is not None and str(error_pos).isdigit():
        idx = int(error_pos) - 1
        if 0 <= idx < len(transmitted_frame):
            frame_chars = list(transmitted_frame)
            original_bit = frame_chars[idx]
            flipped_bit = '1' if original_bit == '0' else '0'
            frame_chars[idx] = flipped_bit
            received_frame = "".join(frame_chars)
            error_applied = True
            error_details = f"Flipped bit at 1-indexed position {idx + 1} ('{original_bit}' -> '{flipped_bit}')"
        else:
            return {
                "success": False,
                "error": f"Invalid error position {error_pos}. Position must be between 1 and frame length ({len(transmitted_frame)})."
            }
    elif injected_error and len(str(injected_error).strip()) > 0:
        received_frame = str(injected_error).strip()
        error_applied = True
        error_details = f"Corrupted frame provided: '{received_frame}'"

    destuff_result = bit_destuff(received_frame, flag_pattern=flag)

    combined_steps = list(stuff_result["steps"])
    if error_applied:
        combined_steps.append(f"[ERROR INJECTION]: {error_details}")
        combined_steps.append(f"[CORRUPTED FRAME]: Received Frame = '{received_frame}'")

    if destuff_result["success"]:
        combined_steps.extend(destuff_result["steps"])
    else:
        combined_steps.append(f"[DE-STUFFING FAILED]: {destuff_result['error']}")

    integrity_match = (destuff_result.get("destuffed_data") == stuff_result["original_data"]) if destuff_result["success"] else False

    return {
        "success": True,
        "action": "full_cycle",
        "original_data": stuff_result["original_data"],
        "flag": flag,
        "stuffed_payload": stuff_result["stuffed_payload"],
        "stuffed_frame": transmitted_frame,
        "stuffed_tokens": stuff_result["tokens"],
        "inserted_bits": stuff_result["inserted_bits"],
        "received_frame": received_frame,
        "destuffed_data": destuff_result.get("destuffed_data"),
        "destuff_success": destuff_result["success"],
        "destuff_error": destuff_result.get("error"),
        "steps": combined_steps,
        "integrity_match": integrity_match,
        "error_injected": error_applied,
        "error_details": error_details
    }
