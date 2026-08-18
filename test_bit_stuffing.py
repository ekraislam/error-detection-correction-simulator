"""
=============================================================================
Test Suite for Bit Stuffing & De-stuffing Algorithm Implementation
Verifies all custom rule test scenarios and edge cases.
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
    print("[PASSED] TEST 1: Exact specification runs (1 -> 01, 11 -> 101, etc.)")

    # ── TEST 2: Input = 111110, FLAG = 01111110 ──
    print("\n--- TEST 2: Input = 111110, FLAG = 01111110 ---")
    res1 = process_bit_stuffing("111110", flag_pattern="01111110")
    print("Stuffed Payload:", res1["stuffed_payload"])
    print("Transmitted Frame:", res1["stuffed_frame"])
    print("Recovered Payload:", res1["destuffed_data"])
    assert res1["success"] == True
    assert res1["stuffed_payload"] == "1111010"
    assert res1["stuffed_frame"] == "01111110111101001111110"
    assert res1["destuffed_data"] == "111110"
    assert res1["integrity_match"] == True
    print("[PASSED] TEST 2")

    # ── TEST 3: Input = 10111 (Multiple Groups of 1s) ──
    print("\n--- TEST 3: Input = 10111 ---")
    res_10111 = process_bit_stuffing("10111", flag_pattern="01111110")
    assert res_10111["success"] == True
    assert res_10111["stuffed_payload"] == "0101101"
    assert res_10111["destuffed_data"] == "10111"
    assert res_10111["integrity_match"] == True
    print("[PASSED] TEST 3: 10111 -> 0101101 -> 10111")

    # ── TEST 4: Input = 101010, FLAG = 01111110 ──
    print("\n--- TEST 4: Input = 101010 ---")
    res2 = process_bit_stuffing("101010", flag_pattern="01111110")
    print("Stuffed Payload:", res2["stuffed_payload"])
    print("Transmitted Frame:", res2["stuffed_frame"])
    assert res2["success"] == True
    assert res2["stuffed_payload"] == "010010010"
    assert res2["stuffed_frame"] == "0111111001001001001111110"
    assert res2["destuffed_data"] == "101010"
    assert res2["integrity_match"] == True
    print("[PASSED] TEST 4")

    # ── TEST 5: Custom / Arbitrary Delimiter FLAG ──
    print("\n--- TEST 5: Custom Delimiter FLAG = 00111100 ---")
    res4 = process_bit_stuffing("111110", flag_pattern="00111100")
    assert res4["stuffed_frame"] == "00111100111101000111100"
    assert res4["destuffed_data"] == "111110"
    assert res4["integrity_match"] == True
    print("[PASSED] TEST 5")

    # ── TEST 6: Standalone De-stuff Action ('action=destuff') ──
    print("\n--- TEST 6: Standalone De-stuff Action ---")
    res5 = process_bit_stuffing("01111110111101001111110", flag_pattern="01111110", action="destuff", original_data="111110")
    assert res5["success"] == True
    assert res5["destuffed_data"] == "111110"
    assert res5["integrity_match"] == True
    print("[PASSED] TEST 6")

    # ── TEST 7: Error Injection (Bit Flip) ──
    print("\n--- TEST 7: Error Injection Simulation ---")
    res6 = process_bit_stuffing("111110", flag_pattern="01111110", error_pos=10)
    assert res6["success"] == True
    assert res6["stuffed_frame"] != res6["received_frame"]
    assert res6["integrity_match"] == False
    print("[PASSED] TEST 7")

    # ── TEST 8: Invalid Non-binary Inputs ──
    print("\n--- TEST 8: Non-binary Input Validation ---")
    assert process_bit_stuffing("1010201", flag_pattern="01111110")["success"] == False
    assert process_bit_stuffing("101010", flag_pattern="01111120")["success"] == False
    assert process_bit_stuffing("", flag_pattern="01111110")["success"] == False
    print("[PASSED] TEST 8")

    # ── TEST 9: Invalid Frame Headers / Delimiters ──
    print("\n--- TEST 9: Invalid Frame Delimiters ---")
    err1 = bit_destuff("11111110111101001111110", flag_pattern="01111110")
    assert err1["success"] == False
    assert "missing starting flag" in err1["error"].lower()

    err2 = bit_destuff("01111110111101001111111", flag_pattern="01111110")
    assert err2["success"] == False
    assert "missing ending flag" in err2["error"].lower()
    print("[PASSED] TEST 9")

    print("\n" + "=" * 80)
    print("ALL BIT STUFFING TESTS PASSED SUCCESSFULLY!")
    print("=" * 80)

if __name__ == "__main__":
    run_tests()

