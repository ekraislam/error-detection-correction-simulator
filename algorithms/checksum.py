"""
=============================================================================
Internet Checksum Module (1's Complement RFC 1071 Standard)
=============================================================================
Course: Data Communication Lab
Layer: Data Link Layer / Network Layer / Transport Layer (Error Detection)

Core Principles:
1. Divide data payload into equal-sized k-bit words (8-bit or 16-bit).
2. Perform 1's complement binary addition across all words:
   - When a carry out of the MSB occurs (sum >= 2^k), wrap the carry bit around
     and add it to the Least Significant Bit (End-Around / Wraparound Carry).
3. Compute the 1's complement (invert all bits) of the final sum to produce the CHECKSUM.
4. Transmitted Frame = Data Words + Checksum.
5. Receiver-side Verification:
   - Sum all received data words PLUS the received checksum using 1's complement addition.
   - If the result is all 1s ('11111111' for 8-bit or '1111111111111111' for 16-bit),
     the inverted sum is 0 -> STATUS: NO ERROR DETECTED.
   - Any non-zero inverted sum indicates transmission error -> STATUS: ERROR DETECTED.
=============================================================================
"""

def invert_bits(bit_str: str) -> str:
    """Computes the 1's complement (bitwise NOT) of a binary string."""
    return "".join('1' if b == '0' else '0' for b in bit_str)


def ones_complement_add(word1: str, word2: str, word_size: int = 8) -> tuple:
    """
    Performs 1's complement addition of two binary words of length `word_size`.
    Implements end-around carry: carry out from MSB is wrapped around and added to LSB.

    :param word1: First binary word string.
    :param word2: Second binary word string.
    :param word_size: Word size in bits (8 or 16).
    :return: Tuple of (final_sum_binary_string, carry_occurred_bool, raw_sum_int, intermediate_steps_list)
    """
    val1 = int(word1, 2)
    val2 = int(word2, 2)
    raw_sum = val1 + val2
    mask = (1 << word_size) - 1
    carry = raw_sum >> word_size

    steps = []
    w1_fmt = format(val1, f"0{word_size}b")
    w2_fmt = format(val2, f"0{word_size}b")

    if carry > 0:
        wrapped_sum = (raw_sum & mask) + carry
        # Handle secondary carry if any
        while wrapped_sum > mask:
            sec_carry = wrapped_sum >> word_size
            wrapped_sum = (wrapped_sum & mask) + sec_carry

        sum_bin = format(wrapped_sum, f"0{word_size}b")
        steps.append(
            f"Add: {w1_fmt} (Dec {val1}) + {w2_fmt} (Dec {val2}) = Raw Sum Dec {raw_sum} -> Carry Out = {carry}"
        )
        steps.append(
            f"End-Around Carry: ({format(raw_sum & mask, f'0{word_size}b')}) + {carry} (carry) = {sum_bin} (Dec {wrapped_sum})"
        )
        return sum_bin, True, raw_sum, steps
    else:
        sum_bin = format(raw_sum, f"0{word_size}b")
        steps.append(
            f"Add: {w1_fmt} (Dec {val1}) + {w2_fmt} (Dec {val2}) = {sum_bin} (Dec {raw_sum}) [No Carry]"
        )
        return sum_bin, False, raw_sum, steps


def validate_checksum_input(data: str, word_size: int = 8) -> dict:
    """
    Validates binary payload and word size parameters.
    """
    if data is None or len(str(data).strip()) == 0:
        return {"valid": False, "error": "Input binary payload cannot be empty."}

    raw_data = str(data).replace(" ", "")
    for ch in raw_data:
        if ch not in ('0', '1'):
            return {"valid": False, "error": f"Invalid non-binary character '{ch}' in input. Only '0' and '1' are allowed."}

    if word_size not in (8, 16):
        return {"valid": False, "error": f"Invalid word size {word_size}-bit. Supported word sizes are 8-bit and 16-bit."}

    # Minimum 1 bit required
    if len(raw_data) < 1:
        return {"valid": False, "error": "Input binary payload must contain at least 1 bit."}

    return {"valid": True, "raw_data": raw_data, "word_size": word_size}


