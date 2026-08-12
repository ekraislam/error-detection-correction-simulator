"""
=============================================================================
Test Suite for Hamming Code Error Detection & Correction Implementation
Verifies all 16 specified test scenarios.
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

    # Test 1: Hamming (7,4), Data = 1011, Even parity -> Expected codeword = 0110011
    print("\n--- TEST 1: Hamming (7,4) Even Parity (Data = 1011) ---")
    res1 = hamming_encode("1011", mode="7,4", parity_type="even")
    print("Success:", res1["success"])
    print("Original Data:", res1["original_data"])
    print("Parity Bits:", res1["parity_bits"])
    print("Encoded Codeword:", res1["encoded_codeword"])
    assert res1["success"] == True
    assert res1["parity_bits"] == {"P1": "0", "P2": "1", "P4": "0"}
    assert res1["encoded_codeword"] == "0110011"
    print("[PASSED] TEST 1")

    # Test 2: Decode valid 0110011
    print("\n--- TEST 2: Decode Valid Codeword (0110011) ---")
    res2 = hamming_decode("0110011", mode="7,4", parity_type="even")
    print("Syndrome String:", res2["syndrome_string"])
    print("Error Position:", res2["error_position"])
    print("Error Detected:", res2["error_detected"])
    print("Extracted Data:", res2["extracted_data"])
    assert res2["success"] == True
    assert res2["syndrome_string"] == "000"
    assert res2["error_position"] == 0
    assert res2["error_detected"] == False
    assert res2["extracted_data"] == "1011"
    print("[PASSED] TEST 2")

    # Test 3: Flip position 3 -> Received = 0100011
    print("\n--- TEST 3: Flip Position 3 (0100011) ---")
    res3 = hamming_decode("0100011", mode="7,4", parity_type="even")
    print("Syndrome String:", res3["syndrome_string"])
    print("Error Position:", res3["error_position"])
    print("Original Bit:", res3["original_bit"])
    print("Corrected Bit:", res3["corrected_bit"])
    print("Corrected Codeword:", res3["corrected_codeword"])
    print("Extracted Data:", res3["extracted_data"])
    assert res3["success"] == True
    assert res3["syndrome_string"] == "011"
    assert res3["error_position"] == 3
    assert res3["corrected_codeword"] == "0110011"
    assert res3["extracted_data"] == "1011"
    print("[PASSED] TEST 3")

    # Test 4: Flip position 1 (Parity bit P1)
    print("\n--- TEST 4: Flip Position 1 (P1) ---")
    res4 = process_hamming("1011", mode="7,4", parity_type="even", error_pos=1)
    print("Transmitted:", res4["encoded_codeword"])
    print("Corrupted:", res4["received_codeword"])
    print("Detected Error Pos:", res4["error_position"])
    print("Corrected Codeword:", res4["corrected_codeword"])
    assert res4["error_position"] == 1
    assert res4["corrected_codeword"] == "0110011"
    assert res4["integrity_match"] == True
    print("[PASSED] TEST 4")

    # Test 5: Flip position 7 (Data bit D4)
    print("\n--- TEST 5: Flip Position 7 (D4) ---")
    res5 = process_hamming("1011", mode="7,4", parity_type="even", error_pos=7)
    print("Detected Error Pos:", res5["error_position"])
    print("Corrected Codeword:", res5["corrected_codeword"])
    assert res5["error_position"] == 7
    assert res5["corrected_codeword"] == "0110011"
    assert res5["integrity_match"] == True
    print("[PASSED] TEST 5")

    # Test 6: Single-bit error across all positions 1 to 7
    print("\n--- TEST 6: Single-bit error sweep (Positions 1 to 7) ---")
    for pos in range(1, 8):
        proc = process_hamming("1011", mode="7,4", parity_type="even", error_pos=pos)
        print(f"Flipped Pos {pos} -> Syndrome Pos: {proc['error_position']} | Corrected CW: {proc['corrected_codeword']} | Data Match: {proc['integrity_match']}")
        assert proc["error_position"] == pos
        assert proc["integrity_match"] == True
    print("[PASSED] TEST 6")

    # Test 7: Hamming (7,4) Odd Parity Encoding
    print("\n--- TEST 7: Hamming (7,4) Odd Parity ---")
    res7 = hamming_encode("1011", mode="7,4", parity_type="odd")
    print("Odd Parity Bits:", res7["parity_bits"])
    print("Encoded Codeword:", res7["encoded_codeword"])
    # For odd parity, bits flip
    assert res7["success"] == True
    assert res7["parity_bits"] == {"P1": "1", "P2": "0", "P4": "1"}
    assert res7["encoded_codeword"] == "1011011"
    print("[PASSED] TEST 7")

    # Test 8: Hamming (15,11) Even Parity Encoding (11 data bits)
    print("\n--- TEST 8: Hamming (15,11) Even Parity (Data = 10110010110) ---")
    data11 = "10110010110"
    res8 = hamming_encode(data11, mode="15,11", parity_type="even")
    print("Total Bits:", res8["total_bits"])
    print("Parity Bits:", res8["parity_bits"])
    print("Encoded Codeword:", res8["encoded_codeword"])
    assert res8["success"] == True
    assert len(res8["encoded_codeword"]) == 15
    print("[PASSED] TEST 8")

    # Test 9: Hamming (15,11) Valid Decoding
    print("\n--- TEST 9: Hamming (15,11) Valid Decoding ---")
    res9 = hamming_decode(res8["encoded_codeword"], mode="15,11", parity_type="even")
    assert res9["error_detected"] == False
    assert res9["extracted_data"] == data11
    print("[PASSED] TEST 9")

    # Test 10: Hamming (15,11) Single-Bit Error Correction
    print("\n--- TEST 10: Hamming (15,11) Error Correction (Pos 9) ---")
    res10 = process_hamming(data11, mode="15,11", parity_type="even", error_pos=9)
    print("Injected Error Pos:", 9)
    print("Detected Error Pos:", res10["error_position"])
    print("Extracted Data Match:", res10["integrity_match"])
    assert res10["error_position"] == 9
    assert res10["integrity_match"] == True
    print("[PASSED] TEST 10")

    # Test 11: Empty Input Validation
    print("\n--- TEST 11: Empty Input Validation ---")
    res11 = process_hamming("", mode="7,4")
    assert res11["success"] == False
    assert "empty" in res11["error"].lower()
    print("[PASSED] TEST 11")

    # Test 12: Non-Binary Input Validation
    print("\n--- TEST 12: Non-Binary Input Validation ---")
    res12 = process_hamming("101A", mode="7,4")
    assert res12["success"] == False
    assert "non-binary" in res12["error"].lower()
    print("[PASSED] TEST 12")

    # Test 13: Wrong Length for Hamming (7,4)
    print("\n--- TEST 13: Wrong Length for 7,4 (5 bits) ---")
    res13 = process_hamming("10110", mode="7,4")
    assert res13["success"] == False
    assert "required exactly 4 data bits" in res13["error"].lower()
    print("[PASSED] TEST 13")

    # Test 14: Wrong Length for Hamming (15,11)
    print("\n--- TEST 14: Wrong Length for 15,11 (8 bits) ---")
    res14 = process_hamming("10110010", mode="15,11")
    assert res14["success"] == False
    assert "required exactly 11 data bits" in res14["error"].lower()
    print("[PASSED] TEST 14")

    # Test 15: Invalid Error Position (<1 or >N)
    print("\n--- TEST 15: Invalid Error Position ---")
    res15 = process_hamming("1011", mode="7,4", error_pos=10)
    assert res15["success"] == False
    assert "invalid error position" in res15["error"].lower()
    print("[PASSED] TEST 15")

    # Test 16: Roundtrip Suite across Varied Datasets
    print("\n--- TEST 16: Roundtrip Integrity Suite ---")
    test_datasets = [
        ("0000", "7,4"), ("1111", "7,4"), ("1010", "7,4"), ("0101", "7,4"),
        ("00000000000", "15,11"), ("11111111111", "15,11"), ("10101010101", "15,11")
    ]
    for data_item, m in test_datasets:
        proc = process_hamming(data_item, mode=m, parity_type="even", action="full_cycle")
        print(f"Mode {m} Payload: {data_item} -> CW: {proc['encoded_codeword']} -> Recovered: {proc['extracted_data']} | Match: {proc['integrity_match']}")
        assert proc["success"] == True
        assert proc["integrity_match"] == True
    print("[PASSED] TEST 16")

    print("\n" + "=" * 70)
    print("ALL 16 TEST SUITES PASSED SUCCESSFULLY!")
    print("=" * 70)

if __name__ == "__main__":
    run_tests()
