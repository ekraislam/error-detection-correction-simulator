"""
=============================================================================
Bit Stuffing and De-stuffing Module (Generic Implementation)
=============================================================================
Course: Data Communication Lab
Layer: Data Link Layer (Framing Technique)

Core Rules:
1. Operates generically on any binary payload stream ('0' and '1's).
2. Default delimiter flag pattern is "01111110", or any user-configured binary pattern.
3. For the PAYLOAD ONLY:
   - Scan bits from left to right.
   - Count consecutive 1s.
   - Whenever exactly 5 consecutive 1s are encountered, automatically insert a '0' bit.
4. Delimiter FLAG itself wraps the frame (FLAG + StuffedPayload + FLAG) and is NEVER bit-stuffed.
5. De-stuffing reverses the process:
   - Validates that frame length >= 2 * len(FLAG).
   - Validates that frame begins and ends with the current dynamic FLAG delimiter.
   - Removes starting and ending FLAG delimiters.
   - Scans the inner stuffed payload and removes the stuffed '0' after every 5 consecutive 1s.
   - Recovers the exact original payload and verifies integrity against the original payload.
=============================================================================
"""

def bit_stuff(data_stream: str, flag_pattern: str = "01111110") -> dict:
    """
    Performs generic bit stuffing on input binary data payload.

    :param data_stream: Binary payload data string (e.g. '111110').
    :param flag_pattern: Delimiter flag pattern (e.g. '01111110').
    :return: Dictionary containing status, stuffed payload, transmitted frame, tokens, stats, and step trace.
    """
    if data_stream is None or len(str(data_stream).strip()) == 0:
        return {
            "success": False,
            "error": "Input binary data payload cannot be empty."
        }

    raw_data = str(data_stream).replace(" ", "")

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

    flag = str(flag_pattern).strip().replace(" ", "")
    for ch in flag:
        if ch not in ('0', '1'):
            return {
                "success": False,
                "error": f"Invalid non-binary character '{ch}' in delimiter flag pattern. FLAG must contain only '0' and '1'."
            }

    steps = []
    tokens = []

    steps.append(f"Step 1: Original input binary payload = '{raw_data}' (Length: {len(raw_data)} bits)")
    steps.append(f"Step 2: Configured Delimiter Flag Pattern = '{flag}' (Length: {len(flag)} bits)")
    steps.append(f"Step 3: Add starting delimiter FLAG ('{flag}') to frame (FLAG is never stuffed)")

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
                steps.append(f"Step {step_num}: Five consecutive 1s detected -> INSERTED STUFFED '0' BIT")
                step_num += 1
                ones_count = 0
        else:
            ones_count = 0
            stuffed_payload_chars.append('0')
            tokens.append({"value": "0", "type": "data", "label": "DATA_BIT"})
            steps.append(f"Step {step_num}: Position {pos}: Read '0' -> reset consecutive ones count to 0")
            step_num += 1

    stuffed_payload = "".join(stuffed_payload_chars)
    tokens.append({"value": flag, "type": "flag", "label": "END_FLAG"})
    stuffed_frame = f"{flag}{stuffed_payload}{flag}"

    steps.append(f"Step {step_num}: Append ending delimiter FLAG ('{flag}') to frame")
    step_num += 1
    steps.append(f"Step {step_num}: Stuffed Payload = '{stuffed_payload}' (Added {inserted_bits_count} stuffed '0's)")
    step_num += 1
    steps.append(f"Step {step_num}: Final Transmitted Frame = '{stuffed_frame}' (FLAG + StuffedPayload + FLAG)")

    orig_len = len(raw_data)
    stuff_len = len(stuffed_payload)
    frame_len = len(stuffed_frame)
    added_bits = stuff_len - orig_len

    stats = {
        "original_length": orig_len,
        "stuffed_length": stuff_len,
        "frame_length": frame_len,
        "added_bits": added_bits,
        "inserted_bits": inserted_bits_count,
        "recovery_status": "Stuffed"
    }

    return {
        "success": True,
        "original_data": raw_data,
        "flag": flag,
        "stuffed_payload": stuffed_payload,
        "stuffed_frame": stuffed_frame,
        "tokens": tokens,
        "inserted_bits": inserted_bits_count,
        "steps": steps,
        "stats": stats
    }


