"""
=============================================================================
Byte / Character Stuffing and De-stuffing Module
=============================================================================
Course: Data Communication Lab
Layer: Data Link Layer (Framing Technique)

Rules:
1. Frame starts and ends with FLAG character (default "F").
2. If input payload contains FLAG, prepend ESC character (default "E") before it.
3. If input payload contains ESC, prepend ESC character (default "E") before it.
4. Other payload bytes remain unchanged.
5. De-stuffing reverses the process by verifying starting & ending FLAGs,
   processing ESC escape sequences, and recovering the exact original payload.
=============================================================================
"""

def byte_stuff(data: str, flag: str = "F", esc: str = "E") -> dict:
    """
    Performs character/byte stuffing on input data payload.

    :param data: Raw payload data string.
    :param flag: Frame delimiter flag string (default 'F').
    :param esc: Escape character string (default 'E').
    :return: Dictionary containing status, stuffed frame, tokens, and step-by-step trace.
    """
    # Validation checks
    if data is None or len(str(data)) == 0:
        return {
            "success": False,
            "error": "Input data payload cannot be empty."
        }

    if not flag or not esc:
        return {
            "success": False,
            "error": "FLAG and ESC characters cannot be empty."
        }

    if flag == esc:
        return {
            "success": False,
            "error": f"FLAG and ESC cannot be the same character (both are '{flag}')."
        }

    data_str = str(data)
    steps = []
    tokens = []
    
    steps.append(f"Step 1: Original input payload data = '{data_str}'")
    steps.append(f"Step 2: Configured Frame Delimiter FLAG = '{flag}', Escape ESC = '{esc}'")
    steps.append(f"Step 3: Start frame with starting FLAG ('{flag}')")

    # Add initial starting FLAG token
    tokens.append({"value": flag, "type": "flag", "label": "START_FLAG"})

    stuffed_payload_chars = []
    step_count = 4

    # Determine iteration units (tokens or characters)
    # If space-separated input or multi-character flag/esc
    if " " in data_str or len(flag) > 1 or len(esc) > 1:
        items = [item for item in data_str.split(" ") if item]
        join_delimiter = " "
    else:
        items = list(data_str)
        join_delimiter = ""

    for idx, char in enumerate(items):
        pos = idx + 1
        if char == flag:
            steps.append(f"Step {step_count}: Position {pos}: Read '{char}' -> matches FLAG -> insert ESC ('{esc}') before FLAG")
            stuffed_payload_chars.append(esc)
            stuffed_payload_chars.append(flag)
            tokens.append({"value": esc, "type": "esc_inserted", "label": "ESC_STUFF"})
            tokens.append({"value": flag, "type": "stuffed_data", "label": "STUFFED_FLAG"})
            step_count += 1
        elif char == esc:
            steps.append(f"Step {step_count}: Position {pos}: Read '{char}' -> matches ESC -> insert ESC ('{esc}') before ESC")
            stuffed_payload_chars.append(esc)
            stuffed_payload_chars.append(esc)
            tokens.append({"value": esc, "type": "esc_inserted", "label": "ESC_STUFF"})
            tokens.append({"value": esc, "type": "stuffed_data", "label": "STUFFED_ESC"})
            step_count += 1
        else:
            steps.append(f"Step {step_count}: Position {pos}: Read '{char}' -> normal byte -> no stuffing required")
            stuffed_payload_chars.append(char)
            tokens.append({"value": char, "type": "data", "label": "DATA"})
            step_count += 1

    stuffed_payload = join_delimiter.join(stuffed_payload_chars)
    
    # Add ending FLAG token
    tokens.append({"value": flag, "type": "flag", "label": "END_FLAG"})
    
    if join_delimiter == " ":
        stuffed_frame = f"{flag} {stuffed_payload} {flag}"
    else:
        stuffed_frame = f"{flag}{stuffed_payload}{flag}"

    steps.append(f"Step {step_count}: Append ending FLAG ('{flag}')")
    step_count += 1
    steps.append(f"Step {step_count}: Final Stuffed Frame = '{stuffed_frame}'")

    return {
        "success": True,
        "original_data": data_str,
        "flag": flag,
        "esc": esc,
        "stuffed_payload": stuffed_payload,
        "stuffed_frame": stuffed_frame,
        "tokens": tokens,
        "steps": steps
    }


