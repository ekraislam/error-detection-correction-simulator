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
        let stuffed = '';
        let onesCount = 0;
        const flushOnes = () => {
            if (onesCount > 0) {
                if (onesCount === 1) {
                    stuffed += '0' + '1';
                } else {
                    stuffed += '1'.repeat(onesCount - 1) + '0' + '1';
                }
                onesCount = 0;
            }
        };
        for (let i = 0; i < raw.length; i++) {
            const bit = raw[i];
            if (bit === '1') {
                onesCount++;
            } else {
                flushOnes();
                stuffed += '0';
            }
        }
        flushOnes();
        return flag + stuffed + flag;
    }

    // ═══════════════════════════════════════════════════════════
    // DOM REFERENCES
    // ═══════════════════════════════════════════════════════════
    const navItems              = document.querySelectorAll('.nav-item');
    const techniqueCards        = document.querySelectorAll('.technique-card');
    const sidebarDrawer         = document.getElementById('sidebar-drawer');
    const mobileMenuBtn         = document.getElementById('mobile-menu-btn');

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
    const stepByStepDisplay     = document.getElementById('step-by-step-display');

    // Pipeline steps
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
    // MOBILE SIDEBAR
    // ═══════════════════════════════════════════════════════════
    if (mobileMenuBtn && sidebarDrawer) {
        mobileMenuBtn.addEventListener('click', e => {
            e.stopPropagation();
            sidebarDrawer.classList.toggle('open');
        });
        document.addEventListener('click', e => {
            if (sidebarDrawer.classList.contains('open') &&
                !sidebarDrawer.contains(e.target) &&
                e.target !== mobileMenuBtn) {
                sidebarDrawer.classList.remove('open');
            }
        });
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
            hint: "Enter binary ('0' and '1's). A '0' is inserted after 5 consecutive '1's.",
            binaryModule: true,
            hasErrorInjector: false,
            theory: "After every 5 consecutive '1' bits in the payload, a '0' is stuffed. The receiver de-stuffs by removing each '0' that follows 5 ones. This prevents accidental flag-pattern detection inside data.",
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
            hasErrorInjector: true,
            theory: '1D Parity appends one bit to make the total number of 1s even (or odd). 2D Block Parity adds row and column parity bits, allowing single-bit error location at (row, col).',
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
                <div class="form-group" id="param-columns-group" style="display: none;">
                    <label for="param-columns">2D Matrix Columns</label>
                    <input type="number" id="param-columns" class="form-control" value="4" min="1" max="16">
                    <small class="form-hint">Number of columns for 2D block</small>
                </div>
                <div class="form-group">
                    <label for="param-error-pos">1D Bit Flip Position (1-indexed)</label>
                    <input type="number" id="param-error-pos" class="form-control" placeholder="e.g. 3" min="1">
                </div>
                <div class="form-group" id="param-2d-error-group" style="grid-column: span 2; display: none; gap: 10px;">
                    <div style="flex:1;">
                        <label for="param-error-row">2D Error Row</label>
                        <input type="number" id="param-error-row" class="form-control" placeholder="e.g. 2" min="1">
                    </div>
                    <div style="flex:1;">
                        <label for="param-error-col">2D Error Column</label>
                        <input type="number" id="param-error-col" class="form-control" placeholder="e.g. 3" min="1">
                    </div>
                </div>
                <div class="form-group" style="grid-column: span 2; font-size:0.78rem; color:var(--text-muted); background:var(--bg-surface); padding:9px 12px; border-radius:7px; border-left:3px solid var(--accent-cyan);">
                    <i class="fa-solid fa-circle-info" style="color:var(--accent-cyan);"></i>
                    1D parity detects odd-count errors. 2D parity pinpoints a single-bit error location.
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

        if (techKey === 'overview') {
            document.getElementById('overview-cards')?.scrollIntoView({ behavior: 'smooth' });
            navItems.forEach(item => item.classList.toggle('active', item.getAttribute('data-technique') === 'overview'));
            if (topHeaderTechBadge) topHeaderTechBadge.innerHTML = `<i class="fa-solid fa-layer-group"></i> OVERVIEW`;
            return;
        }

        if (!techniqueConfigs[techKey]) return;
        currentTechnique = techKey;
        const config = techniqueConfigs[techKey];

        // Navigation highlights
        navItems.forEach(item => item.classList.toggle('active', item.getAttribute('data-technique') === techKey));
        techniqueCards.forEach(card => card.classList.toggle('active', card.getAttribute('data-technique') === techKey));

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
            const modeSelect = document.getElementById('param-parity-mode');
            const colGroup   = document.getElementById('param-columns-group');
            const err2dGroup = document.getElementById('param-2d-error-group');
            modeSelect?.addEventListener('change', e => {
                const is2D = e.target.value === '2D';
                if (colGroup)   colGroup.style.display   = is2D ? 'block' : 'none';
                if (err2dGroup) err2dGroup.style.display = is2D ? 'flex'  : 'none';
                if (primaryInput) primaryInput.value = is2D ? '1011001011001001' : '1011001';
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
    // PIPELINE STATE HELPER
    // ═══════════════════════════════════════════════════════════
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
            const ep  = document.getElementById('param-error-pos')?.value;
            if (ep) payload.params.error_pos = parseInt(ep, 10);
            const er  = document.getElementById('param-error-row')?.value;
            const ec  = document.getElementById('param-error-col')?.value;
            if (er && ec) { payload.params.error_row = parseInt(er, 10); payload.params.error_col = parseInt(ec, 10); }

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
    // RENDERERS
    // ═══════════════════════════════════════════════════════════

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
            const tip = tok.type === 'stuffed_zero' ? "Stuffed '0' inserted after 5 consecutive 1s" : (tok.label || tok.type);
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

    /** Hamming position table */
    function renderHammingPosTable(posTable) {
        if (!posTable || !posTable.length) return '';
        let html = '<div class="hamming-table-container"><table class="hamming-pos-table"><thead>';
        html += '<tr><th>Position</th>';
        posTable.forEach(item => { html += `<th>${item.pos}</th>`; });
        html += '</tr><tr><th>Type</th>';
        posTable.forEach(item => { html += `<th style="font-size:0.72rem;">${item.type}</th>`; });
        html += '</tr></thead><tbody><tr><th>Bit Value</th>';
        posTable.forEach(item => {
            let cls = item.is_parity ? 'pos-cell-p' : 'pos-cell-d';
            if (item.is_error) cls = 'pos-cell-err';
            html += `<td class="${cls}">${item.value}${item.is_error ? ' ⚡' : ''}</td>`;
        });
        html += '</tr></tbody></table></div>';
        return html;
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
            const hasErr  = res.error_detected;
            const pin     = res.pinpointed_location;
            const state   = hasErr ? 'error' : 'success';

            setPipelineState(state);
            let statusText = hasErr
                ? (pin ? `<i class="fa-solid fa-crosshairs"></i> ERROR AT (Row ${pin.row}, Col ${pin.col})` : '<i class="fa-solid fa-triangle-exclamation"></i> ERROR DETECTED')
                : '<i class="fa-solid fa-shield-check"></i> NO ERROR DETECTED';
            setStatus(hasErr ? 'error-detected' : 'success', statusText);

            if (res.mode === '1D') {
                if (outputEncoded)  outputEncoded.textContent  = `Payload: ${res.original_data}  |  Parity Bit: ${res.parity_bit}`;
                if (outputReceived) outputReceived.textContent = res.received_codeword;
                if (outputDecoded)  outputDecoded.textContent  = hasErr ? 'ERROR DETECTED (Corrupted Codeword)' : `Payload Intact: ${res.original_data}`;

                // Populate bit grid from codeword for interactive error injection (1-indexed LTR, parity bit is at last position)
                if (res.encoded_codeword) setCleanBitsForInjector(res.encoded_codeword, [res.encoded_codeword.length]);

            } else {
                if (outputEncoded)  outputEncoded.textContent  = `2D Grid (${res.rows}×${res.columns}) | ${res.parity_type.toUpperCase()} Parity`;
                if (outputReceived) outputReceived.innerHTML   = render2DParityMatrix(res);
                if (outputDecoded)  outputDecoded.textContent  = pin ? `Error at Row ${pin.row}, Column ${pin.col}` : (hasErr ? 'Multi-bit error' : 'Block Parity Intact');
            }

            const errPosLabel = hasErr ? (pin ? `Row ${pin.row} Col ${pin.col}` : 'Detected') : 'None';
            updateTelemetry({ encoded: res.received_codeword || '—', errorPos: errPosLabel, status: hasErr ? 'DETECTED' : 'CLEAN', statusClass: hasErr ? 't-danger' : 't-success' });
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
                outputEncoded.innerHTML = `
                    <div style="margin-bottom:8px;">
                        <strong>Input:</strong> <code>${res.original_data}</code> &nbsp;|&nbsp;
                        <strong>Mode:</strong> <code style="color:var(--accent-cyan);">Hamming (${res.mode})</code> &nbsp;|&nbsp;
                        <strong>Encoded:</strong> <code style="color:var(--accent-cyan);font-weight:700;">${res.encoded_codeword}</code>
                    </div>
                ` + renderHammingPosTable(res.pos_table);
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

    if (processBtn) processBtn.addEventListener('click', () => processSimulatorData('full_cycle'));

    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            selectTechnique(currentTechnique);
        });
    }

    // ═══════════════════════════════════════════════════════════
    // INITIALISE
    // ═══════════════════════════════════════════════════════════
    selectTechnique('byte_stuffing');
});