def calculate_checksum_sender(data: str, word_size: int = 8) -> dict:
    """
    Performs Sender-side Internet Checksum calculation:
    1. Splits data into words of `word_size` bits (pads with trailing zeros if needed).
    2. Sums all words sequentially using 1's complement addition with end-around carry.
    3. Inverts the final sum (1's complement) to obtain the Checksum.

    :param data: Raw binary data string.
    :param word_size: 8 or 16 bits.
    :return: Structured result dictionary with words, addition trace, final sum, and checksum.
    """
    val = validate_checksum_input(data, word_size)
    if not val["valid"]:
        return {"success": False, "error": val["error"]}

    raw_data = val["raw_data"]
    rem = len(raw_data) % word_size
    padding_bits = (word_size - rem) % word_size
    padded_data = raw_data + ('0' * padding_bits) if padding_bits > 0 else raw_data

    # Split into words
    words = [padded_data[i : i + word_size] for i in range(0, len(padded_data), word_size)]
    num_words = len(words)

    steps = [
        f"Step 1: Original input payload = '{raw_data}' (Length: {len(raw_data)} bits)",
        f"Step 2: Selected Word Size = {word_size}-bit. Total words = {num_words}"
    ]

    if padding_bits > 0:
        steps.append(f"Step 2b: Padded {padding_bits} trailing '0's to align with {word_size}-bit boundary -> '{padded_data}'")

    for idx, w in enumerate(words):
        steps.append(f"  Word {idx+1} (W{idx+1}) = '{w}' (Decimal: {int(w, 2)}, Hex: 0x{int(w, 2):0{word_size//4}X})")

    addition_trace = []
    current_sum = words[0]

    steps.append(f"Step 3: Begin 1's Complement Sequential Addition:")
    steps.append(f"  Initial Accumulator = W1 = '{current_sum}' (Dec {int(current_sum, 2)})")

    for i in range(1, num_words):
        next_word = words[i]
        new_sum, carry_occurred, raw_val, sub_steps = ones_complement_add(current_sum, next_word, word_size=word_size)
        carry_val = raw_val >> word_size
        mask = (1 << word_size) - 1
        addition_trace.append({
            "step_index": i,
            "operand_a": current_sum,
            "operand_a_dec": int(current_sum, 2),
            "operand_b": next_word,
            "operand_b_dec": int(next_word, 2),
            "operand_b_label": f"W{i+1}",
            "raw_sum_dec": raw_val,
            "raw_sum_bin": format(raw_val, f"0{word_size + (1 if carry_occurred else 0)}b"),
            "carry_occurred": carry_occurred,
            "carry_val": carry_val,
            "unwrapped_part": format(raw_val & mask, f"0{word_size}b"),
            "result_sum": new_sum,
            "result_sum_dec": int(new_sum, 2),
            "sub_steps": sub_steps
        })
        steps.append(f"  Addition {i}: W{i} Accumulator ('{current_sum}') + W{i+1} ('{next_word}'):")
        for s in sub_steps:
            steps.append(f"    • {s}")
        current_sum = new_sum

    final_sum = current_sum
    checksum = invert_bits(final_sum)
    transmitted_frame = padded_data + checksum
    transmitted_words = words + [checksum]

    steps.append(f"Step 4: Final 1's Complement Sum of all {num_words} words = '{final_sum}' (Dec {int(final_sum, 2)})")
    steps.append(f"Step 5: Take 1's Complement (Bitwise Inversion) of Final Sum:")
    steps.append(f"  ~('{final_sum}') = '{checksum}' (Checksum)")
    steps.append(f"Step 6: Transmitted Codeword Frame = Payload Words ({num_words}×{word_size}b) + Checksum ({word_size}b) = '{transmitted_frame}'")

    return {
        "success": True,
        "original_data": raw_data,
        "padded_data": padded_data,
        "padding_bits": padding_bits,
        "word_size": word_size,
        "num_words": num_words,
        "words": words,
        "addition_trace": addition_trace,
        "final_sum": final_sum,
        "checksum": checksum,
        "transmitted_frame": transmitted_frame,
        "transmitted_words": transmitted_words,
        "steps": steps
    }


