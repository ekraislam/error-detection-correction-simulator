/**
 * EDC SIMULATOR - Educational Simulator JavaScript Application
 * Manages matrix particle stream, technique selection, dynamic form controls,
 * split workspace results rendering, telemetry updates, and relative API requests.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Current Active Technique State
    let currentTechnique = 'byte_stuffing';

    // DOM Elements
    const navItems = document.querySelectorAll('.nav-item');
    const techniqueCards = document.querySelectorAll('.technique-card');
    const sidebarDrawer = document.getElementById('sidebar-drawer');
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    
    const activeTechniqueTag = document.getElementById('active-technique-tag');
    const activeTechniqueTitle = document.getElementById('active-technique-title');
    const topHeaderTechBadge = document.getElementById('top-header-tech-badge');
    
    const primaryInput = document.getElementById('primary-input');
    const primaryInputLabel = document.getElementById('primary-input-label');
    const primaryInputHint = document.getElementById('primary-input-hint');
    const dynamicParamsContainer = document.getElementById('dynamic-params-container');

    const enableErrorToggle = document.getElementById('enable-error-toggle');
    const errorControlsWrapper = document.getElementById('error-controls-wrapper');
    const errorInputField = document.getElementById('error-input-field');
    const flipBitBtn = document.getElementById('flip-bit-btn');
    const corruptByteBtn = document.getElementById('corrupt-byte-btn');

    const processBtn = document.getElementById('process-btn');
    const resetBtn = document.getElementById('reset-btn');

    const heroLaunchBtn = document.getElementById('hero-launch-btn');
    const heroExploreBtn = document.getElementById('hero-explore-btn');

    const resultStatusIndicator = document.getElementById('result-status-indicator');
    const outputEncoded = document.getElementById('output-encoded');
    const outputReceived = document.getElementById('output-received');
    const outputDecoded = document.getElementById('output-decoded');
    const stepByStepDisplay = document.getElementById('step-by-step-display');

    // Telemetry Elements
    const tModule = document.getElementById('t-module');
    const tSize = document.getElementById('t-size');
    const tState = document.getElementById('t-state');
    const tError = document.getElementById('t-error');
    const tLatency = document.getElementById('t-latency');
    const tChannel = document.getElementById('t-channel');

    // Canvas Background Stream Generator
    initBackgroundCanvas();

    // Mobile Sidebar Drawer Toggle
    if (mobileMenuBtn && sidebarDrawer) {
        mobileMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebarDrawer.classList.toggle('open');
        });

        document.addEventListener('click', (e) => {
            if (sidebarDrawer.classList.contains('open') && !sidebarDrawer.contains(e.target) && e.target !== mobileMenuBtn) {
                sidebarDrawer.classList.remove('open');
            }
        });
    }

    // Hero CTA Buttons
    if (heroLaunchBtn) {
        heroLaunchBtn.addEventListener('click', () => {
            document.getElementById('simulator-panel')?.scrollIntoView({ behavior: 'smooth' });
        });
    }

    if (heroExploreBtn) {
        heroExploreBtn.addEventListener('click', () => {
            document.getElementById('overview-cards')?.scrollIntoView({ behavior: 'smooth' });
        });
    }

    /**
     * Futuristic Background Matrix Canvas Animation
     */
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
                speed: 0.5 + Math.random() * 1.5,
                char: Math.random() > 0.5 ? '1' : '0',
                size: 10 + Math.random() * 10,
                opacity: 0.1 + Math.random() * 0.4
            });
        }

        function draw() {
            ctx.clearRect(0, 0, width, height);
            ctx.font = '12px "Fira Code", monospace';

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

    // Configuration map for each of the 6 techniques
    const techniqueConfigs = {
        byte_stuffing: {
            name: "Byte Stuffing",
            title: "Byte Stuffing Simulator",
            inputLabel: "Original Data Payload",
            placeholder: "e.g. ABCFE",
            defaultValue: "ABCFE",
            hint: "Enter data string containing payload bytes (e.g. ABCFE).",
            paramsHtml: `
                <div class="form-group">
                    <label for="param-flag">FLAG Identifier</label>
                    <input type="text" id="param-flag" class="form-control code-input" value="F">
                    <small class="form-hint">Frame delimiter (default 'F')</small>
                </div>
                <div class="form-group">
                    <label for="param-esc">Escape (ESC) Byte</label>
                    <input type="text" id="param-esc" class="form-control code-input" value="E">
                    <small class="form-hint">Escape character (default 'E')</small>
                </div>
                <div class="form-group" style="grid-column: span 2; display: flex; gap: 10px; margin-top: 6px;">
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
            name: "Bit Stuffing",
            title: "Bit Stuffing Simulator",
            inputLabel: "Binary Data Payload",
            placeholder: "e.g. 111110 or 011111101111110",
            defaultValue: "111110",
            hint: "Enter raw binary sequence ('0' and '1's). A '0' is stuffed after 5 consecutive '1's.",
            paramsHtml: `
                <div class="form-group">
                    <label for="param-flag-pattern">Delimiter Flag Pattern</label>
                    <input type="text" id="param-flag-pattern" class="form-control code-input" value="01111110">
                    <small class="form-hint">8-bit framing flag (default '01111110')</small>
                </div>
                <div class="form-group">
                    <label for="param-error-pos">Bit Flip Error Position (1-indexed)</label>
                    <input type="number" id="param-error-pos" class="form-control" placeholder="Optional bit index e.g. 10" min="1">
                    <small class="form-hint">Flip bit at position to test error detection</small>
                </div>
                <div class="form-group" style="grid-column: span 2; display: flex; gap: 10px; margin-top: 6px;">
                    <button type="button" class="btn btn-sm btn-primary" id="btn-bit-stuff-only">
                        <i class="fa-solid fa-file-export"></i> Stuff Data
                    </button>
                    <button type="button" class="btn btn-sm btn-accent" id="btn-bit-destuff-only">
                        <i class="fa-solid fa-file-import"></i> De-stuff Frame
                    </button>
                </div>
                <div class="form-group" style="grid-column: span 2; font-size: 0.78rem; color: var(--text-muted); background: var(--bg-surface); padding: 10px 14px; border-radius: 8px; border-left: 3px solid var(--color-warning);">
                    <i class="fa-solid fa-circle-info" style="color: var(--color-warning);"></i> <strong>Note:</strong> Bit stuffing is primarily a <em>framing/transparency mechanism</em>. Error detection normally requires techniques like Parity or CRC.
                </div>
            `
        },
        parity: {
            name: "Parity Check",
            title: "Parity Check Simulator",
            inputLabel: "Binary Payload Data",
            placeholder: "e.g. 1011001 or 1011001011001001",
            defaultValue: "1011001",
            hint: "Enter binary payload string ('0' and '1's).",
            paramsHtml: `
                <div class="form-group">
                    <label for="param-parity-mode">Parity Dimension Mode</label>
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
                    <input type="number" id="param-error-pos" class="form-control" placeholder="e.g. 3 to flip 3rd bit" min="1">
                </div>
                <div class="form-group" id="param-2d-error-group" style="grid-column: span 2; display: none; gap: 10px;">
                    <div style="flex: 1;">
                        <label for="param-error-row">2D Error Row (1-indexed)</label>
                        <input type="number" id="param-error-row" class="form-control" placeholder="Row e.g. 2" min="1">
                    </div>
                    <div style="flex: 1;">
                        <label for="param-error-col">2D Error Column (1-indexed)</label>
                        <input type="number" id="param-error-col" class="form-control" placeholder="Col e.g. 3" min="1">
                    </div>
                </div>
                <div class="form-group" style="grid-column: span 2; font-size: 0.78rem; color: var(--text-muted); background: var(--bg-surface); padding: 10px 14px; border-radius: 8px; border-left: 3px solid var(--accent-cyan);">
                    <i class="fa-solid fa-circle-info" style="color: var(--accent-cyan);"></i> <strong>Concept:</strong> Simple 1D parity detects odd number of bit errors. 2D parity pinpoints single-bit error locations at Row $r$, Column $c$.
                </div>
            `
        },
        crc: {
            name: "CRC",
            title: "Cyclic Redundancy Check Simulator",
            inputLabel: "Binary Data Payload",
            placeholder: "e.g. 100100",
            defaultValue: "100100",
            hint: "Enter binary data payload ('0' and '1's).",
            paramsHtml: `
                <div class="form-group">
                    <label for="param-crc-poly">Generator Polynomial (Divisor)</label>
                    <input type="text" id="param-crc-poly" class="form-control code-input" value="1101">
                    <small class="form-hint">Must start & end with '1' (e.g. 1101 for CRC-3)</small>
                </div>
                <div class="form-group">
                    <label for="param-error-pos">Codeword Bit Flip Position (1-indexed)</label>
                    <input type="number" id="param-error-pos" class="form-control" placeholder="e.g. 5 to flip 5th bit" min="1">
                </div>
                <div class="form-group" style="grid-column: span 2; display: flex; gap: 10px; margin-top: 6px;">
                    <button type="button" class="btn btn-sm btn-primary" id="btn-crc-encode-only">
                        <i class="fa-solid fa-calculator"></i> Encode CRC
                    </button>
                    <button type="button" class="btn btn-sm btn-accent" id="btn-crc-check-only">
                        <i class="fa-solid fa-check-double"></i> Check Receiver Codeword
                    </button>
                </div>
                <div class="form-group" style="grid-column: span 2; font-size: 0.78rem; color: var(--text-muted); background: var(--bg-surface); padding: 10px 14px; border-radius: 8px; border-left: 3px solid var(--accent-violet);">
                    <i class="fa-solid fa-circle-info" style="color: var(--accent-violet);"></i> <strong>What is CRC?</strong> CRC uses polynomial-based modulo-2 XOR division to calculate a remainder appended to original data. A non-zero remainder indicates an error.
                </div>
            `
        },
        hamming: {
            name: "Hamming Code",
            title: "Hamming Code Simulator",
            inputLabel: "Data Payload (4 bits)",
            placeholder: "e.g. 1011",
            defaultValue: "1011",
            hint: "Enter exactly 4 data bits. Example: 1011",
            paramsHtml: `
                <div class="form-group">
                    <label for="param-hamming-mode">Hamming Mode</label>
                    <select id="param-hamming-mode" class="form-control">
                        <option value="7,4" selected>Hamming (7,4) — 4 Data, 3 Parity</option>
                        <option value="15,11">Hamming (15,11) — 11 Data, 4 Parity</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="param-hamming-parity">Parity Scheme</label>
                    <select id="param-hamming-parity" class="form-control">
                        <option value="even" selected>Even Parity</option>
                        <option value="odd">Odd Parity</option>
                    </select>
                </div>
                <div class="form-group" style="grid-column: span 2;">
                    <label for="param-error-pos">Codeword Bit Flip Position (1-indexed)</label>
                    <input type="number" id="param-error-pos" class="form-control" placeholder="e.g. 3 to flip 3rd bit" min="1" max="15">
                    <small class="form-hint">Syndrome calculation will pinpoint and auto-correct bit flip!</small>
                </div>
                <div class="form-group" style="grid-column: span 2; display: flex; gap: 10px; margin-top: 6px;">
                    <button type="button" class="btn btn-sm btn-primary" id="btn-hamming-encode-only">
                        <i class="fa-solid fa-wand-magic-sparkles"></i> Encode Hamming Code
                    </button>
                    <button type="button" class="btn btn-sm btn-accent" id="btn-hamming-decode-only">
                        <i class="fa-solid fa-wrench"></i> Decode & Correct Error
                    </button>
                </div>
                <div class="form-group" style="grid-column: span 2; font-size: 0.78rem; color: var(--text-muted); background: var(--bg-surface); padding: 10px 14px; border-radius: 8px; border-left: 3px solid var(--accent-blue);" id="hamming-educational-note">
                    <i class="fa-solid fa-circle-info" style="color: var(--accent-blue);"></i> <span id="hamming-note-text">For Hamming (7,4), enter 4 data bits. The simulator automatically adds 3 parity bits to create the 7-bit codeword.</span>
                </div>
            `
        },
        hamming_distance: {
            name: "Hamming Distance",
            title: "Hamming Distance Simulator",
            inputLabel: "Codeword 1 (Binary)",
            placeholder: "e.g. 101101",
            defaultValue: "101101",
            hint: "Equal-length binary codeword string.",
            paramsHtml: `
                <div class="form-group">
                    <label for="param-hdist-mode">Calculation Mode</label>
                    <select id="param-hdist-mode" class="form-control">
                        <option value="pair" selected>MODE A: Compare Two Codewords</option>
                        <option value="multi">MODE B: Calculate d_min from Multiple Codewords</option>
                    </select>
                </div>
                <div class="form-group" id="param-c2-group">
                    <label for="param-codeword2">Codeword 2 (Binary)</label>
                    <input type="text" id="param-codeword2" class="form-control code-input" value="100111">
                    <small class="form-hint">Must be equal length to Codeword 1.</small>
                </div>
                <div class="form-group" id="param-multi-cw-group" style="grid-column: span 2; display: none;">
                    <label for="param-codewords-list">Codewords Set (Comma or line separated)</label>
                    <textarea id="param-codewords-list" class="form-control code-input" rows="3" placeholder="e.g.&#10;101101&#10;100111&#10;111101&#10;001101">101101, 100111, 111101, 001101</textarea>
                    <small class="form-hint">Enter 2 or more equal-length binary codewords.</small>
                </div>
                <div class="form-group" style="grid-column: span 2; font-size: 0.78rem; color: var(--text-muted); background: var(--bg-surface); padding: 10px 14px; border-radius: 8px; border-left: 3px solid var(--color-success);">
                    <i class="fa-solid fa-circle-info" style="color: var(--color-success);"></i> <strong>Theory:</strong> Hamming Distance $d(c_1, c_2)$ measures differing bit positions. Maximum detectable errors $s = d_{min} - 1$, Maximum correctable errors $t = \\lfloor(d_{min}-1)/2\\rfloor$.
                </div>
            `
        }
    };

    /**
     * Switch Active Technique UI & Update Input Form Controls
     */
    function selectTechnique(techKey) {
        if (sidebarDrawer) sidebarDrawer.classList.remove('open');

        if (techKey === 'overview') {
            document.getElementById('overview-cards')?.scrollIntoView({ behavior: 'smooth' });
            navItems.forEach(item => {
                item.classList.toggle('active', item.getAttribute('data-technique') === 'overview');
            });
            if (topHeaderTechBadge) topHeaderTechBadge.innerHTML = `<i class="fa-solid fa-layer-group"></i> OVERVIEW WORKSPACE`;
            return;
        }

        if (!techniqueConfigs[techKey]) return;
        currentTechnique = techKey;
        const config = techniqueConfigs[techKey];

        // Update active highlight on navigation items
        navItems.forEach(item => {
            item.classList.toggle('active', item.getAttribute('data-technique') === techKey);
        });

        // Update active highlight on cards
        techniqueCards.forEach(card => {
            card.classList.toggle('active', card.getAttribute('data-technique') === techKey);
        });

        // Update Header Titles & Badges
        if (activeTechniqueTag) activeTechniqueTag.textContent = config.name;
        if (activeTechniqueTitle) activeTechniqueTitle.textContent = config.title;
        if (topHeaderTechBadge) topHeaderTechBadge.innerHTML = `<i class="fa-solid fa-microchip"></i> ${config.name.toUpperCase()}`;

        // Update Form Inputs
        if (primaryInputLabel) primaryInputLabel.textContent = config.inputLabel;
        if (primaryInput) {
            primaryInput.placeholder = config.placeholder;
            primaryInput.value = config.defaultValue;
        }
        if (primaryInputHint) primaryInputHint.textContent = config.hint;

        // Render Dynamic Parameters
        if (dynamicParamsContainer) dynamicParamsContainer.innerHTML = config.paramsHtml;

        // Update Telemetry Panel
        if (tModule) tModule.textContent = config.name;
        if (tSize) tSize.textContent = `${primaryInput ? primaryInput.value.length : 0} Bits/Chars`;
        if (tState) tState.textContent = 'READY';

        // Attach action button handlers
        if (techKey === 'byte_stuffing') {
            document.getElementById('btn-stuff-only')?.addEventListener('click', () => processSimulatorData('stuff'));
            document.getElementById('btn-destuff-only')?.addEventListener('click', () => processSimulatorData('destuff'));
        } else if (techKey === 'bit_stuffing') {
            document.getElementById('btn-bit-stuff-only')?.addEventListener('click', () => processSimulatorData('stuff'));
            document.getElementById('btn-bit-destuff-only')?.addEventListener('click', () => processSimulatorData('destuff'));
        } else if (techKey === 'parity') {
            const modeSelect = document.getElementById('param-parity-mode');
            const colGroup = document.getElementById('param-columns-group');
            const err2dGroup = document.getElementById('param-2d-error-group');

            modeSelect?.addEventListener('change', (e) => {
                if (e.target.value === '2D') {
                    if (colGroup) colGroup.style.display = 'block';
                    if (err2dGroup) err2dGroup.style.display = 'flex';
                    if (primaryInput) primaryInput.value = "1011001011001001";
                } else {
                    if (colGroup) colGroup.style.display = 'none';
                    if (err2dGroup) err2dGroup.style.display = 'none';
                    if (primaryInput) primaryInput.value = "1011001";
                }
            });
        } else if (techKey === 'crc') {
            document.getElementById('btn-crc-encode-only')?.addEventListener('click', () => processSimulatorData('encode'));
            document.getElementById('btn-crc-check-only')?.addEventListener('click', () => processSimulatorData('check'));
        } else if (techKey === 'hamming') {
            const hModeSelect = document.getElementById('param-hamming-mode');
            const updateHammingUI = (mode) => {
                const noteSpan = document.getElementById('hamming-note-text');
                if (mode === '15,11') {
                    if (primaryInputLabel) primaryInputLabel.textContent = "Data Payload (11 bits)";
                    if (primaryInputHint) primaryInputHint.textContent = "Enter exactly 11 data bits.";
                    if (primaryInput) {
                        primaryInput.placeholder = "e.g. 10110010110";
                        if (primaryInput.value === "1011" || primaryInput.value === "") {
                            primaryInput.value = "10110010110";
                        }
                    }
                    if (noteSpan) noteSpan.textContent = "For Hamming (15,11), enter 11 data bits. The simulator automatically adds 4 parity bits to create the 15-bit codeword.";
                } else {
                    if (primaryInputLabel) primaryInputLabel.textContent = "Data Payload (4 bits)";
                    if (primaryInputHint) primaryInputHint.textContent = "Enter exactly 4 data bits. Example: 1011";
                    if (primaryInput) {
                        primaryInput.placeholder = "e.g. 1011";
                        if (primaryInput.value === "10110010110" || primaryInput.value === "") {
                            primaryInput.value = "1011";
                        }
                    }
                    if (noteSpan) noteSpan.textContent = "For Hamming (7,4), enter 4 data bits. The simulator automatically adds 3 parity bits to create the 7-bit codeword.";
                }
            };

            if (hModeSelect) {
                updateHammingUI(hModeSelect.value);
                hModeSelect.addEventListener('change', (e) => {
                    updateHammingUI(e.target.value);
                });
            }
            document.getElementById('btn-hamming-encode-only')?.addEventListener('click', () => processSimulatorData('full_cycle'));
            document.getElementById('btn-hamming-decode-only')?.addEventListener('click', () => processSimulatorData('full_cycle'));
        } else if (techKey === 'hamming_distance') {
            const hdistModeSelect = document.getElementById('param-hdist-mode');
            const c2Group = document.getElementById('param-c2-group');
            const multiGroup = document.getElementById('param-multi-cw-group');

            hdistModeSelect?.addEventListener('change', (e) => {
                if (e.target.value === 'multi') {
                    if (c2Group) c2Group.style.display = 'none';
                    if (multiGroup) multiGroup.style.display = 'block';
                } else {
                    if (c2Group) c2Group.style.display = 'block';
                    if (multiGroup) multiGroup.style.display = 'none';
                }
            });
        }

        // Reset Error Injection Controls
        if (enableErrorToggle) {
            enableErrorToggle.checked = false;
            toggleErrorInjection(false);
        }

        // Reset Results Display Area
        resetResultsDisplay();
    }

    /**
     * Enable/Disable Error Injection Controls
     */
    function toggleErrorInjection(enabled) {
        if (!errorControlsWrapper) return;
        if (enabled) {
            errorControlsWrapper.classList.remove('disabled');
            if (errorInputField) {
                errorInputField.disabled = false;
                errorInputField.value = primaryInput ? primaryInput.value : '';
            }
            if (flipBitBtn) flipBitBtn.disabled = false;
            if (corruptByteBtn) corruptByteBtn.disabled = false;
            if (tChannel) tChannel.textContent = 'NOISE INJECTED';
        } else {
            errorControlsWrapper.classList.add('disabled');
            if (errorInputField) {
                errorInputField.disabled = true;
                errorInputField.value = '';
            }
            if (flipBitBtn) flipBitBtn.disabled = true;
            if (corruptByteBtn) corruptByteBtn.disabled = true;
            if (tChannel) tChannel.textContent = 'CLEAN';
        }
    }

    /**
     * Reset Results View to Initial State
     */
    function resetResultsDisplay() {
        if (resultStatusIndicator) {
            resultStatusIndicator.className = 'status-indicator-badge neutral';
            resultStatusIndicator.innerHTML = '<i class="fa-solid fa-circle-info"></i> READY TO SIMULATE';
        }
        if (outputEncoded) outputEncoded.textContent = '-- Awaiting Calculation --';
        if (outputReceived) outputReceived.textContent = '-- Awaiting Calculation --';
        if (outputDecoded) outputDecoded.textContent = '-- Awaiting Calculation --';
        if (stepByStepDisplay) {
            stepByStepDisplay.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon"><i class="fa-solid fa-network-wired"></i></div>
                    <p class="empty-title">READY TO SIMULATE</p>
                    <p class="empty-desc">Enter your data and click <strong>RUN SIMULATION</strong> to execute data transmission.</p>
                </div>
            `;
        }
    }

    /**
     * Gather Request Parameters based on technique
     */
    function buildRequestPayload(actionOverride) {
        const payload = {
            technique: currentTechnique,
            input_data: primaryInput ? primaryInput.value.trim() : '',
            injected_error: (enableErrorToggle && enableErrorToggle.checked && errorInputField) ? errorInputField.value.trim() : null,
            params: {}
        };

        if (currentTechnique === 'byte_stuffing') {
            payload.params.flag = document.getElementById('param-flag')?.value || 'F';
            payload.params.esc = document.getElementById('param-esc')?.value || 'E';
            payload.params.action = actionOverride || 'full_cycle';
        } else if (currentTechnique === 'bit_stuffing') {
            payload.params.flag_pattern = document.getElementById('param-flag-pattern')?.value || '01111110';
            payload.params.action = actionOverride || 'full_cycle';
            const errPosVal = document.getElementById('param-error-pos')?.value;
            if (errPosVal) payload.params.error_pos = parseInt(errPosVal, 10);
        } else if (currentTechnique === 'parity') {
            payload.params.parity_type = document.getElementById('param-parity-type')?.value || 'even';
            payload.params.mode = document.getElementById('param-parity-mode')?.value || '1D';
            payload.params.columns = parseInt(document.getElementById('param-columns')?.value || 4, 10);
            payload.params.action = actionOverride || 'full_cycle';

            const errPosVal = document.getElementById('param-error-pos')?.value;
            if (errPosVal) payload.params.error_pos = parseInt(errPosVal, 10);

            const errRowVal = document.getElementById('param-error-row')?.value;
            const errColVal = document.getElementById('param-error-col')?.value;
            if (errRowVal && errColVal) {
                payload.params.error_row = parseInt(errRowVal, 10);
                payload.params.error_col = parseInt(errColVal, 10);
            }
        } else if (currentTechnique === 'crc') {
            payload.params.polynomial = document.getElementById('param-crc-poly')?.value || '1101';
            payload.params.action = actionOverride || 'full_cycle';
            const errPosVal = document.getElementById('param-error-pos')?.value;
            if (errPosVal) payload.params.error_pos = parseInt(errPosVal, 10);
        } else if (currentTechnique === 'hamming') {
            payload.params.mode = document.getElementById('param-hamming-mode')?.value || '7,4';
            payload.params.parity_type = document.getElementById('param-hamming-parity')?.value || 'even';
            payload.params.action = actionOverride || 'full_cycle';
            const errPosVal = document.getElementById('param-error-pos')?.value;
            if (errPosVal) payload.params.error_pos = parseInt(errPosVal, 10);
        } else if (currentTechnique === 'hamming_distance') {
            const hmode = document.getElementById('param-hdist-mode')?.value || 'pair';
            payload.params.mode = hmode;
            if (hmode === 'multi') {
                const multiRaw = document.getElementById('param-codewords-list')?.value || '';
                payload.params.codewords = multiRaw.replace(/\n/g, ',').split(',').map(s => s.trim()).filter(s => s.length > 0);
            } else {
                payload.params.codeword2 = document.getElementById('param-codeword2')?.value || '';
            }
        }

        return payload;
    }

    /**
     * Render Highlighted Visual Tokens Stream for Byte & Bit Stuffing
     */
    function renderStuffedTokens(tokens) {
        if (!tokens || !tokens.length) return '';
        let html = '<div class="token-stream-container">';
        tokens.forEach(tok => {
            let badgeClass = 'token-data';
            if (tok.type === 'flag') badgeClass = 'token-flag';
            else if (tok.type === 'esc_inserted') badgeClass = 'token-esc-inserted';
            else if (tok.type === 'stuffed_data') badgeClass = 'token-stuffed-data';
            else if (tok.type === 'stuffed_zero') badgeClass = 'token-stuffed-zero';

            html += `<span class="token-badge ${badgeClass}" title="${tok.label || tok.type}">${tok.value}</span>`;
        });
        html += '</div>';
        return html;
    }

    /**
     * Render 2D Block Parity Matrix Table
     */
    function render2DParityMatrix(res) {
        if (!res || !res.matrix_rows) return '';
        const cols = res.columns;
        const rows = res.rows;
        const rowParities = res.row_parities;
        const colParities = res.col_parities;
        const cornerParity = res.corner_parity;
        const pin = res.pinpointed_location;

        let html = '<div class="matrix-container"><table class="parity-matrix-table">';
        
        // Header row
        html += '<thead><tr><th>Block Matrix</th>';
        for (let c = 1; c <= cols; c++) {
            html += `<th>Col ${c}</th>`;
        }
        html += `<th>Row Parity (P_r)</th></tr></thead><tbody>`;

        // Matrix Data Rows
        for (let r = 0; r < rows; r++) {
            html += `<tr><th>Row ${r + 1}</th>`;
            const rowBits = res.matrix_rows[r];
            for (let c = 0; c < cols; c++) {
                const bitVal = rowBits[c];
                let isErrCell = (pin && pin.row === (r + 1) && pin.col === (c + 1));
                let cellClass = isErrCell ? 'parity-cell-error' : 'parity-cell-data';
                html += `<td class="${cellClass}">${bitVal} ${isErrCell ? '❌ [ERROR]' : ''}</td>`;
            }
            html += `<td class="parity-cell-row-p">${rowParities[r]}</td></tr>`;
        }

        // Footer Column Parities Row
        html += `<tr><th>Col Parity (P_c)</th>`;
        for (let c = 0; c < cols; c++) {
            html += `<td class="parity-cell-col-p">${colParities[c]}</td>`;
        }
        html += `<td class="parity-cell-corner">${cornerParity} (P_corner)</td></tr>`;

        html += '</tbody></table></div>';
        return html;
    }

    /**
     * Render Hamming Position Map Table
     */
    function renderHammingPosTable(posTable) {
        if (!posTable || !posTable.length) return '';
        let html = '<div class="hamming-table-container"><table class="hamming-pos-table"><thead><tr><th>Position</th>';
        posTable.forEach(item => {
            html += `<th>${item.pos}</th>`;
        });
        html += '</tr><tr><th>Type</th>';
        posTable.forEach(item => {
            html += `<th>${item.type}</th>`;
        });
        html += '</tr></thead><tbody><tr><th>Bit</th>';
        posTable.forEach(item => {
            let cellClass = item.is_parity ? 'pos-cell-p' : 'pos-cell-d';
            if (item.is_error) cellClass = 'pos-cell-err';
            html += `<td class="${cellClass}">${item.value} ${item.is_error ? '❌' : ''}</td>`;
        });
        html += '</tr></tbody></table></div>';
        return html;
    }

    /**
     * Render Hamming Distance Pairwise Bit Comparison Table (Mode A)
     */
    function renderHammingDistanceComparisonTable(comp) {
        if (!comp || !comp.length) return '';
        let html = '<div class="hdist-table-container"><table class="hdist-matrix-table"><thead><tr><th>Position</th>';
        comp.forEach(item => {
            html += `<th>${item.pos}</th>`;
        });
        html += '</tr></thead><tbody><tr><th>Codeword 1</th>';
        comp.forEach(item => {
            let cellClass = item.match ? '' : 'bit-diff-cell';
            html += `<td class="${cellClass}">${item.bit1}</td>`;
        });
        html += '</tr><tr><th>Codeword 2</th>';
        comp.forEach(item => {
            let cellClass = item.match ? '' : 'bit-diff-cell';
            html += `<td class="${cellClass}">${item.bit2}</td>`;
        });
        html += '</tr><tr><th>Match</th>';
        comp.forEach(item => {
            let matchText = item.match ? '✓' : '✗';
            let cellClass = item.match ? '' : 'bit-diff-cell';
            html += `<td class="${cellClass}">${matchText}</td>`;
        });
        html += '</tr><tr><th>XOR Bit</th>';
        comp.forEach(item => {
            let cellClass = item.match ? '' : 'bit-diff-cell';
            html += `<td class="${cellClass}">${item.xor_bit}</td>`;
        });
        html += '</tr></tbody></table></div>';
        return html;
    }

    /**
     * Render Hamming Distance Pairwise Matrix Table (Mode B)
     */
    function renderHammingDistanceMatrixTable(res) {
        if (!res || !res.pairwise_matrix || !res.codewords) return '';
        const cws = res.codewords;
        const matrix = res.pairwise_matrix;
        const dMin = res.d_min;

        let html = '<div class="hdist-table-container"><table class="hdist-matrix-table"><thead><tr><th>Codewords</th>';
        for (let j = 0; j < cws.length; j++) {
            html += `<th>C${j+1} (${cws[j]})</th>`;
        }
        html += '</tr></thead><tbody>';

        for (let i = 0; i < cws.length; i++) {
            html += `<tr><th>C${i+1} (${cws[i]})</th>`;
            for (let j = 0; j < cws.length; j++) {
                const dist = matrix[i][j];
                if (i === j) {
                    html += `<td class="hdist-cell-diag">-</td>`;
                } else if (dist === dMin) {
                    html += `<td class="hdist-cell-min">${dist} (d_min)</td>`;
                } else {
                    html += `<td>${dist}</td>`;
                }
            }
            html += '</tr>';
        }

        html += '</tbody></table></div>';
        return html;
    }

    /**
     * Send API Request to Flask Server & Render Response
     */
    async function processSimulatorData(actionOverride) {
        const startTime = performance.now();
        const payload = buildRequestPayload(actionOverride);

        if (tState) tState.textContent = 'RUNNING...';
        if (processBtn) {
            processBtn.disabled = true;
            processBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> RUNNING SIMULATION...';
        }
        if (resultStatusIndicator) {
            resultStatusIndicator.className = 'status-indicator-badge neutral';
            resultStatusIndicator.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> TRANSMITTING FRAME...';
        }

        try {
            const response = await fetch('/api/process', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            const endTime = performance.now();
            if (tLatency) tLatency.textContent = `${Math.round(endTime - startTime)} ms`;
            if (tState) tState.textContent = 'COMPLETED';

            if (data.success && data.result) {
                const res = data.result;

                // Handle User-Friendly Input Validation Error
                if (res.success === false) {
                    if (resultStatusIndicator) {
                        resultStatusIndicator.className = 'status-indicator-badge error-detected';
                        resultStatusIndicator.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> VALIDATION ERROR';
                    }
                    if (tError) { tError.textContent = 'VALIDATION ERROR'; tError.className = 't-val t-danger'; }
                    if (outputEncoded) outputEncoded.textContent = 'VALIDATION ERROR';
                    if (outputReceived) outputReceived.textContent = res.error || 'Invalid input payload';
                    if (outputDecoded) outputDecoded.textContent = payload.input_data ? `Received Input Payload: ${payload.input_data}` : 'No input payload provided';
                    if (stepByStepDisplay) stepByStepDisplay.innerHTML = `<div class="step-row error-step"><i class="fa-solid fa-circle-exclamation"></i> <strong>Validation Error:</strong> ${res.error}</div>`;
                    return;
                }

                // Render Response for Byte Stuffing or Bit Stuffing
                if (currentTechnique === 'byte_stuffing' || currentTechnique === 'bit_stuffing') {
                    if (res.action === 'stuff') {
                        if (resultStatusIndicator) {
                            resultStatusIndicator.className = 'status-indicator-badge success';
                            resultStatusIndicator.innerHTML = '<i class="fa-solid fa-check-circle"></i> FRAME STUFFED';
                        }
                        if (tError) { tError.textContent = 'NO ERROR'; tError.className = 't-val t-success'; }
                        if (outputEncoded) outputEncoded.textContent = res.original_data;
                        if (outputReceived) outputReceived.innerHTML = renderStuffedTokens(res.stuffed_tokens) || res.stuffed_frame;
                        if (outputDecoded) outputDecoded.textContent = 'N/A (Stuffing Mode)';
                    } else if (res.action === 'destuff') {
                        if (resultStatusIndicator) {
                            resultStatusIndicator.className = 'status-indicator-badge success';
                            resultStatusIndicator.innerHTML = '<i class="fa-solid fa-check-circle"></i> FRAME DE-STUFFED';
                        }
                        if (tError) { tError.textContent = 'NO ERROR'; tError.className = 't-val t-success'; }
                        if (outputEncoded) outputEncoded.textContent = 'N/A (De-stuff Mode)';
                        if (outputReceived) outputReceived.textContent = payload.input_data;
                        if (outputDecoded) outputDecoded.textContent = res.destuffed_data;
                    } else {
                        // Full Cycle Mode
                        if (resultStatusIndicator) {
                            if (res.integrity_match) {
                                resultStatusIndicator.className = 'status-indicator-badge success';
                                resultStatusIndicator.innerHTML = '<i class="fa-solid fa-shield-check"></i> TRANSMISSION VERIFIED';
                                if (tError) { tError.textContent = 'FRAME MATCH'; tError.className = 't-val t-success'; }
                            } else {
                                resultStatusIndicator.className = 'status-indicator-badge error-detected';
                                resultStatusIndicator.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> FRAME MISMATCH';
                                if (tError) { tError.textContent = 'CORRUPTED'; tError.className = 't-val t-danger'; }
                            }
                        }

                        if (outputEncoded) outputEncoded.textContent = res.original_data;
                        if (outputReceived) outputReceived.innerHTML = renderStuffedTokens(res.stuffed_tokens) || res.stuffed_frame;
                        if (outputDecoded) outputDecoded.textContent = res.destuff_success ? res.destuffed_data : `Failed: ${res.destuff_error}`;
                    }
                } else if (currentTechnique === 'parity') {
                    // Render 1D or 2D Parity Check
                    if (resultStatusIndicator) {
                        if (!res.error_detected) {
                            resultStatusIndicator.className = 'status-indicator-badge success';
                            resultStatusIndicator.innerHTML = '<i class="fa-solid fa-shield-check"></i> NO ERROR DETECTED';
                            if (tError) { tError.textContent = 'NO ERROR'; tError.className = 't-val t-success'; }
                        } else {
                            resultStatusIndicator.className = 'status-indicator-badge error-detected';
                            if (tError) { tError.textContent = 'DETECTED'; tError.className = 't-val t-danger'; }
                            if (res.pinpointed_location) {
                                resultStatusIndicator.innerHTML = `<i class="fa-solid fa-crosshairs"></i> ERROR PINPOINTED (Row ${res.pinpointed_location.row}, Col ${res.pinpointed_location.col})`;
                            } else {
                                resultStatusIndicator.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> ERROR DETECTED';
                            }
                        }
                    }

                    if (res.mode === '1D') {
                        if (outputEncoded) outputEncoded.textContent = `Payload: ${res.original_data} | Parity Bit: ${res.parity_bit}`;
                        if (outputReceived) outputReceived.textContent = res.received_codeword;
                        if (outputDecoded) outputDecoded.textContent = res.error_detected ? 'ERROR DETECTED (Corrupted Codeword)' : `Payload Intact: ${res.original_data}`;
                    } else {
                        // 2D Mode
                        if (outputEncoded) outputEncoded.textContent = `2D Grid (${res.rows}x${res.columns}) | Scheme: ${res.parity_type.toUpperCase()}`;
                        if (outputReceived) outputReceived.innerHTML = render2DParityMatrix(res);
                        if (outputDecoded) {
                            if (res.pinpointed_location) {
                                outputDecoded.textContent = `Error Pinpointed at Row ${res.pinpointed_location.row}, Column ${res.pinpointed_location.col}`;
                            } else {
                                outputDecoded.textContent = res.error_detected ? 'Multi-bit Error Detected' : 'Block Parity Intact';
                            }
                        }
                    }
                } else if (currentTechnique === 'crc') {
                    // Render CRC Checksum
                    if (res.action === 'encode') {
                        if (resultStatusIndicator) {
                            resultStatusIndicator.className = 'status-indicator-badge success';
                            resultStatusIndicator.innerHTML = '<i class="fa-solid fa-check-circle"></i> CRC ENCODED';
                        }
                        if (tError) { tError.textContent = 'CHECKSUM CREATED'; tError.className = 't-val t-success'; }
                        if (outputEncoded) outputEncoded.textContent = `Payload: ${res.original_data} | Appended Zeros: ${res.appended_data}`;
                        if (outputReceived) outputReceived.textContent = `CRC Remainder: ${res.crc_remainder}`;
                        if (outputDecoded) outputDecoded.textContent = `Transmitted Codeword: ${res.transmitted_codeword}`;
                    } else if (res.action === 'check') {
                        if (resultStatusIndicator) {
                            if (!res.error_detected) {
                                resultStatusIndicator.className = 'status-indicator-badge success';
                                resultStatusIndicator.innerHTML = '<i class="fa-solid fa-shield-check"></i> NO ERROR (Remainder = 0)';
                                if (tError) { tError.textContent = 'NO ERROR'; tError.className = 't-val t-success'; }
                            } else {
                                resultStatusIndicator.className = 'status-indicator-badge error-detected';
                                resultStatusIndicator.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> ERROR DETECTED (Non-zero Remainder)';
                                if (tError) { tError.textContent = 'NON-ZERO REMAINDER'; tError.className = 't-val t-danger'; }
                            }
                        }
                        if (outputEncoded) outputEncoded.textContent = 'N/A (Check Mode)';
                        if (outputReceived) outputReceived.textContent = `Received Codeword: ${res.received_codeword}`;
                        if (outputDecoded) outputDecoded.textContent = `Receiver Remainder: ${res.received_remainder}`;
                    } else {
                        // Full Cycle Mode
                        if (resultStatusIndicator) {
                            if (!res.error_detected) {
                                resultStatusIndicator.className = 'status-indicator-badge success';
                                resultStatusIndicator.innerHTML = '<i class="fa-solid fa-shield-check"></i> CRC INTEGRITY VERIFIED (Remainder = 0)';
                                if (tError) { tError.textContent = 'REMAINDER = 0'; tError.className = 't-val t-success'; }
                            } else {
                                resultStatusIndicator.className = 'status-indicator-badge error-detected';
                                resultStatusIndicator.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> ERROR DETECTED (Non-zero Remainder)';
                                if (tError) { tError.textContent = 'NON-ZERO REMAINDER'; tError.className = 't-val t-danger'; }
                            }
                        }
                        if (outputEncoded) outputEncoded.textContent = `Payload: ${res.original_data} | Remainder: ${res.crc_remainder}`;
                        if (outputReceived) outputReceived.textContent = `Received Codeword: ${res.received_codeword}`;
                        if (outputDecoded) outputDecoded.textContent = `Receiver Remainder: ${res.received_remainder} | ${res.error_detected ? 'CORRUPTED' : 'DATA INTACT'}`;
                    }
                } else if (currentTechnique === 'hamming') {
                    // Render Hamming Code
                    if (resultStatusIndicator) {
                        if (!res.error_detected) {
                            resultStatusIndicator.className = 'status-indicator-badge success';
                            resultStatusIndicator.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> CODEWORD INTACT (Syndrome = 0)';
                            if (tError) { tError.textContent = 'NO ERROR'; tError.className = 't-val t-success'; }
                        } else {
                            resultStatusIndicator.className = 'status-indicator-badge corrected';
                            resultStatusIndicator.innerHTML = `<i class="fa-solid fa-wrench"></i> ERROR CORRECTED (Position ${res.error_position})`;
                            if (tError) { tError.textContent = `CORRECTED (POS ${res.error_position})`; tError.className = 't-val t-success'; }
                        }
                    }

                    if (outputEncoded) outputEncoded.innerHTML = `<strong>Transmitted (${res.mode}):</strong> ${res.encoded_codeword}` + renderHammingPosTable(res.pos_table);
                    if (outputReceived) outputReceived.textContent = `Received: ${res.received_codeword} | Syndrome S = ${res.syndrome_string} (Pos ${res.error_position})`;
                    if (outputDecoded) outputDecoded.textContent = res.error_detected ? `Corrected Codeword: ${res.corrected_codeword} -> Extracted Data: ${res.extracted_data}` : `Extracted Data: ${res.extracted_data}`;
                } else if (currentTechnique === 'hamming_distance') {
                    // Render Hamming Distance & d_min
                    if (res.mode === 'multi') {
                        if (resultStatusIndicator) {
                            resultStatusIndicator.className = 'status-indicator-badge success';
                            resultStatusIndicator.innerHTML = `<i class="fa-solid fa-ruler"></i> Minimum Distance d_min = ${res.d_min}`;
                            if (tError) { tError.textContent = `d_min = ${res.d_min}`; tError.className = 't-val t-success'; }
                        }
                        if (outputEncoded) outputEncoded.textContent = `Codewords Set: [ ${res.codewords.join(', ')} ] (Count = ${res.num_codewords}, Length = ${res.codeword_length})`;
                        if (outputReceived) outputReceived.innerHTML = renderHammingDistanceMatrixTable(res);
                        if (outputDecoded) outputDecoded.innerHTML = `<strong>Capabilities:</strong> Detectable Errors <code>s = ${res.detectable_errors_s}</code> | Correctable Errors <code>t = ${res.correctable_errors_t}</code>`;
                    } else {
                        // Pair Comparison Mode
                        if (resultStatusIndicator) {
                            resultStatusIndicator.className = 'status-indicator-badge success';
                            resultStatusIndicator.innerHTML = `<i class="fa-solid fa-ruler-combined"></i> Hamming Distance d = ${res.distance}`;
                            if (tError) { tError.textContent = `Distance d = ${res.distance}`; tError.className = 't-val t-success'; }
                        }
                        if (outputEncoded) outputEncoded.textContent = `Codeword 1: ${res.codeword1} | Codeword 2: ${res.codeword2}`;
                        if (outputReceived) outputReceived.innerHTML = renderHammingDistanceComparisonTable(res.comparison);
                        if (outputDecoded) outputDecoded.textContent = `XOR Result: ${res.xor_result} | Differing Positions: ${res.differing_positions.length ? res.differing_positions.join(', ') : 'None (Identical)'}`;
                    }
                }

                // Render Step-by-Step Trace
                let stepsHtml = '';
                if (res.steps && res.steps.length) {
                    res.steps.forEach(step => {
                        let stepClass = 'step-row';
                        if (step.includes('INSERTED') || step.includes('PINPOINTED') || step.includes('AUTO-CORRECTING') || step.includes('d_min') || step.includes('Distance =') || step.includes('FLAG')) stepClass += ' highlight-step';
                        if (step.includes('FAILED') || step.includes('ERROR') || step.includes('Invalid') || step.includes('Notice:')) stepClass += ' error-step';
                        stepsHtml += `<div class="${stepClass}">${step}</div>`;
                    });
                }
                if (stepByStepDisplay) stepByStepDisplay.innerHTML = stepsHtml || 'No step trace generated.';
            } else {
                if (resultStatusIndicator) {
                    resultStatusIndicator.className = 'status-indicator-badge error-detected';
                    resultStatusIndicator.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> ERROR';
                }
                if (stepByStepDisplay) stepByStepDisplay.innerHTML = `<div class="step-row error-step"><i class="fa-solid fa-triangle-exclamation"></i> ${data.error || 'Server processing error occurred.'}</div>`;
            }
        } catch (err) {
            console.error('API Call Error:', err);
            if (resultStatusIndicator) {
                resultStatusIndicator.className = 'status-indicator-badge error-detected';
                resultStatusIndicator.innerHTML = '<i class="fa-solid fa-plug-circle-xmark"></i> CONNECTION ERROR';
            }
            if (stepByStepDisplay) stepByStepDisplay.innerHTML = `<div class="step-row error-step"><i class="fa-solid fa-plug-circle-xmark"></i> Failed to connect to backend relative endpoint at /api/process.</div>`;
        } finally {
            if (processBtn) {
                processBtn.disabled = false;
                processBtn.innerHTML = '<i class="fa-solid fa-play"></i> RUN SIMULATION';
            }
        }
    }

    // Attach Event Listeners
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const techKey = item.getAttribute('data-technique');
            selectTechnique(techKey);
        });
    });

    techniqueCards.forEach(card => {
        card.addEventListener('click', () => {
            const techKey = card.getAttribute('data-technique');
            selectTechnique(techKey);
            document.getElementById('simulator-panel')?.scrollIntoView({ behavior: 'smooth' });
        });
    });

    if (enableErrorToggle) {
        enableErrorToggle.addEventListener('change', (e) => {
            toggleErrorInjection(e.target.checked);
        });
    }

    if (flipBitBtn) {
        flipBitBtn.addEventListener('click', () => {
            if (!errorInputField) return;
            let val = errorInputField.value;
            if (!val) return;
            let arr = val.split('');
            for (let i = 0; i < arr.length; i++) {
                if (arr[i] === '0') { arr[i] = '1'; break; }
                else if (arr[i] === '1') { arr[i] = '0'; break; }
            }
            errorInputField.value = arr.join('');
        });
    }

    if (corruptByteBtn) {
        corruptByteBtn.addEventListener('click', () => {
            if (!errorInputField) return;
            let val = errorInputField.value;
            if (!val) return;
            if (currentTechnique === 'bit_stuffing') {
                errorInputField.value = val.slice(0, 10) + '111111' + val.slice(16);
            } else {
                errorInputField.value = val + " CORRUPT_FLAG";
            }
        });
    }

    if (processBtn) processBtn.addEventListener('click', () => processSimulatorData('full_cycle'));

    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            selectTechnique(currentTechnique);
        });
    }

    // Initialize default view
    selectTechnique('byte_stuffing');
});
