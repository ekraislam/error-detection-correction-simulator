"""
=============================================================================
Test Suite for Dynamic Bit Stuffing & De-stuffing Implementation
Verifies dynamic threshold (N - 1 from FLAG) across all scenarios.
=============================================================================
"""

from algorithms.bit_stuffing import process_bit_stuffing, bit_stuff, bit_destuff

def run_tests():
    print("=" * 80)
    print("RUNNING DYNAMIC BIT STUFFING & DE-STUFFING TEST SUITE")
    print("=" * 80)

    # ── TEST 1: Example 1 from Specification ──
    # FLAG = 01110 (N = 3 ones -> Threshold = 2), DATA = 110 -> Stuffed = 1100
    print("\n--- TEST 1: FLAG = 01110 (N=3, Threshold=2), DATA = 110 ---")
    res1 = process_bit_stuffing("110", flag_pattern="01110")
    print("Stuffed Payload:", res1["stuffed_payload"])
    print("Transmitted Frame:", res1["stuffed_frame"])
    print("Recovered Payload:", res1["destuffed_data"])
    assert res1["success"] == True
    assert res1["threshold"] == 2
    assert res1["stuffed_payload"] == "1100"
    assert res1["stuffed_frame"] == "01110110001110"
    assert res1["destuffed_data"] == "110"
    assert res1["integrity_match"] == True
    print("[PASSED] TEST 1: 110 -> 1100 (Threshold 2)")

    # ── TEST 2: Example 2 from Specification ──
    # FLAG = 011110 (N = 4 ones -> Threshold = 3), DATA = 1110 -> Stuffed = 11100
    print("\n--- TEST 2: FLAG = 011110 (N=4, Threshold=3), DATA = 1110 ---")
    res2 = process_bit_stuffing("1110", flag_pattern="011110")
    assert res2["success"] == True
    assert res2["threshold"] == 3
    assert res2["stuffed_payload"] == "11100"
    assert res2["stuffed_frame"] == "01111011100011110"
    assert res2["destuffed_data"] == "1110"
    assert res2["integrity_match"] == True
    print("[PASSED] TEST 2: 1110 -> 11100 (Threshold 3)")

    # ── TEST 3: Example 3 from Specification ──
    # FLAG = 011110 (N = 4 ones -> Threshold = 3), DATA = 111110 -> Stuffed = 1110110
    print("\n--- TEST 3: FLAG = 011110 (N=4, Threshold=3), DATA = 111110 ---")
    res3 = process_bit_stuffing("111110", flag_pattern="011110")
    assert res3["success"] == True
    assert res3["threshold"] == 3
    assert res3["stuffed_payload"] == "1110110"
    assert res3["stuffed_frame"] == "0111101110110011110"
    assert res3["destuffed_data"] == "111110"
    assert res3["integrity_match"] == True
    print("[PASSED] TEST 3: 111110 -> 1110110 (Threshold 3)")

    # ── TEST 4: Longer Runs Repeated Stuffing Example ──
    # FLAG = 01110 (N = 3 ones -> Threshold = 2), DATA = 11111 -> Stuffed = 1101101
    print("\n--- TEST 4: FLAG = 01110 (N=3, Threshold=2), DATA = 11111 (Multiple Stuffing in One Run) ---")
    res4 = process_bit_stuffing("11111", flag_pattern="01110")
    assert res4["success"] == True
    assert res4["threshold"] == 2
    assert res4["stuffed_payload"] == "1101101"
    assert res4["stuffed_frame"] == "01110110110101110"
    assert res4["destuffed_data"] == "11111"
    assert res4["integrity_match"] == True
    print("[PASSED] TEST 4: 11111 -> 1101101 (Threshold 2)")

    # ── TEST 5: Default Flag = 01111110 (N = 6 -> Threshold = 5) ──
    # DATA = 111110 -> Stuffed = 1111100
    print("\n--- TEST 5: Default FLAG = 01111110 (N=6, Threshold=5), DATA = 111110 ---")
    res5 = process_bit_stuffing("111110", flag_pattern="01111110")
    assert res5["success"] == True
    assert res5["threshold"] == 5
    assert res5["stuffed_payload"] == "1111100"
    assert res5["stuffed_frame"] == "01111110111110001111110"
    assert res5["destuffed_data"] == "111110"
    assert res5["integrity_match"] == True
    print("[PASSED] TEST 5: 111110 -> 1111100 (Threshold 5)")

    # ── TEST 6: All Zeros Payload (00000) ──
    print("\n--- TEST 6: All Zeros Payload (00000) ---")
    res_zeros = process_bit_stuffing("00000", flag_pattern="01111110")
    assert res_zeros["success"] == True
    assert res_zeros["stuffed_payload"] == "00000"
    assert res_zeros["destuffed_data"] == "00000"
    assert res_zeros["inserted_bits"] == 0
    print("[PASSED] TEST 6: 00000 -> 00000 (No stuffing)")

    # ── TEST 7: Standalone De-stuff Action ('action=destuff') ──
    print("\n--- TEST 7: Standalone De-stuff Action ---")
    res_destuff = process_bit_stuffing("01110110110101110", flag_pattern="01110", action="destuff", original_data="11111")
    assert res_destuff["success"] == True
    assert res_destuff["destuffed_data"] == "11111"
    assert res_destuff["integrity_match"] == True
    print("[PASSED] TEST 7")

    # ── TEST 8: Error Injection (Bit Flip) ──
    print("\n--- TEST 8: Error Injection Simulation ---")
    res_err = process_bit_stuffing("111110", flag_pattern="01111110", error_pos=10)
    assert res_err["success"] == True
    assert res_err["stuffed_frame"] != res_err["received_frame"]
    assert res_err["integrity_match"] == False
    print("[PASSED] TEST 8")

    # ── TEST 9: Invalid Non-binary Inputs ──
    print("\n--- TEST 9: Non-binary Input Validation ---")
    assert process_bit_stuffing("1010201", flag_pattern="01111110")["success"] == False
    assert process_bit_stuffing("101010", flag_pattern="01111120")["success"] == False
    assert process_bit_stuffing("", flag_pattern="01111110")["success"] == False
    print("[PASSED] TEST 9")

    # ── TEST 10: Invalid Frame Headers / Delimiters ──
    print("\n--- TEST 10: Invalid Frame Delimiters ---")
    err1 = bit_destuff("11111110111110001111110", flag_pattern="01111110")
    assert err1["success"] == False
    assert "missing starting flag" in err1["error"].lower()

    err2 = bit_destuff("01111110111110001111111", flag_pattern="01111110")
    assert err2["success"] == False
    assert "missing ending flag" in err2["error"].lower()
    print("[PASSED] TEST 10")

    print("\n" + "=" * 80)
    print("ALL DYNAMIC BIT STUFFING TESTS PASSED SUCCESSFULLY!")
    print("=" * 80)

if __name__ == "__main__":
    run_tests()