def bit_destuff(frame: str, flag_pattern: str = "01111110") -> dict:
    """
    Performs generic bit de-stuffing on a received binary frame.

    :param frame: Transmitted/Received binary frame string (expected: FLAG + stuffed_payload + FLAG).
    :param flag_pattern: Delimiter flag pattern.
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

    flag = str(flag_pattern).strip().replace(" ", "") if (flag_pattern is not None and len(str(flag_pattern).strip()) > 0) else "01111110"
    for ch in flag:
        if ch not in ('0', '1'):
            return {
                "success": False,
                "error": f"Invalid non-binary character '{ch}' in delimiter flag pattern. FLAG must contain only '0' and '1'."
            }

    steps = []
    steps.append(f"De-stuff Step 1: Received binary frame = '{raw_frame}' (Length: {len(raw_frame)} bits)")
    steps.append(f"De-stuff Step 2: Configured Delimiter FLAG = '{flag}' (Length: {len(flag)} bits)")

    min_frame_len = 2 * len(flag)
    if len(raw_frame) < min_frame_len:
        return {
            "success": False,
            "error": f"Invalid frame length: Frame length ({len(raw_frame)}) is smaller than two FLAG delimiters ({min_frame_len})."
        }

    # 1. Verify starting FLAG
    if not raw_frame.startswith(flag):
        return {
            "success": False,
            "error": f"Invalid frame: missing starting FLAG ('{flag}'). Frame starts with '{raw_frame[:len(flag)]}'."
        }

    # 2. Verify ending FLAG
    if not raw_frame.endswith(flag):
        return {
            "success": False,
            "error": f"Invalid frame: missing ending FLAG ('{flag}'). Frame ends with '{raw_frame[-len(flag):]}'."
        }

    steps.append(f"De-stuff Step 3: Verified starting FLAG ('{flag}') and ending FLAG ('{flag}'). Stripping delimiters.")

    # 3. Extract stuffed payload between delimiters
    stuffed_payload = raw_frame[len(flag) : len(raw_frame) - len(flag)]
    steps.append(f"De-stuff Step 4: Extracted inner stuffed payload = '{stuffed_payload}' (Length: {len(stuffed_payload)} bits)")

    destuffed_chars = []
    ones_count = 0
    removed_bits_count = 0
    step_num = 5
    i = 0
    payload_len = len(stuffed_payload)

    while i < payload_len:
        bit = stuffed_payload[i]
        pos = i + 1

        if bit == '1':
            ones_count += 1
            destuffed_chars.append('1')
            steps.append(f"De-stuff Step {step_num}: Payload position {pos}: Read '1' -> consecutive ones count = {ones_count}")
            step_num += 1

            if ones_count == 5:
                if i + 1 < payload_len:
                    next_bit = stuffed_payload[i + 1]
                    if next_bit == '0':
                        steps.append(f"De-stuff Step {step_num}: Five consecutive 1s detected -> REMOVED stuffed '0' bit at position {pos + 1}")
                        step_num += 1
                        removed_bits_count += 1
                        i += 1  # Skip stuffed '0' bit
                        ones_count = 0
                    else:
                        return {
                            "success": False,
                            "error": f"Invalid bit stream framing: Five consecutive 1s at position {pos}, but missing required stuffed '0' bit (found '{next_bit}')."
                        }
                else:
                    return {
                        "success": False,
                        "error": "Invalid bit stream framing: Five consecutive 1s at end of payload without required trailing stuffed '0' bit."
                    }
        else:
            ones_count = 0
            destuffed_chars.append('0')
            steps.append(f"De-stuff Step {step_num}: Payload position {pos}: Read '0' -> reset consecutive ones count to 0")
            step_num += 1

        i += 1

    destuffed_data = "".join(destuffed_chars)
    steps.append(f"De-stuff Step {step_num}: De-stuffing complete. Recovered original payload = '{destuffed_data}' (Removed {removed_bits_count} stuffed '0's)")

    return {
        "success": True,
        "destuffed_data": destuffed_data,
        "removed_bits": removed_bits_count,
        "steps": steps
    }


def process_bit_stuffing(data_stream: str, flag_pattern: str = "01111110", action: str = "full_cycle", injected_error: str = None, error_pos: int = None, original_data: str = None) -> dict:
    """
    Main entry point for Bit Stuffing and De-stuffing simulation.

    :param data_stream: Input binary payload string or frame string.
    :param flag_pattern: Flag pattern (default '01111110').
    :param action: 'stuff', 'destuff', or 'full_cycle'.
    :param injected_error: Explicitly provided corrupted frame string.
    :param error_pos: 1-indexed bit position in transmitted frame to flip (0 -> 1 or 1 -> 0).
    :param original_data: Optional original payload to verify recovered data against.
    :return: Comprehensive result dictionary.
    """
    flag = str(flag_pattern).strip().replace(" ", "") if (flag_pattern is not None and len(str(flag_pattern).strip()) > 0) else "01111110"

    if action == "destuff":
        res = bit_destuff(data_stream, flag_pattern=flag)
        if not res["success"]:
            return {
                "success": False,
                "action": "destuff",
                "error": res["error"],
                "flag": flag,
                "received_frame": data_stream,
                "steps": res.get("steps", [f"De-stuffing failed: {res['error']}"]),
                "stats": {
                    "received_length": len(str(data_stream)),
                    "recovery_status": "Failed"
                }
            }

        destuffed = res["destuffed_data"]
        steps = list(res["steps"])
        has_orig = original_data is not None and len(str(original_data).strip()) > 0
        orig_str = str(original_data).replace(" ", "") if has_orig else None
        integrity_match = (destuffed == orig_str) if has_orig else True

        if has_orig:
            steps.append(f"De-stuff Step {len(steps)+1}: Integrity Verification -> Recovered Payload '{destuffed}' vs Original Payload '{orig_str}' -> {'MATCH (Success)' if integrity_match else 'MISMATCH (Failed)'}")

        return {
            "success": True,
            "action": "destuff",
            "flag": flag,
            "original_data": orig_str if has_orig else destuffed,
            "received_frame": data_stream,
            "destuffed_data": destuffed,
            "destuff_success": True,
            "integrity_match": integrity_match,
            "removed_bits": res["removed_bits"],
            "steps": steps,
            "stats": {
                "received_length": len(str(data_stream)),
                "destuffed_length": len(destuffed),
                "original_length": len(orig_str) if has_orig else len(destuffed),
                "recovery_status": "Success" if integrity_match else "Failed"
            }
        }

    if action == "stuff":
        res = bit_stuff(data_stream, flag_pattern=flag)
        if not res["success"]:
            return res
        return {
            "success": True,
            "action": "stuff",
            "original_data": res["original_data"],
            "flag": flag,
            "stuffed_payload": res["stuffed_payload"],
            "stuffed_frame": res["stuffed_frame"],
            "stuffed_tokens": res["tokens"],
            "inserted_bits": res["inserted_bits"],
            "steps": res["steps"],
            "stats": res["stats"]
        }

    # Full Cycle mode (Stuff -> Channel / Error Injection -> De-stuff)
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
        received_frame = str(injected_error).strip().replace(" ", "")
        error_applied = (received_frame != transmitted_frame)
        error_details = f"Corrupted frame provided: '{received_frame}'" if error_applied else "Frame transmitted without error"

    destuff_result = bit_destuff(received_frame, flag_pattern=flag)

    combined_steps = list(stuff_result["steps"])
    if error_applied:
        combined_steps.append(f"⚡ [ERROR INJECTION]: {error_details}")
        combined_steps.append(f"⚡ [CORRUPTED FRAME]: Received Frame = '{received_frame}'")
    else:
        combined_steps.append(f"⚡ Channel Transmission: Received frame is identical to transmitted frame '{received_frame}'")

    if destuff_result["success"]:
        combined_steps.extend(destuff_result["steps"])
        destuffed_data = destuff_result["destuffed_data"]
        # Integrity match: ONLY if recovered payload equals original AND received frame matches transmitted frame
        integrity_match = (destuffed_data == stuff_result["original_data"]) and (received_frame == transmitted_frame)
        destuff_error = None
        recovery_status = "Success" if integrity_match else ("Data Recovered (Frame Modified)" if destuffed_data == stuff_result["original_data"] else "Recovery Failed (Data Mismatch)")
    else:
        combined_steps.append(f"❌ [DE-STUFFING FAILED]: {destuff_result['error']}")
        destuffed_data = None
        integrity_match = False
        destuff_error = destuff_result["error"]
        recovery_status = "Failed"

    stats = dict(stuff_result["stats"])
    stats["received_length"] = len(received_frame)
    stats["recovery_status"] = recovery_status
    stats["integrity_match"] = integrity_match

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
        "destuffed_data": destuffed_data,
        "destuff_success": destuff_result["success"],
        "destuff_error": destuff_error,
        "steps": combined_steps,
        "integrity_match": integrity_match,
        "stats": stats,
        "error_injected": error_applied,
        "error_details": error_details
    }
