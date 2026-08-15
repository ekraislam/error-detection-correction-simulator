"""
=============================================================================
Byte / Character Stuffing and De-stuffing Module (Generic Implementation)
=============================================================================
Course: Data Communication Lab
Layer: Data Link Layer (Framing Technique)

Core Rules:
1. Frame starts and ends with the currently configured FLAG delimiter.
2. If input payload byte equals currently configured FLAG:
   - Prepend ESC before it (ESC + FLAG).
3. If input payload byte equals currently configured ESC:
   - Prepend ESC before it (ESC + ESC).
4. Other payload bytes remain unchanged.
5. Transmitted Frame = FLAG + StuffedData + FLAG.
6. De-stuffing reverses the process:
   - Verifies starting and ending FLAG with the current dynamic FLAG.
   - Strips starting and ending FLAG.
   - Unescapes (ESC + FLAG -> FLAG) and (ESC + ESC -> ESC).
   - Validates that no unescaped FLAG or dangling ESC exists.
   - Recovers the exact original payload.
=============================================================================
"""

def byte_stuff(data: str, flag: str = "F", esc: str = "E") -> dict:
    """
    Performs generic character/byte stuffing on any input data payload.

    :param data: Raw payload data string.
    :param flag: Frame delimiter flag string.
    :param esc: Escape character string.
    :return: Dictionary containing status, stuffed frame, tokens, stats, and step-by-step trace.
    """
    if data is None or len(str(data)) == 0:
        return {
            "success": False,
            "error": "Input data payload cannot be empty."
        }

    if flag is None or len(str(flag)) == 0 or esc is None or len(str(esc)) == 0:
        return {
            "success": False,
            "error": "FLAG and ESC characters cannot be empty."
        }

    flag_str = str(flag)
    esc_str = str(esc)

    if flag_str == esc_str:
        return {
            "success": False,
            "error": f"FLAG and ESC cannot be the same character (both are '{flag_str}')."
        }

    data_str = str(data)
    steps = []
    tokens = []

    steps.append(f"Step 1: Original input payload data = '{data_str}' (Length: {len(data_str)} bytes)")
    steps.append(f"Step 2: Configured Delimiters -> Delimiter FLAG = '{flag_str}', Escape ESC = '{esc_str}'")
    steps.append(f"Step 3: Begin frame with starting delimiter FLAG ('{flag_str}')")

    tokens.append({"value": flag_str, "type": "flag", "label": "START_FLAG"})

    stuffed_chars = []
    step_count = 4

    for idx, char in enumerate(data_str):
        pos = idx + 1
        if char == flag_str:
            steps.append(f"Step {step_count}: Position {pos}: Read '{char}' -> matches FLAG ('{flag_str}') -> insert ESC ('{esc_str}') before FLAG")
            stuffed_chars.append(esc_str)
            stuffed_chars.append(flag_str)
            tokens.append({"value": esc_str, "type": "esc_inserted", "label": f"ESC_STUFF ('{esc_str}')"})
            tokens.append({"value": flag_str, "type": "stuffed_data", "label": f"STUFFED_FLAG ('{flag_str}')"})
            step_count += 1
        elif char == esc_str:
            steps.append(f"Step {step_count}: Position {pos}: Read '{char}' -> matches ESC ('{esc_str}') -> insert ESC ('{esc_str}') before ESC")
            stuffed_chars.append(esc_str)
            stuffed_chars.append(esc_str)
            tokens.append({"value": esc_str, "type": "esc_inserted", "label": f"ESC_STUFF ('{esc_str}')"})
            tokens.append({"value": esc_str, "type": "stuffed_data", "label": f"STUFFED_ESC ('{esc_str}')"})
            step_count += 1
        else:
            steps.append(f"Step {step_count}: Position {pos}: Read '{char}' -> normal byte -> retain unchanged")
            stuffed_chars.append(char)
            tokens.append({"value": char, "type": "data", "label": "DATA"})
            step_count += 1

    stuffed_payload = "".join(stuffed_chars)
    tokens.append({"value": flag_str, "type": "flag", "label": "END_FLAG"})
    stuffed_frame = f"{flag_str}{stuffed_payload}{flag_str}"

    steps.append(f"Step {step_count}: Append ending delimiter FLAG ('{flag_str}')")
    step_count += 1
    steps.append(f"Step {step_count}: Final Transmitted Frame = '{stuffed_frame}' (FLAG + StuffedData + FLAG)")

    orig_len = len(data_str)
    stuff_len = len(stuffed_payload)
    frame_len = len(stuffed_frame)
    added_bytes = stuff_len - orig_len

    stats = {
        "original_length": orig_len,
        "stuffed_length": stuff_len,
        "frame_length": frame_len,
        "added_bytes": added_bytes,
        "recovery_status": "Stuffed"
    }

    return {
        "success": True,
        "original_data": data_str,
        "flag": flag_str,
        "esc": esc_str,
        "stuffed_payload": stuffed_payload,
        "stuffed_frame": stuffed_frame,
        "tokens": tokens,
        "steps": steps,
        "stats": stats
    }


