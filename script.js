// ============================================
// RBXM to Roblox Asset ID Converter
// Full Working Implementation
// ============================================

// --- Galaxy Background Effects ---
function initGalaxy() {
    createStars();
    createShootingStars();
    createFloatingOrbs();
}

function createStars() {
    const container = document.getElementById('stars');
    const count = window.innerWidth < 600 ? 100 : 200;
    for (let i = 0; i < count; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        const size = Math.random() * 2.5 + 0.5;
        star.style.cssText = `
            width: ${size}px;
            height: ${size}px;
            left: ${Math.random() * 100}%;
            top: ${Math.random() * 100}%;
            --duration: ${Math.random() * 3 + 2}s;
            --delay: ${Math.random() * 5}s;
            --min-opacity: ${Math.random() * 0.3 + 0.1};
        `;
        container.appendChild(star);
    }
}

function createShootingStars() {
    const container = document.getElementById('shootingStars');
    for (let i = 0; i < 5; i++) {
        const star = document.createElement('div');
        star.className = 'shooting-star';
        star.style.cssText = `
            left: ${Math.random() * 100 + 20}%;
            top: ${Math.random() * 40}%;
            --duration: ${Math.random() * 4 + 6}s;
            --delay: ${Math.random() * 15}s;
        `;
        container.appendChild(star);
    }
}

function createFloatingOrbs() {
    const container = document.getElementById('floatingOrbs');
    const colors = [
        'rgba(168, 85, 247, 0.3)',
        'rgba(139, 92, 246, 0.25)',
        'rgba(59, 130, 246, 0.2)',
        'rgba(236, 72, 153, 0.2)',
        'rgba(16, 185, 129, 0.15)',
    ];
    for (let i = 0; i < 8; i++) {
        const orb = document.createElement('div');
        orb.className = 'floating-orb';
        const size = Math.random() * 6 + 3;
        orb.style.cssText = `
            width: ${size}px;
            height: ${size}px;
            left: ${Math.random() * 100}%;
            top: ${Math.random() * 100}%;
            --color: ${colors[Math.floor(Math.random() * colors.length)]};
            --duration: ${Math.random() * 4 + 3}s;
            --delay: ${Math.random() * 5}s;
        `;
        container.appendChild(orb);
    }
}

// --- Dropzone Hover Effect ---
function initDropzoneEffect() {
    const dropzone = document.getElementById('dropzone');
    if (!dropzone) return;

    dropzone.addEventListener('mousemove', (e) => {
        const rect = dropzone.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        const effect = dropzone.querySelector('.dropzone-hover-effect');
        if (effect) {
            effect.style.setProperty('--x', x + '%');
            effect.style.setProperty('--y', y + '%');
        }
    });
}

// --- State ---
let currentStep = 1;
let selectedFile = null;

// --- Step Navigation ---
function goToStep(step) {
    // Validation
    if (step === 2 && currentStep === 1) {
        const apiKey = document.getElementById('apiKey').value.trim();
        const creatorId = document.getElementById('creatorId').value.trim();
        if (!apiKey) {
            showToast('Please enter your API Key', 'error');
            shakeElement(document.getElementById('apiKey').closest('.glass-input'));
            return;
        }
        if (!creatorId) {
            showToast('Please enter your Creator ID', 'error');
            shakeElement(document.getElementById('creatorId').closest('.glass-input'));
            return;
        }
    }

    if (step === 3 && currentStep === 2) {
        if (!selectedFile) {
            showToast('Please select a RBXM file', 'error');
            shakeElement(document.getElementById('dropzone'));
            return;
        }
        const assetName = document.getElementById('assetName').value.trim();
        if (!assetName) {
            showToast('Please enter an asset name', 'error');
            shakeElement(document.getElementById('assetName').closest('.glass-input'));
            return;
        }
        // Start conversion
        startConversion();
    }

    if (step <= 3) {
        updateStepUI(step);
        showPanel(step);
        currentStep = step;
    }
}

