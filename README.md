# 🔬 Error Detection & Correction Simulator

[![License: MIT](https://img.shields.io/badge/License-MIT-teal.svg)](LICENSE)
[![Python 3.8+](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://www.python.org/)
[![Tests Passing](https://img.shields.io/badge/Tests-95%20Passed-emerald.svg)](#-test-coverage)

> **Interactive Data Link Layer Laboratory Platform**
> A full-featured, academically accurate simulation environment for 7 core networking algorithms — designed for Data Communication coursework, lab presentations, and engineering portfolios.

---

## ✨ Run Locally

```
python app.py
# Open → http://127.0.0.1:5000
```

---

## 🧩 7 Simulation Modules

| # | Module | Category | Key Feature |
|---|---|---|---|
| 1 | **Byte Stuffing** | Framing | FLAG/ESC character-oriented framing |
| 2 | **Bit Stuffing** | Framing | Dynamic N-threshold zero insertion |
| 3 | **Parity Check** | Error Detection | 1D & 2D matrix with crosshair error pinpointing |
| 4 | **Internet Checksum** | Error Detection | RFC 1071 · 8-bit/16-bit · End-Around Carry |
| 5 | **CRC** | Error Detection | Modulo-2 XOR polynomial division |
| 6 | **Hamming Code** | Error Correction | Dynamic (n,k) SEC · Auto-syndrome correction |
| 7 | **Hamming Distance** | Theory | d_min, detectable (s) and correctable (t) errors |

---

## 🎓 Academic & Advanced Features

- **Step-by-Step Mathematical Proof** — Every algorithm displays a rigorous calculation trace
- **⚡ Real-World Protocol Presets** — 1-click loading of standards (PPP, HDLC, IPv4 Checksum, ATM CRC-8, RAM ECC Hamming)
- **⚖️ Multi-Technique Comparison Studio** — Side-by-side evaluation of overhead %, detection rate, and error correction across all algorithms
- **🎓 Interactive Lab Quiz Mode** — 10 dynamic calculation questions with instant feedback and step-by-step proofs
- **📄 Formal University Lab Assignment Report Exporter** — Generates official academic lab assignment sheets with student credentials, waveforms, and instructor sign-off
- **📋 Result & Step Copying** — 1-click copy of results and full mathematical steps to clipboard
- **🖨️ Clean Print Engine** — Optimized print stylesheet for academic lab submission
- **Digital Signal Waveform** — TTL NRZ-L logic analyzer visualization for every binary module
- **Interactive Error Injection** — Bit-flip, burst error, and random noise injection
- **Live Telemetry HUD** — Real-time transmission pipeline state monitoring

---

## 🧪 Test Coverage

```
95 Automated Test Cases  ·  8 Test Suites  ·  100% Pass Rate
```

| Test Suite | Tests |
|---|---|
| `test_byte_stuffing.py` | 10 |
| `test_bit_stuffing.py` | 8 |
| `test_parity.py` | 12 |
| `test_checksum.py` | 14 |
| `test_crc.py` | 16 |
| `test_hamming.py` | 12 |
| `test_hamming_distance.py` | 15 |
| `test_qa_audit.py` | 8 (E2E via Flask test client) |

---

## 🏗️ Project Architecture

```
Error Detection & Correction Simulator/
│
├── app.py                      # Flask application & /api/process endpoint
│
├── algorithms/
│   ├── __init__.py
│   ├── byte_stuffing.py
│   ├── bit_stuffing.py
│   ├── parity.py
│   ├── checksum.py             # RFC 1071 Internet Checksum (8/16-bit)
│   ├── crc.py
│   ├── hamming.py              # Dynamic Hamming (n,k) SEC
│   └── hamming_distance.py
│
├── templates/
│   └── index.html              # Single-page application shell
│
├── static/
│   ├── css/style.css           # Dark glassmorphism design system + print CSS
│   └── js/app.js               # Frontend logic, renderers, waveform engine
│
└── test_*.py                   # 95 automated test cases
```

---

## ⚙️ Setup

```bash
git clone https://github.com/ekraislam/error-detection-correction-simulator.git
cd error-detection-correction-simulator
pip install flask
python app.py
```

**Requirements:** Python 3.8+ · Flask

---

## 🎨 Design

- Dark Glassmorphism theme · Cyan / Teal / Emerald accent palette
- Google Fonts — Inter (UI) + Fira Code (monospace)
- Print-optimized `@media print` for clean lab sheet export

---

## 👨‍💻 Author

**Ekra Islam Ohi** — Data Communication & Networking Laboratory Project  
*Built with academic precision for educational excellence.*

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for full details.

---

*EDC Simulator v2.0 · 2026 · Data Link Layer Simulation Platform*