def verify_checksum_receiver(received_data: str, word_size: int = 8, expected_words_count: int = None) -> dict:
    """
    Performs Receiver-side Internet Checksum Verification:
    1. Splits received bitstream into words of `word_size` bits (including the checksum as the last word).
    2. Sums all received words (data words + checksum word) using 1's complement addition.
    3. If the final sum is all 1s ('11111111' for 8-bit, '1111111111111111' for 16-bit),
       the 1's complement inverted sum is 0 -> NO ERROR DETECTED.
       Otherwise -> ERROR DETECTED.

    :param received_data: Received binary string (data words + checksum).
    :param word_size: 8 or 16 bits.
    :param expected_words_count: Optional expected word count.
    :return: Receiver verification result dictionary.
    """
    val = validate_checksum_input(received_data, word_size)
    if not val["valid"]:
        return {"success": False, "error": val["error"]}

    raw_recv = val["raw_data"]
    if len(raw_recv) < word_size * 2:
        return {
            "success": False,
            "error": f"Received frame length ({len(raw_recv)} bits) is too short. Must contain at least 1 data word and 1 checksum word ({word_size * 2} bits for {word_size}-bit word size)."
        }

    # Split into words
    recv_words = [raw_recv[i : i + word_size] for i in range(0, len(raw_recv), word_size)]
    data_words = recv_words[:-1]
    recv_checksum = recv_words[-1]
    total_words = len(recv_words)

    steps = [
        f"Receiver Step 1: Received Frame = '{raw_recv}' (Length: {len(raw_recv)} bits, Word Size: {word_size}-bit)",
        f"Receiver Step 2: Extracted {len(data_words)} Payload Words + 1 Received Checksum Word:"
    ]

    for idx, w in enumerate(data_words):
        steps.append(f"  Received Word {idx+1} (R_W{idx+1}) = '{w}' (Dec {int(w, 2)})")
    steps.append(f"  Received Checksum (R_CHK) = '{recv_checksum}' (Dec {int(recv_checksum, 2)})")

    addition_trace = []
    current_sum = recv_words[0]

    steps.append(f"Receiver Step 3: Compute 1's Complement Sum of All Received Words + Checksum:")
    steps.append(f"  Initial Accumulator = R_W1 = '{current_sum}' (Dec {int(current_sum, 2)})")

    for i in range(1, total_words):
        next_word = recv_words[i]
        label = f"R_W{i+1}" if i < total_words - 1 else "R_CHK"
        new_sum, carry_occurred, raw_val, sub_steps = ones_complement_add(current_sum, next_word, word_size=word_size)
        carry_val = raw_val >> word_size
        mask = (1 << word_size) - 1
        addition_trace.append({
            "step_index": i,
            "operand_a": current_sum,
            "operand_a_dec": int(current_sum, 2),
            "operand_b": next_word,
            "operand_b_dec": int(next_word, 2),
            "operand_b_label": label,
            "raw_sum_dec": raw_val,
            "raw_sum_bin": format(raw_val, f"0{word_size + (1 if carry_occurred else 0)}b"),
            "carry_occurred": carry_occurred,
            "carry_val": carry_val,
            "unwrapped_part": format(raw_val & mask, f"0{word_size}b"),
            "result_sum": new_sum,
            "result_sum_dec": int(new_sum, 2),
            "sub_steps": sub_steps
        })
        steps.append(f"  Addition {i}: Accumulator ('{current_sum}') + {label} ('{next_word}'):")
        for s in sub_steps:
            steps.append(f"    • {s}")
        current_sum = new_sum

    receiver_sum = current_sum
    receiver_inverted = invert_bits(receiver_sum)
    all_ones = '1' * word_size
    all_zeros = '0' * word_size

    is_clean = (receiver_sum == all_ones) or (receiver_inverted == all_zeros)
    error_detected = not is_clean

    steps.append(f"Receiver Step 4: Total 1's Complement Sum = '{receiver_sum}'")
    steps.append(f"Receiver Step 5: Check Inverted Sum = ~('{receiver_sum}') = '{receiver_inverted}'")

    if is_clean:
        steps.append(f"Receiver Step 6: Inverted Sum is all zeros ('{all_zeros}') -> STATUS: NO ERROR DETECTED (Data Integrity Verified ✓)")
    else:
        steps.append(f"Receiver Step 6: Inverted Sum is NON-ZERO ('{receiver_inverted}') -> STATUS: ERROR DETECTED (Transmission Corrupted ✗)")

    return {
        "success": True,
        "word_size": word_size,
        "total_words": total_words,
        "received_frame": raw_recv,
        "data_words": data_words,
        "received_checksum": recv_checksum,
        "addition_trace": addition_trace,
        "receiver_sum": receiver_sum,
        "receiver_inverted_sum": receiver_inverted,
        "error_detected": error_detected,
        "integrity_match": is_clean,
        "steps": steps
    }