function updateStepUI(step) {
    const steps = document.querySelectorAll('.step');
    const lines = document.querySelectorAll('.step-line');

    steps.forEach((s, i) => {
        const stepNum = i + 1;
        s.classList.remove('active', 'completed');
        if (stepNum < step) s.classList.add('completed');
        if (stepNum === step) s.classList.add('active');
    });

    lines.forEach((line, i) => {
        line.classList.toggle('filled', i < step - 1);
    });
}

function showPanel(step) {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    const panel = document.getElementById('panel' + step);
    if (panel) {
        panel.classList.add('active');
        // Re-trigger animation
        panel.style.animation = 'none';
        panel.offsetHeight;
        panel.style.animation = '';
    }
}

// --- File Handling ---
function initFileHandlers() {
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('fileInput');

    dropzone.addEventListener('click', () => fileInput.click());

    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('drag-over');
    });

    dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('drag-over');
    });

    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('drag-over');
        const files = e.dataTransfer.files;
        if (files.length > 0) handleFile(files[0]);
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) handleFile(e.target.files[0]);
    });
}

function handleFile(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['rbxm', 'rbxmx'].includes(ext)) {
        showToast('Please select a .rbxm or .rbxmx file', 'error');
        return;
    }

    selectedFile = file;

    // Update UI
    document.getElementById('fileName').textContent = file.name;
    document.getElementById('fileSize').textContent = formatFileSize(file.size);
    document.getElementById('fileInfo').style.display = 'flex';
    document.getElementById('dropzone').style.display = 'none';

    // Auto-fill asset name
    const nameInput = document.getElementById('assetName');
    if (!nameInput.value) {
        nameInput.value = file.name.replace(/\.(rbxm|rbxmx)$/i, '');
    }

    showToast('File loaded: ' + file.name, 'success');
}

function removeFile() {
    selectedFile = null;
    document.getElementById('fileInput').value = '';
    document.getElementById('fileInfo').style.display = 'none';
    document.getElementById('dropzone').style.display = 'block';
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

// --- Conversion Process ---
async function startConversion() {
    currentStep = 3;
    updateStepUI(3);
    showPanel(3);

    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const progressPercent = document.getElementById('progressPercent');
    const logContent = document.getElementById('logContent');

    // Reset
    progressBar.style.width = '0%';
    logContent.innerHTML = '';

    const apiKey = document.getElementById('apiKey').value.trim();
    const creatorId = document.getElementById('creatorId').value.trim();
    const creatorType = document.getElementById('creatorType').value;
    const assetType = document.getElementById('assetType').value;
    const assetName = document.getElementById('assetName').value.trim();
    const assetDescription = document.getElementById('assetDescription').value.trim();

    // Step 1: Preparing
    addLog('Initializing upload process...', 'info');
    await animateProgress(0, 10, 'Preparing file...');

    addLog(`File: ${selectedFile.name} (${formatFileSize(selectedFile.size)})`, 'info');
    await animateProgress(10, 20, 'Reading file data...');

    // Step 2: Reading file
    addLog('Reading RBXM binary data...', 'info');
    let fileBuffer;
    try {
        fileBuffer = await readFileAsArrayBuffer(selectedFile);
        addLog('File data loaded successfully', 'success');
    } catch (err) {
        addLog('Error reading file: ' + err.message, 'error');
        showToast('Error reading file', 'error');
        return;
    }
    await animateProgress(20, 40, 'File data loaded...');

    // Step 3: Upload to Roblox via Open Cloud API
    addLog('Connecting to Roblox Open Cloud API...', 'info');
    await animateProgress(40, 50, 'Connecting to Roblox...');

    addLog(`Creator: ${creatorType} (${creatorId})`, 'info');
    addLog(`Asset type: ${assetType}`, 'info');
    addLog(`Asset name: ${assetName}`, 'info');
    await animateProgress(50, 60, 'Uploading asset...');

    try {
        addLog('Sending asset to Roblox servers...', 'info');
        const result = await uploadToRoblox({
            apiKey,
            creatorId,
            creatorType,
            assetType,
            assetName,
            assetDescription,
            fileBuffer,
            fileName: selectedFile.name
        });

        await animateProgress(60, 80, 'Processing on Roblox...');
        addLog('Asset uploaded, waiting for processing...', 'info');

        // Poll for operation result if needed
        let assetId = result.assetId;
        let operationPath = result.operationPath;

        if (operationPath && !assetId) {
            addLog('Polling operation status...', 'info');
            assetId = await pollOperation(apiKey, operationPath);
        }

        await animateProgress(80, 100, 'Complete!');
        addLog(`Asset ID: ${assetId}`, 'success');
        addLog('Conversion completed successfully!', 'success');

        // Show result
        setTimeout(() => {
            showResult(assetId, assetName, assetType);
        }, 600);

    } catch (err) {
        addLog('Upload failed: ' + err.message, 'error');
        progressText.textContent = 'Upload failed';
        showToast('Upload failed: ' + err.message, 'error');

        // Show retry option
        setTimeout(() => {
            addLog('You can go back and try again.', 'warning');
            const retryBtn = document.createElement('button');
            retryBtn.className = 'glass-button secondary';
            retryBtn.innerHTML = '<i class="fas fa-arrow-left"></i> <span>Go Back</span>';
            retryBtn.style.marginTop = '16px';
            retryBtn.onclick = () => goToStep(2);
            logContent.parentElement.after(retryBtn);
        }, 500);
    }
}

function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(file);
    });
}

