"""
=============================================================================
Parity Check Module (1D Simple & 2D Block Parity)
=============================================================================
Course: Data Communication Lab
Layer: Data Link Layer (Error Detection Technique)

Concepts:
- 1D Simple Parity: Appends a single parity bit to a binary payload.
  - Even Parity: Total number of 1s (data + parity) is EVEN.
  - Odd Parity: Total number of 1s (data + parity) is ODD.
- 2D Block Parity: Arranges binary payload into an R x C matrix.
  - Computes Row Parity for each row, Column Parity for each column, and Corner Parity.
  - Detects multi-bit errors and pinpoints single-bit error (Row r, Column c).
=============================================================================
"""

def calculate_parity_bit(data: str, parity_type: str = "even") -> str:
    """
    Calculates the parity bit for a binary payload string.

    :param data: Binary string (e.g. '1011001').
    :param parity_type: 'even' or 'odd'.
    :return: Parity bit character ('0' or '1').
    """
    ones_count = data.count('1')
    if parity_type.lower() == "even":
        return '0' if (ones_count % 2 == 0) else '1'
    else:  # odd
        return '1' if (ones_count % 2 == 0) else '0'


def encode_parity_1d(data: str, parity_type: str = "even") -> dict:
    """
    Encodes 1D binary payload with a simple parity bit.

    :param data: Binary data payload string.
    :param parity_type: 'even' or 'odd'.
    :return: Dictionary containing parity bit, encoded codeword, and step trace.
    """
    raw_data = str(data).replace(" ", "")
    if not raw_data:
        return {"success": False, "error": "Input binary payload cannot be empty."}

    for ch in raw_data:
        if ch not in ('0', '1'):
            return {"success": False, "error": f"Invalid non-binary character '{ch}' in input. Only '0' and '1' allowed."}

    p_type = parity_type.lower()
    if p_type not in ("even", "odd"):
        return {"success": False, "error": f"Invalid parity type '{parity_type}'. Must be 'even' or 'odd'."}

    ones_count = raw_data.count('1')
    parity_bit = calculate_parity_bit(raw_data, p_type)
    codeword = raw_data + parity_bit

    steps = [
        f"Step 1: Original input binary payload = '{raw_data}' (Length = {len(raw_data)})",
        f"Step 2: Selected Parity Scheme = '{p_type.upper()}' Parity",
        f"Step 3: Count number of 1s in payload = {ones_count}"
    ]

    if p_type == "even":
        if ones_count % 2 == 0:
            steps.append(f"Step 4: Ones count ({ones_count}) is already EVEN -> set Parity Bit = '0'")
        else:
            steps.append(f"Step 4: Ones count ({ones_count}) is ODD -> set Parity Bit = '1' to make total 1s count even")
    else:  # odd
        if ones_count % 2 == 0:
            steps.append(f"Step 4: Ones count ({ones_count}) is EVEN -> set Parity Bit = '1' to make total 1s count odd")
        else:
            steps.append(f"Step 4: Ones count ({ones_count}) is already ODD -> set Parity Bit = '0'")

    steps.append(f"Step 5: Final Transmitted Codeword = Payload ('{raw_data}') + Parity Bit ('{parity_bit}') = '{codeword}'")

    return {
        "success": True,
        "mode": "1D",
        "original_data": raw_data,
        "parity_type": p_type,
        "ones_count": ones_count,
        "parity_bit": parity_bit,
        "encoded_codeword": codeword,
        "steps": steps
    }