def process_checksum(
    data_stream: str,
    word_size: int = 8,
    action: str = "full_cycle",
    injected_error: str = None,
    error_pos: int = None
) -> dict:
    """
    Main entry point for Internet Checksum simulation (Sender, Receiver, Full Cycle with Error Injection).

    :param data_stream: Input binary payload string or complete received frame.
    :param word_size: Word size in bits (8 or 16, default 8).
    :param action: 'encode', 'verify', or 'full_cycle'.
    :param injected_error: Explicit corrupted binary frame string.
    :param error_pos: 1-indexed bit position in transmitted frame to flip (0 -> 1 or 1 -> 0).
    :return: Comprehensive result dictionary.
    """
    try:
        w_size = int(word_size) if word_size is not None else 8
    except (ValueError, TypeError):
        w_size = 8

    if action == "verify":
        return verify_checksum_receiver(data_stream, word_size=w_size)

    sender_res = calculate_checksum_sender(data_stream, word_size=w_size)
    if not sender_res["success"]:
        return sender_res

    if action == "encode":
        return sender_res

    # Full Cycle Mode: Sender -> Channel (with optional bit flip error) -> Receiver
    transmitted_frame = sender_res["transmitted_frame"]
    received_frame = transmitted_frame
    error_applied = False
    error_details = None

    if error_pos is not None and str(error_pos).isdigit():
        pos = int(error_pos)
        if 1 <= pos <= len(transmitted_frame):
            idx = pos - 1
            frame_chars = list(transmitted_frame)
            orig_bit = frame_chars[idx]
            flipped_bit = '1' if orig_bit == '0' else '0'
            frame_chars[idx] = flipped_bit
            received_frame = "".join(frame_chars)
            error_applied = True
            target_word_idx = idx // w_size + 1
            target_bit_in_word = idx % w_size + 1
            is_in_checksum = (target_word_idx > sender_res["num_words"])
            word_label = "Checksum" if is_in_checksum else f"Word {target_word_idx}"
            error_details = f"Flipped bit at 1-indexed position {pos} ({word_label}, bit {target_bit_in_word}) ('{orig_bit}' -> '{flipped_bit}')"
        else:
            return {
                "success": False,
                "error": f"Invalid error position {error_pos}. Must be between 1 and transmitted frame length ({len(transmitted_frame)} bits)."
            }
    elif injected_error and len(str(injected_error).strip()) > 0:
        clean_injected = str(injected_error).replace(" ", "")
        received_frame = clean_injected
        error_applied = (received_frame != transmitted_frame)
        error_details = f"Corrupted frame provided: '{received_frame}'" if error_applied else "Clean transmission"

    receiver_res = verify_checksum_receiver(received_frame, word_size=w_size)

    combined_steps = list(sender_res["steps"])
    if error_applied:
        combined_steps.append(f"⚡ [ERROR INJECTION]: {error_details}")
        combined_steps.append(f"⚡ [CORRUPTED FRAME]: Received Frame = '{received_frame}'")
    else:
        combined_steps.append(f"⚡ Channel Transmission: Received frame is intact ('{received_frame}')")

    if receiver_res["success"]:
        combined_steps.extend(receiver_res["steps"])

    return {
        "success": True,
        "action": "full_cycle",
        "word_size": w_size,
        "original_data": sender_res["original_data"],
        "padded_data": sender_res["padded_data"],
        "padding_bits": sender_res["padding_bits"],
        "num_words": sender_res["num_words"],
        "words": sender_res["words"],
        "addition_trace": sender_res["addition_trace"],
        "final_sum": sender_res["final_sum"],
        "checksum": sender_res["checksum"],
        "transmitted_frame": transmitted_frame,
        "transmitted_words": sender_res["transmitted_words"],
        "received_frame": received_frame,
        "received_words": receiver_res.get("data_words", []),
        "received_checksum": receiver_res.get("received_checksum"),
        "receiver_sum": receiver_res.get("receiver_sum"),
        "receiver_inverted_sum": receiver_res.get("receiver_inverted_sum"),
        "receiver_addition_trace": receiver_res.get("addition_trace", []),
        "error_injected": error_applied,
        "error_pos": error_pos if error_applied else None,
        "error_details": error_details,
        "error_detected": receiver_res.get("error_detected", False),
        "integrity_match": receiver_res.get("integrity_match", False),
        "steps": combined_steps
    }