async function uploadToRoblox({ apiKey, creatorId, creatorType, assetType, assetName, assetDescription, fileBuffer, fileName }) {
    // Roblox Open Cloud Assets API
    // POST https://apis.roblox.com/assets/v1/assets

    const assetTypeMap = {
        'Model': 'Model',
        'Decal': 'Decal',
        'Audio': 'Audio',
    };

    const contentTypeMap = {
        'Model': 'application/octet-stream',
        'Decal': 'image/png',
        'Audio': 'audio/mpeg',
    };

    // Build multipart form data
    const boundary = '----RBXMConverter' + Date.now();

    const requestJson = JSON.stringify({
        assetType: assetTypeMap[assetType],
        displayName: assetName,
        description: assetDescription || assetName,
        creationContext: {
            creator: {
                userId: creatorType === 'User' ? creatorId : undefined,
                groupId: creatorType === 'Group' ? creatorId : undefined,
            }
        }
    });

    // Build multipart body manually
    const encoder = new TextEncoder();

    const parts = [];

    // Part 1: request JSON
    parts.push(encoder.encode(
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="request"\r\n` +
        `Content-Type: application/json\r\n\r\n` +
        requestJson + '\r\n'
    ));

    // Part 2: file content
    const fileHeader = encoder.encode(
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="fileContent"; filename="${fileName}"\r\n` +
        `Content-Type: ${contentTypeMap[assetType] || 'application/octet-stream'}\r\n\r\n`
    );
    parts.push(fileHeader);
    parts.push(new Uint8Array(fileBuffer));
    parts.push(encoder.encode('\r\n'));

    // End boundary
    parts.push(encoder.encode(`--${boundary}--\r\n`));

    // Combine all parts
    let totalLength = 0;
    parts.forEach(p => totalLength += p.byteLength);

    const body = new Uint8Array(totalLength);
    let offset = 0;
    parts.forEach(p => {
        body.set(new Uint8Array(p.buffer || p), offset);
        offset += p.byteLength;
    });

    // Try direct API call (will work if CORS is not blocked)
    // For production, use a backend proxy
    const PROXY_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:3000/api/upload'
        : '/api/upload';

    // Try backend first, fallback to direct (for demo)
    let response;
    try {
        // Try via backend proxy
        const formData = new FormData();
        formData.append('apiKey', apiKey);
        formData.append('creatorId', creatorId);
        formData.append('creatorType', creatorType);
        formData.append('assetType', assetType);
        formData.append('assetName', assetName);
        formData.append('assetDescription', assetDescription || '');
        formData.append('file', new Blob([fileBuffer]), fileName);

        response = await fetch(PROXY_URL, {
            method: 'POST',
            body: formData
        });
    } catch (proxyErr) {
        // Fallback: direct API call (may fail due to CORS)
        console.log('Backend proxy not available, trying direct API...');
        response = await fetch('https://apis.roblox.com/assets/v1/assets', {
            method: 'POST',
            headers: {
                'x-api-key': apiKey,
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
            },
            body: body
        });
    }

    if (!response.ok) {
        let errorMsg = `HTTP ${response.status}`;
        try {
            const errData = await response.json();
            errorMsg = errData.message || errData.error || JSON.stringify(errData);
        } catch (e) {
            try {
                errorMsg = await response.text();
            } catch (e2) { /* ignore */ }
        }
        throw new Error(errorMsg);
    }

    const data = await response.json();

    // The response contains an operation object
    // { "path": "operations/xxx", "done": false/true, "response": { ... } }
    if (data.done && data.response) {
        const assetId = data.response.assetId ||
                        (data.response.path && data.response.path.split('/').pop());
        return { assetId, operationPath: null };
    }

    // Need to poll
    return {
        assetId: data.response?.assetId || null,
        operationPath: data.path || null
    };
}

async function pollOperation(apiKey, operationPath) {
    const maxAttempts = 30;
    const delayMs = 2000;

    const PROXY_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:3000/api/poll'
        : '/api/poll';

    for (let i = 0; i < maxAttempts; i++) {
        await sleep(delayMs);
        addLog(`Checking status... (attempt ${i + 1}/${maxAttempts})`, 'info');

        let response;
        try {
            response = await fetch(`${PROXY_URL}?path=${encodeURIComponent(operationPath)}&apiKey=${encodeURIComponent(apiKey)}`);
        } catch (e) {
            // Direct fallback
            response = await fetch(`https://apis.roblox.com/assets/v1/${operationPath}`, {
                headers: { 'x-api-key': apiKey }
            });
        }

        if (!response.ok) continue;

        const data = await response.json();
        if (data.done && data.response) {
            return data.response.assetId ||
                   (data.response.path && data.response.path.split('/').pop()) ||
                   data.response.revisionId;
        }
    }

    throw new Error('Operation timed out. The asset may still be processing on Roblox servers.');
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function animateProgress(from, to, text) {
    const bar = document.getElementById('progressBar');
    const pText = document.getElementById('progressText');
    const pPercent = document.getElementById('progressPercent');

    pText.textContent = text;

    const duration = 600;
    const steps = 30;
    const stepDuration = duration / steps;

    for (let i = 0; i <= steps; i++) {
        const val = from + (to - from) * (i / steps);
        bar.style.width = val + '%';
        pPercent.textContent = Math.round(val) + '%';
        await sleep(stepDuration);
    }
}

function addLog(message, type = 'info') {
    const logContent = document.getElementById('logContent');
    const entry = document.createElement('div');
    entry.className = 'log-entry ' + type;

    const time = new Date().toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });

    const icons = {
        info: 'ℹ️',
        success: '✅',
        error: '❌',
        warning: '⚠️'
    };

    entry.innerHTML = `<span class="time">[${time}]</span> ${icons[type] || ''} ${message}`;
    logContent.appendChild(entry);
    logContent.scrollTop = logContent.scrollHeight;
}