def byte_destuff(frame: str, flag: str = "F", esc: str = "E") -> dict:
    """
    Performs generic byte de-stuffing on a transmitted frame to extract original payload data.

    :param frame: Transmitted frame string (expected: FLAG + stuffed payload + FLAG).
    :param flag: Frame delimiter flag string.
    :param esc: Escape character string.
    :return: Dictionary containing status, recovered payload data, steps, and error details.
    """
    if frame is None or len(str(frame)) == 0:
        return {
            "success": False,
            "error": "Frame to de-stuff cannot be empty."
        }

    if flag is None or len(str(flag)) == 0 or esc is None or len(str(esc)) == 0:
        return {
            "success": False,
            "error": "FLAG and ESC characters cannot be empty."
        }

    flag_str = str(flag)
    esc_str = str(esc)

    if flag_str == esc_str:
        return {
            "success": False,
            "error": f"FLAG and ESC cannot be the same character (both are '{flag_str}')."
        }

    frame_str = str(frame)
    steps = []
    steps.append(f"De-stuff Step 1: Received frame string = '{frame_str}'")
    steps.append(f"De-stuff Step 2: Configured Delimiters -> FLAG = '{flag_str}', ESC = '{esc_str}'")

    flag_len = len(flag_str)

    if len(frame_str) < flag_len * 2:
        return {
            "success": False,
            "error": f"Invalid frame: missing delimiters. Frame length is too short to contain starting and ending FLAG ('{flag_str}')."
        }

    # 1. Verify starting FLAG
    if not frame_str.startswith(flag_str):
        first_char = frame_str[:flag_len]
        return {
            "success": False,
            "error": f"Invalid frame: missing starting FLAG ('{flag_str}'). Frame starts with '{first_char}'."
        }

    # 2. Verify ending FLAG
    if not frame_str.endswith(flag_str):
        return {
            "success": False,
            "error": f"Invalid frame: missing ending FLAG ('{flag_str}')."
        }

    steps.append(f"De-stuff Step 3: Validated starting FLAG ('{flag_str}') and ending FLAG ('{flag_str}'). Stripping delimiters.")

    # 3. Extract stuffed payload
    payload_str = frame_str[flag_len : len(frame_str) - flag_len]
    steps.append(f"De-stuff Step 4: Extracted stuffed payload = '{payload_str}'")

    destuffed_chars = []
    step_count = 5
    i = 0
    payload_len = len(payload_str)

    while i < payload_len:
        char = payload_str[i]
        pos = i + 1

        if char == esc_str:
            if i + 1 >= payload_len:
                return {
                    "success": False,
                    "error": "Invalid escape sequence: ESC appears without a following character."
                }

            next_char = payload_str[i + 1]
            if next_char == flag_str:
                steps.append(f"De-stuff Step {step_count}: Position {pos}-{pos+1}: ESC sequence found ('{esc_str}' + '{flag_str}') -> unescaped literal FLAG byte '{flag_str}'")
                destuffed_chars.append(flag_str)
                step_count += 1
                i += 2
            elif next_char == esc_str:
                steps.append(f"De-stuff Step {step_count}: Position {pos}-{pos+1}: ESC sequence found ('{esc_str}' + '{esc_str}') -> unescaped literal ESC byte '{esc_str}'")
                destuffed_chars.append(esc_str)
                step_count += 1
                i += 2
            else:
                return {
                    "success": False,
                    "error": f"Invalid escape sequence at position {pos}: ESC ('{esc_str}') followed by invalid byte '{next_char}' (expected '{flag_str}' or '{esc_str}')."
                }
        elif char == flag_str:
            return {
                "success": False,
                "error": f"Invalid frame: Unescaped FLAG ('{flag_str}') detected inside frame payload at position {pos}."
            }
        else:
            steps.append(f"De-stuff Step {step_count}: Position {pos}: Normal byte '{char}' -> retained as payload")
            destuffed_chars.append(char)
            step_count += 1
            i += 1

    destuffed_data = "".join(destuffed_chars)
    steps.append(f"De-stuff Step {step_count}: De-stuffing complete. Recovered original payload = '{destuffed_data}'")

    return {
        "success": True,
        "destuffed_data": destuffed_data,
        "steps": steps
    }


