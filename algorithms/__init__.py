"""
Algorithms Package for Error Detection & Correction Simulator.
This package contains modular implementations for Data Link Layer techniques:
1. Byte/Character Stuffing and De-stuffing
2. Bit Stuffing and De-stuffing
3. Parity Check (1D and 2D)
4. Cyclic Redundancy Check (CRC)
5. Hamming Code (Encoding and Error Correction)
6. Hamming Distance Calculation
"""

from .byte_stuffing import process_byte_stuffing
from .bit_stuffing import process_bit_stuffing
from .parity import process_parity
from .crc import process_crc
from .hamming import process_hamming
from .hamming_distance import process_hamming_distance

__all__ = [
    "process_byte_stuffing",
    "process_bit_stuffing",
    "process_parity",
    "process_crc",
    "process_hamming",
    "process_hamming_distance",
]
