"""
=============================================================================
Test Suite: Generic Byte Stuffing & De-stuffing Simulator
=============================================================================
Verifies dynamic execution for any Data, FLAG, and ESC characters, including
all edge cases and the prompt's required test cases.
=============================================================================
"""

from algorithms.byte_stuffing import process_byte_stuffing, byte_stuff, byte_destuff

def run_tests():
    print("=" * 80)
    print("RUNNING COMPREHENSIVE GENERIC BYTE STUFFING TEST SUITE")
    print("=" * 80)

    # ── TEST CASE A: Data = "ABC#DEF", FLAG = "#", ESC = "\" ──
    print("\n--- TEST A: Data = 'ABC#DEF', FLAG = '#', ESC = '\\' ---")
    res_a = process_byte_stuffing("ABC#DEF", flag="#", esc="\\")
    print("Stuffed Payload:", res_a["stuffed_payload"])
    print("Transmitted Frame:", res_a["stuffed_frame"])
    print("Recovered Data:", res_a["destuffed_data"])
    assert res_a["success"] == True
    assert res_a["stuffed_payload"] == "ABC\\#DEF"
    assert res_a["stuffed_frame"] == "#ABC\\#DEF#"
    assert res_a["destuffed_data"] == "ABC#DEF"
    assert res_a["integrity_match"] == True
    print("[PASSED] TEST A")

    # ── TEST CASE B: Data = "ABC\DEF", FLAG = "#", ESC = "\" ──
    print("\n--- TEST B: Data = 'ABC\\DEF', FLAG = '#', ESC = '\\' ---")
    res_b = process_byte_stuffing("ABC\\DEF", flag="#", esc="\\")
    print("Stuffed Payload:", res_b["stuffed_payload"])
    print("Transmitted Frame:", res_b["stuffed_frame"])
    print("Recovered Data:", res_b["destuffed_data"])
    assert res_b["success"] == True
    assert res_b["stuffed_payload"] == "ABC\\\\DEF"
    assert res_b["stuffed_frame"] == "#ABC\\\\DEF#"
    assert res_b["destuffed_data"] == "ABC\\DEF"
    assert res_b["integrity_match"] == True
    print("[PASSED] TEST B")

    # ── TEST CASE C: Data = "POIAUYTAREWAQ", FLAG = "A", ESC = "X" ──
    print("\n--- TEST C: Data = 'POIAUYTAREWAQ', FLAG = 'A', ESC = 'X' ---")
    res_c = process_byte_stuffing("POIAUYTAREWAQ", flag="A", esc="X")
    print("Stuffed Payload:", res_c["stuffed_payload"])
    print("Transmitted Frame:", res_c["stuffed_frame"])
    print("Recovered Data:", res_c["destuffed_data"])
    assert res_c["success"] == True
    assert res_c["stuffed_payload"] == "POIXAUYTXAREWXAQ"
    assert res_c["stuffed_frame"] == "APOIXAUYTXAREWXAQA"
    assert res_c["destuffed_data"] == "POIAUYTAREWAQ"
    assert res_c["integrity_match"] == True
    print("[PASSED] TEST C")

    # ── TEST CASE D: Classic Data = "ABCFE", FLAG = "F", ESC = "E" ──
    print("\n--- TEST D: Classic 'ABCFE', FLAG = 'F', ESC = 'E' ---")
    res_d = process_byte_stuffing("ABCFE", flag="F", esc="E")
    assert res_d["stuffed_frame"] == "FABCEFEEF"
    assert res_d["destuffed_data"] == "ABCFE"
    assert res_d["integrity_match"] == True
    print("[PASSED] TEST D")

    # ── TEST CASE E: Multiple Consecutive FLAGs & ESCs ──
    print("\n--- TEST E: Multiple Consecutive Delimiters ---")
    res_e1 = process_byte_stuffing("###", flag="#", esc="\\")
    assert res_e1["stuffed_frame"] == "#\\#\\#\\##"
    assert res_e1["destuffed_data"] == "###"

    res_e2 = process_byte_stuffing("\\\\\\", flag="#", esc="\\")
    assert res_e2["stuffed_frame"] == "#\\\\\\\\\\\\#"
    assert res_e2["destuffed_data"] == "\\\\\\"
    print("[PASSED] TEST E")

    # ── TEST CASE F: Single Character Data ──
    print("\n--- TEST F: Single Character Payloads ---")
    assert process_byte_stuffing("#", flag="#", esc="\\")["destuffed_data"] == "#"
    assert process_byte_stuffing("\\", flag="#", esc="\\")["destuffed_data"] == "\\"
    assert process_byte_stuffing("Z", flag="#", esc="\\")["destuffed_data"] == "Z"
    print("[PASSED] TEST F")

    # ── TEST CASE G: Payload with Spaces ──
    print("\n--- TEST G: Payload containing Spaces ---")
    res_g = process_byte_stuffing("HELLO # WORLD \\ END", flag="#", esc="\\")
    assert res_g["stuffed_frame"] == "#HELLO \\# WORLD \\\\ END#"
    assert res_g["destuffed_data"] == "HELLO # WORLD \\ END"
    assert res_g["integrity_match"] == True
    print("[PASSED] TEST G")

    # ── TEST CASE H: Conflict Validation (FLAG == ESC) ──
    print("\n--- TEST H: Validation: FLAG == ESC ---")
    res_h = process_byte_stuffing("HELLO", flag="#", esc="#")
    assert res_h["success"] == False
    assert "same character" in res_h["error"].lower()
    print("[PASSED] TEST H")

    # ── TEST CASE I: Empty Data Validation ──
    print("\n--- TEST I: Validation: Empty Data ---")
    res_i = process_byte_stuffing("", flag="#", esc="\\")
    assert res_i["success"] == False
    assert "empty" in res_i["error"].lower()
    print("[PASSED] TEST I")

    # ── TEST CASE J: Error Injection Simulation ──
    print("\n--- TEST J: Error Injection Simulation ---")
    # 1. Corrupt by changing a byte in payload
    clean_frame = res_a["stuffed_frame"] # "#ABC\#DEF#"
    corrupted_frame = "#ABC\\#DZF#"
    res_err1 = process_byte_stuffing("ABC#DEF", flag="#", esc="\\", injected_error=corrupted_frame)
    print("Corrupted destuffed:", res_err1["destuffed_data"])
    assert res_err1["destuff_success"] == True
    assert res_err1["destuffed_data"] == "ABC#DZF"
    assert res_err1["integrity_match"] == False # mismatch detected

    # 2. Corrupt by stripping starting flag
    res_err2 = process_byte_stuffing("ABC#DEF", flag="#", esc="\\", injected_error="ABC\\#DEF#")
    assert res_err2["destuff_success"] == False
    assert "missing starting flag" in res_err2["destuff_error"].lower()

    # 3. Corrupt by dangling ESC
    res_err3 = process_byte_stuffing("ABC#DEF", flag="#", esc="\\", injected_error="#ABC\\#DEF\\#")
    assert res_err3["destuff_success"] == False
    assert "invalid escape sequence" in res_err3["destuff_error"].lower() or "dangling esc" in res_err3["destuff_error"].lower()

    # 4. Corrupt by unescaped FLAG in payload
    res_err4 = process_byte_stuffing("ABC#DEF", flag="#", esc="\\", injected_error="#ABC#DEF#")
    assert res_err4["destuff_success"] == False
    assert "unescaped flag" in res_err4["destuff_error"].lower()
    print("[PASSED] TEST J")

    # ── TEST CASE K: Dynamic Statistics ──
    print("\n--- TEST K: Dynamic Statistics ---")
    stats = res_a["stats"]
    assert stats["original_length"] == len("ABC#DEF")
    assert stats["stuffed_length"] == len("ABC\\#DEF")
    assert stats["frame_length"] == len("#ABC\\#DEF#")
    assert stats["added_bytes"] == 1
    assert stats["recovery_status"] == "Success"
    # ── TEST CASE L: Standalone De-stuff Action ('action=destuff') ──
    print("\n--- TEST L: Standalone De-stuff Action ('action=destuff') ---")
    # 1. De-stuff FABCEFEEF with FLAG=F, ESC=E, original_data=ABCFE
    res_destuff1 = process_byte_stuffing("FABCEFEEF", flag="F", esc="E", action="destuff", original_data="ABCFE")
    print("De-stuff FABCEFEEF ->", res_destuff1)
    assert res_destuff1["success"] == True
    assert res_destuff1["destuffed_data"] == "ABCFE"
    assert res_destuff1["integrity_match"] == True

    # 2. De-stuff #ABC\#DEF# with FLAG=#, ESC=\, original_data=ABC#DEF
    res_destuff2 = process_byte_stuffing("#ABC\\#DEF#", flag="#", esc="\\", action="destuff", original_data="ABC#DEF")
    assert res_destuff2["success"] == True
    assert res_destuff2["destuffed_data"] == "ABC#DEF"
    assert res_destuff2["integrity_match"] == True

    # 3. De-stuff with missing starting flag
    res_destuff3 = process_byte_stuffing("ABCFE", flag="F", esc="E", action="destuff", original_data="ABCFE")
    assert res_destuff3["success"] == False
    assert "missing starting flag" in res_destuff3["error"].lower()

    # 4. De-stuff with missing ending flag
    res_destuff4 = process_byte_stuffing("FABCEFEE", flag="F", esc="E", action="destuff")
    assert res_destuff4["success"] == False
    assert "missing ending flag" in res_destuff4["error"].lower()

    # 5. De-stuff with dangling ESC
    res_destuff5 = process_byte_stuffing("FABCEFEEF", flag="F", esc="E", action="destuff")
    # Valid
    assert res_destuff5["success"] == True
    assert res_destuff5["destuffed_data"] == "ABCFE"

    res_destuff6 = process_byte_stuffing("FABCEFEEF", flag="A", esc="X", action="destuff")
    assert res_destuff6["success"] == False
    assert "missing starting FLAG ('A')" in res_destuff6["error"]
    assert "Frame starts with 'F'" in res_destuff6["error"]

    print("[PASSED] TEST L")

    print("\n" + "=" * 80)
    print("ALL GENERIC BYTE STUFFING TESTS PASSED!")
    print("=" * 80)

if __name__ == "__main__":
    run_tests()