def process_byte_stuffing(data: str, flag: str = "F", esc: str = "E", action: str = "full_cycle", injected_error: str = None, original_data: str = None) -> dict:
    """
    Main entry point for Byte Stuffing and De-stuffing simulation.

    :param data: Input data string or frame string depending on action.
    :param flag: Flag character (default 'F').
    :param esc: Escape character (default 'E').
    :param action: 'stuff', 'destuff', or 'full_cycle'.
    :param injected_error: Optional modified frame text for error simulation.
    :param original_data: Optional original payload to verify recovered data against.
    :return: Comprehensive result dictionary.
    """
    flag = str(flag) if (flag is not None and len(str(flag)) > 0) else "F"
    esc = str(esc) if (esc is not None and len(str(esc)) > 0) else "E"

    if action == "destuff":
        res = byte_destuff(data, flag=flag, esc=esc)
        if not res["success"]:
            return {
                "success": False,
                "action": "destuff",
                "error": res["error"],
                "flag": flag,
                "escape_character": esc,
                "received_frame": data,
                "steps": res.get("steps", [f"De-stuffing failed: {res['error']}"]),
                "stats": {
                    "received_length": len(str(data)),
                    "recovery_status": "Failed"
                }
            }

        destuffed = res["destuffed_data"]
        steps = list(res["steps"])
        has_orig = original_data is not None and len(str(original_data)) > 0
        orig_str = str(original_data) if has_orig else None
        integrity_match = (destuffed == orig_str) if has_orig else True

        if has_orig:
            steps.append(f"De-stuff Step {len(steps)+1}: Integrity Verification -> Recovered Payload '{destuffed}' vs Original Payload '{orig_str}' -> {'MATCH (Success)' if integrity_match else 'MISMATCH (Failed)'}")

        return {
            "success": True,
            "action": "destuff",
            "flag": flag,
            "escape_character": esc,
            "original_data": orig_str if has_orig else destuffed,
            "received_frame": data,
            "destuffed_data": destuffed,
            "destuff_success": True,
            "integrity_match": integrity_match,
            "steps": steps,
            "stats": {
                "received_length": len(str(data)),
                "destuffed_length": len(destuffed),
                "original_length": len(orig_str) if has_orig else len(destuffed),
                "recovery_status": "Success" if integrity_match else "Failed"
            }
        }

    if action == "stuff":
        res = byte_stuff(data, flag=flag, esc=esc)
        if not res["success"]:
            return res
        return {
            "success": True,
            "action": "stuff",
            "original_data": res["original_data"],
            "flag": flag,
            "escape_character": esc,
            "stuffed_payload": res["stuffed_payload"],
            "stuffed_frame": res["stuffed_frame"],
            "stuffed_tokens": res["tokens"],
            "steps": res["steps"],
            "stats": res["stats"]
        }

    # Full Cycle mode (Stuff -> Optional Channel Error Injection -> De-stuff)
    stuff_result = byte_stuff(data, flag=flag, esc=esc)
    if not stuff_result["success"]:
        return stuff_result

    transmitted_frame = stuff_result["stuffed_frame"]
    has_error_injection = (injected_error is not None and len(str(injected_error)) > 0)
    received_frame = str(injected_error) if has_error_injection else transmitted_frame

    destuff_result = byte_destuff(received_frame, flag=flag, esc=esc)

    combined_steps = list(stuff_result["steps"])
    if has_error_injection:
        if received_frame == transmitted_frame:
            combined_steps.append(f"⚡ Channel Transmission: Received frame is identical to transmitted frame '{received_frame}'")
        else:
            combined_steps.append(f"⚡ ERROR INJECTION ACTIVATED: Transmitted frame '{transmitted_frame}' was corrupted to '{received_frame}'")

    if destuff_result["success"]:
        combined_steps.extend(destuff_result["steps"])
        destuffed_data = destuff_result["destuffed_data"]
        # Integrity match: ONLY if recovered payload equals original AND received frame matches transmitted frame
        integrity_match = (destuffed_data == stuff_result["original_data"]) and (received_frame == transmitted_frame)
        destuff_error = None
        recovery_status = "Success" if integrity_match else ("Data Recovered (Frame Modified)" if destuffed_data == stuff_result["original_data"] else "Recovery Failed (Data Mismatch)")
    else:
        combined_steps.append(f"❌ DE-STUFFING / RECOVERY FAILED: {destuff_result['error']}")
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
        "escape_character": esc,
        "stuffed_payload": stuff_result["stuffed_payload"],
        "stuffed_frame": transmitted_frame,
        "stuffed_tokens": stuff_result["tokens"],
        "received_frame": received_frame,
        "destuffed_data": destuffed_data,
        "destuff_success": destuff_result["success"],
        "destuff_error": destuff_error,
        "steps": combined_steps,
        "integrity_match": integrity_match,
        "stats": stats
    }
