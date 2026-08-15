"""
=============================================================================
Test Suite for Bit Stuffing & De-stuffing Algorithm Implementation
Verifies all generic test scenarios and edge cases.
=============================================================================
"""

from algorithms.bit_stuffing import process_bit_stuffing, bit_stuff, bit_destuff

def run_tests():
    print("=" * 80)
    print("RUNNING BIT STUFFING & DE-STUFFING ALGORITHM TEST SUITE")
    print("=" * 80)

    # ── TEST 1: Input = 111110, FLAG = 01111110 ──
    print("\n--- TEST 1: Input = 111110, FLAG = 01111110 ---")
    res1 = process_bit_stuffing("111110", flag_pattern="01111110")
    print("Stuffed Payload:", res1["stuffed_payload"])
    print("Transmitted Frame:", res1["stuffed_frame"])
    print("Recovered Payload:", res1["destuffed_data"])
    assert res1["success"] == True
    assert res1["stuffed_payload"] == "1111100"
    assert res1["stuffed_frame"] == "01111110111110001111110"
    assert res1["destuffed_data"] == "111110"
    assert res1["integrity_match"] == True
    print("[PASSED] TEST 1")

    # ── TEST 2: Input = 101010, FLAG = 01111110 ──
    print("\n--- TEST 2: Input = 101010 (No stuffing needed) ---")
    res2 = process_bit_stuffing("101010", flag_pattern="01111110")
    print("Stuffed Payload:", res2["stuffed_payload"])
    print("Transmitted Frame:", res2["stuffed_frame"])
    assert res2["success"] == True
    assert res2["stuffed_payload"] == "101010"
    assert res2["stuffed_frame"] == "0111111010101001111110"
    assert res2["destuffed_data"] == "101010"
    assert res2["integrity_match"] == True
    print("[PASSED] TEST 2")

    # ── TEST 3: Multiple Groups of Five 1s (e.g. 1111111111) ──
    print("\n--- TEST 3: Input = 1111111111 (Ten 1s -> two stuffed 0s) ---")
    res3 = process_bit_stuffing("1111111111", flag_pattern="01111110")
    print("Stuffed Payload:", res3["stuffed_payload"])
    print("Transmitted Frame:", res3["stuffed_frame"])
    print("Recovered Payload:", res3["destuffed_data"])
    assert res3["stuffed_payload"] == "111110111110"
    assert res3["stuffed_frame"] == "0111111011111011111001111110"
    assert res3["destuffed_data"] == "1111111111"
    assert res3["integrity_match"] == True
    print("[PASSED] TEST 3")

    # ── TEST 4: Custom / Arbitrary Delimiter FLAG ──
    print("\n--- TEST 4: Custom Delimiter FLAG = 00111100 ---")
    res4 = process_bit_stuffing("111110", flag_pattern="00111100")
    assert res4["stuffed_frame"] == "00111100111110000111100"
    assert res4["destuffed_data"] == "111110"
    assert res4["integrity_match"] == True
    print("[PASSED] TEST 4")

    # ── TEST 5: Standalone De-stuff Action ('action=destuff') ──
    print("\n--- TEST 5: Standalone De-stuff Action ---")
    res5 = process_bit_stuffing("01111110111110001111110", flag_pattern="01111110", action="destuff", original_data="111110")
    print("De-stuff Result:", res5)
    assert res5["success"] == True
    assert res5["destuffed_data"] == "111110"
    assert res5["integrity_match"] == True
    print("[PASSED] TEST 5")

    # ── TEST 6: Error Injection (Bit Flip) ──
    print("\n--- TEST 6: Error Injection Simulation ---")
    res6 = process_bit_stuffing("111110", flag_pattern="01111110", error_pos=10)
    assert res6["success"] == True
    assert res6["stuffed_frame"] != res6["received_frame"]
    assert res6["integrity_match"] == False
    print("[PASSED] TEST 6")

    # ── TEST 7: Invalid Non-binary Inputs ──
    print("\n--- TEST 7: Non-binary Input Validation ---")
    assert process_bit_stuffing("1010201", flag_pattern="01111110")["success"] == False
    assert process_bit_stuffing("101010", flag_pattern="01111120")["success"] == False
    assert process_bit_stuffing("", flag_pattern="01111110")["success"] == False
    print("[PASSED] TEST 7")

    # ── TEST 8: Invalid Frame Headers / Delimiters ──
    print("\n--- TEST 8: Invalid Frame Delimiters ---")
    err1 = bit_destuff("11111110111110001111110", flag_pattern="01111110")
    assert err1["success"] == False
    assert "missing starting flag" in err1["error"].lower()

    err2 = bit_destuff("01111110111110001111111", flag_pattern="01111110")
    assert err2["success"] == False
    assert "missing ending flag" in err2["error"].lower()
    print("[PASSED] TEST 8")

    print("\n" + "=" * 80)
    print("ALL BIT STUFFING TESTS PASSED SUCCESSFULLY!")
    print("=" * 80)

if __name__ == "__main__":
    run_tests()
