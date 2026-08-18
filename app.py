"""
=============================================================================
Error Detection & Correction Simulator - Main Flask Application (v1.1)
=============================================================================
Course: Data Communication Lab
Architecture: Clean Modular Flask Backend with Separate Algorithm Handlers

This Flask app handles web routing and API requests for 6 techniques:
1. Byte/Character Stuffing
2. Bit Stuffing
3. Parity Check
4. Cyclic Redundancy Check (CRC)
5. Hamming Code
6. Hamming Distance
=============================================================================
"""

from flask import Flask, render_template, request, jsonify
from algorithms import (
    process_byte_stuffing,
    process_bit_stuffing,
    process_parity,
    process_crc,
    process_checksum,
    process_hamming,
    process_hamming_distance
)

app = Flask(__name__, template_folder="templates", static_folder="static")

@app.route("/")
def index():
    """
    Renders the main interactive Data Communication Lab Dashboard.
    """
    return render_template("index.html")

@app.route("/api/process", methods=["POST"])
def process_data():
    """
    API endpoint for handling data processing across all 6 techniques.
    Receives JSON payload with technique name, input data, parameters,
    and optional injected errors. Dispatches request to modular algorithm handlers.
    """
    req_data = request.get_json() or {}
    technique = req_data.get("technique")
    input_data = req_data.get("input_data", "")
    injected_error = req_data.get("injected_error")
    params = req_data.get("params", {})

    if not technique:
        return jsonify({"error": "No technique specified"}), 400

    # Route to modular algorithm handler
    if technique == "byte_stuffing":
        flag = params.get("flag", "F")
        esc = params.get("esc", "E")
        action = params.get("action", "full_cycle")
        original_data = params.get("original_data")
        result = process_byte_stuffing(input_data, flag=flag, esc=esc, action=action, injected_error=injected_error, original_data=original_data)
        
    elif technique == "bit_stuffing":
        flag_pattern = params.get("flag_pattern", "01111110")
        action = params.get("action", "full_cycle")
        error_pos = params.get("error_pos")
        original_data = params.get("original_data")
        result = process_bit_stuffing(input_data, flag_pattern=flag_pattern, action=action, injected_error=injected_error, error_pos=error_pos, original_data=original_data)
        
    elif technique == "parity":
        parity_type = params.get("parity_type", "even")
        mode = params.get("mode", "1D")
        columns = int(params.get("columns", 4)) if str(params.get("columns", "")).isdigit() else 4
        action = params.get("action", "full_cycle")
        error_pos = params.get("error_pos")
        error_row = params.get("error_row")
        error_col = params.get("error_col")
        result = process_parity(
            input_data,
            parity_type=parity_type,
            mode=mode,
            columns=columns,
            action=action,
            injected_error=injected_error,
            error_pos=error_pos,
            error_row=error_row,
            error_col=error_col
        )
        
    elif technique == "crc":
        polynomial = params.get("polynomial", "1101")
        action = params.get("action", "full_cycle")
        error_pos = params.get("error_pos")
        result = process_crc(
            input_data,
            polynomial=polynomial,
            action=action,
            injected_error=injected_error,
            error_pos=error_pos
        )
        
    elif technique == "checksum":
        word_size = int(params.get("word_size", 8)) if str(params.get("word_size", "")).isdigit() else 8
        action = params.get("action", "full_cycle")
        error_pos = params.get("error_pos")
        result = process_checksum(
            input_data,
            word_size=word_size,
            action=action,
            injected_error=injected_error,
            error_pos=error_pos
        )
        
    elif technique == "hamming":
        mode = params.get("mode", "auto")
        parity_type = params.get("parity_type", "even")
        action = params.get("action", "full_cycle")
        error_pos = params.get("error_pos")
        result = process_hamming(
            input_data,
            mode=mode,
            parity_type=parity_type,
            action=action,
            injected_error=injected_error,
            error_pos=error_pos
        )
        
    elif technique == "hamming_distance":
        mode = params.get("mode", "pair")
        codeword2 = params.get("codeword2", "")
        codewords_list = params.get("codewords", [])
        
        if mode == "multi" or (codewords_list and len(codewords_list) > 0):
            result = process_hamming_distance(codewords_list, mode="multi")
        else:
            result = process_hamming_distance(input_data, codeword2, mode="pair")
        
    else:
        return jsonify({"error": f"Unknown technique: {technique}"}), 400

    return jsonify({
        "success": True,
        "technique": technique,
        "result": result
    })

if __name__ == "__main__":
    # Run the Flask development server on host 127.0.0.1, port 5000
    print("Starting EDC Simulator - Data Communication Lab...")
    app.run(host="127.0.0.1", port=5000, debug=True)