// --- Show Result ---
function showResult(assetId, assetName, assetType) {
    currentStep = 4;
    updateStepUI(4);
    showPanel(4);

    document.getElementById('resultAssetId').textContent = assetId;
    document.getElementById('resultName').textContent = assetName;
    document.getElementById('resultType').textContent = assetType;
    document.getElementById('resultTime').textContent = new Date().toLocaleString();

    const link = `https://www.roblox.com/library/${assetId}`;
    const resultLink = document.getElementById('resultLink');
    resultLink.href = link;
    resultLink.setAttribute('data-link', link);

    document.getElementById('requireCode').textContent =
        `game:GetService("InsertService"):LoadAsset(${assetId})`;

    // Launch confetti
    launchConfetti();
    showToast('Asset uploaded successfully!', 'success');
}

// --- Copy Functions ---
function copyAssetId() {
    const id = document.getElementById('resultAssetId').textContent;
    copyToClipboard(id, 'Asset ID copied!');
}

function copyLink() {
    const link = document.getElementById('resultLink').getAttribute('data-link') ||
                 document.getElementById('resultLink').href;
    copyToClipboard(link, 'Link copied!');
}

function copyRequire() {
    const code = document.getElementById('requireCode').textContent;
    copyToClipboard(code, 'Script copied!');
}

