/**
 * EDC SIMULATOR v2.0 — Educational Networking Laboratory
 * Manages: background canvas, technique selection, dynamic forms,
 * interactive bit-grid error injector, visualizations, telemetry HUD.
 */

document.addEventListener('DOMContentLoaded', () => {

    // ═══════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════
    let currentTechnique = 'byte_stuffing';
    let cleanEncodedBits = '';   // The clean encoded bitstream after a run
    let corruptedBits    = '';   // Current (possibly flipped) bitstream
    let lastTransmittedText = ''; // Clean transmitted frame text (for non-binary modules like Byte Stuffing)
    let lastInputDataForFrame = ''; // Input data used to generate the transmitted frame
    let lastFlagForFrame = '';     // Flag used to generate the transmitted frame
    let lastEscForFrame = '';      // Esc used to generate the transmitted frame
    let lastBitTransmittedFrame = ''; // Clean transmitted frame for Bit Stuffing
    let lastBitInputData = '';        // Payload used to generate bit frame
    let lastBitFlagPattern = '';      // Flag pattern used to generate bit frame
    let cachedParityPositions = [];   // 1-indexed parity positions for bit grid
    let flippedPositions = new Set(); // 0-based indices of flipped bits

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // ═══════════════════════════════════════════════════════════
    // TOAST NOTIFICATION SYSTEM
    // ═══════════════════════════════════════════════════════════
    const TOAST_ICONS = {
        success: '<i class="fa-solid fa-circle-check toast-icon"></i>',
        warning: '<i class="fa-solid fa-triangle-exclamation toast-icon"></i>',
        error:   '<i class="fa-solid fa-circle-xmark toast-icon"></i>',
        info:    '<i class="fa-solid fa-circle-info toast-icon"></i>'
    };

    function showToast(message, type = 'info', duration = 3500) {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast-notification toast-${type}`;
        toast.innerHTML = `${TOAST_ICONS[type] || TOAST_ICONS.info}<span class="toast-msg">${message}</span>`;
        container.appendChild(toast);

        // Auto-dismiss
        setTimeout(() => {
            toast.classList.add('toast-hide');
            toast.addEventListener('animationend', () => toast.remove(), { once: true });
        }, duration);
    }

    function computeGenericByteStuffing(data, flag, esc) {
        if (!data || !flag || !esc || flag === esc) return '';
        let stuffed = '';
        for (let i = 0; i < data.length; i++) {
            const ch = data[i];
            if (ch === flag) {
                stuffed += esc + flag;
            } else if (ch === esc) {
                stuffed += esc + esc;
            } else {
                stuffed += ch;
            }
        }
        return flag + stuffed + flag;
    }

    function computeGenericBitStuffing(data, flagPattern) {
        if (!data || !flagPattern) return '';
        const raw = String(data).replace(/\s+/g, '');
        const flag = String(flagPattern).replace(/\s+/g, '');
        for (let i = 0; i < raw.length; i++) {
            if (raw[i] !== '0' && raw[i] !== '1') return '';
        }
        for (let i = 0; i < flag.length; i++) {
            if (flag[i] !== '0' && flag[i] !== '1') return '';
        }
        const flagOnes = (flag.match(/1/g) || []).length;
        const threshold = Math.max(flagOnes - 1, 1);
        let stuffed = '';
        let consecutiveOnes = 0;
        for (let i = 0; i < raw.length; i++) {
            const bit = raw[i];
            if (bit === '1') {
                stuffed += '1';
                consecutiveOnes++;
                if (consecutiveOnes === threshold) {
                    stuffed += '0';
                    consecutiveOnes = 0;
                }
            } else {
                stuffed += '0';
                consecutiveOnes = 0;
            }
        }
        return flag + stuffed + flag;
    }

    // ═══════════════════════════════════════════════════════════
    // DOM REFERENCES
    // ═══════════════════════════════════════════════════════════
    const navItems              = document.querySelectorAll('.nav-item');
    const techniqueCards        = document.querySelectorAll('.technique-card');
    const sidebarDrawer         = document.getElementById('sidebar-drawer');
    const mobileMenuBtn         = document.getElementById('mobile-menu-btn');
    const sidebarOverlay        = document.getElementById('sidebar-overlay');

    const activeTechniqueTag    = document.getElementById('active-technique-tag');
    const activeTechniqueTitle  = document.getElementById('active-technique-title');
    const topHeaderTechBadge    = document.getElementById('top-header-tech-badge');

    const primaryInput          = document.getElementById('primary-input');
    const primaryInputLabel     = document.getElementById('primary-input-label');
    const primaryInputHint      = document.getElementById('primary-input-hint');
    const dynamicParamsContainer = document.getElementById('dynamic-params-container');

    const enableErrorToggle     = document.getElementById('enable-error-toggle');
    const errorControlsWrapper  = document.getElementById('error-controls-wrapper');

    // New error injector elements
    const btnFlipOne            = document.getElementById('btn-flip-one');
    const btnRandomErr          = document.getElementById('btn-random-err');
    const btnBurstErr           = document.getElementById('btn-burst-err');
    const btnResetErr           = document.getElementById('btn-reset-err');
    const bitGridContainer      = document.getElementById('bit-grid-container');
    const interactiveBitGrid    = document.getElementById('interactive-bit-grid');
    const bitDiffDisplay        = document.getElementById('bit-diff-display');
    const diffOriginal          = document.getElementById('diff-original');
    const diffCorrupted         = document.getElementById('diff-corrupted');
    const textErrorContainer    = document.getElementById('text-error-container');
    const errorInputField       = document.getElementById('error-input-field');

    const processBtn            = document.getElementById('process-btn');
    const resetBtn              = document.getElementById('reset-btn');

    const resultStatusIndicator = document.getElementById('result-status-indicator');
    const outputEncoded         = document.getElementById('output-encoded');
    const outputReceived        = document.getElementById('output-received');
    const outputDecoded         = document.getElementById('output-decoded');
    const chipsEncoded          = document.getElementById('chips-encoded');
    const chipsReceived         = document.getElementById('chips-received');
    const chipsDecoded          = document.getElementById('chips-decoded');
    const stepByStepDisplay     = document.getElementById('step-by-step-display');

    // Quick Switcher & Collapsible HUD
    const quickSwitcherPills    = document.querySelectorAll('.qs-pill');
    const btnShowOverviewGrid   = document.getElementById('btn-show-overview-grid');
    const btnHudCollapse        = document.getElementById('btn-hud-collapse');
    const hudCollapseIcon       = document.getElementById('hud-collapse-icon');
    const studioRightCol        = document.getElementById('studio-right-col');
    const studioGridContainer   = document.getElementById('studio-grid-container');

    // Pipeline steps & playback controls
    const btnPipeStep           = document.getElementById('btn-pipe-step');
    const btnPipePlay           = document.getElementById('btn-pipe-play');
    const btnPipeReset          = document.getElementById('btn-pipe-reset');
    const pipeStageDesc         = document.getElementById('pipe-stage-desc');

    const pipeNodes = {
        source:  document.getElementById('pipe-source'),
        encoder: document.getElementById('pipe-encoder'),
        channel: document.getElementById('pipe-channel'),
        noise:   document.getElementById('pipe-noise'),
        decoder: document.getElementById('pipe-decoder'),
        verify:  document.getElementById('pipe-verify'),
    };

    // Telemetry HUD
    const tModule      = document.getElementById('t-module');
    const tSize        = document.getElementById('t-size');
    const tEncodedOut  = document.getElementById('t-encoded-out');
    const tErrorPos    = document.getElementById('t-error-pos');
    const tCorrection  = document.getElementById('t-correction');
    const tChannel     = document.getElementById('t-channel');
    const tLatency     = document.getElementById('t-latency');
    const hudTheoryBody = document.getElementById('hud-theory-body');

    // ═══════════════════════════════════════════════════════════
    // BACKGROUND CANVAS
    // ═══════════════════════════════════════════════════════════
    initBackgroundCanvas();

    function initBackgroundCanvas() {
        const canvas = document.getElementById('bg-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let width = canvas.width = window.innerWidth;
        let height = canvas.height = window.innerHeight;

        window.addEventListener('resize', () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        });

        const particles = [];
        const numParticles = Math.floor(width / 30);
        for (let i = 0; i < numParticles; i++) {
            particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                speed: 0.4 + Math.random() * 1.2,
                char: Math.random() > 0.5 ? '1' : '0',
                opacity: 0.08 + Math.random() * 0.3
            });
        }

        function draw() {
            ctx.clearRect(0, 0, width, height);
            ctx.font = '11px "Fira Code", monospace';
            particles.forEach(p => {
                ctx.fillStyle = `rgba(34, 211, 238, ${p.opacity})`;
                ctx.fillText(p.char, p.x, p.y);
                p.y += p.speed;
                if (p.y > height) {
                    p.y = 0;
                    p.x = Math.random() * width;
                    p.char = Math.random() > 0.5 ? '1' : '0';
                }
            });
            requestAnimationFrame(draw);
        }
        draw();
    }

    // ═══════════════════════════════════════════════════════════
    // INTERACTIVE LAB QUIZ QUESTION BANK
    // ═══════════════════════════════════════════════════════════
    const QUIZ_QUESTION_BANK = [
        {
            category: 'Byte Stuffing',
            difficulty: 'EASY',
            prompt: 'In Byte Stuffing with FLAG = <code>"F"</code> and ESC = <code>"E"</code>, what is the transmitted frame for payload <code>"AFEFB"</code>?',
            options: [
                'F A E F E E B F',
                'F A E E F B F',
                'F A F E B F',
                'A E F E E B'
            ],
            correct: 0,
            explanation: 'Any occurrence of FLAG (<code>"F"</code>) or ESC (<code>"E"</code>) inside the payload must be preceded by an ESC byte (<code>"E"</code>). The frame is also wrapped with FLAG at both ends: <code>F + A + (EF) + (EE) + B + F</code> = <code>F A E F E E B F</code>.'
        },
        {
            category: 'Bit Stuffing',
            difficulty: 'EASY',
            prompt: 'In HDLC Bit Stuffing (FLAG = <code>01111110</code>), a <code>0</code> is stuffed after how many consecutive <code>1</code>s in the payload?',
            options: [
                'After every 4 consecutive 1s',
                'After every 5 consecutive 1s',
                'After every 6 consecutive 1s',
                'Only at the end of the frame'
            ],
            correct: 1,
            explanation: 'To prevent user payload data from accidentally mimicking the 6-consecutive-one delimiter FLAG (<code>01111110</code>), the transmitter unconditionally stuffs a <code>0</code> bit after every 5 consecutive <code>1</code>s.'
        },
        {
            category: '1D Parity Check',
            difficulty: 'EASY',
            prompt: 'For binary data <code>1011001</code>, what is the Even Parity bit and the final transmitted codeword?',
            options: [
                'Parity = 0, Codeword = 10110010',
                'Parity = 1, Codeword = 10110011',
                'Parity = 1, Codeword = 11011001',
                'Parity = 0, Codeword = 01011001'
            ],
            correct: 0,
            explanation: 'Data <code>1011001</code> has four 1s (an even count). Under Even Parity, the total number of 1s must remain even, so the parity bit is <code>0</code>, giving codeword <code>10110010</code>.'
        },
        {
            category: '2D Block Parity',
            difficulty: 'MEDIUM',
            prompt: 'In a 2D Parity Matrix, if Row 2 and Column 3 both indicate parity failure at the receiver, what can be deduced?',
            options: [
                'A burst of 5 errors occurred',
                'A single-bit error is pinpointed exactly at (Row 2, Column 3)',
                'The frame must be discarded with no error localization',
                'The entire Row 2 is corrupted'
            ],
            correct: 1,
            explanation: '2D Block Parity calculates row-wise and column-wise parities. The intersection of the faulty row and faulty column uniquely pinpoints the single flipped bit coordinate, allowing 1-bit auto-correction.'
        },
        {
            category: 'Internet Checksum',
            difficulty: 'MEDIUM',
            prompt: 'In RFC 1071 Internet Checksum, how is the final transmitted checksum field generated from the 16-bit 1\'s complement sum?',
            options: [
                'By taking the 2\'s complement of the sum',
                'By bitwise NOT (1\'s complement negation: ~Sum)',
                'By multiplying the sum by polynomial x^4 + 1',
                'By calculating the modulo-2 remainder'
            ],
            correct: 1,
            explanation: 'The sender adds all 16-bit words using 1\'s complement addition (with end-around carry) and then takes the bitwise NOT (<code>~SUM</code>) to produce the checksum field.'
        },
        {
            category: 'CRC Modulo-2',
            difficulty: 'HARD',
            prompt: 'Given data <code>100100</code> and Generator Polynomial <code>G(x) = 1101</code>, what is the CRC remainder (FCS)?',
            options: [
                '001',
                '010',
                '110',
                '000'
            ],
            correct: 0,
            explanation: 'Append 3 zeros: <code>100100000</code>. Modulo-2 binary division by <code>1101</code> yields quotient <code>111101</code> and remainder <code>001</code>. The transmitted codeword is <code>100100001</code>.'
        },
        {
            category: 'Hamming Code (7,4)',
            difficulty: 'MEDIUM',
            prompt: 'In a standard Hamming (7,4) code with 1-based indexing, which bit positions are reserved for parity bits (redundancy)?',
            options: [
                'Positions 1, 2, 4 (Powers of 2: 2^0, 2^1, 2^2)',
                'Positions 1, 3, 5, 7 (Odd positions)',
                'Positions 5, 6, 7 (Upper bits)',
                'Positions 2, 4, 6 (Even positions)'
            ],
            correct: 0,
            explanation: 'In Hamming codes, parity bits are placed strictly at positions that are powers of 2 (i.e. 1, 2, 4, 8, etc.), so each data bit position can be uniquely addressed by a sum of powers of 2.'
        },
        {
            category: 'Hamming Auto-Correction',
            difficulty: 'HARD',
            prompt: 'Receiver gets Hamming (7,4) codeword <code>1010001</code> with Even Parity. Syndrome calculation gives S = (P4, P2, P1) = <code>011</code> (binary 3). What action is taken?',
            options: [
                'Bit at position 3 is flipped from 0 to 1 (Error auto-corrected)',
                'Discard frame because Hamming code cannot correct errors',
                'Bit at position 7 is flipped',
                'Request automatic frame retransmission (ARQ)'
            ],
            correct: 0,
            explanation: 'Syndrome S = 011_2 = 3_10. This directly identifies bit position 3 as erroneous. Inverting position 3 corrects the codeword back to <code>1010101</code>.'
        },
        {
            category: 'Hamming Distance',
            difficulty: 'EASY',
            prompt: 'What is the Hamming distance between codewords <code>c1 = 101101</code> and <code>c2 = 100111</code>?',
            options: [
                'd(c1, c2) = 2',
                'd(c1, c2) = 1',
                'd(c1, c2) = 3',
                'd(c1, c2) = 0'
            ],
            correct: 0,
            explanation: 'XOR: <code>101101 ⊕ 100111 = 001010</code>. The number of 1s in the XOR result is 2 (positions 3 and 5 differ), so the Hamming distance is 2.'
        },
        {
            category: 'Coding Theory (d_min)',
            difficulty: 'HARD',
            prompt: 'If a coding scheme has a minimum Hamming distance of d_min = 5, what is the maximum number of errors it can detect (s) and correct (t)?',
            options: [
                'Detects s = 4 errors, Corrects t = 2 errors',
                'Detects s = 5 errors, Corrects t = 5 errors',
                'Detects s = 2 errors, Corrects t = 4 errors',
                'Detects s = 3 errors, Corrects t = 1 error'
            ],
            correct: 0,
            explanation: 'Fundamental coding theorems: Detection capability s = d_min - 1 = 5 - 1 = 4. Correction capability t = floor((d_min - 1) / 2) = floor(4/2) = 2.'
        }
    ];

    // Quiz State
    let currentQuizIndex = 0;
    let quizScore = 0;
    let quizTotalAnswered = 0;
    let quizCurrentStreak = 0;
    let selectedQuizOption = null;
    let quizAnswered = false;

    function renderCurrentQuizQuestion() {
        const q = QUIZ_QUESTION_BANK[currentQuizIndex];
        if (!q) return;

        const qNumEl = document.getElementById('quiz-q-num');
        const catEl  = document.getElementById('quiz-category-tag');
        const diffEl = document.getElementById('quiz-difficulty-tag');
        const promptEl = document.getElementById('quiz-prompt-text');
        const optionsEl = document.getElementById('quiz-options-container');
        const expBox = document.getElementById('quiz-explanation-box');
        const btnSubmit = document.getElementById('btn-submit-quiz-answer');
        const btnNext = document.getElementById('btn-next-quiz-question');

        if (qNumEl) qNumEl.textContent = `Question ${currentQuizIndex + 1} of ${QUIZ_QUESTION_BANK.length}`;
        if (catEl)  catEl.textContent  = q.category;
        if (diffEl) diffEl.textContent = q.difficulty;
        if (promptEl) promptEl.innerHTML = q.prompt;

        selectedQuizOption = null;
        quizAnswered = false;
        if (expBox) expBox.style.display = 'none';
        if (btnSubmit) {
            btnSubmit.style.display = 'inline-flex';
            btnSubmit.disabled = true;
        }
        if (btnNext) btnNext.style.display = 'none';

        if (optionsEl) {
            optionsEl.innerHTML = '';
            const letters = ['A', 'B', 'C', 'D'];
            q.options.forEach((optText, idx) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'quiz-option-btn';
                btn.innerHTML = `<span class="quiz-opt-letter">${letters[idx]}</span> <span class="quiz-opt-text">${optText}</span>`;
                btn.addEventListener('click', () => {
                    if (quizAnswered) return;
                    document.querySelectorAll('.quiz-option-btn').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    selectedQuizOption = idx;
                    if (btnSubmit) btnSubmit.disabled = false;
                });
                optionsEl.appendChild(btn);
            });
        }
        updateQuizStatsDisplay();
    }

    function submitQuizAnswer() {
        if (selectedQuizOption === null || quizAnswered) return;
        quizAnswered = true;
        quizTotalAnswered++;

        const q = QUIZ_QUESTION_BANK[currentQuizIndex];
        const isCorrect = (selectedQuizOption === q.correct);
        const options = document.querySelectorAll('.quiz-option-btn');

        options.forEach((btn, idx) => {
            btn.disabled = true;
            if (idx === q.correct) {
                btn.classList.add('correct');
            } else if (idx === selectedQuizOption && !isCorrect) {
                btn.classList.add('wrong');
            }
        });

        if (isCorrect) {
            quizScore++;
            quizCurrentStreak++;
            showToast('Correct! Great job! 🎉', 'success', 2000);
        } else {
            quizCurrentStreak = 0;
            showToast('Incorrect. Review the solution below.', 'warning', 2500);
        }

        const expBox = document.getElementById('quiz-explanation-box');
        const expContent = document.getElementById('quiz-exp-content');
        if (expBox && expContent) {
            expContent.innerHTML = q.explanation;
            expBox.style.display = 'block';
        }

        const btnSubmit = document.getElementById('btn-submit-quiz-answer');
        const btnNext   = document.getElementById('btn-next-quiz-question');
        if (btnSubmit) btnSubmit.style.display = 'none';
        if (btnNext)   btnNext.style.display   = 'inline-flex';

        updateQuizStatsDisplay();
    }

    function nextQuizQuestion() {
        currentQuizIndex = (currentQuizIndex + 1) % QUIZ_QUESTION_BANK.length;
        renderCurrentQuizQuestion();
    }

    function restartQuiz() {
        currentQuizIndex = 0;
        quizScore = 0;
        quizTotalAnswered = 0;
        quizCurrentStreak = 0;
        renderCurrentQuizQuestion();
        showToast('Quiz session restarted!', 'info', 1800);
    }

    function updateQuizStatsDisplay() {
        const scoreVal = document.getElementById('quiz-score-val');
        const percentVal = document.getElementById('quiz-percent-val');
        const statAnswered = document.getElementById('stat-answered');
        const statCorrect = document.getElementById('stat-correct');
        const statIncorrect = document.getElementById('stat-incorrect');
        const statStreak = document.getElementById('stat-streak');

        const pct = quizTotalAnswered > 0 ? Math.round((quizScore / quizTotalAnswered) * 100) : 0;
        if (scoreVal) scoreVal.textContent = `${quizScore} / ${quizTotalAnswered}`;
        if (percentVal) percentVal.textContent = `(${pct}%)`;
        if (statAnswered) statAnswered.textContent = quizTotalAnswered;
        if (statCorrect) statCorrect.textContent = quizScore;
        if (statIncorrect) statIncorrect.textContent = (quizTotalAnswered - quizScore);
        if (statStreak) statStreak.textContent = `🔥 ${quizCurrentStreak}`;
    }

    // ═══════════════════════════════════════════════════════════
    // PROTOCOL PRESET LIBRARY (Real-World Standards)
    // ═══════════════════════════════════════════════════════════
    const PROTOCOL_PRESETS = {
        byte_stuffing: [
            { label: 'Point-to-Point (PPP)', data: 'ABCFE', flag: 'F', esc: 'E' },
            { label: 'Escape Burst', data: 'EEEFFF', flag: 'F', esc: 'E' },
            { label: 'Custom Protocol', data: 'HELLO$WORLD', flag: '$', esc: '/' }
        ],
        bit_stuffing: [
            { label: 'HDLC (01111110)', data: '01111110111110', flag_pattern: '01111110' },
            { label: '1s Burst (Stress Test)', data: '111111111111', flag_pattern: '01111110' },
            { label: 'Clean Payload', data: '101010101010', flag_pattern: '01111110' }
        ],
        parity: [
            { label: "ASCII 'A' (1D Even)", data: '1000001', mode: '1D', scheme: 'even' },
            { label: "ASCII 'B' (1D Odd)", data: '1000010', mode: '1D', scheme: 'odd' },
            { label: '2D 4×4 Block Parity', data: '1011001011001001', mode: '2D', scheme: 'even', columns: 4 }
        ],
        checksum: [
            { label: 'IPv4 Header (8-bit)', data: '1010100100110101', word_size: 8 },
            { label: 'UDP Word (16-bit)', data: '11001100101010101111000000001111', word_size: 16 },
            { label: 'Unaligned (12-bit)', data: '101010011111', word_size: 8 }
        ],
        crc: [
            { label: 'CRC-3 (GSM)', data: '100100', generator: '1101' },
            { label: 'CRC-4 (ITU-T G.704)', data: '1101011011', generator: '10011' },
            { label: 'CRC-8 (ATM Header)', data: '101100101001', generator: '100000111' }
        ],
        hamming: [
            { label: 'Hamming (7,4) Standard', data: '1011', parity: 'even' },
            { label: 'Hamming (12,8) RAM ECC', data: '10110010', parity: 'even' },
            { label: 'Hamming (15,11) High-Rate', data: '10110010110', parity: 'even' }
        ],
        hamming_distance: [
            { label: 'Pairwise Distance (d=2)', mode: 'two', c1: '101101', c2: '100111' },
            { label: '4-Codeword Metric Space (d_min=1)', mode: 'multi', list: '101101, 100111, 111101, 001101' },
            { label: 'Orthogonal Codes (d=4)', mode: 'two', c1: '0000', c2: '1111' }
        ]
    };

    function renderPresetsForTechnique(techKey) {
        const bar = document.getElementById('presets-pills-bar');
        const section = document.getElementById('presets-section');
        if (!bar || !section) return;

        const presets = PROTOCOL_PRESETS[techKey];
        if (!presets || !presets.length) {
            section.style.display = 'none';
            return;
        }

        section.style.display = 'block';
        bar.innerHTML = '';
        presets.forEach(p => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'preset-pill-btn';
            btn.innerHTML = `<i class="fa-solid fa-play" style="font-size:0.6rem;"></i> ${escapeHtml(p.label)}`;
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                applyPreset(techKey, p);
            });
            bar.appendChild(btn);
        });
    }

    function applyPreset(techKey, p) {
        if (p.data && primaryInput) primaryInput.value = p.data;
        if (techKey === 'byte_stuffing') {
            if (p.flag && document.getElementById('param-flag')) document.getElementById('param-flag').value = p.flag;
            if (p.esc  && document.getElementById('param-esc'))  document.getElementById('param-esc').value  = p.esc;
        } else if (techKey === 'bit_stuffing') {
            if (p.flag_pattern && document.getElementById('param-flag-pattern')) document.getElementById('param-flag-pattern').value = p.flag_pattern;
        } else if (techKey === 'parity') {
            if (p.mode) {
                const modeSelect = document.getElementById('param-parity-mode');
                if (modeSelect) {
                    modeSelect.value = p.mode;
                    modeSelect.dispatchEvent(new Event('change'));
                }
            }
            if (p.scheme && document.getElementById('param-parity-scheme')) document.getElementById('param-parity-scheme').value = p.scheme;
            if (p.columns && document.getElementById('param-columns')) document.getElementById('param-columns').value = p.columns;
        } else if (techKey === 'checksum') {
            if (p.word_size && document.getElementById('param-word-size')) document.getElementById('param-word-size').value = p.word_size;
        } else if (techKey === 'crc') {
            if (p.generator && document.getElementById('param-generator')) document.getElementById('param-generator').value = p.generator;
        } else if (techKey === 'hamming') {
            if (p.parity && document.getElementById('param-hamming-parity')) document.getElementById('param-hamming-parity').value = p.parity;
        } else if (techKey === 'hamming_distance') {
            if (p.mode) {
                const mSelect = document.getElementById('param-hdist-mode');
                if (mSelect) {
                    mSelect.value = p.mode;
                    mSelect.dispatchEvent(new Event('change'));
                }
            }
            if (p.c1 && primaryInput) primaryInput.value = p.c1;
            if (p.c2 && document.getElementById('param-codeword2')) document.getElementById('param-codeword2').value = p.c2;
            if (p.list && document.getElementById('param-codewords-list')) document.getElementById('param-codewords-list').value = p.list;
        }
        showToast(`Loaded Preset: ${p.label}`, 'info', 1800);
        processSimulatorData('full_cycle');
    }

    // ═══════════════════════════════════════════════════════════
    // TECHNIQUE CONFIG MAP
    // ═══════════════════════════════════════════════════════════
    const techniqueConfigs = {
        byte_stuffing: {
            name: 'Byte Stuffing',
            title: 'Byte Stuffing Simulator',
            inputLabel: 'Original Data Payload',
            placeholder: 'e.g. ABCFE',
            defaultValue: 'ABCFE',
            hint: 'Enter data string containing payload bytes.',
            binaryModule: false,
            hasErrorInjector: false,
            theory: 'Byte Stuffing inserts an ESC character before any FLAG or ESC byte in the payload, so the receiver can distinguish delimiters from data. The frame is wrapped with FLAG...FLAG.',
            paramsHtml: `
                <div class="form-group">
                    <label for="param-flag">FLAG Identifier</label>
                    <input type="text" id="param-flag" class="form-control code-input" value="F" placeholder="e.g. F, #, A">
                    <small class="form-hint">Frame delimiter (default 'F')</small>
                </div>
                <div class="form-group">
                    <label for="param-esc">Escape (ESC) Byte</label>
                    <input type="text" id="param-esc" class="form-control code-input" value="E" placeholder="e.g. E, \\, X">
                    <small class="form-hint">Escape character (default 'E')</small>
                </div>
                <div class="form-group" style="grid-column: span 2; display: flex; gap: 10px; margin-top: 4px;">
                    <button type="button" class="btn btn-sm btn-primary" id="btn-stuff-only">
                        <i class="fa-solid fa-file-export"></i> Stuff Data
                    </button>
                    <button type="button" class="btn btn-sm btn-accent" id="btn-destuff-only">
                        <i class="fa-solid fa-file-import"></i> De-stuff Frame
                    </button>
                </div>
            `
        },
        bit_stuffing: {
            name: 'Bit Stuffing',
            title: 'Bit Stuffing Simulator',
            inputLabel: 'Binary Data Payload',
            placeholder: 'e.g. 111110',
            defaultValue: '111110',
            hint: "Enter binary ('0' and '1's). A '0' is dynamically stuffed after every (N-1) consecutive '1's (where N = number of 1s in FLAG).",
            binaryModule: true,
            hasErrorInjector: false,
            theory: "Stuffing threshold is calculated dynamically as (N - 1), where N is the total number of '1's in the Delimiter FLAG. Whenever the data contains (N - 1) consecutive '1's, a '0' is inserted immediately AFTER them. De-stuffing removes the stuffed '0' after every (N - 1) consecutive '1's.",
            paramsHtml: `
                <div class="form-group" style="grid-column: span 2;">
                    <label for="param-flag-pattern">Delimiter Flag Pattern</label>
                    <input type="text" id="param-flag-pattern" class="form-control code-input" value="01111110" placeholder="e.g. 01111110">
                    <small class="form-hint">8-bit framing flag delimiter (default '01111110')</small>
                </div>
                <div class="form-group" style="grid-column: span 2; display: flex; gap: 10px; margin-top: 4px;">
                    <button type="button" class="btn btn-sm btn-primary" id="btn-bit-stuff-only">
                        <i class="fa-solid fa-file-export"></i> Stuff Data
                    </button>
                    <button type="button" class="btn btn-sm btn-accent" id="btn-bit-destuff-only">
                        <i class="fa-solid fa-file-import"></i> De-stuff Frame
                    </button>
                </div>
            `
        },
        parity: {
            name: 'Parity Check',
            title: 'Parity Check Simulator',
            inputLabel: 'Binary Payload Data',
            placeholder: 'e.g. 1011001',
            defaultValue: '1011001',
            hint: "Enter binary payload ('0' and '1's).",
            binaryModule: true,
            hasErrorInjector: false,
            theory: '1D Parity appends one bit to make the total number of 1s even (or odd). 2D Block Parity arranges bits into a matrix and computes row, column, and corner parity bits to verify block integrity.',
            paramsHtml: `
                <div class="form-group">
                    <label for="param-parity-mode">Parity Dimension</label>
                    <select id="param-parity-mode" class="form-control">
                        <option value="1D" selected>1D Simple Parity Bit</option>
                        <option value="2D">2D Block Matrix Parity</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="param-parity-type">Parity Scheme</label>
                    <select id="param-parity-type" class="form-control">
                        <option value="even" selected>Even Parity</option>
                        <option value="odd">Odd Parity</option>
                    </select>
                </div>
                <div class="form-group" id="param-columns-group" style="grid-column: span 2; display: none;">
                    <label for="param-columns">2D Matrix Columns</label>
                    <input type="number" id="param-columns" class="form-control" value="4" min="1" max="16">
                    <small class="form-hint">Number of columns for 2D block</small>
                </div>
                <div class="form-group" id="param-1d-error-group" style="grid-column: span 2;">
                    <label for="param-error-pos">1D Bit Flip Position (1-indexed)</label>
                    <input type="number" id="param-error-pos" class="form-control code-input" placeholder="e.g. 3 (leave empty for clean codeword)" min="1" step="1">
                    <small class="form-hint" id="param-error-pos-hint">Optional: Enter 1-based index (1 to N) to flip a bit in transmitted codeword</small>
                </div>
                <div class="form-group" id="param-2d-error-group" style="grid-column: span 2; display: none;">
                    <label style="font-weight: 700; margin-bottom: 6px; display: block;">2D Bit Flip Position (1-indexed)</label>
                    <div style="display: flex; gap: 12px;">
                        <div style="flex: 1;">
                            <label for="param-error-row" style="font-size: 0.82rem; color: var(--text-secondary); margin-bottom: 4px;">Row (1-indexed)</label>
                            <input type="number" id="param-error-row" class="form-control code-input" placeholder="e.g. 2" min="1" step="1">
                        </div>
                        <div style="flex: 1;">
                            <label for="param-error-col" style="font-size: 0.82rem; color: var(--text-secondary); margin-bottom: 4px;">Column (1-indexed)</label>
                            <input type="number" id="param-error-col" class="form-control code-input" placeholder="e.g. 3" min="1" step="1">
                        </div>
                    </div>
                    <small class="form-hint" id="param-2d-error-hint">Optional: Specify 1-based Row and Column to flip a bit in the matrix</small>
                </div>
                <div class="form-group" style="grid-column: span 2; font-size:0.78rem; color:var(--text-muted); background:var(--bg-surface); padding:9px 12px; border-radius:7px; border-left:3px solid var(--accent-cyan);">
                    <i class="fa-solid fa-circle-info" style="color:var(--accent-cyan);"></i>
                    1D parity computes a single parity bit. 2D parity constructs a matrix with row, column, and corner parities.
                </div>
            `
        },
        checksum: {
            name: 'Internet Checksum',
            title: 'Internet Checksum Simulator',
            inputLabel: 'Binary Data Payload',
            placeholder: 'e.g. 1010100100110101',
            defaultValue: '1010100100110101',
            hint: "Enter binary string ('0' and '1's). Divided into 8-bit or 16-bit words for 1's complement addition.",
            binaryModule: true,
            hasErrorInjector: true,
            theory: "Internet Checksum (RFC 1071) divides payload into k-bit words (8-bit or 16-bit) and performs 1's complement addition. Whenever a carry out of MSB occurs, it wraps around (End-Around Carry) and is added to LSB. The final sum is inverted (1's complement) to produce the Checksum. The receiver sums all received words PLUS the checksum — an all-1s sum (inverted = 0) confirms error-free transmission.",
            paramsHtml: `
                <div class="form-group" style="grid-column: span 2;">
                    <label>Quick Presets</label>
                    <div class="hamming-preset-bar">
                        <button type="button" class="preset-btn active-preset" id="preset-chk-8b2w" data-val="1010100100110101" data-w="8">8-bit (2 Words)</button>
                        <button type="button" class="preset-btn" id="preset-chk-8b3w" data-val="101010010011010111001100" data-w="8">8-bit (3 Words)</button>
                        <button type="button" class="preset-btn" id="preset-chk-16b2w" data-val="10000000100000000000000100000001" data-w="16">16-bit (2 Words)</button>
                    </div>
                </div>
                <div class="form-group">
                    <label for="param-word-size">Word Size</label>
                    <select id="param-word-size" class="form-control">
                        <option value="8" selected>8-bit Words (Octets)</option>
                        <option value="16">16-bit Words (Standard Internet)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="param-error-pos">Codeword Bit Flip Position (1-indexed)</label>
                    <input type="number" id="param-error-pos" class="form-control code-input" placeholder="e.g. 5" min="1" step="1">
                    <small class="form-hint" id="param-error-pos-hint">Optional: Enter 1-based index (1 to N) to flip a bit in transmitted codeword</small>
                </div>
                <div class="form-group" style="grid-column: span 2; font-size:0.78rem; color:var(--text-muted); background:var(--bg-surface); padding:9px 12px; border-radius:7px; border-left:3px solid var(--accent-teal);">
                    <i class="fa-solid fa-calculator" style="color:var(--accent-teal);"></i>
                    Computes 1's complement sum across words with end-around carry and bitwise inversion (~Sum).
                </div>
            `
        },
        crc: {
            name: 'CRC',
            title: 'Cyclic Redundancy Check Simulator',
            inputLabel: 'Binary Data Payload',
            placeholder: 'e.g. 100100',
            defaultValue: '100100',
            hint: "Enter binary payload ('0' and '1's).",
            binaryModule: true,
            hasErrorInjector: true,
            theory: 'CRC appends (degree of polynomial) zeros to the data and divides by the generator polynomial using modulo-2 XOR. The remainder R is transmitted. The receiver divides (data+R) by the polynomial — a zero remainder means no error.',
            paramsHtml: `
                <div class="form-group">
                    <label for="param-crc-poly">Generator Polynomial (Divisor)</label>
                    <input type="text" id="param-crc-poly" class="form-control code-input" value="1101">
                    <small class="form-hint">Must start & end with '1' (e.g. 1101 for CRC-3)</small>
                </div>
                <div class="form-group">
                    <label for="param-error-pos">Codeword Bit Flip Position (1-indexed)</label>
                    <input type="number" id="param-error-pos" class="form-control" placeholder="e.g. 5" min="1">
                </div>
                <div class="form-group" style="grid-column: span 2; display: flex; gap: 10px; margin-top: 4px;">
                    <button type="button" class="btn btn-sm btn-primary" id="btn-crc-encode-only">
                        <i class="fa-solid fa-calculator"></i> Encode CRC
                    </button>
                    <button type="button" class="btn btn-sm btn-accent" id="btn-crc-check-only">
                        <i class="fa-solid fa-check-double"></i> Check Codeword
                    </button>
                </div>
            `
        },
        hamming: {
            name: 'Hamming Code',
            title: 'Hamming Code Simulator',
            inputLabel: 'Data Payload (Any Length)',
            placeholder: 'e.g. 1011',
            defaultValue: '1011',
            hint: 'Enter any binary data payload. Dynamic Hamming(n,k) is auto-detected!',
            binaryModule: true,
            hasErrorInjector: true,
            theory: 'Hamming places parity bits at power-of-two positions (1,2,4,8...). Each parity bit checks a specific subset of positions. The syndrome — binary XOR of failed checks — directly gives the error position for correction.',
            paramsHtml: `
                <div class="form-group" style="grid-column: span 2;">
                    <label>Quick Presets</label>
                    <div class="hamming-preset-bar">
                        <button type="button" class="preset-btn active-preset" id="preset-74"  data-val="1011">Hamming (7,4)</button>
                        <button type="button" class="preset-btn" id="preset-128" data-val="10110010">Hamming (12,8)</button>
                        <button type="button" class="preset-btn" id="preset-1511" data-val="10110010110">Hamming (15,11)</button>
                    </div>
                </div>
                <div class="form-group" style="grid-column: span 2;">
                    <div class="hamming-auto-badge" id="hamming-auto-badge">
                        <span><i class="fa-solid fa-wand-magic-sparkles"></i> <strong>AUTO:</strong> Hamming (7,4)</span>
                        <span style="font-size:0.75rem; opacity:0.9;">Data: 4b | Parity: 3b | Total: 7b</span>
                    </div>
                </div>
                <div class="form-group" style="grid-column: span 2;">
                    <label for="param-hamming-parity">Parity Scheme</label>
                    <select id="param-hamming-parity" class="form-control">
                        <option value="even" selected>Even Parity</option>
                        <option value="odd">Odd Parity</option>
                    </select>
                </div>
                <div class="form-group" style="grid-column: span 2;">
                    <label for="param-error-pos">Codeword Bit Flip Position (1-indexed, Right-to-Left)</label>
                    <input type="number" id="param-error-pos" class="form-control" placeholder="e.g. 3" min="1" max="64">
                    <small class="form-hint">Syndrome will pinpoint and auto-correct the bit!</small>
                </div>
            `
        },
        hamming_distance: {
            name: 'Hamming Distance',
            title: 'Hamming Distance Simulator',
            inputLabel: 'Codeword 1 (Binary)',
            placeholder: 'e.g. 101101',
            defaultValue: '101101',
            hint: 'Equal-length binary codeword string.',
            binaryModule: false,
            hasErrorInjector: false,
            theory: 'd(c₁,c₂) = number of positions where bits differ (XOR then count 1s). For a code with minimum distance dₘᵢₙ: detectable errors s = dₘᵢₙ−1, correctable errors t = ⌊(dₘᵢₙ−1)/2⌋.',
            paramsHtml: `
                <div class="form-group">
                    <label for="param-hdist-mode">Calculation Mode</label>
                    <select id="param-hdist-mode" class="form-control">
                        <option value="pair" selected>Compare Two Codewords</option>
                        <option value="multi">d_min from Multiple Codewords</option>
                    </select>
                </div>
                <div class="form-group" id="param-c2-group">
                    <label for="param-codeword2">Codeword 2 (Binary)</label>
                    <input type="text" id="param-codeword2" class="form-control code-input" value="100111">
                    <small class="form-hint">Must be equal length to Codeword 1.</small>
                </div>
                <div class="form-group" id="param-multi-cw-group" style="grid-column: span 2; display: none;">
                    <label for="param-codewords-list">Codewords Set (comma or line separated)</label>
                    <textarea id="param-codewords-list" class="form-control code-input" rows="3" placeholder="e.g.&#10;101101&#10;100111&#10;111101">101101, 100111, 111101, 001101</textarea>
                    <small class="form-hint">Enter 2 or more equal-length binary codewords.</small>
                </div>
            `
        }
    };

    // ═══════════════════════════════════════════════════════════
    // TECHNIQUE SELECTION
    // ═══════════════════════════════════════════════════════════
    function selectTechnique(techKey) {
        if (sidebarDrawer) sidebarDrawer.classList.remove('open');

        const simPanel  = document.getElementById('simulator-panel');
        const compPanel = document.getElementById('comparison-panel');
        const quizPanel = document.getElementById('quiz-panel');

        if (techKey === 'overview') {
            if (simPanel)  simPanel.style.display  = 'block';
            if (compPanel) compPanel.style.display = 'none';
            if (quizPanel) quizPanel.style.display = 'none';
            document.getElementById('overview-cards')?.scrollIntoView({ behavior: 'smooth' });
            navItems.forEach(item => item.classList.toggle('active', item.getAttribute('data-technique') === 'overview'));
            techniqueCards.forEach(card => card.classList.remove('active'));
            quickSwitcherPills.forEach(pill => pill.classList.remove('active'));
            if (topHeaderTechBadge) topHeaderTechBadge.innerHTML = `<i class="fa-solid fa-layer-group"></i> OVERVIEW`;
            window.location.hash = 'overview';
            return;
        }

        if (techKey === 'compare') {
            if (simPanel)  simPanel.style.display  = 'none';
            if (compPanel) compPanel.style.display = 'block';
            if (quizPanel) quizPanel.style.display = 'none';
            navItems.forEach(item => item.classList.toggle('active', item.getAttribute('data-technique') === 'compare'));
            techniqueCards.forEach(card => card.classList.remove('active'));
            quickSwitcherPills.forEach(pill => pill.classList.toggle('active', pill.getAttribute('data-technique') === 'compare'));
            if (topHeaderTechBadge) topHeaderTechBadge.innerHTML = `<i class="fa-solid fa-scale-balanced"></i> COMPARISON MATRIX`;
            window.location.hash = 'compare';
            compPanel?.scrollIntoView({ behavior: 'smooth', block: 'start' });

            const tbody = document.getElementById('comparison-matrix-tbody');
            if (tbody && (!tbody.children.length || tbody.textContent.includes('Evaluating'))) {
                runMultiTechniqueComparison('10110010');
            }
            return;
        }

        if (techKey === 'quiz') {
            if (simPanel)  simPanel.style.display  = 'none';
            if (compPanel) compPanel.style.display = 'none';
            if (quizPanel) quizPanel.style.display = 'block';
            navItems.forEach(item => item.classList.toggle('active', item.getAttribute('data-technique') === 'quiz'));
            techniqueCards.forEach(card => card.classList.remove('active'));
            quickSwitcherPills.forEach(pill => pill.classList.toggle('active', pill.getAttribute('data-technique') === 'quiz'));
            if (topHeaderTechBadge) topHeaderTechBadge.innerHTML = `<i class="fa-solid fa-graduation-cap"></i> LAB QUIZ`;
            window.location.hash = 'quiz';
            quizPanel?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            renderCurrentQuizQuestion();
            return;
        }

        // Return to standard simulation panel
        if (simPanel)  simPanel.style.display  = 'block';
        if (compPanel) compPanel.style.display = 'none';
        if (quizPanel) quizPanel.style.display = 'none';

        if (!techniqueConfigs[techKey]) return;
        currentTechnique = techKey;
        const config = techniqueConfigs[techKey];
        window.location.hash = techKey;

        // Navigation highlights
        navItems.forEach(item => item.classList.toggle('active', item.getAttribute('data-technique') === techKey));
        techniqueCards.forEach(card => card.classList.toggle('active', card.getAttribute('data-technique') === techKey));
        quickSwitcherPills.forEach(pill => pill.classList.toggle('active', pill.getAttribute('data-technique') === techKey));

        // Header
        if (activeTechniqueTag)   activeTechniqueTag.textContent  = config.name;
        if (activeTechniqueTitle) activeTechniqueTitle.textContent = config.title;
        if (topHeaderTechBadge)   topHeaderTechBadge.innerHTML = `<i class="fa-solid fa-microchip"></i> ${config.name.toUpperCase()}`;

        // Form
        if (primaryInputLabel) primaryInputLabel.textContent  = config.inputLabel;
        if (primaryInput) {
            primaryInput.placeholder = config.placeholder;
            primaryInput.value       = config.defaultValue;
        }
        if (primaryInputHint) primaryInputHint.textContent = config.hint;
        if (dynamicParamsContainer) dynamicParamsContainer.innerHTML = config.paramsHtml;

        // Render Presets
        renderPresetsForTechnique(techKey);

        // Theory HUD
        if (hudTheoryBody) hudTheoryBody.textContent = config.theory;

        // Telemetry
        if (tModule) tModule.textContent = config.name;
        updateInputSizeTelemetry();

        // Error injector card visibility & reset
        const errorInjectionCard = document.getElementById('error-injection-card');
        if (errorInjectionCard) {
            errorInjectionCard.style.display = config.hasErrorInjector ? 'block' : 'none';
        }

        resetErrorInjector();
        if (enableErrorToggle) {
            enableErrorToggle.checked = false;
            setErrorInjectorEnabled(false);
        }

        // Attach technique-specific param handlers
        attachParamHandlers(techKey);

        // Reset results
        resetResultsDisplay();

        // Scroll to simulator
        document.getElementById('simulator-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function attachParamHandlers(techKey) {
        if (techKey === 'byte_stuffing') {
            document.getElementById('btn-stuff-only')?.addEventListener('click', () => processSimulatorData('stuff'));
            document.getElementById('btn-destuff-only')?.addEventListener('click', () => processSimulatorData('destuff'));
        } else if (techKey === 'bit_stuffing') {
            document.getElementById('btn-bit-stuff-only')?.addEventListener('click', () => processSimulatorData('stuff'));
            document.getElementById('btn-bit-destuff-only')?.addEventListener('click', () => processSimulatorData('destuff'));
        } else if (techKey === 'parity') {
            const modeSelect  = document.getElementById('param-parity-mode');
            const colGroup    = document.getElementById('param-columns-group');
            const colInput    = document.getElementById('param-columns');
            const err1dGroup  = document.getElementById('param-1d-error-group');
            const errPosInput = document.getElementById('param-error-pos');
            const err2dGroup  = document.getElementById('param-2d-error-group');
            const errRowInput = document.getElementById('param-error-row');
            const errColInput = document.getElementById('param-error-col');

            const updateParityHint = () => {
                const is2D = modeSelect?.value === '2D';
                const val = primaryInput ? primaryInput.value.replace(/\s+/g, '') : '';
                const isBin = /^[01]+$/.test(val);

                if (!is2D) {
                    const hint1d = document.getElementById('param-error-pos-hint');
                    if (hint1d) {
                        if (val && isBin) {
                            const totalBits = val.length + 1; // data + parity bit
                            hint1d.textContent = `Optional: Enter 1-based index (1 to ${totalBits}) to flip a bit in codeword`;
                            if (errPosInput) errPosInput.max = totalBits;
                        } else {
                            hint1d.textContent = 'Optional: Enter 1-based index (1 to N) to flip a bit in codeword';
                        }
                    }
                } else {
                    const hint2d = document.getElementById('param-2d-error-hint');
                    if (hint2d) {
                        const cols = parseInt(colInput?.value || 4, 10) || 4;
                        const len = val && isBin ? val.length : 16;
                        const rows = Math.ceil(len / cols) || 1;
                        hint2d.textContent = `Optional: Specify 1-based Row (1 to ${rows}) and Column (1 to ${cols}) to flip a bit`;
                        if (errRowInput) errRowInput.max = rows;
                        if (errColInput) errColInput.max = cols;
                    }
                }
            };

            updateParityHint();
            primaryInput?.addEventListener('input', updateParityHint);
            colInput?.addEventListener('input', updateParityHint);

            // 1D Position input listeners
            errPosInput?.addEventListener('keydown', e => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    processSimulatorData();
                }
            });

            errPosInput?.addEventListener('input', e => {
                const val = e.target.value;
                if (val === '') {
                    e.target.style.borderColor = '';
                    return;
                }
                const num = Number(val);
                const rawData = primaryInput ? primaryInput.value.replace(/\s+/g, '') : '';
                const maxLen = rawData ? (rawData.length + 1) : 64;
                if (num < 1 || !Number.isInteger(num) || num > maxLen) {
                    e.target.style.borderColor = 'var(--color-danger)';
                } else {
                    e.target.style.borderColor = 'var(--accent-cyan)';
                }
            });

            // 2D Row & Column input listeners
            [errRowInput, errColInput].forEach(inp => {
                inp?.addEventListener('keydown', e => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        processSimulatorData();
                    }
                });
            });

            errRowInput?.addEventListener('input', e => {
                const val = e.target.value;
                if (val === '') { e.target.style.borderColor = ''; return; }
                const num = Number(val);
                const cols = parseInt(colInput?.value || 4, 10) || 4;
                const rawData = primaryInput ? primaryInput.value.replace(/\s+/g, '') : '';
                const maxRows = Math.ceil((rawData.length || 1) / cols);
                if (num < 1 || !Number.isInteger(num) || num > maxRows) {
                    e.target.style.borderColor = 'var(--color-danger)';
                } else {
                    e.target.style.borderColor = 'var(--accent-cyan)';
                }
            });

            errColInput?.addEventListener('input', e => {
                const val = e.target.value;
                if (val === '') { e.target.style.borderColor = ''; return; }
                const num = Number(val);
                const maxCols = parseInt(colInput?.value || 4, 10) || 4;
                if (num < 1 || !Number.isInteger(num) || num > maxCols) {
                    e.target.style.borderColor = 'var(--color-danger)';
                } else {
                    e.target.style.borderColor = 'var(--accent-cyan)';
                }
            });

            modeSelect?.addEventListener('change', e => {
                const is2D = e.target.value === '2D';
                if (colGroup)   colGroup.style.display   = is2D ? 'block' : 'none';
                if (err1dGroup) err1dGroup.style.display = is2D ? 'none'  : 'block';
                if (err2dGroup) err2dGroup.style.display = is2D ? 'block' : 'none';
                if (primaryInput) primaryInput.value = is2D ? '1011001011001001' : '1011001';
                updateParityHint();
            });
        } else if (techKey === 'checksum') {
            const wordSelect  = document.getElementById('param-word-size');
            const errPosInput = document.getElementById('param-error-pos');
            const hintPos     = document.getElementById('param-error-pos-hint');

            const updateChecksumHint = () => {
                const wSize = parseInt(wordSelect?.value || 8, 10);
                const rawData = primaryInput ? primaryInput.value.replace(/\s+/g, '') : '';
                const isBin = /^[01]+$/.test(rawData);
                if (rawData && isBin) {
                    const totalWords = Math.ceil(rawData.length / wSize) || 1;
                    const totalBits = (totalWords + 1) * wSize; // Payload words + 1 Checksum word
                    if (hintPos) {
                        hintPos.textContent = `Optional: Enter 1-based index (1 to ${totalBits}) to flip a bit (${totalWords} words + 1 checksum)`;
                    }
                    if (errPosInput) errPosInput.max = totalBits;
                } else if (hintPos) {
                    hintPos.textContent = 'Optional: Enter 1-based index (1 to N) to flip a bit in transmitted codeword';
                }
            };

            updateChecksumHint();
            primaryInput?.addEventListener('input', updateChecksumHint);
            wordSelect?.addEventListener('change', updateChecksumHint);

            // Preset buttons
            document.querySelectorAll('.preset-btn[id^="preset-chk-"]').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.preset-btn[id^="preset-chk-"]').forEach(b => b.classList.remove('active-preset'));
                    btn.classList.add('active-preset');
                    if (primaryInput) primaryInput.value = btn.dataset.val;
                    if (wordSelect && btn.dataset.w) wordSelect.value = btn.dataset.w;
                    updateChecksumHint();
                    processSimulatorData();
                });
            });

            errPosInput?.addEventListener('keydown', e => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    processSimulatorData();
                }
            });
        } else if (techKey === 'crc') {
            document.getElementById('btn-crc-encode-only')?.addEventListener('click', () => processSimulatorData('encode'));
            document.getElementById('btn-crc-check-only')?.addEventListener('click', () => processSimulatorData('check'));
        } else if (techKey === 'hamming') {
            const updateBadge = () => {
                const badge = document.getElementById('hamming-auto-badge');
                if (!badge) return;
                const val    = primaryInput ? primaryInput.value.trim() : '';
                const isBin  = /^[01]+$/.test(val);
                const k      = val.length;

                if (!val || !isBin || k < 1) {
                    badge.style.borderColor = 'var(--color-warning)';
                    badge.style.color       = 'var(--color-warning)';
                    badge.style.background  = 'rgba(234,179,8,0.1)';
                    badge.innerHTML = `<span><i class="fa-solid fa-triangle-exclamation"></i> <strong>Invalid</strong> — enter binary data</span>`;
                    return;
                }
                let r = 1;
                while ((1 << r) < (k + r + 1)) r++;
                const n = k + r;
                badge.style.borderColor = 'var(--accent-cyan)';
                badge.style.color       = 'var(--accent-cyan)';
                badge.style.background  = 'rgba(34,211,238,0.08)';
                badge.innerHTML = `<span><i class="fa-solid fa-wand-magic-sparkles"></i> <strong>AUTO:</strong> Hamming (${n},${k})</span><span style="font-size:0.75rem;opacity:.9;">Data: ${k}b | Parity: ${r}b | Total: ${n}b</span>`;

                // Sync preset button active state
                document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active-preset'));
                if (k === 4)  document.getElementById('preset-74')?.classList.add('active-preset');
                if (k === 8)  document.getElementById('preset-128')?.classList.add('active-preset');
                if (k === 11) document.getElementById('preset-1511')?.classList.add('active-preset');
            };

            if (primaryInput) {
                updateBadge();
                primaryInput.addEventListener('input', updateBadge);
            }

            // Preset buttons
            document.querySelectorAll('.preset-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    if (primaryInput) {
                        primaryInput.value = btn.getAttribute('data-val');
                        updateBadge();
                    }
                });
            });

        } else if (techKey === 'hamming_distance') {
            const modeSelect = document.getElementById('param-hdist-mode');
            const c2Group    = document.getElementById('param-c2-group');
            const multiGroup = document.getElementById('param-multi-cw-group');
            modeSelect?.addEventListener('change', e => {
                const isMulti = e.target.value === 'multi';
                if (c2Group)    c2Group.style.display    = isMulti ? 'none'  : 'block';
                if (multiGroup) multiGroup.style.display = isMulti ? 'block' : 'none';
            });
        }
    }

    function updateInputSizeTelemetry() {
        if (tSize && primaryInput) {
            const v = primaryInput.value;
            const config = techniqueConfigs[currentTechnique];
            if (config && config.binaryModule) {
                tSize.textContent = `${v.length} bits`;
            } else {
                tSize.textContent = `${v.length} chars`;
            }
        }
    }

    if (primaryInput) {
        primaryInput.addEventListener('input', updateInputSizeTelemetry);
    }

    // ═══════════════════════════════════════════════════════════
    // ERROR INJECTOR
    // ═══════════════════════════════════════════════════════════

    function setErrorInjectorEnabled(enabled) {
        if (!errorControlsWrapper) return;
        const config = techniqueConfigs[currentTechnique];
        const isBinary = config && config.binaryModule;

        if (enabled) {
            errorControlsWrapper.classList.remove('disabled');
            [btnFlipOne, btnRandomErr, btnBurstErr, btnResetErr].forEach(b => { if (b) b.disabled = false; });
            if (tChannel) { tChannel.textContent = 'NOISE INJECTED'; tChannel.className = 'hud-val t-danger'; }

            if (isBinary) {
                if (bitGridContainer)   bitGridContainer.style.display = 'block';
                if (textErrorContainer) textErrorContainer.style.display = 'none';
                // If we have a clean encoded stream, build the grid
                if (cleanEncodedBits) buildBitGrid(cleanEncodedBits);
            } else {
                if (bitGridContainer)   bitGridContainer.style.display = 'none';
                if (textErrorContainer) textErrorContainer.style.display = 'block';
                if (errorInputField) {
                    errorInputField.disabled = false;
                    // For Byte Stuffing, populate with the transmitted frame (FLAG + StuffedData + FLAG), NOT raw input
                    const flag = document.getElementById('param-flag')?.value || 'F';
                    const esc  = document.getElementById('param-esc')?.value  || 'E';
                    const data = primaryInput ? primaryInput.value : '';
                    const frameToCorrupt = lastTransmittedText || computeGenericByteStuffing(data, flag, esc) || '';
                    errorInputField.value = frameToCorrupt;
                    errorInputField.placeholder = frameToCorrupt ? `e.g. ${frameToCorrupt} (edit to corrupt frame)` : 'Enter modified frame for channel...';
                }
            }
        } else {
            errorControlsWrapper.classList.add('disabled');
            [btnFlipOne, btnRandomErr, btnBurstErr, btnResetErr].forEach(b => { if (b) b.disabled = true; });
            if (tChannel) { tChannel.textContent = 'CLEAN'; tChannel.className = 'hud-val t-success'; }
            if (errorInputField) { errorInputField.disabled = true; errorInputField.value = ''; }
        }
    }

    function resetErrorInjector() {
        cleanEncodedBits = '';
        corruptedBits    = '';
        lastTransmittedText = '';
        flippedPositions.clear();
        if (interactiveBitGrid) interactiveBitGrid.innerHTML = '';
        if (bitDiffDisplay)     bitDiffDisplay.style.display = 'none';
        if (bitGridContainer)   bitGridContainer.style.display = 'none';
        if (textErrorContainer) textErrorContainer.style.display = 'none';
        if (errorInputField) {
            errorInputField.disabled = true;
            errorInputField.value = '';
        }
        if (tChannel) { tChannel.textContent = 'CLEAN'; tChannel.className = 'hud-val t-success'; }
    }

    /** Populate the interactive bit grid from a binary string */
    function buildBitGrid(binaryStr, parityPositions = cachedParityPositions) {
        if (!interactiveBitGrid) return;
        cachedParityPositions = parityPositions || [];
        cleanEncodedBits = binaryStr;
        if (!corruptedBits || corruptedBits.length !== binaryStr.length) {
            corruptedBits = binaryStr;
            flippedPositions.clear();
        }

        interactiveBitGrid.innerHTML = '';
        const n = binaryStr.length;
        const isRightToLeft = (currentTechnique === 'hamming');

        for (let i = 0; i < n; i++) {
            const chip = document.createElement('div');
            chip.className = 'bit-chip';
            chip.textContent = corruptedBits[i];
            chip.setAttribute('data-index', i);
            const posNum = isRightToLeft ? (n - i) : (i + 1);
            chip.title = `Bit Position ${posNum}`;

            // Mark parity bits
            const isParity = isRightToLeft
                ? cachedParityPositions.includes(n - i)
                : cachedParityPositions.includes(i + 1);

            if (isParity) {
                chip.classList.add('parity-bit');
                chip.title = `Parity bit P${posNum}`;
            }

            // Mark already flipped bits
            if (flippedPositions.has(i)) chip.classList.add('flipped');

            // Position label (shown above chip, 1-indexed Left-to-Right for Parity)
            const pos = document.createElement('span');
            pos.className = 'bit-chip-pos';
            pos.textContent = posNum;
            chip.appendChild(pos);

            chip.addEventListener('click', () => toggleBit(i));
            interactiveBitGrid.appendChild(chip);
        }

        updateDiffDisplay();
    }

    function toggleBit(index) {
        if (!corruptedBits || index >= corruptedBits.length) return;
        const arr = corruptedBits.split('');
        arr[index] = arr[index] === '0' ? '1' : '0';
        corruptedBits = arr.join('');

        if (flippedPositions.has(index)) {
            flippedPositions.delete(index);
        } else {
            flippedPositions.add(index);
        }

        // Update chip visuals
        const chips = interactiveBitGrid.querySelectorAll('.bit-chip');
        if (chips[index]) {
            chips[index].textContent = arr[index];
            chips[index].classList.toggle('flipped', flippedPositions.has(index));
            // Re-append position label since textContent overwrote it
            const isRightToLeft = (currentTechnique === 'hamming');
            const posNum = isRightToLeft ? (corruptedBits.length - index) : (index + 1);
            const pos = document.createElement('span');
            pos.className = 'bit-chip-pos';
            pos.textContent = posNum;
            chips[index].appendChild(pos);
        }

        updateDiffDisplay();
    }

    function updateDiffDisplay() {
        if (!bitDiffDisplay || !cleanEncodedBits) return;
        const hasFlipped = flippedPositions.size > 0;
        bitDiffDisplay.style.display = hasFlipped ? 'flex' : 'none';

        if (!hasFlipped) return;

        const makeStream = (bits, highlightSet) => {
            let html = '';
            for (let i = 0; i < bits.length; i++) {
                const cls = highlightSet.has(i) ? 'mismatch' : 'match';
                html += `<span class="diff-bit ${cls}">${bits[i]}</span>`;
            }
            return html;
        };

        if (diffOriginal)  diffOriginal.innerHTML  = makeStream(cleanEncodedBits, flippedPositions);
        if (diffCorrupted) diffCorrupted.innerHTML = makeStream(corruptedBits,    flippedPositions);
    }

    // Quick-action error buttons
    if (btnFlipOne) {
        btnFlipOne.addEventListener('click', () => {
            if (!cleanEncodedBits) return;
            // Flip position 0 (leftmost bit)
            toggleBit(0);
        });
    }

    if (btnRandomErr) {
        btnRandomErr.addEventListener('click', () => {
            if (!cleanEncodedBits) return;
            const idx = Math.floor(Math.random() * cleanEncodedBits.length);
            toggleBit(idx);
        });
    }

    if (btnBurstErr) {
        btnBurstErr.addEventListener('click', () => {
            if (!cleanEncodedBits || cleanEncodedBits.length < 2) return;
            const start = Math.floor(Math.random() * (cleanEncodedBits.length - 1));
            toggleBit(start);
            toggleBit(start + 1);
        });
    }

    if (btnResetErr) {
        btnResetErr.addEventListener('click', () => {
            if (!cleanEncodedBits) return;
            corruptedBits = cleanEncodedBits;
            flippedPositions.clear();
            buildBitGrid(cleanEncodedBits);
        });
    }

    if (enableErrorToggle) {
        enableErrorToggle.addEventListener('change', e => setErrorInjectorEnabled(e.target.checked));
    }

    // ═══════════════════════════════════════════════════════════
    // PIPELINE STATE HELPER & INTERACTIVE STEP-THROUGH
    // ═══════════════════════════════════════════════════════════
    const PIPELINE_STAGES = [
        { key: 'source',  name: 'SOURCE',  icon: 'fa-database', desc: '1. SOURCE: Raw application data payload generated and placed into transmission queue.' },
        { key: 'encoder', name: 'ENCODE',  icon: 'fa-gears', desc: '2. ENCODE: Redundancy / Framing logic calculated (Framing Delimiters, Parity Bit, CRC Remainder, or Hamming Matrix Bits).' },
        { key: 'channel', name: 'CHANNEL', icon: 'fa-wifi', desc: '3. CHANNEL: Frame serialized into electrical / optical bitstream and propagated across transmission medium.' },
        { key: 'noise',   name: 'NOISE',   icon: 'fa-bug', desc: '4. NOISE LAYER: Channel noise, Gaussian interference, or intentional bit-flip injection evaluated.' },
        { key: 'decoder', name: 'DECODE',  icon: 'fa-filter', desc: '5. DECODE: Receiver frame synchronizer unpacks packet; syndrome, checksum, or parity recalculated.' },
        { key: 'verify',  name: 'VERIFY',  icon: 'fa-circle-check', desc: '6. VERIFY: Final integrity check completed. Errors detected or single-bit errors auto-corrected.' }
    ];

    let currentPipelineStepIdx = -1;
    let pipelinePlayInterval = null;

    function resetPipelinePlayback() {
        if (pipelinePlayInterval) {
            clearInterval(pipelinePlayInterval);
            pipelinePlayInterval = null;
        }
        if (btnPipePlay) {
            btnPipePlay.classList.remove('active-play');
            btnPipePlay.innerHTML = '<i class="fa-solid fa-play"></i> Animate';
        }
        currentPipelineStepIdx = -1;
        Object.values(pipeNodes).forEach(el => {
            if (el) el.classList.remove('pipe-focus');
        });
        if (pipeStageDesc) {
            pipeStageDesc.innerHTML = '<i class="fa-solid fa-circle-info"></i> Pipeline Ready. Click <strong>RUN SIMULATION</strong> or <strong>Animate</strong> to execute.';
        }
    }

    function stepPipelineNext() {
        currentPipelineStepIdx = (currentPipelineStepIdx + 1) % PIPELINE_STAGES.length;
        highlightPipelineStage(currentPipelineStepIdx);
    }

    function highlightPipelineStage(idx) {
        const stage = PIPELINE_STAGES[idx];
        if (!stage) return;

        Object.entries(pipeNodes).forEach(([key, el]) => {
            if (el) {
                el.classList.toggle('pipe-focus', key === stage.key);
                if (key === stage.key) {
                    el.classList.add('active-pipe');
                }
            }
        });

        if (pipeStageDesc) {
            pipeStageDesc.innerHTML = `<i class="fa-solid ${stage.icon}" style="color:var(--accent-cyan);"></i> <span><strong>${stage.name}:</strong> ${stage.desc}</span>`;
        }
    }

    function togglePipelinePlay() {
        if (pipelinePlayInterval) {
            clearInterval(pipelinePlayInterval);
            pipelinePlayInterval = null;
            if (btnPipePlay) {
                btnPipePlay.classList.remove('active-play');
                btnPipePlay.innerHTML = '<i class="fa-solid fa-play"></i> Animate';
            }
        } else {
            if (btnPipePlay) {
                btnPipePlay.classList.add('active-play');
                btnPipePlay.innerHTML = '<i class="fa-solid fa-pause"></i> Pause';
            }
            if (currentPipelineStepIdx === -1 || currentPipelineStepIdx >= PIPELINE_STAGES.length - 1) {
                currentPipelineStepIdx = -1;
            }
            stepPipelineNext();
            pipelinePlayInterval = setInterval(() => {
                if (currentPipelineStepIdx < PIPELINE_STAGES.length - 1) {
                    stepPipelineNext();
                } else {
                    clearInterval(pipelinePlayInterval);
                    pipelinePlayInterval = null;
                    if (btnPipePlay) {
                        btnPipePlay.classList.remove('active-play');
                        btnPipePlay.innerHTML = '<i class="fa-solid fa-play"></i> Animate';
                    }
                }
            }, 900);
        }
    }

    btnPipeStep?.addEventListener('click', stepPipelineNext);
    btnPipePlay?.addEventListener('click', togglePipelinePlay);
    btnPipeReset?.addEventListener('click', resetPipelinePlayback);

    function setPipelineState(stage) {
        // stage: 'running' | 'success' | 'error' | 'corrected' | 'idle'
        const stageMap = {
            running:   { source:'active-pipe', encoder:'active-pipe', channel:'active-pipe', noise:''         , decoder:''         , verify:''           },
            success:   { source:'pipe-done',   encoder:'pipe-done',   channel:'pipe-done',   noise:'pipe-done', decoder:'pipe-done', verify:'pipe-done'   },
            error:     { source:'pipe-done',   encoder:'pipe-done',   channel:'pipe-done',   noise:'pipe-error', decoder:'pipe-done', verify:'pipe-error'  },
            corrected: { source:'pipe-done',   encoder:'pipe-done',   channel:'pipe-done',   noise:'pipe-error', decoder:'pipe-done', verify:'pipe-done'   },
            idle:      { source:'active-pipe', encoder:''           , channel:''           , noise:''          , decoder:''         , verify:''           }
        };
        const map = stageMap[stage] || stageMap.idle;
        Object.entries(pipeNodes).forEach(([key, el]) => {
            if (el) {
                el.className = 'pipe-step-sm';
                if (map[key]) el.classList.add(map[key]);
            }
        });
    }

    // ═══════════════════════════════════════════════════════════
    // RESET RESULTS DISPLAY
    // ═══════════════════════════════════════════════════════════
    function resetResultsDisplay() {
        if (resultStatusIndicator) {
            resultStatusIndicator.className = 'status-indicator-badge neutral';
            resultStatusIndicator.innerHTML = '<i class="fa-solid fa-circle-info"></i> READY TO SIMULATE';
        }
        if (outputEncoded)  outputEncoded.textContent  = '— Awaiting Simulation —';
        if (outputReceived) outputReceived.textContent = '— Awaiting Simulation —';
        if (outputDecoded)  outputDecoded.textContent  = '— Awaiting Simulation —';
        if (chipsEncoded)   chipsEncoded.innerHTML     = '';
        if (chipsReceived)  chipsReceived.innerHTML    = '';
        if (chipsDecoded)   chipsDecoded.innerHTML     = '';
        resetPipelinePlayback();
        if (stepByStepDisplay) {
            stepByStepDisplay.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon"><i class="fa-solid fa-network-wired"></i></div>
                    <p class="empty-title">READY TO SIMULATE</p>
                    <p class="empty-desc">Enter your data and click <strong>RUN SIMULATION</strong> to begin.</p>
                </div>`;
        }
        setPipelineState('idle');

        // Reset telemetry values
        if (tEncodedOut) tEncodedOut.textContent = '—';
        if (tErrorPos)   tErrorPos.textContent   = '—';
        if (tCorrection) { tCorrection.textContent = 'READY'; tCorrection.className = 'hud-val t-neutral'; }
    }

    // ═══════════════════════════════════════════════════════════
    // BUILD REQUEST PAYLOAD
    // ═══════════════════════════════════════════════════════════
    function buildRequestPayload(actionOverride) {
        const config      = techniqueConfigs[currentTechnique];
        const isBinary    = config && config.binaryModule;
        const errorActive = enableErrorToggle && enableErrorToggle.checked;

        // Get injected error value
        let injectedError = null;
        if (errorActive) {
            if (isBinary && corruptedBits && flippedPositions.size > 0) {
                injectedError = corruptedBits;
            } else if (!isBinary && errorInputField && errorInputField.value.trim()) {
                injectedError = errorInputField.value.trim();
            }
        }

        const payload = {
            technique: currentTechnique,
            input_data: primaryInput ? primaryInput.value.trim() : '',
            injected_error: injectedError,
            params: {}
        };

        if (currentTechnique === 'byte_stuffing') {
            const currentData = primaryInput ? primaryInput.value.trim() : '';
            const flag = document.getElementById('param-flag')?.value || 'F';
            const esc  = document.getElementById('param-esc')?.value  || 'E';
            const action = actionOverride || 'full_cycle';

            payload.params.flag = flag;
            payload.params.esc = esc;
            payload.params.action = action;
            payload.params.original_data = currentData;

            if (action === 'destuff') {
                // When de-stuffing, the frame to decode MUST be the received / transmitted frame!
                let frameToDestuff = '';
                if (errorActive && errorInputField && errorInputField.value.trim()) {
                    frameToDestuff = errorInputField.value.trim();
                } else if (lastTransmittedText && lastInputDataForFrame === currentData && lastFlagForFrame === flag && lastEscForFrame === esc) {
                    frameToDestuff = lastTransmittedText;
                } else {
                    frameToDestuff = computeGenericByteStuffing(currentData, flag, esc);
                }
                payload.input_data = frameToDestuff;
            } else {
                payload.input_data = currentData;
            }

        } else if (currentTechnique === 'bit_stuffing') {
            const currentData = primaryInput ? primaryInput.value.trim() : '';
            const flagPattern = document.getElementById('param-flag-pattern')?.value.trim() || '01111110';
            const action      = actionOverride || 'full_cycle';

            payload.params.flag_pattern  = flagPattern;
            payload.params.action        = action;
            payload.params.original_data = currentData;

            const ep = document.getElementById('param-error-pos')?.value;
            if (ep) payload.params.error_pos = parseInt(ep, 10);

            if (action === 'destuff') {
                // When de-stuffing, the frame to decode MUST be the received / transmitted frame!
                let frameToDestuff = '';
                if (errorActive && corruptedBits && flippedPositions.size > 0) {
                    frameToDestuff = corruptedBits;
                } else if (lastBitTransmittedFrame && lastBitInputData === currentData && lastBitFlagPattern === flagPattern) {
                    frameToDestuff = lastBitTransmittedFrame;
                } else {
                    frameToDestuff = computeGenericBitStuffing(currentData, flagPattern);
                }
                payload.input_data = frameToDestuff;
            } else {
                payload.input_data = currentData;
            }

        } else if (currentTechnique === 'parity') {
            payload.params.parity_type = document.getElementById('param-parity-type')?.value || 'even';
            payload.params.mode        = document.getElementById('param-parity-mode')?.value  || '1D';
            payload.params.columns     = parseInt(document.getElementById('param-columns')?.value || 4, 10);
            payload.params.action      = actionOverride || 'full_cycle';

            if (payload.params.mode === '1D') {
                const epRaw = document.getElementById('param-error-pos')?.value;
                if (epRaw !== undefined && epRaw !== null && String(epRaw).trim() !== '') {
                    const epTrim = String(epRaw).trim();
                    const epNum = Number(epTrim);
                    const cleanData = payload.input_data ? payload.input_data.replace(/\s+/g, '') : '';
                    const maxLen = cleanData.length + 1; // data + parity bit

                    if (isNaN(epNum) || !Number.isInteger(epNum) || epNum < 1) {
                        showToast('Invalid 1D bit flip position. Please enter a positive whole number (≥ 1).', 'error');
                        setStatus('error-detected', '<i class="fa-solid fa-triangle-exclamation"></i> INVALID POSITION (Must be integer ≥ 1)');
                        return;
                    }
                    if (cleanData && epNum > maxLen) {
                        showToast(`Bit flip position ${epNum} exceeds codeword length (${maxLen} bits: ${cleanData.length} data + 1 parity bit).`, 'error');
                        setStatus('error-detected', `<i class="fa-solid fa-triangle-exclamation"></i> POSITION OUT OF BOUNDS (1..${maxLen})`);
                        return;
                    }
                    payload.params.error_pos = epNum;
                }
            } else if (payload.params.mode === '2D') {
                const rowRaw = document.getElementById('param-error-row')?.value;
                const colRaw = document.getElementById('param-error-col')?.value;
                const hasRow = rowRaw !== undefined && rowRaw !== null && String(rowRaw).trim() !== '';
                const hasCol = colRaw !== undefined && colRaw !== null && String(colRaw).trim() !== '';

                if (hasRow || hasCol) {
                    if (!hasRow || !hasCol) {
                        showToast('Please provide BOTH Row and Column (1-indexed) to flip a bit in 2D matrix.', 'error');
                        setStatus('error-detected', '<i class="fa-solid fa-triangle-exclamation"></i> BOTH ROW & COLUMN REQUIRED');
                        return;
                    }
                    const rowNum = Number(String(rowRaw).trim());
                    const colNum = Number(String(colRaw).trim());
                    const cleanData = payload.input_data ? payload.input_data.replace(/\s+/g, '') : '';
                    const cols = payload.params.columns || 4;
                    const maxRows = Math.ceil((cleanData.length || 1) / cols);

                    if (isNaN(rowNum) || !Number.isInteger(rowNum) || rowNum < 1) {
                        showToast('Invalid Row. Please enter a positive integer (≥ 1).', 'error');
                        setStatus('error-detected', '<i class="fa-solid fa-triangle-exclamation"></i> INVALID ROW (Must be integer ≥ 1)');
                        return;
                    }
                    if (isNaN(colNum) || !Number.isInteger(colNum) || colNum < 1) {
                        showToast('Invalid Column. Please enter a positive integer (≥ 1).', 'error');
                        setStatus('error-detected', '<i class="fa-solid fa-triangle-exclamation"></i> INVALID COL (Must be integer ≥ 1)');
                        return;
                    }
                    if (rowNum > maxRows) {
                        showToast(`Row ${rowNum} exceeds matrix row count (${maxRows} rows).`, 'error');
                        setStatus('error-detected', `<i class="fa-solid fa-triangle-exclamation"></i> ROW OUT OF BOUNDS (1..${maxRows})`);
                        return;
                    }
                    if (colNum > cols) {
                        showToast(`Column ${colNum} exceeds matrix column count (${cols} columns).`, 'error');
                        setStatus('error-detected', `<i class="fa-solid fa-triangle-exclamation"></i> COL OUT OF BOUNDS (1..${cols})`);
                        return;
                    }
                    payload.params.error_row = rowNum;
                    payload.params.error_col = colNum;
                }
            }

        } else if (currentTechnique === 'checksum') {
            payload.params.word_size = parseInt(document.getElementById('param-word-size')?.value || 8, 10);
            payload.params.action    = actionOverride || 'full_cycle';
            const epRaw = document.getElementById('param-error-pos')?.value;
            if (epRaw !== undefined && epRaw !== null && String(epRaw).trim() !== '') {
                const epNum = Number(String(epRaw).trim());
                if (!isNaN(epNum) && Number.isInteger(epNum) && epNum >= 1) {
                    payload.params.error_pos = epNum;
                }
            }

        } else if (currentTechnique === 'crc') {
            payload.params.polynomial = document.getElementById('param-crc-poly')?.value || '1101';
            payload.params.action     = actionOverride || 'full_cycle';
            const ep = document.getElementById('param-error-pos')?.value;
            if (ep) payload.params.error_pos = parseInt(ep, 10);

        } else if (currentTechnique === 'hamming') {
            payload.params.mode        = 'auto';
            payload.params.parity_type = document.getElementById('param-hamming-parity')?.value || 'even';
            payload.params.action      = actionOverride || 'full_cycle';
            const ep = document.getElementById('param-error-pos')?.value;
            if (ep) payload.params.error_pos = parseInt(ep, 10);

        } else if (currentTechnique === 'hamming_distance') {
            const hmode = document.getElementById('param-hdist-mode')?.value || 'pair';
            payload.params.mode = hmode;
            if (hmode === 'multi') {
                const raw = document.getElementById('param-codewords-list')?.value || '';
                payload.params.codewords = raw.replace(/\n/g, ',').split(',').map(s => s.trim()).filter(s => s.length > 0);
            } else {
                payload.params.codeword2 = document.getElementById('param-codeword2')?.value || '';
            }
        }

        return payload;
    }

    // ═══════════════════════════════════════════════════════════
    // RENDERERS & COLOR-CODED CHIP STREAMS
    // ═══════════════════════════════════════════════════════════

    /** Color-coded Visual Chip Stream Renderers */
    function renderChipsForEncoded(container, tech, res, payload) {
        if (!container) return;
        container.innerHTML = '';

        if (tech === 'byte_stuffing') {
            const tokens = res.stuffed_tokens || [];
            if (tokens.length) {
                tokens.forEach(tok => {
                    const chip = document.createElement('span');
                    const isFlag = tok.type === 'flag';
                    const isEsc = tok.type === 'esc_inserted';
                    chip.className = `chip-item ${isFlag ? 'chip-flag' : isEsc ? 'chip-esc' : 'chip-data'}`;
                    chip.innerHTML = `<span>${escapeHtml(tok.value)}</span><span class="chip-tag-sm">${isFlag ? 'FLAG' : isEsc ? 'ESC' : 'DATA'}</span>`;
                    container.appendChild(chip);
                });
            }
        } else if (tech === 'bit_stuffing') {
            const tokens = res.stuffed_tokens || [];
            if (tokens.length) {
                tokens.forEach(tok => {
                    const chip = document.createElement('span');
                    const isFlag = tok.type === 'flag';
                    const isStuffed = tok.type === 'stuffed_zero';
                    chip.className = `chip-item ${isFlag ? 'chip-flag' : isStuffed ? 'chip-stuffed' : 'chip-data'}`;
                    chip.innerHTML = `<span>${escapeHtml(tok.value)}</span><span class="chip-tag-sm">${isFlag ? 'FLAG' : isStuffed ? 'STUFF 0' : 'DATA'}</span>`;
                    container.appendChild(chip);
                });
            }
        } else if (tech === 'parity') {
            const cw = res.codeword || res.transmitted_codeword || '';
            if (cw && res.mode === '1D') {
                const dataLen = cw.length - 1;
                for (let i = 0; i < cw.length; i++) {
                    const chip = document.createElement('span');
                    const isParity = (i === dataLen);
                    chip.className = `chip-item ${isParity ? 'chip-parity' : 'chip-data'}`;
                    chip.innerHTML = `<span>${cw[i]}</span><span class="chip-tag-sm">${isParity ? 'PARITY' : 'D' + (i + 1)}</span>`;
                    container.appendChild(chip);
                }
            }
        } else if (tech === 'crc') {
            const cw = res.transmitted_codeword || '';
            const rem = res.crc_remainder || '';
            if (cw && rem) {
                const dataLen = cw.length - rem.length;
                for (let i = 0; i < cw.length; i++) {
                    const chip = document.createElement('span');
                    const isRem = (i >= dataLen);
                    chip.className = `chip-item ${isRem ? 'chip-crc' : 'chip-data'}`;
                    chip.innerHTML = `<span>${cw[i]}</span><span class="chip-tag-sm">${isRem ? 'CRC' : 'D' + (i + 1)}</span>`;
                    container.appendChild(chip);
                }
            }
        } else if (tech === 'hamming') {
            const posTable = res.pos_table || [];
            if (posTable.length) {
                posTable.forEach(item => {
                    const chip = document.createElement('span');
                    const isP = item.is_parity;
                    chip.className = `chip-item ${isP ? 'chip-parity' : 'chip-data'}`;
                    chip.innerHTML = `<span>${item.bit}</span><span class="chip-tag-sm">${item.name}</span>`;
                    container.appendChild(chip);
                });
            }
        } else if (tech === 'checksum') {
            const words = res.words || [];
            const chk = res.checksum || '';
            if (words.length) {
                words.forEach((w, idx) => {
                    const chip = document.createElement('span');
                    chip.className = 'chip-item chip-data';
                    chip.innerHTML = `<span>${w}</span><span class="chip-tag-sm">W${idx + 1}</span>`;
                    container.appendChild(chip);
                });
                if (chk) {
                    const chkChip = document.createElement('span');
                    chkChip.className = 'chip-item chip-crc';
                    chkChip.innerHTML = `<span>${chk}</span><span class="chip-tag-sm">CHECKSUM</span>`;
                    container.appendChild(chkChip);
                }
            }
        }
    }

    function renderChipsForReceived(container, tech, res, payload) {
        if (!container) return;
        container.innerHTML = '';

        if (tech === 'byte_stuffing') {
            const frame = res.received_frame || '';
            const isCorrupted = res.received_frame && res.stuffed_frame && (res.received_frame !== res.stuffed_frame);
            if (isCorrupted) {
                const chip = document.createElement('span');
                chip.className = 'chip-item chip-error';
                chip.innerHTML = `<span><i class="fa-solid fa-bolt"></i> ${escapeHtml(frame)}</span><span class="chip-tag-sm">CORRUPTED</span>`;
                container.appendChild(chip);
            } else if (res.stuffed_tokens) {
                renderChipsForEncoded(container, tech, res, payload);
            }
        } else if (tech === 'bit_stuffing') {
            const frame = res.received_frame || '';
            const isCorrupted = res.received_frame && res.stuffed_frame && (res.received_frame !== res.stuffed_frame);
            if (isCorrupted) {
                const chip = document.createElement('span');
                chip.className = 'chip-item chip-error';
                chip.innerHTML = `<span><i class="fa-solid fa-bolt"></i> ${escapeHtml(frame)}</span><span class="chip-tag-sm">CORRUPTED</span>`;
                container.appendChild(chip);
            } else if (res.stuffed_tokens) {
                renderChipsForEncoded(container, tech, res, payload);
            }
        } else if (tech === 'parity' || tech === 'crc' || tech === 'hamming' || tech === 'checksum') {
            const recv = res.received_codeword || res.received_frame || '';
            const errPos = res.injected_error_pos || res.error_pos;
            if (recv && /^[01]+$/.test(recv)) {
                for (let i = 0; i < recv.length; i++) {
                    const chip = document.createElement('span');
                    const isRightToLeft = (tech === 'hamming');
                    const posNum = isRightToLeft ? (recv.length - i) : (i + 1);
                    const isFlipped = (errPos === posNum);

                    chip.className = `chip-item ${isFlipped ? 'chip-error' : 'chip-data'}`;
                    chip.innerHTML = `<span>${recv[i]}${isFlipped ? '⚡' : ''}</span><span class="chip-tag-sm">${isFlipped ? 'ERR P' + posNum : 'b' + posNum}</span>`;
                    container.appendChild(chip);
                }
            }
        }
    }

    function renderChipsForDecoded(container, tech, res, payload) {
        if (!container) return;
        container.innerHTML = '';
        const data = res.destuffed_data || res.decoded_payload || res.corrected_data || res.data || '';
        if (data && typeof data === 'string') {
            for (let i = 0; i < Math.min(data.length, 32); i++) {
                const chip = document.createElement('span');
                chip.className = 'chip-item chip-stuffed';
                chip.innerHTML = `<span>${escapeHtml(data[i])}</span><span class="chip-tag-sm">${i + 1}</span>`;
                container.appendChild(chip);
            }
        }
    }

    /** Stuffed token stream (byte/bit stuffing) */
    function renderStuffedTokens(tokens) {
        if (!tokens || !tokens.length) return '';
        let html = '<div class="token-stream-container">';
        tokens.forEach(tok => {
            let cls = 'token-data';
            if (tok.type === 'flag')         cls = 'token-flag';
            if (tok.type === 'esc_inserted') cls = 'token-esc-inserted';
            if (tok.type === 'stuffed_data') cls = 'token-stuffed-data';
            if (tok.type === 'stuffed_zero') cls = 'token-stuffed-zero';
            const tip = tok.type === 'stuffed_zero' ? "Stuffed '0' inserted after dynamic threshold consecutive 1s" : (tok.label || tok.type);
            html += `<span class="token-badge ${cls}" title="${tip}">${tok.value}</span>`;
        });
        html += '</div>';
        return html;
    }

    /** 2D Parity Matrix with crosshair highlighting */
    function render2DParityMatrix(res) {
        if (!res || !res.matrix_rows) return '';
        const cols        = res.columns;
        const rows        = res.rows;
        const rowParities = res.row_parities;
        const colParities = res.col_parities;
        const corner      = res.corner_parity;
        const pin         = res.pinpointed_location;

        const errRow = pin ? pin.row : -1;
        const errCol = pin ? pin.col : -1;

        let html = '<div class="matrix-container"><table class="parity-matrix-table"><thead><tr><th>Block</th>';
        for (let c = 1; c <= cols; c++) html += `<th>Col ${c}</th>`;
        html += `<th>Row P (Pᵣ)</th></tr></thead><tbody>`;

        for (let r = 0; r < rows; r++) {
            const isErrRow = (r + 1) === errRow;
            html += `<tr${isErrRow ? ' class="crosshair-row"' : ''}>`;
            html += `<th>Row ${r + 1}</th>`;
            const rowBits = res.matrix_rows[r];
            for (let c = 0; c < cols; c++) {
                const isTarget = isErrRow && (c + 1) === errCol;
                const isErrCol = (c + 1) === errCol;
                let cls = isTarget ? 'crosshair-target' : (isErrCol ? 'parity-cell-data crosshair-col' : 'parity-cell-data');
                html += `<td class="${cls}">${rowBits[c]}${isTarget ? ' <span style="font-size:0.8em">⚡</span>' : ''}</td>`;
            }
            html += `<td class="parity-cell-row-p">${rowParities[r]}</td></tr>`;
        }

        html += `<tr><th>Col P (Pᶜ)</th>`;
        for (let c = 0; c < cols; c++) {
            const isErrCol = (c + 1) === errCol;
            html += `<td class="${isErrCol ? 'parity-cell-col-p crosshair-col' : 'parity-cell-col-p'}">${colParities[c]}</td>`;
        }
        html += `<td class="parity-cell-corner">${corner}</td></tr>`;
        html += '</tbody></table></div>';
        return html;
    }

    /** Render dedicated Hamming Encoded section with separated Summary Panel and Expanded Table */
    function renderHammingEncodedSection(res) {
        if (!res) return '';
        const posTable = res.pos_table || [];

        let posHeadersHtml = '';
        let typeHeadersHtml = '';
        let valCellsHtml = '';

        posTable.forEach(item => {
            const isParity = item.is_parity;
            const isErr = item.is_error;

            posHeadersHtml += `<th class="hamming-col-head" title="Bit Position ${item.pos}">${item.pos}</th>`;

            const typeCls = isParity ? 'type-parity' : 'type-data';
            const typeTip = isParity ? `Parity Bit ${item.type}` : `Data Bit ${item.type}`;
            typeHeadersHtml += `<th class="hamming-col-type ${typeCls}" title="${typeTip}">${item.type}</th>`;

            let valCls = isParity ? 'val-parity' : 'val-data';
            if (isErr) valCls = 'val-error';
            valCellsHtml += `<td class="hamming-col-val ${valCls}" title="Position ${item.pos} (${item.type}) = ${item.value}">${item.value}${isErr ? ' <span style="font-size:0.75em">⚡</span>' : ''}</td>`;
        });

        return `
            <div class="hamming-encoded-workspace">
                <!-- 1. Summary Information Card -->
                <div class="hamming-summary-card">
                    <div class="hamming-summary-item">
                        <span class="hamming-summary-label">INPUT</span>
                        <div class="hamming-summary-val-wrap">
                            <span class="hamming-summary-val code-font">${escapeHtml(res.original_data || '—')}</span>
                        </div>
                    </div>
                    <div class="hamming-summary-divider"></div>
                    <div class="hamming-summary-item">
                        <span class="hamming-summary-label">MODE</span>
                        <div class="hamming-summary-val-wrap">
                            <span class="hamming-mode-badge">Hamming (${escapeHtml(res.mode || '7,4')})</span>
                        </div>
                    </div>
                    <div class="hamming-summary-divider"></div>
                    <div class="hamming-summary-item">
                        <span class="hamming-summary-label">ENCODED</span>
                        <div class="hamming-summary-val-wrap">
                            <span class="hamming-encoded-badge code-font">${escapeHtml(res.encoded_codeword || '—')}</span>
                        </div>
                    </div>
                </div>

                <!-- 2. Hamming Calculation Table Card -->
                <div class="hamming-table-card">
                    <div class="hamming-table-header">
                        <div class="hamming-table-title-group">
                            <i class="fa-solid fa-table-cells" style="color:var(--accent-cyan);"></i>
                            <span class="hamming-table-title">HAMMING CALCULATION TABLE</span>
                        </div>
                        <div class="hamming-table-legend">
                            <span class="legend-chip legend-data"><span class="legend-dot dot-data"></span> Data (D)</span>
                            <span class="legend-chip legend-parity"><span class="legend-dot dot-parity"></span> Parity (R/P)</span>
                        </div>
                    </div>
                    <div class="hamming-table-scroll-wrapper">
                        <table class="hamming-pos-table">
                            <thead>
                                <tr class="hamming-row-pos">
                                    <th class="hamming-lead-col">Position</th>
                                    ${posHeadersHtml}
                                </tr>
                                <tr class="hamming-row-type">
                                    <th class="hamming-lead-col">Type</th>
                                    ${typeHeadersHtml}
                                </tr>
                            </thead>
                            <tbody>
                                <tr class="hamming-row-val">
                                    <th class="hamming-lead-col">Bit Value</th>
                                    ${valCellsHtml}
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    /** Hamming position table fallback */
    function renderHammingPosTable(posTable) {
        if (!posTable || !posTable.length) return '';
        return renderHammingEncodedSection({ pos_table: posTable });
    }

    /** Render Internet Checksum Encoded Section with Top HUD Banner & Mathematical Addition Blackboard Cards */
    function renderChecksumEncodedSection(res) {
        if (!res) return '';
        const words = res.words || [];
        const trace = res.addition_trace || [];
        const wSize = res.word_size || 8;
        const hexSum = '0x' + parseInt(res.final_sum || '0', 2).toString(16).toUpperCase().padStart(wSize / 4, '0');
        const hexChk = '0x' + parseInt(res.checksum || '0', 2).toString(16).toUpperCase().padStart(wSize / 4, '0');

        // 1. Top HUD Ribbon (3 KPI Summary Cards)
        const hudHtml = `
            <div class="chk-hud-ribbon">
                <div class="chk-hud-card">
                    <span class="chk-hud-label"><i class="fa-solid fa-layer-group"></i> PAYLOAD WORDS</span>
                    <div class="chk-hud-val code-font">${escapeHtml(res.words ? res.words.join('  ') : res.original_data)}</div>
                    <span class="chk-hud-meta">${res.num_words} words × ${wSize}-bit (${res.padding_bits > 0 ? `+${res.padding_bits} pad` : 'Aligned'})</span>
                </div>
                <div class="chk-hud-card">
                    <span class="chk-hud-label"><i class="fa-solid fa-calculator"></i> 1's COMPLEMENT SUM (Σ)</span>
                    <div class="chk-hud-val code-font chk-color-cyan">${escapeHtml(res.final_sum || '—')}</div>
                    <span class="chk-hud-meta">Dec ${parseInt(res.final_sum || '0', 2)} • Hex ${hexSum}</span>
                </div>
                <div class="chk-hud-card chk-hud-featured">
                    <span class="chk-hud-label"><i class="fa-solid fa-shield-halved"></i> CHECKSUM (~SUM)</span>
                    <div class="chk-hud-val code-font chk-color-teal">${escapeHtml(res.checksum || '—')}</div>
                    <span class="chk-hud-meta">Dec ${parseInt(res.checksum || '0', 2)} • Hex ${hexChk} • Transmitted</span>
                </div>
            </div>
        `;

        // 2. Mathematical Addition Steps Blackboard Cards
        let mathStepsHtml = '';
        if (words.length <= 1) {
            mathStepsHtml = `
                <div class="chk-math-card">
                    <div class="chk-math-header">
                        <span class="chk-math-title"><i class="fa-solid fa-arrow-right-arrow-left"></i> Single Word Payload</span>
                        <span class="chk-tag-nocarry">Direct Inversion</span>
                    </div>
                    <div class="chk-blackboard">
                        <div class="chk-math-line"><span class="chk-math-lbl">Word 1 (W1):</span><span class="chk-math-bits">${words[0] || res.original_data}</span><span class="chk-math-dec">(Dec ${parseInt(words[0] || '0', 2)})</span></div>
                        <div class="chk-math-divider"></div>
                        <div class="chk-math-line chk-math-sum"><span class="chk-math-lbl">Final Sum (Σ):</span><span class="chk-math-bits chk-color-cyan">${res.final_sum}</span><span class="chk-math-dec">(Dec ${parseInt(res.final_sum || '0', 2)})</span></div>
                    </div>
                </div>
            `;
        } else {
            trace.forEach((step, idx) => {
                const isCarry = step.carry_occurred;
                const carryBadge = isCarry
                    ? `<span class="chk-tag-carry"><i class="fa-solid fa-arrow-rotate-right"></i> End-Around Carry (+${step.carry_val || 1})</span>`
                    : `<span class="chk-tag-nocarry"><i class="fa-solid fa-check"></i> No Carry</span>`;

                let carryLinesHtml = '';
                if (isCarry) {
                    carryLinesHtml = `
                        <div class="chk-math-line chk-math-raw">
                            <span class="chk-math-lbl">Raw Sum (${wSize+1}b):</span>
                            <span class="chk-math-bits"><span class="chk-carry-digit">${step.carry_val || '1'}</span> <span class="chk-unwrapped-digits">${step.unwrapped_part || ''}</span></span>
                            <span class="chk-math-dec">(Dec ${step.raw_sum_dec})</span>
                        </div>
                        <div class="chk-math-line chk-math-wrap">
                            <span class="chk-math-lbl">Wrap Carry:</span>
                            <span class="chk-math-bits">+ <span class="chk-carry-digit">${step.carry_val || '1'}</span></span>
                            <span class="chk-math-dec" style="color:var(--color-warning);">(Add carry to LSB)</span>
                        </div>
                        <div class="chk-math-divider"></div>
                    `;
                }

                mathStepsHtml += `
                    <div class="chk-math-card">
                        <div class="chk-math-header">
                            <span class="chk-math-title"><i class="fa-solid fa-plus"></i> Addition ${idx + 1}: Accumulator + ${step.operand_b_label}</span>
                            ${carryBadge}
                        </div>
                        <div class="chk-blackboard">
                            <div class="chk-math-line">
                                <span class="chk-math-lbl">${idx === 0 ? 'Word 1 (W1):' : 'Accumulator:'}</span>
                                <span class="chk-math-bits">${step.operand_a}</span>
                                <span class="chk-math-dec">(Dec ${step.operand_a_dec ?? parseInt(step.operand_a, 2)})</span>
                            </div>
                            <div class="chk-math-line">
                                <span class="chk-math-lbl">+ ${step.operand_b_label}:</span>
                                <span class="chk-math-bits">${step.operand_b}</span>
                                <span class="chk-math-dec">(Dec ${step.operand_b_dec ?? parseInt(step.operand_b, 2)})</span>
                            </div>
                            <div class="chk-math-divider"></div>
                            ${carryLinesHtml}
                            <div class="chk-math-line chk-math-sum">
                                <span class="chk-math-lbl">Accumulator:</span>
                                <span class="chk-math-bits chk-color-cyan">${step.result_sum}</span>
                                <span class="chk-math-dec">(Dec ${step.result_sum_dec ?? parseInt(step.result_sum, 2)})</span>
                            </div>
                        </div>
                    </div>
                `;
            });
        }

        // 3. Final Checksum Inversion Card
        const finalInversionCardHtml = `
            <div class="chk-math-card chk-math-final-card">
                <div class="chk-math-header">
                    <span class="chk-math-title"><i class="fa-solid fa-shield-halved" style="color:var(--accent-teal);"></i> Final Checksum Generation (Bitwise Inversion / 1's Complement)</span>
                    <span class="chk-tag-transmitted">TRANSMITTED CHECKSUM</span>
                </div>
                <div class="chk-blackboard">
                    <div class="chk-math-line">
                        <span class="chk-math-lbl">Final Sum (Σ):</span>
                        <span class="chk-math-bits chk-color-cyan">${res.final_sum}</span>
                        <span class="chk-math-dec">(Dec ${parseInt(res.final_sum || '0', 2)})</span>
                    </div>
                    <div class="chk-math-line">
                        <span class="chk-math-lbl">Invert Bits (~Σ):</span>
                        <span class="chk-math-bits" style="color:var(--text-muted);">~ ( ${res.final_sum} )</span>
                        <span class="chk-math-dec">(Flip 0 ↔ 1)</span>
                    </div>
                    <div class="chk-math-divider"></div>
                    <div class="chk-math-line chk-math-sum">
                        <span class="chk-math-lbl" style="color:var(--accent-teal); font-weight:800;">CHECKSUM:</span>
                        <span class="chk-math-bits chk-color-teal" style="font-weight:800; font-size:1.15rem;">${res.checksum}</span>
                        <span class="chk-math-dec" style="color:var(--accent-teal); font-weight:700;">Hex ${hexChk}</span>
                    </div>
                </div>
            </div>
        `;

        return `
            <div class="checksum-studio-container">
                ${hudHtml}
                <div class="chk-math-steps-grid">
                    ${mathStepsHtml}
                    ${finalInversionCardHtml}
                </div>
            </div>
        `;
    }

    /** Render Digital Signal Waveform (TTL / Logic Analyzer Pulse Train) */
    function renderDigitalWaveform(bitString, errorIndices = new Set()) {
        if (!bitString || !/^[01]+$/.test(bitString)) return '';
        const cleanBits = bitString.slice(0, 32);
        const bitWidth = 26;
        const svgWidth = Math.max(320, cleanBits.length * bitWidth + 24);
        const svgHeight = 44;
        const highY = 8;
        const lowY = 28;
        let d = `M 10 ${(cleanBits[0] === '1') ? highY : lowY} `;
        let labelsHtml = '';
        let x = 10;

        for (let i = 0; i < cleanBits.length; i++) {
            const bit = cleanBits[i];
            const isErr = errorIndices.has(i);
            const y = (bit === '1') ? highY : lowY;
            d += `V ${y} H ${x + bitWidth} `;
            labelsHtml += `<span class="wave-bit-label ${isErr ? 'wave-bit-err' : ''}" style="left:${x + bitWidth / 2}px">${bit}${isErr ? '⚡' : ''}</span>`;
            x += bitWidth;
        }

        return `
            <div class="digital-waveform-card">
                <div class="waveform-header">
                    <span class="waveform-title"><i class="fa-solid fa-wave-square"></i> DIGITAL TTL SIGNAL WAVEFORM (LOGIC ANALYZER)</span>
                    <span class="waveform-meta">${cleanBits.length} Bits Stream • NRZ-L Signaling</span>
                </div>
                <div class="waveform-scroll-area">
                    <div class="waveform-svg-wrap" style="width:${svgWidth}px;">
                        <svg class="waveform-svg" width="${svgWidth}" height="${svgHeight}">
                            <line x1="0" y1="${highY}" x2="${svgWidth}" y2="${highY}" stroke="rgba(255,255,255,0.06)" stroke-dasharray="3 3" />
                            <line x1="0" y1="${lowY}" x2="${svgWidth}" y2="${lowY}" stroke="rgba(255,255,255,0.06)" stroke-dasharray="3 3" />
                            <path d="${d}" fill="none" stroke="var(--accent-cyan)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
                        </svg>
                        <div class="wave-bits-overlay">${labelsHtml}</div>
                    </div>
                </div>
            </div>
        `;
    }

    /** Hamming Distance pair comparison table */
    function renderHammingDistanceComparisonTable(comp) {
        if (!comp || !comp.length) return '';
        let html = '<div class="hdist-table-container"><table class="hdist-matrix-table"><thead><tr><th>Position</th>';
        comp.forEach(item => { html += `<th>${item.pos}</th>`; });
        html += '</tr></thead><tbody>';

        const rows = [
            { label: 'Codeword 1', key: 'bit1' },
            { label: 'Codeword 2', key: 'bit2' },
            { label: 'Match',      key: null, special: 'match' },
            { label: 'XOR',        key: 'xor_bit' }
        ];

        rows.forEach(row => {
            html += `<tr><th>${row.label}</th>`;
            comp.forEach(item => {
                const isDiff = !item.match;
                const cls    = isDiff ? 'bit-diff-cell' : '';
                if (row.special === 'match') {
                    html += `<td class="${cls}">${item.match ? '✓' : '✗'}</td>`;
                } else {
                    html += `<td class="${cls}">${item[row.key]}</td>`;
                }
            });
            html += '</tr>';
        });

        html += '</tbody></table></div>';
        return html;
    }

    /** Hamming Distance pairwise matrix (mode B) */
    function renderHammingDistanceMatrixTable(res) {
        if (!res || !res.pairwise_matrix || !res.codewords) return '';
        const cws = res.codewords;
        const mat = res.pairwise_matrix;
        const dMin = res.d_min;

        let html = '<div class="hdist-table-container"><table class="hdist-matrix-table"><thead><tr><th>d(·,·)</th>';
        cws.forEach((cw, j) => { html += `<th>C${j+1}</th>`; });
        html += '</tr></thead><tbody>';
        cws.forEach((cw, i) => {
            html += `<tr><th>C${i+1} <span style="font-size:0.72rem;color:var(--text-muted);">${cw}</span></th>`;
            cws.forEach((_, j) => {
                const d = mat[i][j];
                if (i === j) html += `<td class="hdist-cell-diag">—</td>`;
                else if (d === dMin) html += `<td class="hdist-cell-min">${d}</td>`;
                else html += `<td>${d}</td>`;
            });
            html += '</tr>';
        });
        html += '</tbody></table></div>';
        return html;
    }

    /** CRC Structured Division Table */
    function renderCRCDivisionTable(steps) {
        if (!steps || !steps.length) return '';

        // Parse raw step strings into structured rows
        const rows = [];
        steps.forEach((s, idx) => {
            if (idx === 0) return; // Skip the setup line
            // Extract: "Step N: [explanation]"
            const match = s.match(/Step (\d+): (.+)/);
            if (!match) return;
            const stepNum = match[1];
            const desc    = match[2];

            // Extract dividend/XOR/remainder segments from description
            const xorMatch = desc.match(/'([01]+)' \^ '([01]+)' = '([01]+)'/);
            const remMatch = desc.match(/Final Remainder = '([01]+)'/);
            const isFinal  = desc.includes('Final Remainder');

            if (xorMatch) {
                rows.push({
                    step: stepNum,
                    dividend: xorMatch[1],
                    divisor:  xorMatch[2],
                    result:   xorMatch[3],
                    final:    isFinal,
                    remainder: remMatch ? remMatch[1] : null
                });
            }
        });

        if (!rows.length) return '';

        let html = `<div style="overflow-x:auto;"><table class="crc-division-table">
            <thead><tr>
                <th>Step</th>
                <th>Current Segment</th>
                <th>Divisor (XOR)</th>
                <th>Result</th>
                <th>Remainder</th>
            </tr></thead><tbody>`;

        rows.forEach(row => {
            const cls = row.final ? ' class="crc-final-row"' : '';
            html += `<tr${cls}>
                <td class="crc-step-num">${row.step}</td>
                <td><code>${row.dividend}</code></td>
                <td><code>${row.divisor}</code></td>
                <td><code>${row.result}</code></td>
                <td class="${row.remainder !== null ? 'crc-remainder' : ''}">${row.remainder !== null ? row.remainder : '—'}</td>
            </tr>`;
        });

        html += '</tbody></table></div>';
        return html;
    }

    // ═══════════════════════════════════════════════════════════
    // MAIN API CALL & RENDERING
    // ═══════════════════════════════════════════════════════════
    async function processSimulatorData(actionOverride) {
        const startTime = performance.now();
        const payload   = buildRequestPayload(actionOverride);
        if (!payload) return;

        // UI: Running state
        setPipelineState('running');
        if (processBtn) {
            processBtn.disabled = true;
            processBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> TRANSMITTING...';
        }
        if (resultStatusIndicator) {
            resultStatusIndicator.className = 'status-indicator-badge neutral';
            resultStatusIndicator.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> TRANSMITTING FRAME...';
        }

        try {
            const response = await fetch('/api/process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data    = await response.json();
            const elapsed = Math.round(performance.now() - startTime);

            if (tLatency) tLatency.textContent = `${elapsed} ms`;

            if (data.success && data.result) {
                const res = data.result;

                // Validation error
                if (res.success === false) {
                    setPipelineState('error');
                    if (resultStatusIndicator) {
                        resultStatusIndicator.className = 'status-indicator-badge error-detected';
                        resultStatusIndicator.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> VALIDATION ERROR';
                    }
                    if (tCorrection) { tCorrection.textContent = 'INVALID INPUT'; tCorrection.className = 'hud-val t-danger'; }
                    if (outputEncoded)  outputEncoded.textContent  = 'VALIDATION ERROR';
                    if (outputReceived) outputReceived.textContent = res.error || 'Invalid input payload';
                    if (outputDecoded)  outputDecoded.textContent  = `Input: ${payload.input_data}`;
                    if (stepByStepDisplay) stepByStepDisplay.innerHTML = `<div class="step-row error-step"><i class="fa-solid fa-circle-exclamation"></i> <strong>Validation Error:</strong> ${res.error}</div>`;
                    return;
                }

                renderResult(res, payload, elapsed);

            } else {
                setPipelineState('error');
                if (resultStatusIndicator) {
                    resultStatusIndicator.className = 'status-indicator-badge error-detected';
                    resultStatusIndicator.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> SERVER ERROR';
                }
                if (stepByStepDisplay) stepByStepDisplay.innerHTML = `<div class="step-row error-step"><i class="fa-solid fa-triangle-exclamation"></i> ${data.error || 'Server processing error.'}</div>`;
            }

        } catch (err) {
            console.error('API Error:', err);
            setPipelineState('error');
            if (resultStatusIndicator) {
                resultStatusIndicator.className = 'status-indicator-badge error-detected';
                resultStatusIndicator.innerHTML = '<i class="fa-solid fa-plug-circle-xmark"></i> CONNECTION ERROR';
            }
            if (stepByStepDisplay) stepByStepDisplay.innerHTML = `<div class="step-row error-step"><i class="fa-solid fa-plug-circle-xmark"></i> Failed to connect to /api/process.</div>`;
        } finally {
            if (processBtn) {
                processBtn.disabled = false;
                processBtn.innerHTML = '<i class="fa-solid fa-play"></i> RUN SIMULATION';
            }
        }
    }

    function renderResult(res, payload, elapsed) {
        const tech = currentTechnique;

        // ── Byte Stuffing ──
        if (tech === 'byte_stuffing') {
            const flag = payload.params.flag || 'F';
            const esc  = payload.params.esc  || 'E';

            if (res.action === 'stuff') {
                lastTransmittedText = res.stuffed_frame || '';
                lastInputDataForFrame = res.original_data || '';
                lastFlagForFrame = flag;
                lastEscForFrame = esc;

                setPipelineState('success');
                setStatus('success', `<i class="fa-solid fa-check-circle"></i> FRAME STUFFED (Ready to De-stuff)`);
                if (outputEncoded)  outputEncoded.textContent = res.stuffed_frame;
                if (outputReceived) outputReceived.innerHTML  = renderStuffedTokens(res.stuffed_tokens) || escapeHtml(res.stuffed_frame);
                if (outputDecoded)  outputDecoded.textContent = `— Frame Ready. Click 'De-stuff Frame' to Decode —`;
                updateTelemetry({ encoded: res.stuffed_frame, errorPos: '—', status: 'STUFFED', statusClass: 't-success' });

                if (errorInputField && !enableErrorToggle?.checked) {
                    errorInputField.value = res.stuffed_frame;
                }
            } else if (res.action === 'destuff') {
                const ok = res.destuff_success && res.integrity_match;
                const destuffOk = res.destuff_success;
                setPipelineState(ok ? 'success' : 'error');

                let statusText = '';
                if (ok) {
                    statusText = '<i class="fa-solid fa-shield-check"></i> DE-STUFFING SUCCESS (Verified)';
                } else if (!destuffOk) {
                    statusText = `<i class="fa-solid fa-triangle-exclamation"></i> DE-STUFFING FAILED: ${res.error || 'Invalid Frame'}`;
                } else {
                    statusText = '<i class="fa-solid fa-triangle-exclamation"></i> DE-STUFFING MISMATCH (Data Differed)';
                }
                setStatus(ok ? 'success' : 'error-detected', statusText);

                const currentOrig = payload.params.original_data || primaryInput?.value.trim() || '';
                if (outputEncoded)  outputEncoded.textContent = lastTransmittedText || computeGenericByteStuffing(currentOrig, flag, esc) || payload.input_data;
                if (outputReceived) outputReceived.textContent = payload.input_data;
                if (outputDecoded)  outputDecoded.textContent  = destuffOk ? res.destuffed_data : `Failed: ${res.error || 'Invalid frame delimiters'}`;
                updateTelemetry({ encoded: payload.input_data, errorPos: ok ? 'None' : 'Error', status: ok ? 'SUCCESS' : 'FAILED', statusClass: ok ? 't-success' : 't-danger' });
            } else {
                // Full cycle
                lastTransmittedText = res.stuffed_frame || '';
                lastInputDataForFrame = res.original_data || '';
                lastFlagForFrame = flag;
                lastEscForFrame = esc;

                const ok = res.integrity_match;
                const destuffOk = res.destuff_success;
                const frameCorrupted = res.received_frame !== res.stuffed_frame;

                setPipelineState(ok ? 'success' : 'error');
                
                let statusText = '';
                if (ok) {
                    statusText = '<i class="fa-solid fa-shield-check"></i> TRANSMISSION VERIFIED';
                } else if (!destuffOk) {
                    statusText = `<i class="fa-solid fa-triangle-exclamation"></i> RECOVERY FAILED: ${res.destuff_error || 'Invalid Frame'}`;
                } else {
                    statusText = '<i class="fa-solid fa-triangle-exclamation"></i> FRAME MISMATCH (Corrupted in Channel)';
                }
                setStatus(ok ? 'success' : 'error-detected', statusText);

                // Box 1: Transmitted Frame (FLAG + StuffedData + FLAG)
                if (outputEncoded)  outputEncoded.textContent = res.stuffed_frame;

                // Box 2: Received Frame
                if (outputReceived) {
                    if (frameCorrupted) {
                        outputReceived.innerHTML = `<span style="color:var(--color-danger); font-weight:600;"><i class="fa-solid fa-bolt"></i> ${escapeHtml(res.received_frame)}</span>`;
                    } else {
                        outputReceived.innerHTML = renderStuffedTokens(res.stuffed_tokens) || escapeHtml(res.stuffed_frame);
                    }
                }

                // Box 3: Decoded / Verified Result
                if (outputDecoded) {
                    if (destuffOk) {
                        outputDecoded.textContent = ok ? res.destuffed_data : `${res.destuffed_data} [FRAME MISMATCH]`;
                    } else {
                        outputDecoded.textContent = `Failed: ${res.destuff_error || 'Recovery failed'}`;
                    }
                }

                // If error injector is open, update its field with the transmitted frame if clean
                if (errorInputField && !enableErrorToggle?.checked) {
                    errorInputField.value = res.stuffed_frame;
                }

                const errPosLabel = frameCorrupted ? 'Channel Noise' : 'None';
                const statusLabel = ok ? 'SUCCESS' : (destuffOk ? 'MISMATCH' : 'FAILED');
                updateTelemetry({ encoded: res.stuffed_frame, errorPos: errPosLabel, status: statusLabel, statusClass: ok ? 't-success' : 't-danger' });
            }
        }

        // ── Bit Stuffing ──
        else if (tech === 'bit_stuffing') {
            const flagPattern = payload.params.flag_pattern || '01111110';

            if (res.action === 'stuff') {
                lastBitTransmittedFrame = res.stuffed_frame || '';
                lastBitInputData = res.original_data || '';
                lastBitFlagPattern = flagPattern;

                setPipelineState('success');
                setStatus('success', '<i class="fa-solid fa-check-circle"></i> BIT-STREAM STUFFED (Ready to De-stuff)');
                if (outputEncoded)  outputEncoded.textContent   = res.stuffed_frame;
                if (outputReceived) outputReceived.innerHTML    = renderStuffedTokens(res.stuffed_tokens) || escapeHtml(res.stuffed_frame);
                if (outputDecoded)  outputDecoded.textContent   = `— Frame Ready. Click 'De-stuff Frame' to Decode —`;
                updateTelemetry({ encoded: res.stuffed_frame, errorPos: '—', status: 'STUFFED', statusClass: 't-success' });

                // Populate bit grid with complete transmitted frame
                setCleanBitsForInjector(res.stuffed_frame);

            } else if (res.action === 'destuff') {
                const ok = res.destuff_success && res.integrity_match;
                const destuffOk = res.destuff_success;
                setPipelineState(ok ? 'success' : 'error');

                let statusText = '';
                if (ok) {
                    statusText = '<i class="fa-solid fa-shield-check"></i> DE-STUFFING SUCCESS (Verified)';
                } else if (!destuffOk) {
                    statusText = `<i class="fa-solid fa-triangle-exclamation"></i> DE-STUFFING FAILED: ${res.error || 'Invalid Frame'}`;
                } else {
                    statusText = '<i class="fa-solid fa-triangle-exclamation"></i> DE-STUFFING MISMATCH (Data Differed)';
                }
                setStatus(ok ? 'success' : 'error-detected', statusText);

                const currentOrig = payload.params.original_data || primaryInput?.value.trim() || '';
                if (outputEncoded)  outputEncoded.textContent = lastBitTransmittedFrame || computeGenericBitStuffing(currentOrig, flagPattern) || payload.input_data;
                if (outputReceived) outputReceived.textContent = payload.input_data;
                if (outputDecoded)  outputDecoded.textContent  = destuffOk ? res.destuffed_data : `Failed: ${res.error || 'Invalid frame delimiters'}`;
                updateTelemetry({ encoded: payload.input_data, errorPos: ok ? 'None' : 'Error', status: ok ? 'SUCCESS' : 'FAILED', statusClass: ok ? 't-success' : 't-danger' });

            } else {
                // Full cycle
                lastBitTransmittedFrame = res.stuffed_frame || '';
                lastBitInputData = res.original_data || '';
                lastBitFlagPattern = flagPattern;

                const ok = res.integrity_match;
                const destuffOk = res.destuff_success;
                const frameCorrupted = res.received_frame !== res.stuffed_frame;

                setPipelineState(ok ? 'success' : 'error');

                let statusText = '';
                if (ok) {
                    statusText = '<i class="fa-solid fa-shield-check"></i> TRANSMISSION VERIFIED';
                } else if (!destuffOk) {
                    statusText = `<i class="fa-solid fa-triangle-exclamation"></i> RECOVERY FAILED: ${res.destuff_error || 'Invalid Frame'}`;
                } else {
                    statusText = '<i class="fa-solid fa-triangle-exclamation"></i> FRAME MISMATCH (Corrupted in Channel)';
                }
                setStatus(ok ? 'success' : 'error-detected', statusText);

                // Box 1: Transmitted Frame (FLAG + StuffedPayload + FLAG)
                if (outputEncoded)  outputEncoded.textContent = res.stuffed_frame;

                // Box 2: Received Frame
                if (outputReceived) {
                    if (frameCorrupted) {
                        outputReceived.innerHTML = `<span style="color:var(--color-danger); font-weight:600;"><i class="fa-solid fa-bolt"></i> ${escapeHtml(res.received_frame)}</span>`;
                    } else {
                        outputReceived.innerHTML = renderStuffedTokens(res.stuffed_tokens) || escapeHtml(res.stuffed_frame);
                    }
                }

                // Box 3: Decoded / Verified Result
                if (outputDecoded) {
                    if (destuffOk) {
                        outputDecoded.textContent = ok ? res.destuffed_data : `${res.destuffed_data} [FRAME MISMATCH]`;
                    } else {
                        outputDecoded.textContent = `Failed: ${res.destuff_error || 'Recovery failed'}`;
                    }
                }

                // Populate bit grid with complete transmitted frame
                setCleanBitsForInjector(res.stuffed_frame);

                const errPosLabel = frameCorrupted ? (res.error_details || 'Noise Detected') : 'None';
                const statusLabel = ok ? 'SUCCESS' : (destuffOk ? 'MISMATCH' : 'FAILED');
                updateTelemetry({ encoded: res.stuffed_frame, errorPos: errPosLabel, status: statusLabel, statusClass: ok ? 't-success' : 't-danger' });
            }
        }

        // ── Parity ──
        else if (tech === 'parity') {
            const hasErr   = res.error_detected;
            const injected = res.error_injected;
            const ep       = res.error_pos || (injected && res.error_details ? res.error_details.match(/position (\d+)/)?.[1] : null);
            const state    = hasErr ? 'error' : 'success';

            setPipelineState(state);
            let statusText = '';
            if (hasErr) {
                statusText = `<i class="fa-solid fa-triangle-exclamation"></i> PARITY ERROR DETECTED${ep ? ` (Bit #${ep} Flipped)` : ''}`;
            } else if (injected && !hasErr) {
                statusText = '<i class="fa-solid fa-circle-info"></i> ERROR UNDETECTED (Even Count Error Limitation)';
            } else {
                statusText = '<i class="fa-solid fa-shield-check"></i> NO ERROR (Parity Verified)';
            }
            setStatus(hasErr ? 'error-detected' : 'success', statusText);

            if (res.mode === '1D') {
                if (outputEncoded)  outputEncoded.textContent  = `Payload: ${res.original_data}  |  Parity Bit: ${res.parity_bit} (${res.parity_type.toUpperCase()})`;

                if (outputReceived) {
                    if (injected && res.received_codeword) {
                        const origCw = res.encoded_codeword || '';
                        const recvCw = res.received_codeword;
                        let bitHtml = '<div style="display:flex; gap:6px; flex-wrap:wrap; align-items:center;">';
                        for (let i = 0; i < recvCw.length; i++) {
                            const isFlipped = origCw[i] !== undefined && origCw[i] !== recvCw[i];
                            const isParityBit = (i === recvCw.length - 1);
                            if (isFlipped) {
                                bitHtml += `<span class="badge" style="padding:4px 9px; font-size:0.92rem; font-family:var(--font-code); font-weight:700; background:rgba(239,68,68,0.22); border:1px solid #ef4444; color:#fca5a5; border-radius:6px;" title="Bit #${i+1} flipped (${origCw[i]} → ${recvCw[i]})">${recvCw[i]} <small style="font-size:0.65rem; opacity:0.85;">[FLIPPED #${i+1}]</small></span>`;
                            } else if (isParityBit) {
                                bitHtml += `<span class="badge" style="padding:4px 9px; font-size:0.92rem; font-family:var(--font-code); font-weight:700; background:rgba(168,85,247,0.2); border:1px solid #a855f7; color:#d8b4fe; border-radius:6px;" title="Parity Bit (${res.parity_type})">${recvCw[i]} <small style="font-size:0.65rem; opacity:0.85;">[PARITY]</small></span>`;
                            } else {
                                bitHtml += `<span class="badge" style="padding:4px 8px; font-size:0.92rem; font-family:var(--font-code); font-weight:600; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.15); border-radius:6px;" title="Data bit #${i+1}">${recvCw[i]}</span>`;
                            }
                        }
                        bitHtml += '</div>';
                        outputReceived.innerHTML = bitHtml;
                    } else {
                        outputReceived.textContent = `Encoded Codeword: ${res.encoded_codeword}`;
                    }
                }

                if (outputDecoded) {
                    if (injected) {
                        outputDecoded.innerHTML = `<span style="color:var(--color-danger); font-weight:600;"><i class="fa-solid fa-triangle-exclamation"></i> Error Detected (Bit #${ep || '?'} Flipped)</span> — Parity check failed on received codeword '${res.received_codeword}'`;
                    } else {
                        outputDecoded.textContent = `Payload Intact: ${res.original_data}  |  Parity: ${res.parity_bit} (${res.parity_type.toUpperCase()})`;
                    }
                }

                const errPosLabel = injected ? `Bit #${ep || '?'}` : 'None';
                updateTelemetry({ encoded: res.received_codeword || res.encoded_codeword || '—', errorPos: errPosLabel, status: hasErr ? 'ERROR DETECTED' : (injected ? 'UNDETECTED' : 'VALID'), statusClass: hasErr ? 't-danger' : 't-success' });

            } else {
                // 2D Mode
                const pin = res.pinpointed_location;
                const cell = res.corrupted_cell || pin;
                if (outputEncoded)  outputEncoded.textContent  = `2D Grid (${res.rows}×${res.columns}) | ${res.parity_type.toUpperCase()} Parity`;
                if (outputReceived) outputReceived.innerHTML   = render2DParityMatrix(res);

                if (outputDecoded) {
                    if (pin) {
                        outputDecoded.innerHTML = `<span style="color:var(--color-danger); font-weight:600;"><i class="fa-solid fa-crosshairs"></i> Single-Bit Error Pinpointed</span> — Row ${pin.row}, Column ${pin.col} (Parity Mismatch Detected)`;
                    } else if (hasErr) {
                        outputDecoded.innerHTML = `<span style="color:var(--color-danger); font-weight:600;"><i class="fa-solid fa-triangle-exclamation"></i> 2D Parity Mismatch</span> — Rows: [${res.mismatched_rows?.join(', ') || '—'}], Cols: [${res.mismatched_cols?.join(', ') || '—'}]`;
                    } else {
                        outputDecoded.textContent = `2D Block Matrix Parity Verified (${res.rows} rows × ${res.columns} cols) — All parities intact`;
                    }
                }

                if (hasErr) {
                    statusText = pin
                        ? `<i class="fa-solid fa-crosshairs"></i> 2D ERROR PINPOINTED (Row ${pin.row}, Col ${pin.col})`
                        : '<i class="fa-solid fa-triangle-exclamation"></i> 2D PARITY MISMATCH DETECTED';
                    setStatus('error-detected', statusText);
                }

                const errPosLabel = cell ? `Row ${cell.row}, Col ${cell.col}` : (hasErr ? 'Detected' : 'None');
                updateTelemetry({
                    encoded: (res.matrix_rows ? res.matrix_rows.join(' ') : '—'),
                    errorPos: errPosLabel,
                    status: hasErr ? (pin ? 'PINPOINTED' : 'ERROR') : 'VALID',
                    statusClass: hasErr ? 't-danger' : 't-success'
                });
            }
        }

        // ── Internet Checksum ──
        else if (tech === 'checksum') {
            const hasErr   = res.error_detected;
            const injected = res.error_injected;
            const state    = hasErr ? 'error' : 'success';
            const ep       = res.error_pos;
            const wSize    = res.word_size || 8;

            setPipelineState(state);
            let statusText = '';
            if (hasErr) {
                statusText = `<i class="fa-solid fa-triangle-exclamation"></i> CHECKSUM ERROR DETECTED${ep ? ` (Bit #${ep} Flipped)` : ''}`;
            } else if (injected && !hasErr) {
                statusText = '<i class="fa-solid fa-circle-info"></i> ERROR UNDETECTED (Compensating Error)';
            } else {
                statusText = `<i class="fa-solid fa-shield-check"></i> CHECKSUM VERIFIED (${wSize}-Bit 1's Complement Sum = All 1s)`;
            }
            setStatus(hasErr ? 'error-detected' : 'success', statusText);

            // Box 1: Encoded / Transmitted
            if (outputEncoded) {
                outputEncoded.innerHTML = renderChecksumEncodedSection(res);
            }

            // Box 2: Received Frame
            if (outputReceived) {
                const recvWords = res.received_words || [];
                const recvChk = res.received_checksum || '';
                const origFrame = res.transmitted_frame || '';
                const recvFrame = res.received_frame || '';
                const wSize = res.word_size || 8;

                let wordsHtml = '<div class="chk-recv-stream-wrap">';
                recvWords.forEach((w, idx) => {
                    const wordStart = idx * wSize;
                    const origWord = origFrame.substr(wordStart, wSize);
                    const isWordErr = (origWord && origWord !== w);
                    const cls = isWordErr ? 'chk-word-badge chk-word-corrupted' : 'chk-word-badge';
                    const icon = isWordErr ? '<i class="fa-solid fa-triangle-exclamation" style="color:#ef4444; margin-right:4px;"></i>' : '';
                    wordsHtml += `
                        <div class="${cls}">
                            <span class="chk-word-tag">${icon}Word ${idx+1}</span>
                            <span class="chk-word-val code-font">${w}</span>
                        </div>
                    `;
                });

                if (recvChk) {
                    const chkStart = recvWords.length * wSize;
                    const origChk = origFrame.substr(chkStart, wSize);
                    const isChkErr = (origChk && origChk !== recvChk);
                    const cls = isChkErr ? 'chk-word-badge chk-chk-corrupted' : 'chk-word-badge chk-chk-badge';
                    const icon = isChkErr ? '<i class="fa-solid fa-triangle-exclamation" style="color:#ef4444; margin-right:4px;"></i>' : '<i class="fa-solid fa-shield-halved" style="margin-right:4px;"></i>';
                    wordsHtml += `
                        <div class="${cls}">
                            <span class="chk-word-tag">${icon}Checksum</span>
                            <span class="chk-word-val code-font">${recvChk}</span>
                        </div>
                    `;
                }
                wordsHtml += '</div>';
                outputReceived.innerHTML = wordsHtml;
            }

            // Box 3: Decoded / Verified Result
            if (outputDecoded) {
                if (hasErr) {
                    outputDecoded.innerHTML = `
                        <div class="chk-verify-box chk-verify-error">
                            <div class="chk-verify-badge-err"><i class="fa-solid fa-triangle-exclamation"></i> CHECKSUM MISMATCH (TRANSMISSION ERROR)</div>
                            <div class="chk-verify-details">
                                <span>Receiver 1's Sum: <code class="code-font font-bold">${res.receiver_sum}</code></span>
                                <span>Inverted (~Sum): <code class="code-font font-bold" style="color:#ef4444;">${res.receiver_inverted_sum}</code> <small style="color:#f87171;">(Non-zero ✗)</small></span>
                            </div>
                        </div>
                    `;
                } else {
                    outputDecoded.innerHTML = `
                        <div class="chk-verify-box chk-verify-success">
                            <div class="chk-verify-badge-ok"><i class="fa-solid fa-shield-check"></i> CHECKSUM VERIFIED (DATA INTEGRITY INTACT)</div>
                            <div class="chk-verify-details">
                                <span>Receiver 1's Sum: <code class="code-font font-bold" style="color:#34d399;">${res.receiver_sum}</code> <small style="color:#34d399;">(All 1s)</small></span>
                                <span>Inverted (~Sum): <code class="code-font font-bold" style="color:#34d399;">${res.receiver_inverted_sum}</code> <small style="color:#34d399;">(All 0s ✓)</small></span>
                            </div>
                        </div>
                    `;
                }
            }

            // Populate clean bits for error injector
            if (res.transmitted_frame) {
                setCleanBitsForInjector(res.transmitted_frame);
            }

            const errPosLabel = injected ? (res.error_details || `Bit #${ep || '?'}`) : 'None';
            updateTelemetry({
                encoded:     res.checksum ? `Sum: ${res.final_sum} | Chk: ${res.checksum}` : (res.transmitted_frame || '—'),
                errorPos:    errPosLabel,
                status:      hasErr ? 'CHECKSUM ERROR' : 'VERIFIED',
                statusClass: hasErr ? 't-danger' : 't-success'
            });
        }

        // ── CRC ──
        else if (tech === 'crc') {
            if (res.action === 'encode') {
                setPipelineState('success');
                setStatus('success', '<i class="fa-solid fa-check-circle"></i> CRC ENCODED');
                if (outputEncoded)  outputEncoded.textContent  = `Data: ${res.original_data}  |  Appended: ${res.appended_data}`;
                if (outputReceived) outputReceived.innerHTML   = renderCRCDivisionTable(res.steps) || `Remainder: ${res.crc_remainder}`;
                if (outputDecoded)  outputDecoded.textContent  = `Transmitted Codeword: ${res.transmitted_codeword}`;
                if (res.transmitted_codeword) setCleanBitsForInjector(res.transmitted_codeword);
                updateTelemetry({ encoded: res.transmitted_codeword, errorPos: '—', status: `R = ${res.crc_remainder}`, statusClass: 't-success' });

            } else if (res.action === 'check') {
                const hasErr = res.error_detected;
                setPipelineState(hasErr ? 'error' : 'success');
                setStatus(hasErr ? 'error-detected' : 'success',
                    hasErr ? '<i class="fa-solid fa-triangle-exclamation"></i> ERROR (Non-zero Remainder)'
                           : '<i class="fa-solid fa-shield-check"></i> NO ERROR (Remainder = 0)');
                if (outputEncoded)  outputEncoded.textContent  = 'N/A — Check mode';
                if (outputReceived) outputReceived.textContent = `Received: ${res.received_codeword}`;
                if (outputDecoded)  outputDecoded.textContent  = `Receiver Remainder: ${res.received_remainder}`;
                updateTelemetry({ encoded: res.received_codeword, errorPos: hasErr ? 'Non-zero R' : 'None', status: hasErr ? 'ERROR' : 'CLEAN', statusClass: hasErr ? 't-danger' : 't-success' });

            } else {
                // Full cycle
                const hasErr = res.error_detected;
                setPipelineState(hasErr ? 'error' : 'success');
                setStatus(hasErr ? 'error-detected' : 'success',
                    hasErr ? '<i class="fa-solid fa-triangle-exclamation"></i> CRC ERROR (Non-zero Remainder)'
                           : '<i class="fa-solid fa-shield-check"></i> CRC VERIFIED (Remainder = 0)');
                if (outputEncoded)  outputEncoded.textContent  = `Payload: ${res.original_data}  |  CRC Remainder: ${res.crc_remainder}`;
                if (outputReceived) outputReceived.innerHTML   = renderCRCDivisionTable(res.steps) || `Received: ${res.received_codeword}`;
                if (outputDecoded)  outputDecoded.textContent  = `Receiver Remainder: ${res.received_remainder}  |  ${hasErr ? 'CORRUPTED' : 'DATA INTACT'}`;
                if (res.transmitted_codeword) setCleanBitsForInjector(res.transmitted_codeword);
                updateTelemetry({ encoded: res.transmitted_codeword, errorPos: hasErr ? 'Non-zero R' : 'None', status: hasErr ? 'ERROR' : 'VERIFIED', statusClass: hasErr ? 't-danger' : 't-success' });
            }
        }

        // ── Hamming Code ──
        else if (tech === 'hamming') {
            const hasErr   = res.error_detected;
            const state    = hasErr ? 'corrected' : 'success';
            const errPos   = res.error_position;
            const syndrome = res.syndrome_string;

            setPipelineState(state);
            setStatus(hasErr ? 'corrected' : 'success',
                hasErr ? `<i class="fa-solid fa-wrench"></i> AUTO-CORRECTED — Pos ${errPos} (Syndrome ${syndrome})`
                       : `<i class="fa-solid fa-circle-check"></i> HAMMING (${res.mode}) VERIFIED — Syndrome ${syndrome || '000'}`);

            if (outputEncoded) {
                outputEncoded.innerHTML = renderHammingEncodedSection(res);
            }

            const errColor = hasErr ? 'var(--color-error)' : 'var(--accent-cyan)';
            if (outputReceived) {
                outputReceived.innerHTML = `
                    <div>
                        <strong>Received:</strong> <code style="color:${errColor};font-weight:700;">${res.received_codeword}</code> &nbsp;|&nbsp;
                        <strong>Syndrome:</strong> <code style="color:${hasErr ? 'var(--color-warning)' : 'var(--color-success)'};font-weight:700;">${syndrome}</code> &nbsp;|&nbsp;
                        <strong>Error Pos:</strong> <code>${errPos === 0 ? 'None (Syndrome=0)' : 'Position ' + errPos}</code>
                    </div>`;
            }

            if (outputDecoded) {
                outputDecoded.innerHTML = `
                    <div style="display:flex;gap:14px;flex-wrap:wrap;align-items:center;">
                        <span><strong>Corrected:</strong> <code style="color:var(--color-success);font-weight:700;">${res.corrected_codeword}</code></span>
                        <span><strong>Extracted Data:</strong> <code style="color:var(--color-success);font-size:1.05rem;font-weight:800;">${res.extracted_data}</code></span>
                        <span class="badge ${res.integrity_match ? 'badge-success' : 'badge-danger'}" style="padding:3px 10px;border-radius:6px;background:${res.integrity_match ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'};color:${res.integrity_match ? 'var(--color-success)' : 'var(--color-error)'};">
                            ${res.integrity_match ? '✓ INTEGRITY MATCH' : '✗ INTEGRITY MISMATCH'}
                        </span>
                    </div>`;
            }

            // Populate interactive bit grid with the encoded codeword
            if (res.encoded_codeword) {
                const parityPos = res.pos_table ? res.pos_table.filter(p => p.is_parity).map(p => p.pos) : [];
                setCleanBitsForInjector(res.encoded_codeword, parityPos);
            }

            updateTelemetry({
                encoded:     res.encoded_codeword,
                errorPos:    hasErr ? `Pos ${errPos} (Syndrome ${syndrome})` : 'None',
                status:      hasErr ? `CORRECTED (Pos ${errPos})` : 'NO ERROR',
                statusClass: hasErr ? 't-success' : 't-success'
            });
        }

        // ── Hamming Distance ──
        else if (tech === 'hamming_distance') {
            if (res.mode === 'multi') {
                setPipelineState('success');
                setStatus('success', `<i class="fa-solid fa-ruler"></i> d_min = ${res.d_min}  |  Detectable: ${res.detectable_errors_s}  |  Correctable: ${res.correctable_errors_t}`);
                if (outputEncoded)  outputEncoded.textContent = `Codewords: [${res.codewords.join(', ')}]  |  Count: ${res.num_codewords}  |  Length: ${res.codeword_length}`;
                if (outputReceived) outputReceived.innerHTML  = renderHammingDistanceMatrixTable(res);
                if (outputDecoded)  outputDecoded.innerHTML   = `<strong>Error Capability:</strong> Detectable s = ${res.detectable_errors_s}  |  Correctable t = ${res.correctable_errors_t}`;
                updateTelemetry({ encoded: `d_min = ${res.d_min}`, errorPos: '—', status: `s=${res.detectable_errors_s}, t=${res.correctable_errors_t}`, statusClass: 't-success' });
            } else {
                setPipelineState('success');
                setStatus('success', `<i class="fa-solid fa-ruler-combined"></i> Hamming Distance d(c₁,c₂) = ${res.distance}`);
                if (outputEncoded)  outputEncoded.textContent = `C₁: ${res.codeword1}  |  C₂: ${res.codeword2}`;
                if (outputReceived) outputReceived.innerHTML  = renderHammingDistanceComparisonTable(res.comparison);
                if (outputDecoded)  outputDecoded.textContent = `XOR: ${res.xor_result}  |  Differing bits at: ${res.differing_positions.length ? res.differing_positions.join(', ') : 'None (Identical)'}`;
                updateTelemetry({ encoded: `d = ${res.distance}`, errorPos: '—', status: `Distance: ${res.distance}`, statusClass: 't-success' });
            }
        }

        // ── Step-by-step trace ──
        let stepsHtml = '';
        if (res.steps && res.steps.length) {
            res.steps.forEach(step => {
                let cls = 'step-row';
                if (/INSERTED|PINPOINTED|AUTO-CORRECTING|d_min|Distance =|FLAG|SYNDROME|CORRECTED/i.test(step)) cls += ' highlight-step';
                if (/FAILED|ERROR|Invalid|Notice:/i.test(step)) cls += ' error-step';
                stepsHtml += `<div class="${cls}">${step}</div>`;
            });
        }
        if (stepByStepDisplay) stepByStepDisplay.innerHTML = stepsHtml || '<div class="step-row">No trace generated.</div>';

        // ── Render Visual Chips ──
        renderChipsForEncoded(chipsEncoded, tech, res, payload);
        renderChipsForReceived(chipsReceived, tech, res, payload);
        renderChipsForDecoded(chipsDecoded, tech, res, payload);

        // ── Digital Signal Waveform Visualizer ──
        const waveformBox = document.getElementById('waveform-box');
        const outputWaveform = document.getElementById('output-waveform');
        if (waveformBox && outputWaveform) {
            const config = techniqueConfigs[tech];
            const bitStream = res.received_frame || res.received_codeword || res.transmitted_frame || res.transmitted_codeword || res.stuffed_frame || (config?.binaryModule && /^[01]+$/.test(res.original_data) ? res.original_data : null);

            if (bitStream && /^[01]+$/.test(bitStream)) {
                waveformBox.style.display = 'block';
                const errSet = new Set(flippedPositions);
                if (res.error_pos) errSet.add(res.error_pos - 1);
                outputWaveform.innerHTML = renderDigitalWaveform(bitStream, errSet);
            } else {
                waveformBox.style.display = 'none';
            }
        }
    }

    // ── Helpers for rendering ──
    function setStatus(cls, html) {
        if (resultStatusIndicator) {
            resultStatusIndicator.className = `status-indicator-badge ${cls}`;
            resultStatusIndicator.innerHTML = html;
        }
    }

    function updateTelemetry({ encoded, errorPos, status, statusClass }) {
        if (tEncodedOut) tEncodedOut.textContent = encoded ? (encoded.length > 20 ? encoded.slice(0, 20) + '…' : encoded) : '—';
        if (tErrorPos)   tErrorPos.textContent   = errorPos   || '—';
        if (tCorrection) {
            tCorrection.textContent = status || '—';
            tCorrection.className   = `hud-val ${statusClass || 't-neutral'}`;
        }
    }

    /** Store clean bits in the injector after a successful encoding */
    function setCleanBitsForInjector(binaryStr, parityPositions = []) {
        cleanEncodedBits = binaryStr;
        cachedParityPositions = parityPositions || [];
        if (!flippedPositions.size) {
            corruptedBits = binaryStr;
        }
        if (enableErrorToggle?.checked && bitGridContainer) {
            bitGridContainer.style.display = 'block';
            buildBitGrid(binaryStr, cachedParityPositions);
        }
        // Enable the error injector quick-buttons even when not yet toggled
        // so the user sees them as available after running
        [btnFlipOne, btnRandomErr, btnBurstErr, btnResetErr].forEach(b => {
            if (b && enableErrorToggle?.checked) b.disabled = false;
        });
    }

    // ═══════════════════════════════════════════════════════════
    // EVENT LISTENERS
    // ═══════════════════════════════════════════════════════════
    navItems.forEach(item => {
        item.addEventListener('click', e => {
            e.preventDefault();
            selectTechnique(item.getAttribute('data-technique'));
        });
    });

    techniqueCards.forEach(card => {
        card.addEventListener('click', () => {
            selectTechnique(card.getAttribute('data-technique'));
        });
    });

    // Quick Switcher Pills Listener
    quickSwitcherPills.forEach(pill => {
        pill.addEventListener('click', () => {
            const tech = pill.getAttribute('data-technique');
            if (tech) selectTechnique(tech);
        });
    });

    if (btnShowOverviewGrid) {
        btnShowOverviewGrid.addEventListener('click', () => {
            selectTechnique('overview');
        });
    }

    // Copy Result Buttons Listener
    document.querySelectorAll('.btn-copy-result').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const targetId = btn.getAttribute('data-target');
            const targetEl = document.getElementById(targetId);
            if (!targetEl) return;
            const text = targetEl.textContent.trim();
            if (!text || text === '— Awaiting Simulation —' || text === 'VALIDATION ERROR') {
                showToast('No simulated data to copy yet.', 'info');
                return;
            }
            navigator.clipboard.writeText(text).then(() => {
                btn.classList.add('copied');
                btn.innerHTML = '<i class="fa-solid fa-check"></i>';
                showToast('Copied result to clipboard! 📋', 'success', 2000);
                setTimeout(() => {
                    btn.classList.remove('copied');
                    btn.innerHTML = '<i class="fa-solid fa-copy"></i>';
                }, 2000);
            }).catch(() => {
                showToast('Could not copy to clipboard.', 'error');
            });
        });
    });

    // Collapsible Live Telemetry HUD
    if (btnHudCollapse) {
        btnHudCollapse.addEventListener('click', (e) => {
            e.preventDefault();
            const isCollapsed = studioRightCol?.classList.toggle('collapsed');
            studioGridContainer?.classList.toggle('hud-collapsed', isCollapsed);
            if (hudCollapseIcon) {
                hudCollapseIcon.className = isCollapsed ? 'fa-solid fa-chevron-left' : 'fa-solid fa-chevron-right';
            }
            btnHudCollapse.title = isCollapsed ? 'Expand Telemetry Panel' : 'Collapse Telemetry Panel';
        });
    }

    if (processBtn) processBtn.addEventListener('click', () => processSimulatorData('full_cycle'));

    if (primaryInput) {
        primaryInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                processSimulatorData('full_cycle');
            }
        });
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            selectTechnique(currentTechnique);
        });
    }

    // ═══════════════════════════════════════════════════════════
    // MULTI-TECHNIQUE COMPARISON BENCHMARK ENGINE
    // ═══════════════════════════════════════════════════════════
    async function runMultiTechniqueComparison(rawInput) {
        const tbody = document.getElementById('comparison-matrix-tbody');
        if (!tbody) return;
        const input = (rawInput || document.getElementById('comp-input-data')?.value || '10110010').trim();
        if (!input || !/^[01]+$/.test(input)) {
            showToast('Please enter a valid binary sequence for comparison (e.g. 10110010).', 'warning');
            return;
        }

        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:24px; color:var(--accent-cyan);"><i class="fa-solid fa-spinner fa-spin"></i> Evaluating all detection and correction algorithms...</td></tr>`;

        const k = input.length;

        try {
            const [pRes, cRes, crcRes, hRes] = await Promise.all([
                fetch('/api/process', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ technique: 'parity', input_data: input, params: { mode: '1D', scheme: 'even' } })
                }).then(r => r.json()),
                fetch('/api/process', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ technique: 'checksum', input_data: input, params: { word_size: 8 } })
                }).then(r => r.json()),
                fetch('/api/process', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ technique: 'crc', input_data: input, params: { generator: '10011', action: 'full_cycle' } })
                }).then(r => r.json()),
                fetch('/api/process', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ technique: 'hamming', input_data: input, params: { parity: 'even' } })
                }).then(r => r.json())
            ]);

            const pData = pRes.result || {};
            const cData = cRes.result || {};
            const crcData = crcRes.result || {};
            const hData = hRes.result || {};

            const parityN = pData.codeword ? pData.codeword.length : k + 1;
            const parityOverhead = (((parityN - k) / k) * 100).toFixed(1);

            const chkN = cData.transmitted_frame ? cData.transmitted_frame.length : k + 8;
            const chkOverhead = (((chkN - k) / k) * 100).toFixed(1);

            const crcN = crcData.transmitted_codeword ? crcData.transmitted_codeword.length : k + 4;
            const crcOverhead = (((crcN - k) / k) * 100).toFixed(1);

            const hamN = hData.total_length || (hData.transmitted_codeword ? hData.transmitted_codeword.length : k + Math.ceil(Math.log2(k + 1)));
            const hamOverhead = (((hamN - k) / k) * 100).toFixed(1);

            tbody.innerHTML = `
                <tr>
                    <td><div class="comp-tech-name"><i class="fa-solid fa-list-check" style="color:var(--accent-violet);"></i> 1D Parity Check</div></td>
                    <td><code>${k} bits</code></td>
                    <td><code>${parityN} bits</code></td>
                    <td><span class="comp-overhead-val">+${parityOverhead}%</span> (1 bit)</td>
                    <td><span class="comp-tech-badge comp-badge-ok">✅ 100% Detected</span></td>
                    <td><span class="comp-tech-badge comp-badge-no">❌ 0% (Blind)</span></td>
                    <td><span class="comp-tech-badge comp-badge-partial">⚠️ Odd-bursts only</span></td>
                    <td><span class="comp-tech-badge comp-badge-no">❌ None</span></td>
                    <td><span class="comp-domain-tag">UART Serial COM, Microcontrollers</span></td>
                </tr>
                <tr>
                    <td><div class="comp-tech-name"><i class="fa-solid fa-calculator" style="color:#2dd4bf;"></i> Internet Checksum (RFC 1071)</div></td>
                    <td><code>${k} bits</code></td>
                    <td><code>${chkN} bits</code></td>
                    <td><span class="comp-overhead-val">+${chkOverhead}%</span> (8 bits)</td>
                    <td><span class="comp-tech-badge comp-badge-ok">✅ 100% Detected</span></td>
                    <td><span class="comp-tech-badge comp-badge-ok">✅ Detected</span></td>
                    <td><span class="comp-tech-badge comp-badge-partial">⚠️ Weak vs Compensating Swaps</span></td>
                    <td><span class="comp-tech-badge comp-badge-no">❌ None</span></td>
                    <td><span class="comp-domain-tag">IPv4 Header, UDP / TCP Transport</span></td>
                </tr>
                <tr>
                    <td><div class="comp-tech-name"><i class="fa-solid fa-calculator" style="color:var(--color-warning);"></i> CRC Polynomial (CRC-4)</div></td>
                    <td><code>${k} bits</code></td>
                    <td><code>${crcN} bits</code></td>
                    <td><span class="comp-overhead-val">+${crcOverhead}%</span> (4 bits)</td>
                    <td><span class="comp-tech-badge comp-badge-ok">✅ 100% Detected</span></td>
                    <td><span class="comp-tech-badge comp-badge-ok">✅ 100% Detected</span></td>
                    <td><span class="comp-tech-badge comp-badge-ok">✅ Robust (Burst ≤ 4)</span></td>
                    <td><span class="comp-tech-badge comp-badge-no">❌ None</span></td>
                    <td><span class="comp-domain-tag">Ethernet (802.3), Wi-Fi (802.11), SATA</span></td>
                </tr>
                <tr>
                    <td><div class="comp-tech-name"><i class="fa-solid fa-wand-magic-sparkles" style="color:var(--accent-cyan);"></i> Hamming Code (${hData.mode || 'Auto'})</div></td>
                    <td><code>${k} bits</code></td>
                    <td><code>${hamN} bits</code></td>
                    <td><span class="comp-overhead-val">+${hamOverhead}%</span> (${hamN - k} bits)</td>
                    <td><span class="comp-tech-badge comp-badge-ok">✅ 100% Detected</span></td>
                    <td><span class="comp-tech-badge comp-badge-ok">✅ 100% Detected</span></td>
                    <td><span class="comp-tech-badge comp-badge-partial">⚠️ Single-cluster only</span></td>
                    <td><span class="comp-tech-badge comp-badge-ok">⚡ Auto-Corrects 1-Bit</span></td>
                    <td><span class="comp-domain-tag">RAM ECC Memory, Deep Space Telemetry</span></td>
                </tr>
            `;
            showToast('Benchmark Matrix Calculated!', 'success', 2000);
        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:18px; color:var(--color-error);">Failed to load comparison data.</td></tr>`;
        }
    }

    // Comparison Studio Event Handlers
    const btnRunComp = document.getElementById('btn-run-comparison');
    const btnCompSubmit = document.getElementById('btn-comp-submit');
    const compInput = document.getElementById('comp-input-data');

    btnRunComp?.addEventListener('click', () => runMultiTechniqueComparison());
    btnCompSubmit?.addEventListener('click', () => runMultiTechniqueComparison());
    compInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            runMultiTechniqueComparison();
        }
    });

    document.querySelectorAll('.comp-sample-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            const sample = pill.getAttribute('data-sample');
            if (sample && compInput) {
                compInput.value = sample;
                runMultiTechniqueComparison(sample);
            }
        });
    });

    // ── Global Keyboard Shortcuts ──
    document.addEventListener('keydown', (e) => {
        // Ignore if user is currently typing in an input or textarea
        const activeTag = document.activeElement?.tagName?.toLowerCase();
        const isTyping = (activeTag === 'input' || activeTag === 'textarea');

        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            if (window.location.hash === '#compare') {
                runMultiTechniqueComparison();
            } else {
                processSimulatorData('full_cycle');
            }
            return;
        }

        if (!isTyping) {
            if (e.code === 'Space') {
                e.preventDefault();
                togglePipelinePlay();
            } else if (e.key >= '1' && e.key <= '7') {
                const map = ['byte_stuffing', 'bit_stuffing', 'parity', 'checksum', 'crc', 'hamming', 'hamming_distance'];
                const idx = parseInt(e.key, 10) - 1;
                if (map[idx]) selectTechnique(map[idx]);
            }
        }
    });

    // ═══════════════════════════════════════════════════════════
    // FORMAL LAB REPORT GENERATOR & MODAL HANDLERS
    // ═══════════════════════════════════════════════════════════
    function openLabReportModal() {
        const modal = document.getElementById('lab-report-modal');
        if (modal) {
            modal.classList.add('active');
            modal.style.display = 'flex';
            const dateInput = document.getElementById('rep-lab-date');
            if (dateInput && !dateInput.value) {
                dateInput.value = new Date().toISOString().split('T')[0];
            }
        }
    }

    function closeLabReportModal() {
        const modal = document.getElementById('lab-report-modal');
        if (modal) {
            modal.classList.remove('active');
            modal.style.display = 'none';
        }
    }

    function generateFormalLabReport() {
        const studentName = document.getElementById('rep-student-name')?.value || 'Student';
        const studentId   = document.getElementById('rep-student-id')?.value || '—';
        const courseCode  = document.getElementById('rep-course-code')?.value || 'CSE 3105';
        const institution = document.getElementById('rep-institution')?.value || 'Department of CSE';
        const expTitle    = document.getElementById('rep-experiment-title')?.value || 'EDC Simulation';
        const labDate     = document.getElementById('rep-lab-date')?.value || new Date().toLocaleDateString();

        const config = techniqueConfigs[currentTechnique];
        const techTitle = config ? config.title : 'Error Detection & Correction';
        const inputVal  = primaryInput?.value || '—';
        const encVal    = document.getElementById('result-encoded-val')?.textContent || '—';
        const recVal    = document.getElementById('result-received-val')?.textContent || '—';
        const decVal    = document.getElementById('result-decoded-val')?.textContent || '—';
        const rows      = document.querySelectorAll('#step-by-step-display .step-row');

        let stepsHtml = '';
        rows.forEach(r => {
            stepsHtml += `<div style="padding:4px 8px; border-bottom:1px solid #eee; font-family:monospace; font-size:12px;">${escapeHtml(r.textContent.trim())}</div>`;
        });
        if (!stepsHtml) {
            stepsHtml = '<div style="padding:8px; font-style:italic;">Simulation verified with 100% integrity.</div>';
        }

        const reportWindow = window.open('', '_blank');
        if (!reportWindow) {
            showToast('Please allow popups to generate print report.', 'warning');
            return;
        }

        reportWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>${escapeHtml(expTitle)} - Lab Report</title>
                <style>
                    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 40px; color: #111; line-height: 1.5; font-size: 14px; }
                    .header-box { text-align: center; border-bottom: 2px solid #111; padding-bottom: 15px; margin-bottom: 20px; }
                    .header-box h1 { margin: 0 0 5px 0; font-size: 20px; text-transform: uppercase; letter-spacing: 1px; }
                    .header-box h2 { margin: 0 0 5px 0; font-size: 15px; color: #444; font-weight: normal; }
                    .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
                    .meta-table td { padding: 6px 10px; border: 1px solid #ccc; font-size: 13px; }
                    .meta-label { font-weight: bold; width: 22%; background: #f5f5f5; }
                    .section-title { font-size: 15px; font-weight: bold; border-bottom: 1px solid #333; padding-bottom: 4px; margin: 20px 0 10px 0; text-transform: uppercase; }
                    .data-box { background: #fafafa; border: 1px solid #ddd; padding: 12px 15px; border-radius: 4px; margin-bottom: 15px; font-family: monospace; }
                    .steps-box { border: 1px solid #ccc; border-radius: 4px; background: #fdfdfd; margin-bottom: 25px; }
                    .sign-box { margin-top: 40px; display: flex; justify-content: space-between; page-break-inside: avoid; }
                    .sign-col { width: 40%; text-align: center; border-top: 1px solid #111; padding-top: 8px; font-size: 13px; }
                    @media print {
                        body { margin: 20px; }
                    }
                </style>
            </head>
            <body>
                <div class="header-box">
                    <h1>${escapeHtml(institution)}</h1>
                    <h2>${escapeHtml(courseCode)}</h2>
                    <p style="margin:4px 0 0 0; font-weight:bold; font-size:16px;">${escapeHtml(expTitle)}</p>
                </div>

                <table class="meta-table">
                    <tr>
                        <td class="meta-label">Student Name:</td>
                        <td>${escapeHtml(studentName)}</td>
                        <td class="meta-label">Student ID / Roll:</td>
                        <td>${escapeHtml(studentId)}</td>
                    </tr>
                    <tr>
                        <td class="meta-label">Active Technique:</td>
                        <td>${escapeHtml(techTitle)}</td>
                        <td class="meta-label">Submission Date:</td>
                        <td>${escapeHtml(labDate)}</td>
                    </tr>
                </table>

                <div class="section-title">1. Experiment Objectives &amp; Background</div>
                <p>${config ? escapeHtml(config.theory) : 'Implementation and verification of error detection and correction algorithm.'}</p>

                <div class="section-title">2. Simulation Data &amp; Codewords</div>
                <div class="data-box">
                    <div><strong>Original Input Payload:</strong> ${escapeHtml(inputVal)}</div>
                    <div><strong>Transmitted Codeword:</strong> ${escapeHtml(encVal)}</div>
                    <div><strong>Received Channel Data:</strong> ${escapeHtml(recVal)}</div>
                    <div><strong>Receiver Decoded Output:</strong> ${escapeHtml(decVal)}</div>
                </div>

                <div class="section-title">3. Mathematical Verification &amp; Step Proof</div>
                <div class="steps-box">
                    ${stepsHtml}
                </div>

                <div class="section-title">4. Lab Evaluation &amp; Sign-off</div>
                <div class="sign-box">
                    <div class="sign-col">
                        <strong>Student Signature</strong><br>
                        <span>${escapeHtml(studentName)}</span>
                    </div>
                    <div class="sign-col">
                        <strong>Course Instructor / Lab Evaluator</strong><br>
                        <span>Marks / Grade: ______ / 10</span>
                    </div>
                </div>

                <script>
                    window.onload = function() {
                        window.print();
                    }
                </script>
            </body>
            </html>
        `);
        reportWindow.document.close();
        closeLabReportModal();
        showToast('Official University Lab Report Generated! 📄', 'success', 2500);
    }

    // Modal & Quiz Listeners
    const btnOpenReportModal   = document.getElementById('btn-open-report-modal');
    const btnCloseReportModal  = document.getElementById('btn-close-report-modal');
    const btnCancelReportModal = document.getElementById('btn-cancel-report-modal');
    const btnConfirmReport     = document.getElementById('btn-confirm-generate-report');
    const modalReportOverlay   = document.getElementById('lab-report-modal');

    btnOpenReportModal?.addEventListener('click', openLabReportModal);
    btnCloseReportModal?.addEventListener('click', closeLabReportModal);
    btnCancelReportModal?.addEventListener('click', closeLabReportModal);
    btnConfirmReport?.addEventListener('click', generateFormalLabReport);
    modalReportOverlay?.addEventListener('click', (e) => {
        if (e.target === modalReportOverlay) closeLabReportModal();
    });

    // Quiz Buttons
    const btnSubmitQuiz = document.getElementById('btn-submit-quiz-answer');
    const btnNextQuiz   = document.getElementById('btn-next-quiz-question');
    const btnRestartQuiz = document.getElementById('btn-restart-quiz');

    btnSubmitQuiz?.addEventListener('click', submitQuizAnswer);
    btnNextQuiz?.addEventListener('click', nextQuizQuestion);
    btnRestartQuiz?.addEventListener('click', restartQuiz);

    // ── Step Trace Copy & Print Buttons ──
    const btnCopyTrace = document.getElementById('btn-copy-trace');
    const btnPrintReport = document.getElementById('btn-print-report');

    if (btnCopyTrace) {
        btnCopyTrace.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const config = techniqueConfigs[currentTechnique];
            const techName = config ? config.title : 'EDC Simulation';
            const rows = document.querySelectorAll('#step-by-step-display .step-row');
            if (!rows || rows.length === 0 || rows[0].textContent.includes('READY TO SIMULATE')) {
                showToast('Run a simulation first to generate calculation steps.', 'warning');
                return;
            }
            let report = `# ${techName} — Step-by-Step Mathematical Proof\n\n`;
            rows.forEach(r => {
                report += `${r.textContent.trim()}\n`;
            });
            report += `\nGenerated by EDC Simulator v2.0 (Academic Lab Edition)\n`;
            navigator.clipboard.writeText(report).then(() => {
                showToast('Step-by-step calculation report copied to clipboard! 📋', 'success');
            }).catch(() => {
                showToast('Failed to copy to clipboard.', 'error');
            });
        });
    }

    if (btnPrintReport) {
        btnPrintReport.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            openLabReportModal();
        });
    }

    // ═══════════════════════════════════════════════════════════
    // MOBILE SIDEBAR DRAWER
    // ═══════════════════════════════════════════════════════════
    function openSidebar() {
        if (!sidebarDrawer) return;
        sidebarDrawer.classList.add('open');
        if (sidebarOverlay) {
            sidebarOverlay.classList.add('active');
        }
        document.body.style.overflow = 'hidden';
        if (mobileMenuBtn) mobileMenuBtn.setAttribute('aria-expanded', 'true');
    }

    function closeSidebar() {
        if (!sidebarDrawer) return;
        sidebarDrawer.classList.remove('open');
        if (sidebarOverlay) {
            sidebarOverlay.classList.remove('active');
        }
        document.body.style.overflow = '';
        if (mobileMenuBtn) mobileMenuBtn.setAttribute('aria-expanded', 'false');
    }

    function toggleSidebar() {
        if (sidebarDrawer && sidebarDrawer.classList.contains('open')) {
            closeSidebar();
        } else {
            openSidebar();
        }
    }

    if (mobileMenuBtn) {
        mobileMenuBtn.setAttribute('aria-expanded', 'false');
        mobileMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleSidebar();
        });
    }

    // Close when overlay (backdrop) is tapped
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', closeSidebar);
    }

    // Close sidebar when a nav item is clicked (mobile UX)
    if (sidebarDrawer) {
        sidebarDrawer.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    closeSidebar();
                }
            });
        });
    }

    // On resize: if going back to desktop, remove overflow lock and reset sidebar
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            closeSidebar();
        }
    });

    // Close sidebar on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && sidebarDrawer && sidebarDrawer.classList.contains('open')) {
            closeSidebar();
        }
        if (e.key === 'Escape' && modalReportOverlay && modalReportOverlay.style.display !== 'none') {
            closeLabReportModal();
        }
    });

    // ═══════════════════════════════════════════════════════════
    // INITIALISE
    // ═══════════════════════════════════════════════════════════
    const initialHash = window.location.hash.replace(/^#/, '');
    if (initialHash === 'overview') {
        selectTechnique('overview');
    } else if (initialHash === 'compare') {
        selectTechnique('compare');
    } else if (initialHash === 'quiz') {
        selectTechnique('quiz');
    } else if (initialHash && techniqueConfigs[initialHash]) {
        selectTechnique(initialHash);
    } else {
        selectTechnique('byte_stuffing');
    }

});
