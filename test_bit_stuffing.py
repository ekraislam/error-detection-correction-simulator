"""
=============================================================================
Test Suite for Bit Stuffing & De-stuffing Algorithm Implementation
Verifies all custom rule test scenarios, universal examples, and edge cases.
=============================================================================
"""

from algorithms.bit_stuffing import process_bit_stuffing, bit_stuff, bit_destuff

def run_tests():
    print("=" * 80)
    print("RUNNING BIT STUFFING & DE-STUFFING ALGORITHM TEST SUITE")
    print("=" * 80)

    # ── TEST 1: Exact Examples from Specification ──
    print("\n--- TEST 1: Single and Multiple 1s ---")
    assert bit_stuff("1")["stuffed_payload"] == "01"
    assert bit_stuff("11")["stuffed_payload"] == "101"
    assert bit_stuff("111")["stuffed_payload"] == "1101"
    assert bit_stuff("1111")["stuffed_payload"] == "11101"
    assert bit_stuff("11111")["stuffed_payload"] == "111101"
    assert bit_stuff("111111")["stuffed_payload"] == "1111101"
    assert bit_stuff("1111111")["stuffed_payload"] == "11111101"
    print("[PASSED] TEST 1: Exact specification runs (1 -> 01, 11 -> 101, ... 1111111 -> 11111101)")

    # ── TEST 2: Example 1: Input = 111110 ──
    print("\n--- TEST 2: Input = 111110, FLAG = 01111110 ---")
    res1 = process_bit_stuffing("111110", flag_pattern="01111110")
    assert res1["success"] == True
    assert res1["stuffed_payload"] == "1111010"
    assert res1["stuffed_frame"] == "01111110111101001111110"
    assert res1["destuffed_data"] == "111110"
    assert res1["integrity_match"] == True
    print("[PASSED] TEST 2: 111110 -> 1111010")

    # ── TEST 3: Example 2: Input = 1110111 ──
    print("\n--- TEST 3: Input = 1110111 ---")
    res_1110111 = process_bit_stuffing("1110111", flag_pattern="01111110")
    assert res_1110111["success"] == True
    assert res_1110111["stuffed_payload"] == "110101101"
    assert res_1110111["destuffed_data"] == "1110111"
    assert res_1110111["integrity_match"] == True
    print("[PASSED] TEST 3: 1110111 -> 110101101")

    # ── TEST 4: Example 3: Input = 10111 ──
    print("\n--- TEST 4: Input = 10111 ---")
    res_10111 = process_bit_stuffing("10111", flag_pattern="01111110")
    assert res_10111["success"] == True
    assert res_10111["stuffed_payload"] == "0101101"
    assert res_10111["destuffed_data"] == "10111"
    assert res_10111["integrity_match"] == True
    print("[PASSED] TEST 4: 10111 -> 0101101")

    # ── TEST 5: Example 4: Input = 10001 ──
    print("\n--- TEST 5: Input = 10001 ---")
    res_10001 = process_bit_stuffing("10001", flag_pattern="01111110")
    assert res_10001["success"] == True
    assert res_10001["stuffed_payload"] == "0100001"
    assert res_10001["destuffed_data"] == "10001"
    assert res_10001["integrity_match"] == True
    print("[PASSED] TEST 5: 10001 -> 0100001")

    # ── TEST 6: Example: Input = 1110011110 ──
    print("\n--- TEST 6: Input = 1110011110 ---")
    res_1110011110 = process_bit_stuffing("1110011110", flag_pattern="01111110")
    assert res_1110011110["success"] == True
    assert res_1110011110["stuffed_payload"] == "110100111010"
    assert res_1110011110["destuffed_data"] == "1110011110"
    assert res_1110011110["integrity_match"] == True
    print("[PASSED] TEST 6: 1110011110 -> 110100111010")

    # ── TEST 7: Input = 101010 ──
    print("\n--- TEST 7: Input = 101010 ---")
    res2 = process_bit_stuffing("101010", flag_pattern="01111110")
    assert res2["success"] == True
    assert res2["stuffed_payload"] == "010010010"
    assert res2["destuffed_data"] == "101010"
    assert res2["integrity_match"] == True
    print("[PASSED] TEST 7: 101010 -> 010010010")

    # ── TEST 8: All Zeros (00000) ──
    print("\n--- TEST 8: All Zeros ---")
    res_zeros = process_bit_stuffing("00000", flag_pattern="01111110")
    assert res_zeros["success"] == True
    assert res_zeros["stuffed_payload"] == "00000"
    assert res_zeros["destuffed_data"] == "00000"
    assert res_zeros["inserted_bits"] == 0
    print("[PASSED] TEST 8: 00000 -> 00000")

    # ── TEST 9: Custom Flag = 01110, Data = 111110 ──
    print("\n--- TEST 9: Custom Flag = 01110, Data = 111110 ---")
    res_custom = process_bit_stuffing("111110", flag_pattern="01110")
    assert res_custom["stuffed_frame"] == "01110111101001110"
    assert res_custom["destuffed_data"] == "111110"
    assert res_custom["integrity_match"] == True
    print("[PASSED] TEST 9: Frame = 01110111101001110")

    # ── TEST 10: Invariant Validations ──
    print("\n--- TEST 10: Invariant Validations ---")
    test_cases = ["1", "11", "0", "00", "01", "10", "111110", "1110111", "10111", "10001", "1110011110", "101010"]
    for tc in test_cases:
        st = bit_stuff(tc)
        assert st["stuffed_payload"].count("1") == tc.count("1"), f"1s count mismatch for {tc}"
        expected_runs = len([run for run in tc.split("0") if run])
        assert st["inserted_bits"] == expected_runs, f"Inserted 0s mismatch for {tc}"
    print("[PASSED] TEST 10: All count and invariant checks passed")

    # ── TEST 11: Standalone De-stuff Action ('action=destuff') ──
    print("\n--- TEST 11: Standalone De-stuff Action ---")
    res5 = process_bit_stuffing("01111110111101001111110", flag_pattern="01111110", action="destuff", original_data="111110")
    assert res5["success"] == True
    assert res5["destuffed_data"] == "111110"
    assert res5["integrity_match"] == True
    print("[PASSED] TEST 11")

    # ── TEST 12: Error Injection (Bit Flip) ──
    print("\n--- TEST 12: Error Injection Simulation ---")
    res6 = process_bit_stuffing("111110", flag_pattern="01111110", error_pos=10)
    assert res6["success"] == True
    assert res6["stuffed_frame"] != res6["received_frame"]
    assert res6["integrity_match"] == False
    print("[PASSED] TEST 12")

    # ── TEST 13: Invalid Non-binary Inputs ──
    print("\n--- TEST 13: Non-binary Input Validation ---")
    assert process_bit_stuffing("1010201", flag_pattern="01111110")["success"] == False
    assert process_bit_stuffing("101010", flag_pattern="01111120")["success"] == False
    assert process_bit_stuffing("", flag_pattern="01111110")["success"] == False
    print("[PASSED] TEST 13")

    # ── TEST 14: Invalid Frame Headers / Delimiters ──
    print("\n--- TEST 14: Invalid Frame Delimiters ---")
    err1 = bit_destuff("11111110111101001111110", flag_pattern="01111110")
    assert err1["success"] == False
    assert "missing starting flag" in err1["error"].lower()

    err2 = bit_destuff("01111110111101001111111", flag_pattern="01111110")
    assert err2["success"] == False
    assert "missing ending flag" in err2["error"].lower()
    print("[PASSED] TEST 14")

    print("\n" + "=" * 80)
    print("ALL BIT STUFFING TESTS PASSED SUCCESSFULLY!")
    print("=" * 80)

if __name__ == "__main__":
    run_tests()