function copyToClipboard(text, message) {
    navigator.clipboard.writeText(text).then(() => {
        showToast(message, 'success');
    }).catch(() => {
        // Fallback
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showToast(message, 'success');
    });
}

// --- Toast Notifications ---
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        info: 'fas fa-info-circle',
        warning: 'fas fa-exclamation-triangle'
    };

    toast.innerHTML = `<i class="${icons[type]}"></i><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 400);
    }, 3500);
}

// --- Shake Animation ---
function shakeElement(el) {
    el.style.animation = 'none';
    el.offsetHeight;
    el.style.animation = 'shake 0.5s ease';
    el.style.borderColor = 'rgba(239, 68, 68, 0.5)';
    setTimeout(() => {
        el.style.borderColor = '';
        el.style.animation = '';
    }, 1000);
}

// Add shake keyframes
const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 50%, 90% { transform: translateX(-4px); }
        30%, 70% { transform: translateX(4px); }
    }
`;
document.head.appendChild(shakeStyle);

// --- Toggle Password ---
function togglePassword(inputId, btn) {
    const input = document.getElementById(inputId);
    const icon = btn.querySelector('i');
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.replace('fa-eye-slash', 'fa-eye');
    }
}

// --- Reset ---
function resetAll() {
    currentStep = 1;
    selectedFile = null;
    document.getElementById('fileInput').value = '';
    document.getElementById('fileInfo').style.display = 'none';
    document.getElementById('dropzone').style.display = 'block';
    document.getElementById('assetName').value = '';
    document.getElementById('assetDescription').value = '';

    updateStepUI(1);
    showPanel(1);
}

// --- Confetti ---
function launchConfetti() {
    const canvas = document.getElementById('confettiCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const colors = ['#a855f7', '#c084fc', '#e9d5ff', '#10b981', '#34d399', '#fbbf24', '#f472b6', '#60a5fa'];
    const particleCount = 150;

    for (let i = 0; i < particleCount; i++) {
        particles.push({
            x: canvas.width / 2 + (Math.random() - 0.5) * 200,
            y: canvas.height / 2,
            vx: (Math.random() - 0.5) * 20,
            vy: Math.random() * -18 - 5,
            w: Math.random() * 10 + 4,
            h: Math.random() * 6 + 3,
            color: colors[Math.floor(Math.random() * colors.length)],
            rotation: Math.random() * 360,
            rotationSpeed: (Math.random() - 0.5) * 15,
            gravity: 0.3 + Math.random() * 0.2,
            opacity: 1,
            decay: 0.008 + Math.random() * 0.008,
        });
    }

    let frame = 0;
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let alive = false;

        particles.forEach(p => {
            if (p.opacity <= 0) return;
            alive = true;

            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.gravity;
            p.vx *= 0.99;
            p.rotation += p.rotationSpeed;
            p.opacity -= p.decay;

            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate((p.rotation * Math.PI) / 180);
            ctx.globalAlpha = Math.max(0, p.opacity);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
            ctx.restore();
        });

        frame++;
        if (alive && frame < 300) {
            requestAnimationFrame(animate);
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }

    animate();
}

// --- Initialize ---
document.addEventListener('DOMContentLoaded', () => {
    initGalaxy();
    initFileHandlers();
    initDropzoneEffect();

    // Handle window resize for confetti canvas
    window.addEventListener('resize', () => {
        const canvas = document.getElementById('confettiCanvas');
        if (canvas) {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
    });
});
