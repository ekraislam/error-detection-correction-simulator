"""
=============================================================================
Unit Test Suite for Internet Checksum (RFC 1071 1's Complement Standard)
=============================================================================
"""

import unittest
from algorithms.checksum import (
    invert_bits,
    ones_complement_add,
    calculate_checksum_sender,
    verify_checksum_receiver,
    process_checksum
)

class TestInternetChecksum(unittest.TestCase):

    def test_01_invert_bits(self):
        self.assertEqual(invert_bits("10101010"), "01010101")
        self.assertEqual(invert_bits("11110000"), "00001111")
        self.assertEqual(invert_bits("11111111"), "00000000")
        self.assertEqual(invert_bits("00000000"), "11111111")

    def test_02_ones_complement_add_no_carry(self):
        # 00001010 (10) + 00000101 (5) = 00001111 (15)
        sum_bin, carry, raw_val, steps = ones_complement_add("00001010", "00000101", word_size=8)
        self.assertEqual(sum_bin, "00001111")
        self.assertFalse(carry)
        self.assertEqual(raw_val, 15)

    def test_03_ones_complement_add_with_end_around_carry(self):
        # 11110000 (240) + 00010001 (17) = 257 -> 257 % 256 + 1 = 2 -> 00000010
        sum_bin, carry, raw_val, steps = ones_complement_add("11110000", "00010001", word_size=8)
        self.assertEqual(sum_bin, "00000010")
        self.assertTrue(carry)
        self.assertEqual(raw_val, 257)

    def test_04_sender_8bit_two_words(self):
        # Payload: 10101001 00110101 (2 words)
        # W1 = 10101001 (169), W2 = 00110101 (53)
        # Sum = 169 + 53 = 222 = 11011110 (No carry)
        # Checksum = ~11011110 = 00100001
        res = calculate_checksum_sender("1010100100110101", word_size=8)
        self.assertTrue(res["success"])
        self.assertEqual(res["num_words"], 2)
        self.assertEqual(res["final_sum"], "11011110")
        self.assertEqual(res["checksum"], "00100001")
        self.assertEqual(res["transmitted_frame"], "101010010011010100100001")

    def test_05_sender_8bit_end_around_carry(self):
        # W1 = 11001100 (204), W2 = 10101010 (170)
        # Raw sum = 374 -> Carry = 1 -> Wrapped sum = (374 - 256) + 1 = 119 = 01110111
        # Checksum = ~01110111 = 10001000
        res = calculate_checksum_sender("1100110010101010", word_size=8)
        self.assertTrue(res["success"])
        self.assertEqual(res["final_sum"], "01110111")
        self.assertEqual(res["checksum"], "10001000")

    def test_06_sender_8bit_multiple_words(self):
        # 4 words: 10000001, 10000010, 10000011, 10000100
        data = "10000001" + "10000010" + "10000011" + "10000100"
        res = calculate_checksum_sender(data, word_size=8)
        self.assertTrue(res["success"])
        self.assertEqual(res["num_words"], 4)
        self.assertEqual(len(res["addition_trace"]), 3)

    def test_07_sender_16bit_word_size(self):
        # W1 = 1000000010000000, W2 = 0000000100000001
        # Sum = 1000000110000001
        # Checksum = 0111111001111110
        w1 = "1000000010000000"
        w2 = "0000000100000001"
        res = calculate_checksum_sender(w1 + w2, word_size=16)
        self.assertTrue(res["success"])
        self.assertEqual(res["word_size"], 16)
        self.assertEqual(res["num_words"], 2)
        self.assertEqual(res["final_sum"], "1000000110000001")
        self.assertEqual(res["checksum"], "0111111001111110")

    def test_08_receiver_clean_verification_8bit(self):
        # Send W1=10101001, W2=00110101, CHK=00100001
        frame = "101010010011010100100001"
        res = verify_checksum_receiver(frame, word_size=8)
        self.assertTrue(res["success"])
        self.assertFalse(res["error_detected"])
        self.assertTrue(res["integrity_match"])
        self.assertEqual(res["receiver_sum"], "11111111")
        self.assertEqual(res["receiver_inverted_sum"], "00000000")

    def test_09_receiver_clean_verification_16bit(self):
        sender = calculate_checksum_sender("11001100110011001010101010101010", word_size=16)
        recv = verify_checksum_receiver(sender["transmitted_frame"], word_size=16)
        self.assertTrue(recv["success"])
        self.assertFalse(recv["error_detected"])
        self.assertTrue(recv["integrity_match"])
        self.assertEqual(recv["receiver_sum"], "1111111111111111")

    def test_10_single_bit_error_detection(self):
        # Flip position 3 in transmitted frame
        full = process_checksum("1010100100110101", word_size=8, error_pos=3)
        self.assertTrue(full["success"])
        self.assertTrue(full["error_injected"])
        self.assertTrue(full["error_detected"])
        self.assertFalse(full["integrity_match"])
        self.assertNotEqual(full["receiver_sum"], "11111111")

    def test_11_checksum_bit_error_detection(self):
        # Checksum is at positions 17..24. Flip position 20 (inside checksum)
        full = process_checksum("1010100100110101", word_size=8, error_pos=20)
        self.assertTrue(full["success"])
        self.assertTrue(full["error_injected"])
        self.assertTrue(full["error_detected"])
        self.assertFalse(full["integrity_match"])

    def test_12_unaligned_padding(self):
        # 12 bits with word_size=8 -> padded to 16 bits (2 words)
        data_12b = "101010011111"
        sender = calculate_checksum_sender(data_12b, word_size=8)
        self.assertTrue(sender["success"])
        self.assertEqual(sender["padding_bits"], 4)
        self.assertEqual(sender["padded_data"], data_12b + "0000")
        self.assertEqual(sender["num_words"], 2)

    def test_13_invalid_inputs(self):
        # Empty input
        r1 = calculate_checksum_sender("", word_size=8)
        self.assertFalse(r1["success"])

        # Non-binary character
        r2 = calculate_checksum_sender("10102010", word_size=8)
        self.assertFalse(r2["success"])

        # Invalid word size
        r3 = calculate_checksum_sender("10101010", word_size=12)
        self.assertFalse(r3["success"])

    def test_14_full_cycle_clean_and_corrupted(self):
        # Clean
        res_clean = process_checksum("1011001111000011", word_size=8)
        self.assertTrue(res_clean["success"])
        self.assertFalse(res_clean["error_injected"])
        self.assertFalse(res_clean["error_detected"])
        self.assertTrue(res_clean["integrity_match"])

        # Corrupted
        res_err = process_checksum("1011001111000011", word_size=8, error_pos=1)
        self.assertTrue(res_err["success"])
        self.assertTrue(res_err["error_injected"])
        self.assertTrue(res_err["error_detected"])
        self.assertFalse(res_err["integrity_match"])

if __name__ == "__main__":
    unittest.main()
