"""
=============================================================================
Error Detection & Correction Simulator - Main Flask Application
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
    process_hamming,
    process_hamming_distance
)

app = Flask(__name__)

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
        flag = params.get("flag", "FLAG")
        esc = params.get("esc", "ESC")
        result = process_byte_stuffing(input_data, flag=flag, esc=esc, injected_error=injected_error)
        
    elif technique == "bit_stuffing":
        flag_pattern = params.get("flag_pattern", "01111110")
        result = process_bit_stuffing(input_data, flag_pattern=flag_pattern, injected_error=injected_error)
        
    elif technique == "parity":
        parity_type = params.get("parity_type", "even")
        mode = params.get("mode", "1D")
        result = process_parity(input_data, parity_type=parity_type, mode=mode, injected_error=injected_error)
        
    elif technique == "crc":
        polynomial = params.get("polynomial", "1101")
        result = process_crc(input_data, polynomial=polynomial, injected_error=injected_error)
        
    elif technique == "hamming":
        parity_type = params.get("parity_type", "even")
        result = process_hamming(input_data, parity_type=parity_type, injected_error=injected_error)
        
    elif technique == "hamming_distance":
        codeword2 = params.get("codeword2", "")
        result = process_hamming_distance(input_data, codeword2)
        
    else:
        return jsonify({"error": f"Unknown technique: {technique}"}), 400

    return jsonify({
        "success": True,
        "technique": technique,
        "result": result
    })

if __name__ == "__main__":
    # Run the Flask development server on host 127.0.0.1, port 5000
    print("🚀 Starting Data Communication Lab - Error Detection & Correction Simulator...")
    app.run(host="127.0.0.1", port=5000, debug=True)
