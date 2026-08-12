"""
=============================================================================
Test Suite for Cyclic Redundancy Check (CRC) Implementation
Verifies all 16 specified test scenarios.
=============================================================================
"""

from algorithms.crc import (
    process_crc,
    crc_encode,
    crc_check,
    modulo2_division,
    validate_crc_inputs
)

def run_tests():
    print("=" * 70)
    print("RUNNING CYCLIC REDUNDANCY CHECK (CRC) ALGORITHM TEST SUITE")
    print("=" * 70)

    # Test 1: Data = 100100, Generator = 1101
    print("\n--- TEST 1: Data = 100100, Generator = 1101 ---")
    res1 = crc_encode("100100", polynomial="1101")
    print("Success:", res1["success"])
    print("Original Data:", res1["original_data"])
    print("Appended Data:", res1["appended_data"])
    print("CRC Remainder:", res1["crc_remainder"])
    print("Transmitted Codeword:", res1["transmitted_codeword"])
    assert res1["success"] == True
    assert res1["crc_remainder"] == "001"
    assert res1["transmitted_codeword"] == "100100001"
    print("[PASSED] TEST 1")

    # Test 2: Receiver Check on 100100001 with 1101
    print("\n--- TEST 2: Receiver Check on 100100001 ---")
    chk2 = crc_check("100100001", polynomial="1101")
    print("Success:", chk2["success"])
    print("Received Remainder:", chk2["received_remainder"])
    print("Error Detected:", chk2["error_detected"])
    assert chk2["success"] == True
    assert chk2["received_remainder"] == "000"
    assert chk2["error_detected"] == False
    print("[PASSED] TEST 2")

    # Test 3: Flip Bit 1 (Pos 1) in Codeword
    print("\n--- TEST 3: Bit Flip Error Injection (Pos 1) ---")
    res3 = process_crc("100100", polynomial="1101", error_pos=1)
    print("Transmitted:", res3["transmitted_codeword"])
    print("Corrupted:", res3["received_codeword"])
    print("Remainder:", res3["received_remainder"])
    print("Error Detected:", res3["error_detected"])
    assert res3["error_injected"] == True
    assert res3["error_detected"] == True
    assert res3["received_remainder"] != "000"
    print("[PASSED] TEST 3")

    # Test 4: Flip Bit 8 in Codeword
    print("\n--- TEST 4: Bit Flip Error Injection (Pos 8) ---")
    res4 = process_crc("100100", polynomial="1101", error_pos=8)
    print("Remainder:", res4["received_remainder"])
    print("Error Detected:", res4["error_detected"])
    assert res4["error_injected"] == True
    assert res4["error_detected"] == True
    assert res4["received_remainder"] != "000"
    print("[PASSED] TEST 4")

    # Test 5: All Zeros Data Payload
    print("\n--- TEST 5: Payload All Zeros (000000) ---")
    res5 = crc_encode("000000", polynomial="1101")
    print("CRC Remainder:", res5["crc_remainder"])
    assert res5["success"] == True
    assert res5["crc_remainder"] == "000"
    chk5 = crc_check(res5["transmitted_codeword"], polynomial="1101")
    assert chk5["error_detected"] == False
    print("[PASSED] TEST 5")

    # Test 6: All Ones Data Payload
    print("\n--- TEST 6: Payload All Ones (111111) ---")
    res6 = process_crc("111111", polynomial="1101")
    assert res6["success"] == True
    assert res6["integrity_match"] == True
    print("[PASSED] TEST 6")

    # Test 7: Different Valid Generator Polynomial (e.g. 10011 CRC-4)
    print("\n--- TEST 7: Generator = 10011 (CRC-4) ---")
    res7 = process_crc("1101011011", polynomial="10011")
    print("Appended Data:", res7["appended_data"])
    print("CRC Remainder:", res7["crc_remainder"])
    print("Transmitted Codeword:", res7["transmitted_codeword"])
    assert res7["success"] == True
    assert len(res7["crc_remainder"]) == 4
    assert res7["integrity_match"] == True
    print("[PASSED] TEST 7")

    # Test 8: Non-binary Data Payload
    print("\n--- TEST 8: Non-Binary Data Payload ---")
    res8 = crc_encode("1001A0", polynomial="1101")
    assert res8["success"] == False
    assert "non-binary" in res8["error"].lower()
    print("[PASSED] TEST 8")

    # Test 9: Non-binary Generator Polynomial
    print("\n--- TEST 9: Non-Binary Generator Polynomial ---")
    res9 = crc_encode("100100", polynomial="1102")
    assert res9["success"] == False
    assert "non-binary" in res9["error"].lower()
    print("[PASSED] TEST 9")

    # Test 10: Generator Does Not Start with 1
    print("\n--- TEST 10: Generator Does Not Start with 1 ---")
    res10 = crc_encode("100100", polynomial="0101")
    assert res10["success"] == False
    assert "start with '1'" in res10["error"].lower()
    print("[PASSED] TEST 10")

    # Test 11: Generator Does Not End with 1
    print("\n--- TEST 11: Generator Does Not End with 1 ---")
    res11 = crc_encode("100100", polynomial="1100")
    assert res11["success"] == False
    assert "end with '1'" in res11["error"].lower()
    print("[PASSED] TEST 11")

    # Test 12: Generator Too Short (< 2 bits)
    print("\n--- TEST 12: Generator Too Short (< 2 bits) ---")
    res12 = crc_encode("100100", polynomial="1")
    assert res12["success"] == False
    assert "too short" in res12["error"].lower()
    print("[PASSED] TEST 12")

    # Test 13: Empty Data Payload
    print("\n--- TEST 13: Empty Data Payload ---")
    res13 = crc_encode("", polynomial="1101")
    assert res13["success"] == False
    assert "empty" in res13["error"].lower()
    print("[PASSED] TEST 13")

    # Test 14: Empty Generator Polynomial
    print("\n--- TEST 14: Empty Generator Polynomial ---")
    res14 = crc_encode("100100", polynomial="")
    assert res14["success"] == False
    assert "empty" in res14["error"].lower()
    print("[PASSED] TEST 14")

    # Test 15: Roundtrip Encode -> Check (Receiver Remainder = All Zeros)
    print("\n--- TEST 15: Roundtrip Suite across Varied Payloads ---")
    test_payloads = ["100100", "1101", "10110010", "1111111111", "101"]
    for payload in test_payloads:
        proc = process_crc(payload, polynomial="1101", action="full_cycle")
        print(f"Payload: {payload} -> Remainder: {proc['crc_remainder']} -> Receiver Remainder: {proc['received_remainder']} | Match: {proc['integrity_match']}")
        assert proc["success"] == True
        assert proc["integrity_match"] == True
        assert all(ch == '0' for ch in proc["received_remainder"])
    print("[PASSED] TEST 15")

    # Test 16: Error Injection Encode -> Flip Bit -> Check (Non-zero Remainder)
    print("\n--- TEST 16: Error Injection Roundtrip ---")
    proc16 = process_crc("100100", polynomial="1101", error_pos=5)
    print("Original CW:", proc16["transmitted_codeword"])
    print("Corrupted CW:", proc16["received_codeword"])
    print("Recv Remainder:", proc16["received_remainder"])
    print("Error Detected:", proc16["error_detected"])
    assert proc16["error_injected"] == True
    assert proc16["error_detected"] == True
    assert proc16["received_remainder"] != "000"
    print("[PASSED] TEST 16")

    print("\n" + "=" * 70)
    print("ALL 16 TEST SUITES PASSED SUCCESSFULLY!")
    print("=" * 70)

if __name__ == "__main__":
    run_tests()
