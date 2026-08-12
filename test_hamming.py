"""
=============================================================================
Test Suite for Dynamic Hamming(n,k) Error Detection & Correction Engine
Verifies all dynamic test scenarios for arbitrary binary payload lengths (k >= 1)
under the Right-to-Left positional convention (Pos n..1: D_k..D_1 and R_r..R_1).
=============================================================================
"""

from algorithms.hamming import (
    process_hamming,
    hamming_encode,
    hamming_decode,
    calculate_syndrome,
    validate_hamming_input,
    calculate_hamming_r_and_n
)

def run_tests():
    print("=" * 70)
    print("RUNNING DYNAMIC HAMMING(n,k) CODE TEST SUITE")
    print("=" * 70)

    # REQUIRED TEST 1: Data = 1011 -> Mode = Hamming (7,4)
    print("\n--- TEST 1: Data = 1011 -> Expected Mode = Hamming (7,4) ---")
    proc1 = process_hamming("1011", mode="auto", parity_type="even", action="full_cycle")
    assert proc1["success"] == True
    assert proc1["mode"] == "7,4"
    assert proc1["k"] == 4
    assert proc1["r"] == 3
    assert proc1["total_bits"] == 7
    assert proc1["encoded_codeword"] == "1010101"
    assert proc1["extracted_data"] == "1011"
    assert proc1["integrity_match"] == True
    print("[PASSED] TEST 1 (Data 1011 -> Hamming 7,4 -> Codeword 1010101)")

    # REQUIRED TEST 2: Data = 10110010 -> Expected Mode = Hamming (12,8)
    print("\n--- TEST 2: Data = 10110010 (8 bits) -> Expected Mode = Hamming (12,8) ---")
    proc2 = process_hamming("10110010", mode="auto", parity_type="even", action="full_cycle")
    assert proc2["success"] == True
    assert proc2["mode"] == "12,8"
    assert proc2["k"] == 8
    assert proc2["r"] == 4
    assert proc2["total_bits"] == 12
    assert proc2["extracted_data"] == "10110010"
    assert proc2["integrity_match"] == True
    print("[PASSED] TEST 2 (Data 10110010 -> Hamming 12,8)")

    # REQUIRED TEST 3: Data = 10110010110 -> Expected Mode = Hamming (15,11)
    print("\n--- TEST 3: Data = 10110010110 (11 bits) -> Expected Mode = Hamming (15,11) ---")
    data11 = "10110010110"
    proc3 = process_hamming(data11, mode="auto", parity_type="even", action="full_cycle")
    assert proc3["success"] == True
    assert proc3["mode"] == "15,11"
    assert proc3["k"] == 11
    assert proc3["r"] == 4
    assert proc3["total_bits"] == 15
    assert proc3["extracted_data"] == data11
    assert proc3["integrity_match"] == True
    print("[PASSED] TEST 3 (Data 10110010110 -> Hamming 15,11)")

    # REQUIRED TEST 4: Single-bit error injection into Hamming (7,4) (Pos 3 flip)
    print("\n--- TEST 4: Inject Position 3 Error into Hamming (7,4) ---")
    proc4 = process_hamming("1011", mode="auto", parity_type="even", error_pos=3, action="full_cycle")
    assert proc4["success"] == True
    assert proc4["encoded_codeword"] == "1010101"
    assert proc4["received_codeword"] == "1010001"
    assert proc4["syndrome_string"] == "011"
    assert proc4["error_position"] == 3
    assert proc4["error_detected"] == True
    assert proc4["corrected_codeword"] == "1010101"
    assert proc4["extracted_data"] == "1011"
    assert proc4["integrity_match"] == True
    print("[PASSED] TEST 4 (Hamming 7,4 Position 3 error corrected)")

    # REQUIRED TEST 5: Single-bit error injection into Hamming (12,8) (Pos 5 flip)
    print("\n--- TEST 5: Inject Position 5 Error into Hamming (12,8) ---")
    proc5 = process_hamming("10110010", mode="auto", parity_type="even", error_pos=5, action="full_cycle")
    assert proc5["success"] == True
    assert proc5["error_position"] == 5
    assert proc5["error_detected"] == True
    assert proc5["extracted_data"] == "10110010"
    assert proc5["integrity_match"] == True
    print("[PASSED] TEST 5 (Hamming 12,8 Position 5 error corrected)")

    # REQUIRED TEST 6: Single-bit error injection into Hamming (15,11) (Pos 9 flip)
    print("\n--- TEST 6: Inject Position 9 Error into Hamming (15,11) ---")
    proc6 = process_hamming(data11, mode="auto", parity_type="even", error_pos=9, action="full_cycle")
    assert proc6["success"] == True
    assert proc6["error_position"] == 9
    assert proc6["error_detected"] == True
    assert proc6["extracted_data"] == data11
    assert proc6["integrity_match"] == True
    print("[PASSED] TEST 6 (Hamming 15,11 Position 9 error corrected)")

    # REQUIRED TEST 7: Even Parity Verification
    print("\n--- TEST 7: Even Parity Verification ---")
    proc7 = process_hamming("1011", mode="auto", parity_type="even", action="full_cycle")
    assert proc7["parity_type"] == "even"
    assert proc7["parity_bits"] == {"R1": "1", "R2": "0", "R4": "0"}
    assert proc7["encoded_codeword"] == "1010101"
    print("[PASSED] TEST 7 (Even Parity)")

    # REQUIRED TEST 8: Odd Parity Verification
    print("\n--- TEST 8: Odd Parity Verification ---")
    proc8 = process_hamming("1011", mode="auto", parity_type="odd", action="full_cycle")
    assert proc8["parity_type"] == "odd"
    assert proc8["parity_bits"] == {"R1": "0", "R2": "1", "R4": "1"}
    assert proc8["encoded_codeword"] == "1011110"
    assert proc8["extracted_data"] == "1011"
    print("[PASSED] TEST 8 (Odd Parity)")

    # REQUIRED TEST 9: Right-to-Left Classroom Convention Verification
    print("\n--- TEST 9: Right-to-Left Positional Mapping Verification ---")
    val9 = process_hamming("1011", mode="auto")
    pos_map = val9["pos_table"]
    # Positions ordered 7 down to 1
    assert [item["pos"] for item in pos_map] == [7, 6, 5, 4, 3, 2, 1]
    assert [item["type"] for item in pos_map] == ["D4", "D3", "D2", "R4", "D1", "R2", "R1"]
    assert [item["value"] for item in pos_map] == ["1", "0", "1", "0", "1", "0", "1"]
    print("[PASSED] TEST 9 (RTL Position Table 7..1: D4 D3 D2 R4 D1 R2 R1)")

    # REQUIRED TEST 10: Decoded Payload Exact Match Verification across varied lengths
    print("\n--- TEST 10: Decoded Payload Exact Match across Varied Lengths ---")
    test_payloads = ["1", "10", "101", "1011", "11001", "10110010", "10110010110", "1011001011001101"]
    for payload in test_payloads:
        res = process_hamming(payload, mode="auto", parity_type="even", action="full_cycle")
        assert res["success"] == True
        assert res["extracted_data"] == payload
        assert res["integrity_match"] == True
    print("[PASSED] TEST 10 (Exact Payload Match for 1 to 16 bits)")

    # TEST 11: 16-bit payload -> Hamming (21,16)
    print("\n--- TEST 11: 16-bit Payload -> Hamming (21,16) ---")
    proc16 = process_hamming("1011001011001101", mode="auto")
    assert proc16["mode"] == "21,16"
    assert proc16["k"] == 16
    assert proc16["r"] == 5
    assert proc16["total_bits"] == 21
    print("[PASSED] TEST 11 (Hamming 21,16)")

    # TEST 12: Invalid Non-Binary Character Rejection
    print("\n--- TEST 12: Invalid Non-Binary Input ---")
    proc12 = process_hamming("101201")
    assert proc12["success"] == False
    assert "invalid non-binary character" in proc12["error"].lower()
    print("[PASSED] TEST 12 (Invalid Non-Binary Input Rejected)")

    print("\n" + "=" * 70)
    print("ALL DYNAMIC HAMMING(n,k) AUTOMATED TEST SUITES PASSED SUCCESSFULLY!")
    print("=" * 70)

if __name__ == "__main__":
    run_tests()