def check_parity_1d(received_codeword: str, parity_type: str = "even") -> dict:
    """
    Checks parity bit of a received 1D codeword.

    :param received_codeword: Binary codeword string (payload + parity bit).
    :param parity_type: 'even' or 'odd'.
    :return: Error detection status and check steps.
    """
    raw_cw = str(received_codeword).replace(" ", "")
    if not raw_cw or len(raw_cw) < 2:
        return {"success": False, "error": "Received codeword must be at least 2 bits long (data + parity)."}

    for ch in raw_cw:
        if ch not in ('0', '1'):
            return {"success": False, "error": f"Invalid non-binary character '{ch}' in codeword."}

    p_type = parity_type.lower()
    data_bits = raw_cw[:-1]
    recv_parity_bit = raw_cw[-1]
    expected_parity_bit = calculate_parity_bit(data_bits, p_type)

    total_ones = raw_cw.count('1')
    if p_type == "even":
        is_valid = (total_ones % 2 == 0)
    else:
        is_valid = (total_ones % 2 != 0)

    steps = [
        f"Receiver Step 1: Received codeword = '{raw_cw}'",
        f"Receiver Step 2: Extracted payload bits = '{data_bits}', Received Parity Bit = '{recv_parity_bit}'",
        f"Receiver Step 3: Recalculated expected Parity Bit for '{data_bits}' under {p_type.upper()} parity = '{expected_parity_bit}'",
        f"Receiver Step 4: Total 1s in received codeword = {total_ones}"
    ]

    if is_valid:
        steps.append(f"Receiver Step 5: Total 1s count ({total_ones}) satisfies {p_type.upper()} parity -> STATUS: NO ERROR DETECTED")
    else:
        steps.append(f"Receiver Step 5: Total 1s count ({total_ones}) violates {p_type.upper()} parity (Expected parity bit '{expected_parity_bit}' != Received '{recv_parity_bit}') -> STATUS: ERROR DETECTED")

    return {
        "success": True,
        "mode": "1D",
        "received_codeword": raw_cw,
        "data_bits": data_bits,
        "received_parity_bit": recv_parity_bit,
        "expected_parity_bit": expected_parity_bit,
        "total_ones": total_ones,
        "error_detected": not is_valid,
        "steps": steps
    }


def calculate_block_parity(data: str, columns: int = 4, parity_type: str = "even") -> dict:
    """
    Computes 2D Block Parity for a binary payload string.

    :param data: Binary payload string.
    :param columns: Number of matrix columns (must be >= 1).
    :param parity_type: 'even' or 'odd'.
    :return: 2D matrix view, row parities, column parities, corner parity, and steps.
    """
    raw_data = str(data).replace(" ", "")
    if not raw_data:
        return {"success": False, "error": "Input binary payload cannot be empty."}

    for ch in raw_data:
        if ch not in ('0', '1'):
            return {"success": False, "error": f"Invalid non-binary character '{ch}' in input."}

    if not isinstance(columns, int) or columns < 1:
        return {"success": False, "error": f"Invalid column count '{columns}'. Must be an integer >= 1."}

    p_type = parity_type.lower()
    if p_type not in ("even", "odd"):
        return {"success": False, "error": f"Invalid parity type '{parity_type}'. Must be 'even' or 'odd'."}

    # Pad payload with trailing zeros if needed to complete final row
    padded_data = raw_data
    padding_added = 0
    if len(raw_data) % columns != 0:
        padding_added = columns - (len(raw_data) % columns)
        padded_data = raw_data + ('0' * padding_added)

    rows_count = len(padded_data) // columns
    matrix_rows = []
    row_parities = []

    steps = [
        f"Step 1: Original input payload = '{raw_data}' (Length = {len(raw_data)})",
        f"Step 2: Configured 2D Matrix Columns = {columns}, Parity Scheme = '{p_type.upper()}'"
    ]

    if padding_added > 0:
        steps.append(f"Step 2b: Padded payload with {padding_added} trailing '0's to form {rows_count} full rows of length {columns} -> '{padded_data}'")

    # Build rows and row parities
    for r in range(rows_count):
        row_str = padded_data[r * columns : (r + 1) * columns]
        r_parity = calculate_parity_bit(row_str, p_type)
        matrix_rows.append(row_str)
        row_parities.append(r_parity)
        steps.append(f"Step 3.{r+1}: Row {r+1} = '{row_str}' (1s count = {row_str.count('1')}) -> Row Parity P_r{r+1} = '{r_parity}'")

    # Build column parities
    col_parities = []
    for c in range(columns):
        col_str = "".join(matrix_rows[r][c] for r in range(rows_count))
        c_parity = calculate_parity_bit(col_str, p_type)
        col_parities.append(c_parity)
        steps.append(f"Step 4.{c+1}: Column {c+1} = '{col_str}' (1s count = {col_str.count('1')}) -> Column Parity P_c{c+1} = '{c_parity}'")

    # Corner Parity (calculated over row parities)
    corner_parity = calculate_parity_bit("".join(row_parities), p_type)
    steps.append(f"Step 5: Corner Parity P_corner (over Row Parities '{''.join(row_parities)}') = '{corner_parity}'")

    return {
        "success": True,
        "mode": "2D",
        "original_data": raw_data,
        "padded_data": padded_data,
        "padding_added": padding_added,
        "columns": columns,
        "rows": rows_count,
        "parity_type": p_type,
        "matrix_rows": matrix_rows,
        "row_parities": row_parities,
        "col_parities": col_parities,
        "corner_parity": corner_parity,
        "steps": steps
    }


