"""
Test script for Byte Stuffing & De-stuffing algorithm implementation.
Verifies all 7 user-specified test scenarios.
"""

from algorithms.byte_stuffing import process_byte_stuffing, byte_stuff, byte_destuff

def run_tests():
    print("=" * 70)
    print("RUNNING BYTE STUFFING & DE-STUFFING ALGORITHM TEST SUITE")
    print("=" * 70)

    # Test 1: Data = ABCD (No stuffing inside payload)
    print("\n--- TEST 1: Data = ABCD (No FLAG or ESC inside payload) ---")
    res1 = process_byte_stuffing("ABCD", flag="F", esc="E")
    print("Success:", res1["success"])
    print("Original Data:", res1["original_data"])
    print("Stuffed Frame:", res1["stuffed_frame"])
    print("Destuffed Data:", res1["destuffed_data"])
    print("Integrity Match:", res1["integrity_match"])
    assert res1["success"] == True
    assert res1["stuffed_frame"] == "FABCDF"
    assert res1["destuffed_data"] == "ABCD"
    assert res1["integrity_match"] == True
    print("[PASSED] TEST 1")

    # Test 2: Data contains FLAG (e.g. ABFC)
    print("\n--- TEST 2: Data contains FLAG ('ABFC') ---")
    res2 = process_byte_stuffing("ABFC", flag="F", esc="E")
    print("Original Data:", res2["original_data"])
    print("Stuffed Frame:", res2["stuffed_frame"])
    print("Destuffed Data:", res2["destuffed_data"])
    assert res2["stuffed_frame"] == "FABEFCF"
    assert res2["destuffed_data"] == "ABFC"
    assert res2["integrity_match"] == True
    print("[PASSED] TEST 2")

    # Test 3: Data contains ESC (e.g. ABEC)
    print("\n--- TEST 3: Data contains ESC ('ABEC') ---")
    res3 = process_byte_stuffing("ABEC", flag="F", esc="E")
    print("Original Data:", res3["original_data"])
    print("Stuffed Frame:", res3["stuffed_frame"])
    print("Destuffed Data:", res3["destuffed_data"])
    assert res3["stuffed_frame"] == "FABEECF"
    assert res3["destuffed_data"] == "ABEC"
    assert res3["integrity_match"] == True
    print("[PASSED] TEST 3")

    # Test 4: Data contains both FLAG and ESC (e.g. ABCFE)
    print("\n--- TEST 4: Data contains both FLAG and ESC ('ABCFE') ---")
    res4 = process_byte_stuffing("ABCFE", flag="F", esc="E")
    print("Original Data:", res4["original_data"])
    print("Stuffed Frame:", res4["stuffed_frame"])
    print("Destuffed Data:", res4["destuffed_data"])
    assert res4["stuffed_frame"] == "FABCEFEEF"
    assert res4["destuffed_data"] == "ABCFE"
    assert res4["integrity_match"] == True
    print("[PASSED] TEST 4")

    # Test 5: Empty input
    print("\n--- TEST 5: Empty Input Validation ---")
    res5 = process_byte_stuffing("", flag="F", esc="E")
    print("Result:", res5)
    assert res5["success"] == False
    assert "empty" in res5["error"].lower()
    print("[PASSED] TEST 5")

    # Test 6: FLAG == ESC
    print("\n--- TEST 6: FLAG == ESC Conflict Validation ---")
    res6 = process_byte_stuffing("ABCD", flag="F", esc="F")
    print("Result:", res6)
    assert res6["success"] == False
    assert "same character" in res6["error"].lower()
    print("[PASSED] TEST 6")

    # Test 7: Stuff -> De-stuff roundtrip integrity across varied payloads
    print("\n--- TEST 7: Roundtrip Integrity Suite ---")
    test_inputs = ["F", "E", "FE", "EF", "HELLO WORLD", "A F B E C F"]
    for inp in test_inputs:
        res = process_byte_stuffing(inp, flag="F", esc="E")
        print(f"Input: '{inp}' -> Frame: '{res['stuffed_frame']}' -> Destuffed: '{res['destuffed_data']}' | Match: {res['integrity_match']}")
        assert res["success"] == True
        assert res["integrity_match"] == True
    print("[PASSED] TEST 7")

    # Test 8: De-stuffing corrupt frames (Error validation)
    print("\n--- TEST 8: Invalid Frame Validation ---")
    err1 = byte_destuff("ABCF", flag="F", esc="E")  # Doesn't start with F
    assert err1["success"] == False
    print("Missing start FLAG check:", err1["error"])

    err2 = byte_destuff("FABC", flag="F", esc="E")  # Doesn't end with F
    assert err2["success"] == False
    print("Missing end FLAG check:", err2["error"])

    err3 = byte_destuff("FABE F", flag="F", esc="E") # Dangling ESC
    assert err3["success"] == False
    print("Dangling ESC check:", err3["error"])

    err4 = byte_destuff("FABE X F", flag="F", esc="E") # Invalid byte after ESC
    assert err4["success"] == False
    print("Invalid ESC byte check:", err4["error"])
    print("[PASSED] TEST 8")

    print("\n" + "=" * 70)
    print("ALL 8 TEST SUITES PASSED SUCCESSFULLY!")
    print("=" * 70)

if __name__ == "__main__":
    run_tests()