def byte_destuff(frame: str, flag: str = "F", esc: str = "E") -> dict:
    """
    Performs byte de-stuffing on a transmitted frame to extract original payload data.

    :param frame: Transmitted frame string (expected FLAG + stuffed payload + FLAG).
    :param flag: Frame delimiter flag string (default 'F').
    :param esc: Escape character string (default 'E').
    :return: Dictionary containing status, recovered payload data, and step-by-step trace.
    """
    if frame is None or len(str(frame).strip()) == 0:
        return {
            "success": False,
            "error": "Frame to de-stuff cannot be empty."
        }

    if flag == esc:
        return {
            "success": False,
            "error": f"FLAG and ESC cannot be the same character (both are '{flag}')."
        }

    frame_str = str(frame).strip()
    steps = []
    steps.append(f"De-stuff Step 1: Received frame string = '{frame_str}'")

    # Determine tokenization
    if " " in frame_str or len(flag) > 1 or len(esc) > 1:
        tokens = [t for t in frame_str.split(" ") if t]
        join_delimiter = " "
    else:
        tokens = list(frame_str)
        join_delimiter = ""

    if len(tokens) < 2:
        return {
            "success": False,
            "error": f"Invalid frame length: Frame must contain at least starting and ending FLAGs."
        }

    # Verify starting FLAG
    if tokens[0] != flag:
        return {
            "success": False,
            "error": f"Invalid frame: Frame does not start with starting FLAG ('{flag}'). Starts with '{tokens[0]}'."
        }

    # Verify ending FLAG
    if tokens[-1] != flag:
        return {
            "success": False,
            "error": f"Invalid frame: Frame does not end with ending FLAG ('{flag}'). Ends with '{tokens[-1]}'."
        }

    steps.append(f"De-stuff Step 2: Validated starting FLAG ('{tokens[0]}') and ending FLAG ('{tokens[-1]}').")
    
    payload_tokens = tokens[1:-1]
    steps.append(f"De-stuff Step 3: Extracted stuffed frame payload = '{join_delimiter.join(payload_tokens)}'")

    destuffed_chars = []
    escaped = False
    step_count = 4

    for idx, token in enumerate(payload_tokens):
        pos = idx + 1
        if escaped:
            if token == flag:
                steps.append(f"De-stuff Step {step_count}: Position {pos}: ESC sequence found ('{esc}' + '{token}') -> extracted original byte '{flag}'")
                destuffed_chars.append(flag)
            elif token == esc:
                steps.append(f"De-stuff Step {step_count}: Position {pos}: ESC sequence found ('{esc}' + '{token}') -> extracted original byte '{esc}'")
                destuffed_chars.append(esc)
            else:
                return {
                    "success": False,
                    "error": f"Invalid escape sequence at payload position {pos}: ESC ('{esc}') followed by invalid byte '{token}'."
                }
            escaped = False
            step_count += 1
        else:
            if token == esc:
                steps.append(f"De-stuff Step {step_count}: Position {pos}: Found ESC byte ('{esc}') -> next byte will be unescaped")
                escaped = True
                step_count += 1
            elif token == flag:
                return {
                    "success": False,
                    "error": f"Invalid frame: Unescaped FLAG ('{flag}') detected inside frame payload at position {pos}."
                }
            else:
                steps.append(f"De-stuff Step {step_count}: Position {pos}: Normal byte '{token}' -> retained as payload")
                destuffed_chars.append(token)
                step_count += 1

    if escaped:
        return {
            "success": False,
            "error": f"Invalid frame: Dangling ESC ('{esc}') at end of frame payload without a following byte."
        }

    destuffed_data = join_delimiter.join(destuffed_chars)
    steps.append(f"De-stuff Step {step_count}: De-stuffing complete. Recovered original payload = '{destuffed_data}'")

    return {
        "success": True,
        "destuffed_data": destuffed_data,
        "steps": steps
    }


def process_byte_stuffing(data: str, flag: str = "F", esc: str = "E", action: str = "full_cycle", injected_error: str = None) -> dict:
    """
    Main entry point for Byte Stuffing and De-stuffing processing.

    :param data: Input data string or frame string depending on action.
    :param flag: Flag character (default 'F').
    :param esc: Escape character (default 'E').
    :param action: 'stuff', 'destuff', or 'full_cycle'.
    :param injected_error: Optional modified frame text for error simulation.
    :return: Comprehensive result dictionary.
    """
    # Force defaults if empty parameters supplied
    flag = flag if (flag is not None and len(str(flag)) > 0) else "F"
    esc = esc if (esc is not None and len(str(esc)) > 0) else "E"

    if action == "destuff":
        return byte_destuff(data, flag=flag, esc=esc)

    if action == "stuff":
        return byte_stuff(data, flag=flag, esc=esc)

    # Full Cycle mode (Stuff -> Optional Error Injection -> De-stuff)
    stuff_result = byte_stuff(data, flag=flag, esc=esc)
    if not stuff_result["success"]:
        return stuff_result

    # Determine frame to de-stuff
    frame_to_destuff = injected_error if (injected_error is not None and len(str(injected_error)) > 0) else stuff_result["stuffed_frame"]
    destuff_result = byte_destuff(frame_to_destuff, flag=flag, esc=esc)

    combined_steps = list(stuff_result["steps"])
    if injected_error and len(str(injected_error)) > 0:
        combined_steps.append(f"⚡ ERROR INJECTION ACTIVATED: Transmitted frame corrupted to '{injected_error}'")

    if destuff_result["success"]:
        combined_steps.extend(destuff_result["steps"])
    else:
        combined_steps.append(f"❌ DE-STUFFING FAILED: {destuff_result['error']}")

    integrity_match = (destuff_result.get("destuffed_data") == stuff_result["original_data"]) if destuff_result["success"] else False

    return {
        "success": True,
        "action": "full_cycle",
        "original_data": stuff_result["original_data"],
        "flag": flag,
        "escape_character": esc,
        "stuffed_payload": stuff_result["stuffed_payload"],
        "stuffed_frame": stuff_result["stuffed_frame"],
        "stuffed_tokens": stuff_result["tokens"],
        "received_frame": frame_to_destuff,
        "destuffed_data": destuff_result.get("destuffed_data"),
        "destuff_success": destuff_result["success"],
        "destuff_error": destuff_result.get("error"),
        "steps": combined_steps,
        "integrity_match": integrity_match
    }
