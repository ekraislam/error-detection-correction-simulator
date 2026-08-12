/**
 * Error Detection & Correction Simulator - Frontend JavaScript App
 * Handles dynamic UI state, technique selection, error injection controls, and API calls.
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
            title: "Byte / Character Stuffing Simulator",
            inputLabel: "Data Payload",
            placeholder: "e.g. A FLAG B ESC C",
            defaultValue: "A FLAG B ESC C",
            hint: "Enter space-separated characters or words representing byte payload.",
            paramsHtml: `
                <div class="form-group">
                    <label for="param-flag">Flag Byte</label>
                    <input type="text" id="param-flag" class="form-control code-input" value="FLAG">
                </div>
                <div class="form-group">
                    <label for="param-esc">Escape (ESC) Byte</label>
                    <input type="text" id="param-esc" class="form-control code-input" value="ESC">
                </div>
            `
        },
        bit_stuffing: {
            name: "Bit Stuffing",
            title: "Bit Stuffing & De-stuffing Simulator",
            inputLabel: "Binary Data Payload",
            placeholder: "e.g. 011111101111110",
            defaultValue: "011111101111110",
            hint: "Enter raw binary sequence ('0' and '1's).",
            paramsHtml: `
                <div class="form-group">
                    <label for="param-flag-pattern">Delimiter Flag Pattern</label>
                    <input type="text" id="param-flag-pattern" class="form-control code-input" value="01111110">
                </div>
            `
        },
        parity: {
            name: "Parity Check",
            title: "Parity Check (1D & 2D Block) Simulator",
            inputLabel: "Binary Payload Data",
            placeholder: "e.g. 1011001 or 1011 0101 1100",
            defaultValue: "1011001",
            hint: "Enter binary string for 1D or space-separated bytes for 2D parity block.",
            paramsHtml: `
                <div class="form-group">
                    <label for="param-parity-type">Parity Scheme</label>
                    <select id="param-parity-type" class="form-control">
                        <option value="even" selected>Even Parity</option>
                        <option value="odd">Odd Parity</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="param-parity-mode">Parity Dimension Mode</label>
                    <select id="param-parity-mode" class="form-control">
                        <option value="1D" selected>1D (Simple Parity Bit)</option>
                        <option value="2D">2D (Block Longitudinal Parity)</option>
                    </select>
                </div>
            `
        },
        crc: {
            name: "CRC Checksum",
            title: "Cyclic Redundancy Check (CRC) Simulator",
            inputLabel: "Binary Data Stream",
            placeholder: "e.g. 100100",
            defaultValue: "100100",
            hint: "Enter data bits to be polynomial-divided.",
            paramsHtml: `
                <div class="form-group">
                    <label for="param-crc-poly">Generator Polynomial (Divisor)</label>
                    <input type="text" id="param-crc-poly" class="form-control code-input" value="1101">
                    <small class="form-hint">e.g. 1101 for CRC-3 (X³ + X² + 1)</small>
                </div>
            `
        },
        hamming: {
            name: "Hamming Code",
            title: "Hamming Code Error Detection & Correction",
            inputLabel: "Raw Data Bits",
            placeholder: "e.g. 1011",
            defaultValue: "1011",
            hint: "Enter 4-bit (Hamming 7,4) or 11-bit payload sequence.",
            paramsHtml: `
                <div class="form-group">
                    <label for="param-hamming-parity">Parity Scheme</label>
                    <select id="param-hamming-parity" class="form-control">
                        <option value="even" selected>Even Parity</option>
                        <option value="odd">Odd Parity</option>
                    </select>
                </div>
            `
        },
        hamming_distance: {
            name: "Hamming Distance",
            title: "Hamming Distance & $d_{min}$ Theory Simulator",
            inputLabel: "Codeword 1 (Binary)",
            placeholder: "e.g. 101101",
            defaultValue: "101101",
            hint: "First codeword string.",
            paramsHtml: `
                <div class="form-group">
                    <label for="param-codeword2">Codeword 2 (Binary)</label>
                    <input type="text" id="param-codeword2" class="form-control code-input" value="100111">
                    <small class="form-hint">Equal length binary codeword string.</small>
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
            // Pre-fill error field with current input
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
    function buildRequestPayload() {
        const payload = {
            technique: currentTechnique,
            input_data: primaryInput.value.trim(),
            injected_error: enableErrorToggle.checked ? errorInputField.value.trim() : null,
            params: {}
        };

        if (currentTechnique === 'byte_stuffing') {
            payload.params.flag = document.getElementById('param-flag')?.value || 'FLAG';
            payload.params.esc = document.getElementById('param-esc')?.value || 'ESC';
        } else if (currentTechnique === 'bit_stuffing') {
            payload.params.flag_pattern = document.getElementById('param-flag-pattern')?.value || '01111110';
        } else if (currentTechnique === 'parity') {
            payload.params.parity_type = document.getElementById('param-parity-type')?.value || 'even';
            payload.params.mode = document.getElementById('param-parity-mode')?.value || '1D';
        } else if (currentTechnique === 'crc') {
            payload.params.polynomial = document.getElementById('param-crc-poly')?.value || '1101';
        } else if (currentTechnique === 'hamming') {
            payload.params.parity_type = document.getElementById('param-hamming-parity')?.value || 'even';
        } else if (currentTechnique === 'hamming_distance') {
            payload.params.codeword2 = document.getElementById('param-codeword2')?.value || '';
        }

        return payload;
    }

    /**
     * Send API Request to Flask Server
     */
    async function processSimulatorData() {
        const payload = buildRequestPayload();

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
                resultStatusIndicator.className = 'status-indicator-badge success';
                resultStatusIndicator.innerHTML = '<i class="fa-solid fa-circle-check"></i> Flask Endpoint Responded';

                outputEncoded.textContent = payload.input_data;
                outputReceived.textContent = payload.injected_error || payload.input_data;
                outputDecoded.textContent = res.message || "Ready";

                stepByStepDisplay.innerHTML = `
                    <div style="color: var(--accent-cyan); font-weight: 600; margin-bottom: 10px;">
                        [Status] ${res.status || 'OK'}
                    </div>
                    <div>${res.message || 'Modular endpoint active.'}</div>
                    <pre style="margin-top: 14px; color: var(--text-secondary); background: var(--bg-base); padding: 12px; border-radius: 6px;">${JSON.stringify(res, null, 2)}</pre>
                `;
            } else {
                resultStatusIndicator.className = 'status-indicator-badge error-detected';
                resultStatusIndicator.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Error';
                stepByStepDisplay.textContent = data.error || 'Server processing error occurred.';
            }
        } catch (err) {
            console.error('API Call Error:', err);
            resultStatusIndicator.className = 'status-indicator-badge error-detected';
            resultStatusIndicator.innerHTML = '<i class="fa-solid fa-plug-circle-xmark"></i> Connection Error';
            stepByStepDisplay.textContent = 'Failed to connect to Flask server backend at http://127.0.0.1:5000.';
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
            // Smooth scroll down to simulator panel on card click
            document.getElementById('simulator-panel').scrollIntoView({ behavior: 'smooth' });
        });
    });

    enableErrorToggle.addEventListener('change', (e) => {
        toggleErrorInjection(e.target.checked);
    });

    flipBitBtn.addEventListener('click', () => {
        let val = errorInputField.value;
        if (!val) return;
        // Simple bit flip simulation for binary strings
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
        errorInputField.value = val + " CORRUPT_FLAG";
    });

    processBtn.addEventListener('click', processSimulatorData);

    resetBtn.addEventListener('click', () => {
        selectTechnique(currentTechnique);
    });

    // Initialize default view
    selectTechnique('byte_stuffing');
});
