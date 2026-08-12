"""
=============================================================================
Test Suite for Hamming Distance & Minimum Distance (d_min) Implementation
Verifies all 15 specified test scenarios.
=============================================================================
"""

from algorithms.hamming_distance import (
    process_hamming_distance,
    compare_codewords,
    calculate_minimum_distance,
    calculate_error_capabilities,
    validate_codeword
)

def run_tests():
    print("=" * 70)
    print("RUNNING HAMMING DISTANCE & d_min THEORY TEST SUITE")
    print("=" * 70)

    # Test 1: 101101 vs 100111 -> Expected XOR = 001010, Distance = 2
    print("\n--- TEST 1: 101101 vs 100111 ---")
    res1 = compare_codewords("101101", "100111")
    print("Success:", res1["success"])
    print("XOR Result:", res1["xor_result"])
    print("Differing Positions:", res1["differing_positions"])
    print("Distance:", res1["distance"])
    assert res1["success"] == True
    assert res1["xor_result"] == "001010"
    assert res1["differing_positions"] == [3, 5]
    assert res1["distance"] == 2
    print("[PASSED] TEST 1")

    # Test 2: Identical Codewords (101101 vs 101101) -> Expected Distance = 0
    print("\n--- TEST 2: Identical Codewords (101101 vs 101101) ---")
    res2 = compare_codewords("101101", "101101")
    assert res2["success"] == True
    assert res2["xor_result"] == "000000"
    assert res2["distance"] == 0
    print("[PASSED] TEST 2")

    # Test 3: Completely Different Codewords (0000 vs 1111) -> Expected Distance = 4
    print("\n--- TEST 3: Completely Different Codewords (0000 vs 1111) ---")
    res3 = compare_codewords("0000", "1111")
    assert res3["success"] == True
    assert res3["distance"] == 4
    print("[PASSED] TEST 3")

    # Test 4: Single-bit Difference (1000 vs 1001) -> Expected Distance = 1
    print("\n--- TEST 4: Single-bit Difference (1000 vs 1001) ---")
    res4 = compare_codewords("1000", "1001")
    assert res4["success"] == True
    assert res4["distance"] == 1
    print("[PASSED] TEST 4")

    # Test 5: Invalid Non-Binary Input
    print("\n--- TEST 5: Invalid Non-Binary Input ---")
    res5 = compare_codewords("101A", "1001")
    assert res5["success"] == False
    assert "non-binary" in res5["error"].lower()
    print("[PASSED] TEST 5")

    # Test 6: Different-Length Codewords (101 vs 1011)
    print("\n--- TEST 6: Different-Length Codewords ---")
    res6 = compare_codewords("101", "1011")
    assert res6["success"] == False
    assert "mismatch" in res6["error"].lower()
    print("[PASSED] TEST 6")

    # Test 7: Empty Input Validation
    print("\n--- TEST 7: Empty Input Validation ---")
    res7 = compare_codewords("", "1011")
    assert res7["success"] == False
    assert "empty" in res7["error"].lower()
    print("[PASSED] TEST 7")

    # Test 8: Multiple Codewords with Known d_min (101101, 100111, 111101, 001101)
    print("\n--- TEST 8: Multiple Codewords d_min Calculation ---")
    cws8 = ["101101", "100111", "111101", "001101"]
    res8 = calculate_minimum_distance(cws8)
    print("Num Codewords:", res8["num_codewords"])
    print("Pairwise Matrix:\n", res8["pairwise_matrix"])
    print("Minimum Distance d_min:", res8["d_min"])
    print("Detectable Errors s:", res8["detectable_errors_s"])
    print("Correctable Errors t:", res8["correctable_errors_t"])
    assert res8["success"] == True
    assert res8["d_min"] == 1
    assert res8["detectable_errors_s"] == 0
    assert res8["correctable_errors_t"] == 0
    print("[PASSED] TEST 8")

    # Test 9: Duplicate Codewords in Set (101101, 101101, 100111) -> d_min = 0
    print("\n--- TEST 9: Duplicate Codewords Handling ---")
    cws9 = ["101101", "101101", "100111"]
    res9 = calculate_minimum_distance(cws9)
    print("Has Duplicates:", res9["has_duplicates"])
    print("Minimum Distance d_min:", res9["d_min"])
    assert res9["has_duplicates"] == True
    assert res9["d_min"] == 0
    print("[PASSED] TEST 9")

    # Test 10: Error Capabilities for d_min = 3 -> s = 2, t = 1
    print("\n--- TEST 10: Error Capability for d_min = 3 ---")
    caps10 = calculate_error_capabilities(3)
    assert caps10["detectable_s"] == 2
    assert caps10["correctable_t"] == 1
    print("[PASSED] TEST 10")

    # Test 11: Error Capabilities for d_min = 4 -> s = 3, t = 1
    print("\n--- TEST 11: Error Capability for d_min = 4 ---")
    caps11 = calculate_error_capabilities(4)
    assert caps11["detectable_s"] == 3
    assert caps11["correctable_t"] == 1
    print("[PASSED] TEST 11")

    # Test 12: Error Capabilities for d_min = 5 -> s = 4, t = 2
    print("\n--- TEST 12: Error Capability for d_min = 5 ---")
    caps12 = calculate_error_capabilities(5)
    assert caps12["detectable_s"] == 4
    assert caps12["correctable_t"] == 2
    print("[PASSED] TEST 12")

    # Test 13: Pairwise Distance Matrix Symmetry: d(ci, cj) == d(cj, ci)
    print("\n--- TEST 13: Matrix Symmetry Check ---")
    cws13 = ["0000", "0011", "1100", "1111"]
    res13 = calculate_minimum_distance(cws13)
    mat = res13["pairwise_matrix"]
    for i in range(len(cws13)):
        for j in range(len(cws13)):
            assert mat[i][j] == mat[j][i]
    print("[PASSED] TEST 13")

    # Test 14: Matrix Diagonal Zero Check: d(ci, ci) == 0
    print("\n--- TEST 14: Matrix Diagonal Zero Check ---")
    for i in range(len(cws13)):
        assert mat[i][i] == 0
    print("[PASSED] TEST 14")

    # Test 15: General Multi-Codeword Roundtrip (d_min = 2 code: 0000, 0011, 1100, 1111)
    print("\n--- TEST 15: General Multi-Codeword d_min = 2 Code ---")
    assert res13["d_min"] == 2
    assert res13["detectable_errors_s"] == 1
    assert res13["correctable_errors_t"] == 0
    print("[PASSED] TEST 15")

    print("\n" + "=" * 70)
    print("ALL 15 TEST SUITES PASSED SUCCESSFULLY!")
    print("=" * 70)

if __name__ == "__main__":
    run_tests()
