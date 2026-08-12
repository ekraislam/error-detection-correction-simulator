/**
 * Error Detection & Correction Simulator - Frontend JavaScript App
 * Handles dynamic UI state, technique selection, Byte/Bit Stuffing,
 * 1D/2D Parity Check, CRC Checksum, Hamming Code, Hamming Distance visualizations, error injection controls, and API calls.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Current Active Technique State
    let currentTechnique = 'byte_stuffing';

    // DOM Elements
    const navItems = document.querySelectorAll('.nav-item');
    const techniqueCards = document.querySelectorAll('.technique-card');
    
    const activeTechniqueTag = document.getElementById('active-technique-tag');
    const activeTechniqueTitle = document.getElementById('active-technique-title');
    
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

    const resultStatusIndicator = document.getElementById('result-status-indicator');
    const outputEncoded = document.getElementById('output-encoded');
    const outputReceived = document.getElementById('output-received');
    const outputDecoded = document.getElementById('output-decoded');
    const stepByStepDisplay = document.getElementById('step-by-step-display');

    // Configuration map for each of the 6 techniques
    const techniqueConfigs = {
        byte_stuffing: {
            name: "Byte Stuffing",
            title: "Byte / Character Stuffing & De-stuffing",
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
            title: "Bit Stuffing & De-stuffing Simulator",
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
                <div class="form-group" style="grid-column: span 2; font-size: 0.78rem; color: var(--text-muted); background: var(--bg-surface); padding: 8px 12px; border-radius: 6px; border-left: 3px solid var(--accent-amber);">
                    <i class="fa-solid fa-circle-info" style="color: var(--accent-amber);"></i> <strong>Note:</strong> Bit stuffing is primarily a <em>framing/transparency mechanism</em>. Error detection normally requires techniques like Parity or CRC.
                </div>
            `
        },
        parity: {
            name: "Parity Check",
            title: "Parity Check (1D Simple & 2D Block Parity)",
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
                <div class="form-group" style="grid-column: span 2; font-size: 0.78rem; color: var(--text-muted); background: var(--bg-surface); padding: 8px 12px; border-radius: 6px; border-left: 3px solid var(--accent-cyan);">
                    <i class="fa-solid fa-circle-info" style="color: var(--accent-cyan);"></i> <strong>Concept:</strong> Simple 1D parity detects odd number of bit errors (e.g. 1 bit flip), but fails on even number of bit errors (e.g. 2 bit flips). 2D parity pinpoints single-bit error locations at Row $r$, Column $c$.
                </div>
            `
        },
        crc: {
            name: "CRC Checksum",
            title: "Cyclic Redundancy Check (CRC) Modulo-2 Division",
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
                <div class="form-group" style="grid-column: span 2; font-size: 0.78rem; color: var(--text-muted); background: var(--bg-surface); padding: 8px 12px; border-radius: 6px; border-left: 3px solid var(--accent-purple);">
                    <i class="fa-solid fa-circle-info" style="color: var(--accent-purple);"></i> <strong>What is CRC?</strong> CRC uses polynomial-based modulo-2 XOR division to calculate a remainder appended to original data. The receiver repeats division. A non-zero remainder indicates an error. CRC detects transmission errors but does not itself correct them.
                </div>
            `
        },
        hamming: {
            name: "Hamming Code",
            title: "Hamming Code Error Detection & Correction (SEC)",
            inputLabel: "Raw Data Bits Payload",
            placeholder: "e.g. 1011 for (7,4) or 10110010110 for (15,11)",
            defaultValue: "1011",
            hint: "Requires exactly 4 bits for Hamming (7,4) or 11 bits for Hamming (15,11).",
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
                <div class="form-group" style="grid-column: span 2; font-size: 0.78rem; color: var(--text-muted); background: var(--bg-surface); padding: 8px 12px; border-radius: 6px; border-left: 3px solid var(--accent-blue);">
                    <i class="fa-solid fa-circle-info" style="color: var(--accent-blue);"></i> <strong>How it works:</strong> Hamming Code adds parity bits at power-of-two positions (1, 2, 4, 8...). At the receiver, parity checks generate a syndrome identifying the 1-indexed position of a single-bit error, allowing auto-correction.
                </div>
            `
        },
        hamming_distance: {
            name: "Hamming Distance",
            title: "Hamming Distance & Minimum Distance (d_min) Theory",
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
                <div class="form-group" style="grid-column: span 2; font-size: 0.78rem; color: var(--text-muted); background: var(--bg-surface); padding: 8px 12px; border-radius: 6px; border-left: 3px solid var(--accent-emerald);">
                    <i class="fa-solid fa-circle-info" style="color: var(--accent-emerald);"></i> <strong>Theory:</strong> Hamming Distance $d(c_1, c_2)$ measures the number of differing bit positions. For a codeword set, $d_{min}$ is the smallest distance between any pair. Maximum detectable errors $s = d_{min} - 1$, Maximum correctable errors $t = \\lfloor(d_{min}-1)/2\\rfloor$.
                </div>
            `
        }
    };

    /**
     * Switch Active Technique UI & Update Input Form Controls
     */
    function selectTechnique(techKey) {
        if (!techniqueConfigs[techKey]) return;
        currentTechnique = techKey;
        const config = techniqueConfigs[techKey];

        // Update active highlight on navigation items
        navItems.forEach(item => {
            if (item.getAttribute('data-technique') === techKey) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Update active highlight on cards
        techniqueCards.forEach(card => {
            if (card.getAttribute('data-technique') === techKey) {
                card.classList.add('active');
            } else {
                card.classList.remove('active');
            }
        });

        // Update Header Titles
        activeTechniqueTag.textContent = config.name;
        activeTechniqueTitle.textContent = config.title;

        // Update Form Inputs
        primaryInputLabel.textContent = config.inputLabel;
        primaryInput.placeholder = config.placeholder;
        primaryInput.value = config.defaultValue;
        primaryInputHint.textContent = config.hint;

        // Render Dynamic Parameters
        dynamicParamsContainer.innerHTML = config.paramsHtml;

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
                    primaryInput.value = "1011001011001001";
                } else {
                    if (colGroup) colGroup.style.display = 'none';
                    if (err2dGroup) err2dGroup.style.display = 'none';
                    primaryInput.value = "1011001";
                }
            });
        } else if (techKey === 'crc') {
            document.getElementById('btn-crc-encode-only')?.addEventListener('click', () => processSimulatorData('encode'));
            document.getElementById('btn-crc-check-only')?.addEventListener('click', () => processSimulatorData('check'));
        } else if (techKey === 'hamming') {
            const hModeSelect = document.getElementById('param-hamming-mode');
            hModeSelect?.addEventListener('change', (e) => {
                if (e.target.value === '15,11') {
                    primaryInput.value = "10110010110";
                } else {
                    primaryInput.value = "1011";
                }
            });
            document.getElementById('btn-hamming-encode-only')?.addEventListener('click', () => processSimulatorData('encode'));
            document.getElementById('btn-hamming-decode-only')?.addEventListener('click', () => processSimulatorData('decode'));
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
        enableErrorToggle.checked = false;
        toggleErrorInjection(false);

        // Reset Results Display Area
        resetResultsDisplay();
    }

    /**
     * Enable/Disable Error Injection Controls
     */
    function toggleErrorInjection(enabled) {
        if (enabled) {
            errorControlsWrapper.classList.remove('disabled');
            errorInputField.disabled = false;
            flipBitBtn.disabled = false;
            corruptByteBtn.disabled = false;
            errorInputField.value = primaryInput.value;
        } else {
            errorControlsWrapper.classList.add('disabled');
            errorInputField.disabled = true;
            flipBitBtn.disabled = true;
            corruptByteBtn.disabled = true;
            errorInputField.value = '';
        }
    }

    /**
     * Reset Results View to Initial State
     */
    function resetResultsDisplay() {
        resultStatusIndicator.className = 'status-indicator-badge neutral';
        resultStatusIndicator.innerHTML = '<i class="fa-solid fa-circle-info"></i> Ready for Processing';
        outputEncoded.textContent = '-- Awaiting Calculation --';
        outputReceived.textContent = '-- Awaiting Calculation --';
        outputDecoded.textContent = '-- Awaiting Calculation --';
        stepByStepDisplay.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-sliders"></i>
                <p>Select inputs and click <strong>Process Data</strong> to execute step-by-step calculations.</p>
            </div>
        `;
    }

    /**
     * Gather Request Parameters based on technique
     */
    function buildRequestPayload(actionOverride) {
        const payload = {
            technique: currentTechnique,
            input_data: primaryInput.value.trim(),
            injected_error: enableErrorToggle.checked ? errorInputField.value.trim() : null,
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
        const payload = buildRequestPayload(actionOverride);

        resultStatusIndicator.className = 'status-indicator-badge neutral';
        resultStatusIndicator.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing Backend...';

        try {
            const response = await fetch('/api/process', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (data.success && data.result) {
                const res = data.result;

                // Handle Error Response from Algorithm Validation
                if (res.success === false) {
                    resultStatusIndicator.className = 'status-indicator-badge error-detected';
                    resultStatusIndicator.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Error';
                    outputEncoded.textContent = 'Validation Error';
                    outputReceived.textContent = 'N/A';
                    outputDecoded.textContent = 'N/A';
                    stepByStepDisplay.innerHTML = `<div class="step-row error-step"><i class="fa-solid fa-circle-exclamation"></i> ${res.error}</div>`;
                    return;
                }

                // Render Response for Byte Stuffing or Bit Stuffing
                if (currentTechnique === 'byte_stuffing' || currentTechnique === 'bit_stuffing') {
                    if (res.action === 'stuff') {
                        resultStatusIndicator.className = 'status-indicator-badge success';
                        resultStatusIndicator.innerHTML = '<i class="fa-solid fa-check-circle"></i> Data Stuffed';
                        outputEncoded.textContent = res.original_data;
                        outputReceived.innerHTML = renderStuffedTokens(res.stuffed_tokens) || res.stuffed_frame;
                        outputDecoded.textContent = 'N/A (Stuffing Mode)';
                    } else if (res.action === 'destuff') {
                        resultStatusIndicator.className = 'status-indicator-badge success';
                        resultStatusIndicator.innerHTML = '<i class="fa-solid fa-check-circle"></i> Frame De-stuffed';
                        outputEncoded.textContent = 'N/A (De-stuff Mode)';
                        outputReceived.textContent = payload.input_data;
                        outputDecoded.textContent = res.destuffed_data;
                    } else {
                        // Full Cycle Mode
                        if (res.integrity_match) {
                            resultStatusIndicator.className = 'status-indicator-badge success';
                            resultStatusIndicator.innerHTML = '<i class="fa-solid fa-shield-check"></i> Integrity Verified (Exact Match)';
                        } else {
                            resultStatusIndicator.className = 'status-indicator-badge error-detected';
                            resultStatusIndicator.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Error / Frame Mismatch';
                        }

                        outputEncoded.textContent = res.original_data;
                        outputReceived.innerHTML = renderStuffedTokens(res.stuffed_tokens) || res.stuffed_frame;
                        outputDecoded.textContent = res.destuff_success ? res.destuffed_data : `Failed: ${res.destuff_error}`;
                    }
                } else if (currentTechnique === 'parity') {
                    // Render 1D or 2D Parity Check
                    if (!res.error_detected) {
                        resultStatusIndicator.className = 'status-indicator-badge success';
                        resultStatusIndicator.innerHTML = '<i class="fa-solid fa-shield-check"></i> NO ERROR DETECTED';
                    } else {
                        resultStatusIndicator.className = 'status-indicator-badge error-detected';
                        if (res.pinpointed_location) {
                            resultStatusIndicator.innerHTML = `<i class="fa-solid fa-crosshairs"></i> ERROR DETECTED & PINPOINTED (Row ${res.pinpointed_location.row}, Col ${res.pinpointed_location.col})`;
                        } else {
                            resultStatusIndicator.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> ERROR DETECTED';
                        }
                    }

                    if (res.mode === '1D') {
                        outputEncoded.textContent = `Payload: ${res.original_data} | Parity Bit: ${res.parity_bit}`;
                        outputReceived.textContent = res.received_codeword;
                        outputDecoded.textContent = res.error_detected ? 'ERROR DETECTED (Corrupted Codeword)' : `Payload Intact: ${res.original_data}`;
                    } else {
                        // 2D Mode
                        outputEncoded.textContent = `2D Grid (${res.rows}x${res.columns}) | Parity Scheme: ${res.parity_type.toUpperCase()}`;
                        outputReceived.innerHTML = render2DParityMatrix(res);
                        if (res.pinpointed_location) {
                            outputDecoded.textContent = `Error Pinpointed at Row ${res.pinpointed_location.row}, Column ${res.pinpointed_location.col}`;
                        } else {
                            outputDecoded.textContent = res.error_detected ? 'Multi-bit Error Detected' : 'Block Parity Intact';
                        }
                    }
                } else if (currentTechnique === 'crc') {
                    // Render CRC Checksum
                    if (res.action === 'encode') {
                        resultStatusIndicator.className = 'status-indicator-badge success';
                        resultStatusIndicator.innerHTML = '<i class="fa-solid fa-check-circle"></i> CRC Encoded';
                        outputEncoded.textContent = `Payload: ${res.original_data} | Appended Zeros: ${res.appended_data}`;
                        outputReceived.textContent = `CRC Remainder: ${res.crc_remainder}`;
                        outputDecoded.textContent = `Transmitted Codeword: ${res.transmitted_codeword}`;
                    } else if (res.action === 'check') {
                        if (!res.error_detected) {
                            resultStatusIndicator.className = 'status-indicator-badge success';
                            resultStatusIndicator.innerHTML = '<i class="fa-solid fa-shield-check"></i> NO ERROR DETECTED (Remainder = 0)';
                        } else {
                            resultStatusIndicator.className = 'status-indicator-badge error-detected';
                            resultStatusIndicator.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> ERROR DETECTED (Non-zero Remainder)';
                        }
                        outputEncoded.textContent = 'N/A (Check Mode)';
                        outputReceived.textContent = `Received Codeword: ${res.received_codeword}`;
                        outputDecoded.textContent = `Receiver Remainder: ${res.received_remainder}`;
                    } else {
                        // Full Cycle Mode
                        if (!res.error_detected) {
                            resultStatusIndicator.className = 'status-indicator-badge success';
                            resultStatusIndicator.innerHTML = '<i class="fa-solid fa-shield-check"></i> CRC INTEGRITY VERIFIED (Remainder = 0)';
                        } else {
                            resultStatusIndicator.className = 'status-indicator-badge error-detected';
                            resultStatusIndicator.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> ERROR DETECTED (Non-zero Remainder)';
                        }
                        outputEncoded.textContent = `Payload: ${res.original_data} | Remainder: ${res.crc_remainder}`;
                        outputReceived.textContent = `Received Codeword: ${res.received_codeword}`;
                        outputDecoded.textContent = `Receiver Remainder: ${res.received_remainder} | ${res.error_detected ? 'CORRUPTED' : 'DATA INTACT'}`;
                    }
                } else if (currentTechnique === 'hamming') {
                    // Render Hamming Code
                    if (!res.error_detected) {
                        resultStatusIndicator.className = 'status-indicator-badge success';
                        resultStatusIndicator.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> CODEWORD INTACT (Syndrome = 0)';
                    } else {
                        resultStatusIndicator.className = 'status-indicator-badge corrected';
                        resultStatusIndicator.innerHTML = `<i class="fa-solid fa-wrench"></i> ERROR DETECTED & AUTO-CORRECTED (Position ${res.error_position})`;
                    }

                    outputEncoded.innerHTML = `<strong>Transmitted (${res.mode}):</strong> ${res.encoded_codeword}` + renderHammingPosTable(res.pos_table);
                    outputReceived.textContent = `Received: ${res.received_codeword} | Syndrome S = ${res.syndrome_string} (Pos ${res.error_position})`;
                    outputDecoded.textContent = res.error_detected ? `Corrected Codeword: ${res.corrected_codeword} -> Extracted Data: ${res.extracted_data}` : `Extracted Data: ${res.extracted_data}`;
                } else if (currentTechnique === 'hamming_distance') {
                    // Render Hamming Distance & d_min
                    if (res.mode === 'multi') {
                        resultStatusIndicator.className = 'status-indicator-badge success';
                        resultStatusIndicator.innerHTML = `<i class="fa-solid fa-ruler"></i> Minimum Distance d_min = ${res.d_min}`;
                        outputEncoded.textContent = `Codewords Set: [ ${res.codewords.join(', ')} ] (Count = ${res.num_codewords}, Length = ${res.codeword_length})`;
                        outputReceived.innerHTML = renderHammingDistanceMatrixTable(res);
                        outputDecoded.innerHTML = `<strong>Theoretical Capabilities:</strong> Max Detectable Errors <code>s = ${res.detectable_errors_s}</code> | Max Correctable Errors <code>t = ${res.correctable_errors_t}</code>`;
                    } else {
                        // Pair Comparison Mode
                        resultStatusIndicator.className = 'status-indicator-badge success';
                        resultStatusIndicator.innerHTML = `<i class="fa-solid fa-ruler-combined"></i> Hamming Distance d = ${res.distance}`;
                        outputEncoded.textContent = `Codeword 1: ${res.codeword1} | Codeword 2: ${res.codeword2}`;
                        outputReceived.innerHTML = renderHammingDistanceComparisonTable(res.comparison);
                        outputDecoded.textContent = `XOR Result: ${res.xor_result} | Differing Positions: ${res.differing_positions.length ? res.differing_positions.join(', ') : 'None (Identical)'}`;
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
                stepByStepDisplay.innerHTML = stepsHtml || 'No step trace generated.';
            } else {
                resultStatusIndicator.className = 'status-indicator-badge error-detected';
                resultStatusIndicator.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Error';
                stepByStepDisplay.textContent = data.error || 'Server processing error occurred.';
            }
        } catch (err) {
            console.error('API Call Error:', err);
            resultStatusIndicator.className = 'status-indicator-badge error-detected';
            resultStatusIndicator.innerHTML = '<i class="fa-solid fa-plug-circle-xmark"></i> Connection Error';
            stepByStepDisplay.textContent = 'Failed to connect to Flask server backend at /api/process.';
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
            document.getElementById('simulator-panel').scrollIntoView({ behavior: 'smooth' });
        });
    });

    enableErrorToggle.addEventListener('change', (e) => {
        toggleErrorInjection(e.target.checked);
    });

    flipBitBtn.addEventListener('click', () => {
        let val = errorInputField.value;
        if (!val) return;
        let arr = val.split('');
        for (let i = 0; i < arr.length; i++) {
            if (arr[i] === '0') { arr[i] = '1'; break; }
            else if (arr[i] === '1') { arr[i] = '0'; break; }
        }
        errorInputField.value = arr.join('');
    });

    corruptByteBtn.addEventListener('click', () => {
        let val = errorInputField.value;
        if (!val) return;
        if (currentTechnique === 'bit_stuffing') {
            errorInputField.value = val.slice(0, 10) + '111111' + val.slice(16);
        } else {
            errorInputField.value = val + " CORRUPT_FLAG";
        }
    });

    processBtn.addEventListener('click', () => processSimulatorData('full_cycle'));

    resetBtn.addEventListener('click', () => {
        selectTechnique(currentTechnique);
    });

    // Initialize default view
    selectTechnique('byte_stuffing');
});
