"""
=============================================================================
Test Suite for Parity Check (1D Simple & 2D Block Parity) Implementation
Verifies all 14 specified test scenarios.
=============================================================================
"""

from algorithms.parity import (
    process_parity,
    encode_parity_1d,
    check_parity_1d,
    calculate_block_parity,
    calculate_parity_bit
)

def run_tests():
    print("=" * 70)
    print("RUNNING PARITY CHECK (1D & 2D BLOCK) ALGORITHM TEST SUITE")
    print("=" * 70)

    # Test 1: 1D Even parity, Data = 1011001 (4 ones)
    print("\n--- TEST 1: 1D Even Parity (Data = 1011001) ---")
    res1 = encode_parity_1d("1011001", parity_type="even")
    print("Success:", res1["success"])
    print("Parity Bit:", res1["parity_bit"])
    print("Codeword:", res1["encoded_codeword"])
    assert res1["success"] == True
    assert res1["parity_bit"] == '0'
    assert res1["encoded_codeword"] == "10110010"
    print("[PASSED] TEST 1")

    # Test 2: 1D Odd parity, Data = 1011001 (4 ones)
    print("\n--- TEST 2: 1D Odd Parity (Data = 1011001) ---")
    res2 = encode_parity_1d("1011001", parity_type="odd")
    print("Parity Bit:", res2["parity_bit"])
    print("Codeword:", res2["encoded_codeword"])
    assert res2["success"] == True
    assert res2["parity_bit"] == '1'
    assert res2["encoded_codeword"] == "10110011"
    print("[PASSED] TEST 2")

    # Test 3: 1D Even parity with odd number of 1s (Data = 1011000, 3 ones)
    print("\n--- TEST 3: 1D Even Parity with Odd number of 1s ---")
    res3 = encode_parity_1d("1011000", parity_type="even")
    assert res3["parity_bit"] == '1'
    assert res3["encoded_codeword"] == "10110001"
    print("[PASSED] TEST 3")

    # Test 4: 1D Odd parity with odd number of 1s (Data = 1011000, 3 ones)
    print("\n--- TEST 4: 1D Odd Parity with Odd number of 1s ---")
    res4 = encode_parity_1d("1011000", parity_type="odd")
    assert res4["parity_bit"] == '0'
    assert res4["encoded_codeword"] == "10110000"
    print("[PASSED] TEST 4")

    # Test 5: 1D No Error Validation
    print("\n--- TEST 5: 1D Codeword Validation (No Error) ---")
    chk5 = check_parity_1d("10110010", parity_type="even")
    assert chk5["error_detected"] == False
    print("[PASSED] TEST 5")

    # Test 6: 1D Single-Bit Error Injection (Detected)
    print("\n--- TEST 6: 1D Single-Bit Error Injection ---")
    res6 = process_parity("1011001", parity_type="even", mode="1D", error_pos=3)
    print("Original Codeword:", res6["encoded_codeword"])
    print("Corrupted Codeword:", res6["received_codeword"])
    print("Error Detected:", res6["error_detected"])
    assert res6["error_injected"] == True
    assert res6["error_detected"] == True
    print("[PASSED] TEST 6")

    # Test 7: 1D Two-Bit Error Injection (Demonstrating Parity Limitation)
    print("\n--- TEST 7: 1D Two-Bit Error Injection (Limitation) ---")
    # Codeword: 10110010 -> flip bit 1 and bit 2 -> 01110010 (still has 4 ones!)
    proc7 = process_parity("1011001", parity_type="even", mode="1D", injected_error="01110010")
    print("Received Corrupted Codeword:", proc7["received_codeword"])
    print("Error Detected:", proc7["error_detected"])
    # 2-bit flip has even number of changes -> simple parity fails to detect it!
    assert proc7["error_detected"] == False
    print("Note: 2-bit error was NOT detected, proving simple parity limitation.")
    print("[PASSED] TEST 7")

    # Test 8: Empty input validation
    print("\n--- TEST 8: Empty Input Validation ---")
    res8 = process_parity("", parity_type="even", mode="1D")
    assert res8["success"] == False
    assert "empty" in res8["error"].lower()
    print("[PASSED] TEST 8")

    # Test 9: Non-binary input validation
    print("\n--- TEST 9: Non-Binary Input Validation ---")
    res9 = process_parity("1011A01", parity_type="even", mode="1D")
    assert res9["success"] == False
    assert "non-binary" in res9["error"].lower()
    print("[PASSED] TEST 9")

    # Test 10: 2D Even Parity Matrix Generation
    print("\n--- TEST 10: 2D Even Parity Matrix Generation ---")
    # Data: 1011001011001001 (16 bits), cols = 4 -> 4 rows of 4 bits
    # Row 1: 1011 -> 3 ones -> Even Parity P_r1 = 1
    # Row 2: 0010 -> 1 one  -> Even Parity P_r2 = 1
    # Row 3: 1100 -> 2 ones -> Even Parity P_r3 = 0
    # Row 4: 1001 -> 2 ones -> Even Parity P_r4 = 0
    # Row Parities = ['1', '1', '0', '0']
    res10 = calculate_block_parity("1011001011001001", columns=4, parity_type="even")
    print("Rows:", res10["rows"], "Cols:", res10["columns"])
    print("Matrix Rows:", res10["matrix_rows"])
    print("Row Parities:", res10["row_parities"])
    print("Col Parities:", res10["col_parities"])
    print("Corner Parity:", res10["corner_parity"])
    assert res10["success"] == True
    assert res10["row_parities"] == ['1', '1', '0', '0']
    assert res10["col_parities"] == ['1', '1', '0', '0']
    assert res10["row_parities"] == ['1', '1', '0', '0']
    print("[PASSED] TEST 10")

    # Test 11: 2D Odd Parity Matrix Generation
    print("\n--- TEST 11: 2D Odd Parity Matrix Generation ---")
    res11 = calculate_block_parity("1011001011001001", columns=4, parity_type="odd")
    print("Odd Row Parities:", res11["row_parities"])
    print("Odd Col Parities:", res11["col_parities"])
    assert res11["success"] == True
    assert res11["row_parities"] == ['0', '0', '1', '1']
    print("[PASSED] TEST 11")

    # Test 12: 2D Single-Bit Error Injection & Pinpointing
    print("\n--- TEST 12: 2D Single-Bit Error Pinpointing ---")
    # Flip bit at Row 2, Column 3
    res12 = process_parity("1011001011001001", columns=4, parity_type="even", mode="2D", error_row=2, error_col=3)
    print("Error Details:", res12["error_details"])
    print("Mismatched Rows:", res12["mismatched_rows"])
    print("Mismatched Cols:", res12["mismatched_cols"])
    print("Pinpointed Location:", res12["pinpointed_location"])
    assert res12["error_detected"] == True
    assert res12["mismatched_rows"] == [2]
    assert res12["mismatched_cols"] == [3]
    assert res12["pinpointed_location"] == {"row": 2, "col": 3}
    print("[PASSED] TEST 12")

    # Test 13: Invalid column count validation
    print("\n--- TEST 13: Invalid Column Count Validation ---")
    res13 = calculate_block_parity("10110010", columns=0, parity_type="even")
    assert res13["success"] == False
    assert "column count" in res13["error"].lower()
    print("[PASSED] TEST 13")

    # Test 14: 2D Roundtrip / Check with No Error
    print("\n--- TEST 14: 2D Roundtrip Check (No Error) ---")
    res14 = process_parity("1011001011001001", columns=4, parity_type="even", mode="2D")
    print("Error Detected:", res14["error_detected"])
    print("Integrity Match:", res14["integrity_match"])
    assert res14["success"] == True
    assert res14["error_detected"] == False
    assert res14["integrity_match"] == True
    print("[PASSED] TEST 14")

    print("\n" + "=" * 70)
    print("ALL 14 TEST SUITES PASSED SUCCESSFULLY!")
    print("=" * 70)

if __name__ == "__main__":
    run_tests()
