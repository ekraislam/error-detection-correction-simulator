"""
=============================================================================
Comprehensive Final QA Audit Script for Error Detection & Correction Simulator
=============================================================================
Executes end-to-end tests for all 6 modules, valid/invalid inputs, edge cases,
malformed requests, and API contract matching.
=============================================================================
"""

import sys
import json
from app import app

def run_qa_audit():
    print("=" * 80)
    print("EXECUTING FINAL END-TO-END QA AUDIT VIA FLASK TEST CLIENT")
    print("=" * 80)

    client = app.test_client()

    # 1. Test GET /
    print("\n--- Phase 1: Checking GET / Route ---")
    resp = client.get("/")
    assert resp.status_code == 200
    assert b"Error Detection & Correction Simulator" in resp.data
    print("[PASS] GET / returns HTTP 200 OK with dashboard HTML")

    # 2. Test Invalid Technique & Malformed API Requests
    print("\n--- Phase 2: Testing Malformed / API Error Handling ---")
    resp_empty = client.post("/api/process", json={})
    assert resp_empty.status_code == 400
    assert "No technique specified" in resp_empty.get_json()["error"]
    print("[PASS] Missing technique returns 400 Bad Request JSON")

    resp_unk = client.post("/api/process", json={"technique": "unknown_tech"})
    assert resp_unk.status_code == 400
    assert "Unknown technique" in resp_unk.get_json()["error"]
    print("[PASS] Unknown technique returns 400 Bad Request JSON")

    # 3. Test Module 1: Byte Stuffing API
    print("\n--- Phase 3: Module 1 — Byte Stuffing Audit ---")
    res1_1 = client.post("/api/process", json={
        "technique": "byte_stuffing",
        "input_data": "ABCFE",
        "params": {"flag": "F", "esc": "E", "action": "full_cycle"}
    }).get_json()
    assert res1_1["success"] == True
    assert res1_1["result"]["stuffed_frame"] == "FABCEFEEF"
    assert res1_1["result"]["destuffed_data"] == "ABCFE"
    assert res1_1["result"]["integrity_match"] == True
    print("[PASS] Byte stuffing ABCFE -> FABCEFEEF -> ABCFE (Match: True)")

    # Edge cases for Byte stuffing
    res1_err1 = client.post("/api/process", json={
        "technique": "byte_stuffing",
        "input_data": "",
        "params": {"flag": "F", "esc": "E"}
    }).get_json()
    assert res1_err1["result"]["success"] == False
    assert "cannot be empty" in res1_err1["result"]["error"].lower()
    print("[PASS] Empty byte stuffing payload handled gracefully")

    res1_err2 = client.post("/api/process", json={
        "technique": "byte_stuffing",
        "input_data": "ABC",
        "params": {"flag": "F", "esc": "F"}
    }).get_json()
    assert res1_err2["result"]["success"] == False
    assert "cannot be the same" in res1_err2["result"]["error"].lower()
    print("[PASS] FLAG == ESC conflict handled gracefully")

    # 4. Test Module 2: Bit Stuffing API
    print("\n--- Phase 4: Module 2 — Bit Stuffing Audit ---")
    res2_1 = client.post("/api/process", json={
        "technique": "bit_stuffing",
        "input_data": "111110",
        "params": {"flag_pattern": "01111110", "action": "full_cycle"}
    }).get_json()
    assert res2_1["success"] == True
    assert res2_1["result"]["threshold"] == 5
    assert res2_1["result"]["stuffed_payload"] == "1111100"
    assert res2_1["result"]["stuffed_frame"] == "01111110111110001111110"
    assert res2_1["result"]["destuffed_data"] == "111110"
    print("[PASS] Bit stuffing 111110 -> 1111100 -> Frame -> Destuffed 111110")

    res2_err1 = client.post("/api/process", json={
        "technique": "bit_stuffing",
        "input_data": "101201"
    }).get_json()
    assert res2_err1["result"]["success"] == False
    assert "non-binary" in res2_err1["result"]["error"].lower()
    print("[PASS] Non-binary bit stuffing input handled gracefully")

    # 5. Test Module 3: Parity Check API (1D & 2D)
    print("\n--- Phase 5: Module 3 — Parity Check Audit ---")
    res3_1d = client.post("/api/process", json={
        "technique": "parity",
        "input_data": "1011001",
        "params": {"mode": "1D", "parity_type": "even", "action": "full_cycle"}
    }).get_json()
    assert res3_1d["result"]["parity_bit"] == "0"
    assert res3_1d["result"]["encoded_codeword"] == "10110010"
    assert res3_1d["result"]["error_detected"] == False
    print("[PASS] 1D Even Parity 1011001 -> Parity 0, Codeword 10110010 (No Error)")

    res3_2d = client.post("/api/process", json={
        "technique": "parity",
        "input_data": "1011001011001001",
        "params": {"mode": "2D", "parity_type": "even", "columns": 4, "error_row": 2, "error_col": 3}
    }).get_json()
    assert res3_2d["result"]["error_detected"] == True
    assert res3_2d["result"]["pinpointed_location"] == {"row": 2, "col": 3}
    print("[PASS] 2D Block Parity Single-bit Error Pinpointed at Row 2, Column 3")

    # 6. Test Module 4: CRC Checksum API
    print("\n--- Phase 6: Module 4 — CRC Checksum Audit ---")
    res4 = client.post("/api/process", json={
        "technique": "crc",
        "input_data": "100100",
        "params": {"polynomial": "1101", "action": "full_cycle", "error_pos": 5}
    }).get_json()
    assert res4["result"]["crc_remainder"] == "001"
    assert res4["result"]["transmitted_codeword"] == "100100001"
    assert res4["result"]["error_injected"] == True
    assert res4["result"]["error_detected"] == True
    print("[PASS] CRC 100100 / 1101 -> Remainder 001, Codeword 100100001, Pos 5 Error Detected")

    # 7. Test Module 5: Hamming Code API
    print("\n--- Phase 7: Module 5 — Hamming Code Audit ---")
    res5 = client.post("/api/process", json={
        "technique": "hamming",
        "input_data": "1011",
        "params": {"mode": "7,4", "parity_type": "even", "action": "full_cycle", "error_pos": 3}
    }).get_json()
    assert res5["result"]["encoded_codeword"] == "1010101"
    assert res5["result"]["error_position"] == 3
    assert res5["result"]["corrected_codeword"] == "1010101"
    assert res5["result"]["extracted_data"] == "1011"
    print("[PASS] Hamming (7,4) 1011 -> 1010101 -> Pos 3 Error Syndrome 011 -> Auto-corrected to 1011")

    # 8. Test Module 6: Hamming Distance API (Mode A & B)
    print("\n--- Phase 8: Module 6 — Hamming Distance Audit ---")
    res6_a = client.post("/api/process", json={
        "technique": "hamming_distance",
        "input_data": "101101",
        "params": {"mode": "pair", "codeword2": "100111"}
    }).get_json()
    assert res6_a["result"]["distance"] == 2
    assert res6_a["result"]["xor_result"] == "001010"
    print("[PASS] Hamming Distance Mode A: 101101 vs 100111 -> Distance 2")

    res6_b = client.post("/api/process", json={
        "technique": "hamming_distance",
        "input_data": "",
        "params": {"mode": "multi", "codewords": ["101101", "100111", "111101", "001101"]}
    }).get_json()
    assert res6_b["result"]["d_min"] == 1
    assert res6_b["result"]["detectable_errors_s"] == 0
    assert res6_b["result"]["correctable_errors_t"] == 0
    print("[PASS] Hamming Distance Mode B: 4 codewords -> d_min = 1, s = 0, t = 0")

    # 9. Test Module 7: Internet Checksum API
    print("\n--- Phase 9: Module 7 — Internet Checksum Audit ---")
    res7_clean = client.post("/api/process", json={
        "technique": "checksum",
        "input_data": "1010100100110101",
        "params": {"word_size": 8, "action": "full_cycle"}
    }).get_json()
    assert res7_clean["result"]["final_sum"] == "11011110"
    assert res7_clean["result"]["checksum"] == "00100001"
    assert res7_clean["result"]["error_detected"] == False
    assert res7_clean["result"]["integrity_match"] == True
    print("[PASS] Internet Checksum 8-bit Clean -> Final Sum 11011110, Checksum 00100001, Integrity Match: True")

    res7_err = client.post("/api/process", json={
        "technique": "checksum",
        "input_data": "1010100100110101",
        "params": {"word_size": 8, "action": "full_cycle", "error_pos": 3}
    }).get_json()
    assert res7_err["result"]["error_injected"] == True
    assert res7_err["result"]["error_detected"] == True
    assert res7_err["result"]["integrity_match"] == False
    print("[PASS] Internet Checksum Error Injection -> Pos 3 Error Detected: True")

    print("\n" + "=" * 80)
    print("ALL API ENDPOINT QA AUDIT CHECKS PASSED SUCCESSFULLY!")
    print("=" * 80)

if __name__ == "__main__":
    run_qa_audit()
