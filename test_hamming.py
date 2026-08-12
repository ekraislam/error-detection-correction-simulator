"""
=============================================================================
Test Suite for Hamming Code Error Detection & Correction Implementation
Verifies all specified test scenarios for Hamming (7,4) and Hamming (15,11)
under the Right-to-Left positional convention (Pos 7..1: D4 D3 D2 R3 D1 R2 R1).
=============================================================================
"""

from algorithms.hamming import (
    process_hamming,
    hamming_encode,
    hamming_decode,
    calculate_syndrome,
    validate_hamming_input
)

def run_tests():
    print("=" * 70)
    print("RUNNING HAMMING CODE ERROR DETECTION & CORRECTION TEST SUITE")
    print("=" * 70)

    # REQUIRED TEST 1: 1011 + Hamming (7,4) + even => PASS (Expected 1010101)
    print("\n--- TEST 1: 1011 + Hamming (7,4) + Even Parity ---")
    proc1 = process_hamming("1011", mode="7,4", parity_type="even", action="full_cycle")
    print("Success:", proc1["success"])
    print("Original Data:", proc1["original_data"])
    print("Encoded Codeword:", proc1["encoded_codeword"])
    print("Received Codeword:", proc1["received_codeword"])
    print("Syndrome String:", proc1["syndrome_string"])
    print("Error Position:", proc1["error_position"])
    print("Error Detected:", proc1["error_detected"])
    print("Corrected Codeword:", proc1["corrected_codeword"])
    print("Extracted Data:", proc1["extracted_data"])
    print("Integrity Match:", proc1["integrity_match"])

    assert proc1["success"] == True
    assert proc1["original_data"] == "1011"
    assert proc1["encoded_codeword"] == "1010101"
    assert proc1["received_codeword"] == "1010101"
    assert proc1["syndrome_string"] == "000"
    assert proc1["error_position"] == 0
    assert proc1["error_detected"] == False
    assert proc1["corrected_codeword"] == "1010101"
    assert proc1["extracted_data"] == "1011"
    assert proc1["integrity_match"] == True
    print("[PASSED] TEST 1")

    # REQUIRED TEST 2: 0000 + Hamming (7,4) + even => PASS
    print("\n--- TEST 2: 0000 + Hamming (7,4) + Even Parity ---")
    proc2 = process_hamming("0000", mode="7,4", parity_type="even", action="full_cycle")
    assert proc2["success"] == True
    assert proc2["encoded_codeword"] == "0000000"
    assert proc2["syndrome_string"] == "000"
    assert proc2["extracted_data"] == "0000"
    print("[PASSED] TEST 2")

    # REQUIRED TEST 3: 1111 + Hamming (7,4) + even => PASS
    print("\n--- TEST 3: 1111 + Hamming (7,4) + even => PASS ---")
    proc3 = process_hamming("1111", mode="7,4", parity_type="even", action="full_cycle")
    assert proc3["success"] == True
    assert proc3["encoded_codeword"] == "1111111"
    assert proc3["syndrome_string"] == "000"
    assert proc3["extracted_data"] == "1111"
    print("[PASSED] TEST 3")

    # REQUIRED TEST 4: 101 + Hamming (7,4) => INVALID (3 bits)
    print("\n--- TEST 4: 101 + Hamming (7,4) => INVALID (3 data bits) ---")
    proc4 = process_hamming("101", mode="7,4")
    assert proc4["success"] == False
    assert "required exactly 4 data bits" in proc4["error"].lower()
    print("[PASSED] TEST 4 (Invalid 3-bit input rejected correctly)")

    # REQUIRED TEST 5: 10111 + Hamming (7,4) => INVALID (5 bits)
    print("\n--- TEST 5: 10111 + Hamming (7,4) => INVALID (5 data bits) ---")
    proc5 = process_hamming("10111", mode="7,4")
    assert proc5["success"] == False
    assert "required exactly 4 data bits" in proc5["error"].lower()
    print("[PASSED] TEST 5 (Invalid 5-bit input rejected correctly)")

    # REQUIRED TEST 6: 1011 + Hamming (7,4) + odd parity => PASS
    print("\n--- TEST 6: 1011 + Hamming (7,4) + Odd Parity ---")
    proc6 = process_hamming("1011", mode="7,4", parity_type="odd", action="full_cycle")
    assert proc6["success"] == True
    assert proc6["parity_bits"] == {"R1": "0", "R2": "1", "R4": "1"}
    assert proc6["encoded_codeword"] == "1011110"
    assert proc6["extracted_data"] == "1011"
    print("[PASSED] TEST 6")

    # REQUIRED TEST 7: 11-bit valid input + Hamming (15,11) => PASS
    print("\n--- TEST 7: 11-bit payload + Hamming (15,11) Even Parity ---")
    data11 = "10110010110"
    proc7 = process_hamming(data11, mode="15,11", parity_type="even", action="full_cycle")
    assert proc7["success"] == True
    assert len(proc7["encoded_codeword"]) == 15
    assert proc7["extracted_data"] == data11
    assert proc7["integrity_match"] == True
    print("[PASSED] TEST 7")

    # ERROR INJECTION TEST: 1011 -> 1010101 -> Flip Pos 3 -> 1010001 -> Syndrome 011 -> Auto-correct to 1010101 -> Extract 1011
    print("\n--- ERROR INJECTION TEST: Flip Position 3 (1010101 -> 1010001) ---")
    proc_err = process_hamming("1011", mode="7,4", parity_type="even", error_pos=3, action="full_cycle")
    print("Transmitted Codeword:", proc_err["encoded_codeword"])
    print("Received Corrupted Codeword:", proc_err["received_codeword"])
    print("Syndrome String:", proc_err["syndrome_string"])
    print("Detected Error Position:", proc_err["error_position"])
    print("Corrected Codeword:", proc_err["corrected_codeword"])
    print("Extracted Data:", proc_err["extracted_data"])

    assert proc_err["success"] == True
    assert proc_err["encoded_codeword"] == "1010101"
    assert proc_err["received_codeword"] == "1010001"
    assert proc_err["syndrome_string"] == "011"
    assert proc_err["error_position"] == 3
    assert proc_err["error_detected"] == True
    assert proc_err["corrected_codeword"] == "1010101"
    assert proc_err["extracted_data"] == "1011"
    assert proc_err["integrity_match"] == True
    print("[PASSED] ERROR INJECTION TEST")

    # TEST SWEEP: Single-bit error across all positions 1 to 7
    print("\n--- SINGLE-BIT ERROR SWEEP (Positions 1 to 7) ---")
    for pos in range(1, 8):
        proc = process_hamming("1011", mode="7,4", parity_type="even", error_pos=pos)
        assert proc["error_position"] == pos
        assert proc["integrity_match"] == True
    print("[PASSED] SINGLE-BIT ERROR SWEEP")

    # TEST HAMMING (15,11) ERROR INJECTION AT POSITION 9
    print("\n--- HAMMING (15,11) ERROR INJECTION AT POSITION 9 ---")
    proc15 = process_hamming(data11, mode="15,11", parity_type="even", error_pos=9)
    assert proc15["error_position"] == 9
    assert proc15["integrity_match"] == True
    print("[PASSED] HAMMING (15,11) ERROR INJECTION TEST")

    # MODE AUTO-DETECTION TESTS
    print("\n--- AUTO-DETECTION TEST 1: 4 bits ('1011') with mode='auto' ---")
    proc_auto4 = process_hamming("1011", mode="auto", parity_type="even", action="full_cycle")
    assert proc_auto4["success"] == True
    assert proc_auto4["mode"] == "7,4"
    assert proc_auto4["encoded_codeword"] == "1010101"
    assert proc_auto4["extracted_data"] == "1011"
    print("[PASSED] AUTO-DETECTION 4-BIT TEST (Auto-detected 7,4)")

    print("\n--- AUTO-DETECTION TEST 2: 11 bits ('10110010110') with mode='auto' ---")
    proc_auto11 = process_hamming("10110010110", mode="auto", parity_type="even", action="full_cycle")
    assert proc_auto11["success"] == True
    assert proc_auto11["mode"] == "15,11"
    assert len(proc_auto11["encoded_codeword"]) == 15
    assert proc_auto11["extracted_data"] == "10110010110"
    print("[PASSED] AUTO-DETECTION 11-BIT TEST (Auto-detected 15,11)")

    print("\n--- AUTO-DETECTION TEST 3: Invalid length 5 bits ('10110') with mode='auto' ---")
    proc_auto_err = process_hamming("10110", mode="auto")
    assert proc_auto_err["success"] == False
    assert "invalid payload length of 5 bits" in proc_auto_err["error"].lower()
    print("[PASSED] AUTO-DETECTION INVALID LENGTH TEST")

    print("\n" + "=" * 70)
    print("ALL HAMMING CODE AUTOMATED TEST SUITES PASSED SUCCESSFULLY!")
    print("=" * 70)

if __name__ == "__main__":
    run_tests()