def process_parity(data_stream: str, parity_type: str = "even", mode: str = "1D", columns: int = 4, action: str = "full_cycle", injected_error: str = None, error_pos: int = None, error_row: int = None, error_col: int = None) -> dict:
    """
    Main entry point for 1D Simple and 2D Block Parity processing.

    :param data_stream: Binary payload string.
    :param parity_type: 'even' or 'odd'.
    :param mode: '1D' or '2D'.
    :param columns: Number of columns for 2D mode (default 4).
    :param action: 'encode', 'check', or 'full_cycle'.
    :param injected_error: Explicitly corrupted binary string.
    :param error_pos: 1-indexed bit position in 1D codeword to flip.
    :param error_row: 1-indexed row position for 2D bit flip.
    :param error_col: 1-indexed column position for 2D bit flip.
    :return: Comprehensive result dictionary.
    """
    p_type = parity_type.lower() if parity_type else "even"
    p_mode = mode.upper() if mode else "1D"

    if p_mode not in ("1D", "2D"):
        return {"success": False, "error": f"Invalid mode '{mode}'. Must be '1D' or '2D'."}

    # =========================================================================
    # 1D SIMPLE PARITY PROCESSING
    # =========================================================================
    if p_mode == "1D":
        if action == "check":
            return check_parity_1d(data_stream, parity_type=p_type)

        encode_res = encode_parity_1d(data_stream, parity_type=p_type)
        if not encode_res["success"]:
            return encode_res

        if action == "encode":
            return encode_res

        # Full Cycle Mode with optional Error Injection
        transmitted_cw = encode_res["encoded_codeword"]
        received_cw = transmitted_cw
        error_applied = False
        error_details = None
        pos = None

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

        check_res = check_parity_1d(received_cw, parity_type=p_type)

        combined_steps = list(encode_res["steps"])
        if error_applied:
            combined_steps.append(f"[ERROR INJECTION]: {error_details}")
            combined_steps.append(f"[CORRUPTED CODEWORD]: Received Codeword = '{received_cw}'")

        if check_res["success"]:
            combined_steps.extend(check_res["steps"])

        return {
            "success": True,
            "mode": "1D",
            "parity_type": p_type,
            "original_data": encode_res["original_data"],
            "parity_bit": encode_res["parity_bit"],
            "encoded_codeword": transmitted_cw,
            "received_codeword": received_cw,
            "error_injected": error_applied,
            "error_pos": pos if error_applied else None,
            "error_details": error_details,
            "error_detected": check_res.get("error_detected", False),
            "integrity_match": not check_res.get("error_detected", False),
            "steps": combined_steps
        }

    # =========================================================================
    # 2D BLOCK PARITY PROCESSING
    # =========================================================================
    else:
        calc_res = calculate_block_parity(data_stream, columns=columns, parity_type=p_type)
        if not calc_res["success"]:
            return calc_res

        # Build receiver block checking & error injection
        matrix_rows = list(calc_res["matrix_rows"])
        orig_row_parities = list(calc_res["row_parities"])
        orig_col_parities = list(calc_res["col_parities"])
        orig_corner_parity = calc_res["corner_parity"]
        num_rows = calc_res["rows"]
        num_cols = calc_res["columns"]

        error_applied = False
        error_details = None
        corrupted_row_idx = None
        corrupted_col_idx = None

        # Handle 2D Error Injection (Row & Col or 1D index)
        if error_row is not None and error_col is not None:
            r_idx = int(error_row) - 1
            c_idx = int(error_col) - 1
            if 0 <= r_idx < num_rows and 0 <= c_idx < num_cols:
                row_chars = list(matrix_rows[r_idx])
                orig_bit = row_chars[c_idx]
                row_chars[c_idx] = '1' if orig_bit == '0' else '0'
                matrix_rows[r_idx] = "".join(row_chars)
                error_applied = True
                corrupted_row_idx = r_idx
                corrupted_col_idx = c_idx
                error_details = f"Flipped data bit at Row {r_idx + 1}, Column {c_idx + 1} ('{orig_bit}' -> '{row_chars[c_idx]}')"
            else:
                return {"success": False, "error": f"Invalid row/col ({error_row}, {error_col}). Matrix dimensions are {num_rows} rows x {num_cols} cols."}
        elif error_pos is not None and str(error_pos).isdigit():
            pos = int(error_pos) - 1
            flat_len = num_rows * num_cols
            if 0 <= pos < flat_len:
                r_idx = pos // num_cols
                c_idx = pos % num_cols
                row_chars = list(matrix_rows[r_idx])
                orig_bit = row_chars[c_idx]
                row_chars[c_idx] = '1' if orig_bit == '0' else '0'
                matrix_rows[r_idx] = "".join(row_chars)
                error_applied = True
                corrupted_row_idx = r_idx
                corrupted_col_idx = c_idx
                error_details = f"Flipped bit at 1D index {pos + 1} (Row {r_idx + 1}, Column {c_idx + 1})"

        # Recalculate parities on received matrix
        mismatched_rows = []
        mismatched_cols = []
        recv_row_parities = []
        recv_col_parities = []

        for r in range(num_rows):
            r_str = matrix_rows[r]
            calc_p = calculate_parity_bit(r_str, p_type)
            recv_row_parities.append(calc_p)
            if calc_p != orig_row_parities[r]:
                mismatched_rows.append(r + 1)

        for c in range(num_cols):
            c_str = "".join(matrix_rows[r][c] for r in range(num_rows))
            calc_p = calculate_parity_bit(c_str, p_type)
            recv_col_parities.append(calc_p)
            if calc_p != orig_col_parities[c]:
                mismatched_cols.append(c + 1)

        error_detected = (len(mismatched_rows) > 0 or len(mismatched_cols) > 0)
        pinpointed_location = None

        combined_steps = list(calc_res["steps"])
        if error_applied:
            combined_steps.append(f"[ERROR INJECTION]: {error_details}")

        combined_steps.append("Receiver 2D Block Parity Verification:")
        if not error_detected:
            combined_steps.append("  All Row and Column Parities match expected values -> STATUS: NO ERROR DETECTED")
        else:
            combined_steps.append(f"  Parity Mismatch Detected in Row(s): {mismatched_rows}, Column(s): {mismatched_cols}")
            if len(mismatched_rows) == 1 and len(mismatched_cols) == 1:
                pinpointed_location = {"row": mismatched_rows[0], "col": mismatched_cols[0]}
                combined_steps.append(f"  [PINPOINTED] SINGLE-BIT ERROR PINPOINTED at Row {mismatched_rows[0]}, Column {mismatched_cols[0]}!")
            else:
                combined_steps.append("  Multi-bit error detected across multiple rows/columns.")

        return {
            "success": True,
            "mode": "2D",
            "parity_type": p_type,
            "original_data": calc_res["original_data"],
            "columns": num_cols,
            "rows": num_rows,
            "matrix_rows": matrix_rows,
            "row_parities": orig_row_parities,
            "col_parities": orig_col_parities,
            "corner_parity": orig_corner_parity,
            "recv_row_parities": recv_row_parities,
            "recv_col_parities": recv_col_parities,
            "error_injected": error_applied,
            "error_details": error_details,
            "error_detected": error_detected,
            "mismatched_rows": mismatched_rows,
            "mismatched_cols": mismatched_cols,
            "pinpointed_location": pinpointed_location,
            "integrity_match": not error_detected,
            "steps": combined_steps
        }
