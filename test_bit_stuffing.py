"""
=============================================================================
Test Suite for Bit Stuffing & De-stuffing Algorithm Implementation
Verifies all 12 specified test scenarios.
=============================================================================
"""

from algorithms.bit_stuffing import process_bit_stuffing, bit_stuff, bit_destuff

def run_tests():
    print("=" * 70)
    print("RUNNING BIT STUFFING & DE-STUFFING ALGORITHM TEST SUITE")
    print("=" * 70)

    # Test 1: Input = 101010 (No 5 consecutive 1s)
    print("\n--- TEST 1: Input = 101010 (No stuffing required) ---")
    res1 = bit_stuff("101010", flag_pattern="01111110")
    print("Success:", res1["success"])
    print("Original Data:", res1["original_data"])
    print("Stuffed Payload:", res1["stuffed_payload"])
    print("Stuffed Frame:", res1["stuffed_frame"])
    assert res1["success"] == True
    assert res1["stuffed_payload"] == "101010"
    assert res1["stuffed_frame"] == "0111111010101001111110"
    print("[PASSED] TEST 1")

    # Test 2: Input = 11111 (Five 1s)
    print("\n--- TEST 2: Input = 11111 (Five 1s -> insert 0) ---")
    res2 = bit_stuff("11111", flag_pattern="01111110")
    print("Stuffed Payload:", res2["stuffed_payload"])
    assert res2["stuffed_payload"] == "111110"
    assert res2["inserted_bits"] == 1
    print("[PASSED] TEST 2")

    # Test 3: Input = 111110 (Five 1s followed by payload 0)
    print("\n--- TEST 3: Input = 111110 ---")
    res3 = bit_stuff("111110", flag_pattern="01111110")
    print("Stuffed Payload:", res3["stuffed_payload"])
    assert res3["stuffed_payload"] == "1111100"
    assert res3["stuffed_frame"] == "01111110111110001111110"
    print("[PASSED] TEST 3")

    # Test 4: Input = 1111111111 (Ten 1s)
    print("\n--- TEST 4: Input = 1111111111 (Ten 1s -> two stuffed 0s) ---")
    res4 = bit_stuff("1111111111", flag_pattern="01111110")
    print("Stuffed Payload:", res4["stuffed_payload"])
    assert res4["stuffed_payload"] == "111110111110"
    assert res4["inserted_bits"] == 2
    print("[PASSED] TEST 4")

    # Test 5: Input = 101111101 (Five 1s embedded inside stream)
    print("\n--- TEST 5: Input = 101111101 ---")
    res5 = bit_stuff("101111101", flag_pattern="01111110")
    print("Stuffed Payload:", res5["stuffed_payload"])
    assert res5["stuffed_payload"] == "1011111001"
    print("[PASSED] TEST 5")

    # Test 6: Roundtrip stuff -> destuff
    print("\n--- TEST 6: Roundtrip Stuff -> De-stuff Integrity Suite ---")
    test_streams = [
        "101010", "11111", "111110", "1111111111", "101111101",
        "01111110", "111110111110", "00000", "111111111111111"
    ]
    for stream in test_streams:
        proc = process_bit_stuffing(stream, flag_pattern="01111110", action="full_cycle")
        print(f"Payload: {stream} -> Frame: {proc['stuffed_frame']} -> Destuffed: {proc['destuffed_data']} | Match: {proc['integrity_match']}")
        assert proc["success"] == True
        assert proc["integrity_match"] == True
    print("[PASSED] TEST 6")

    # Test 7: Empty input validation
    print("\n--- TEST 7: Empty Input Validation ---")
    res7 = process_bit_stuffing("", flag_pattern="01111110")
    assert res7["success"] == False
    assert "empty" in res7["error"].lower()
    print("Error message:", res7["error"])
    print("[PASSED] TEST 7")

    # Test 8: Non-binary input validation
    print("\n--- TEST 8: Non-binary Input Validation ---")
    res8 = process_bit_stuffing("1010201", flag_pattern="01111110")
    assert res8["success"] == False
    assert "non-binary" in res8["error"].lower()
    print("Error message:", res8["error"])
    print("[PASSED] TEST 8")

    # Test 9: Missing starting FLAG validation
    print("\n--- TEST 9: Frame Missing Starting FLAG ---")
    res9 = bit_destuff("11111110111110001111110", flag_pattern="01111110")
    assert res9["success"] == False
    assert "start with delimiter flag" in res9["error"].lower()
    print("Error message:", res9["error"])
    print("[PASSED] TEST 9")

    # Test 10: Missing ending FLAG validation
    print("\n--- TEST 10: Frame Missing Ending FLAG ---")
    res10 = bit_destuff("01111110111110001111111", flag_pattern="01111110")
    assert res10["success"] == False
    assert "end with delimiter flag" in res10["error"].lower()
    print("Error message:", res10["error"])
    print("[PASSED] TEST 10")

    # Test 11: Missing stuffed 0 after five 1s
    print("\n--- TEST 11: Missing Stuffed 0 After Five 1s (Corrupted Stream) ---")
    # Payload has 111111 (six 1s) without a stuffed 0
    corrupt_frame = "01111110" + "111111" + "01111110"
    res11 = bit_destuff(corrupt_frame, flag_pattern="01111110")
    assert res11["success"] == False
    assert "missing required stuffed '0' bit" in res11["error"].lower()
    print("Error message:", res11["error"])
    print("[PASSED] TEST 11")

    # Test 12: Error injection bit flip
    print("\n--- TEST 12: Error Injection Bit Flipping ---")
    # Original frame: 01111110111110001111110 (len 23)
    # Flip bit at 1-indexed position 10 (inside stuffed payload)
    res12 = process_bit_stuffing("111110", flag_pattern="01111110", error_pos=10)
    print("Original Frame:", res12["stuffed_frame"])
    print("Corrupted Frame:", res12["received_frame"])
    print("Error Injected:", res12["error_injected"])
    print("Details:", res12["error_details"])
    print("Integrity Match:", res12["integrity_match"])
    assert res12["success"] == True
    assert res12["error_injected"] == True
    assert res12["stuffed_frame"] != res12["received_frame"]
    print("[PASSED] TEST 12")

    print("\n" + "=" * 70)
    print("ALL 12 TEST SUITES PASSED SUCCESSFULLY!")
    print("=" * 70)

if __name__ == "__main__":
    run_tests()
