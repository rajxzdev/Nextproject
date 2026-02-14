// =============================================
// RBXM → Asset ID Converter | Premium Edition
// =============================================

// =================== GALAXY CANVAS ===================
(function initGalaxy() {
    const c = document.getElementById('galaxyCanvas');
    const ctx = c.getContext('2d');
    let w, h, stars = [], mouse = { x: -1000, y: -1000 };

    function resize() {
        w = c.width = window.innerWidth;
        h = c.height = window.innerHeight;
    }

    function createStars() {
        stars = [];
        const count = Math.min(Math.floor((w * h) / 4000), 350);
        for (let i = 0; i < count; i++) {
            stars.push({
                x: Math.random() * w,
                y: Math.random() * h,
                r: Math.random() * 1.4 + 0.3,
                baseAlpha: Math.random() * 0.6 + 0.2,
                alpha: 0,
                speed: Math.random() * 0.0015 + 0.0008,
                phase: Math.random() * Math.PI * 2,
                drift: (Math.random() - 0.5) * 0.08,
            });
        }
    }

    function draw(t) {
        ctx.clearRect(0, 0, w, h);
        stars.forEach(s => {
            s.alpha = s.baseAlpha + Math.sin(t * s.speed + s.phase) * 0.3;
            s.y += s.drift;
            if (s.y > h + 5) { s.y = -5; s.x = Math.random() * w; }
            if (s.y < -5) { s.y = h + 5; s.x = Math.random() * w; }

            const dx = s.x - mouse.x;
            const dy = s.y - mouse.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const glow = dist < 150 ? (1 - dist / 150) * 0.6 : 0;

            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r + glow * 2, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(210,180,255,${Math.max(0, Math.min(1, s.alpha + glow))})`;
            ctx.fill();

            if (glow > 0.1) {
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.r + glow * 6, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(168,85,247,${glow * 0.2})`;
                ctx.fill();
            }
        });
        requestAnimationFrame(draw);
    }

    resize();
    createStars();
    requestAnimationFrame(draw);

    window.addEventListener('resize', () => { resize(); createStars(); });
    document.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
    document.addEventListener('mouseleave', () => { mouse.x = -1000; mouse.y = -1000; });
})();

// =================== STATE ===================
let currentStep = 1;
let uploadedFile = null;

// =================== HELP SYSTEM ===================
function openHelp() {
    const section = document.getElementById('helpSection');
    section.classList.add('visible');
    section.style.animation = 'none';
    void section.offsetHeight;
    section.style.animation = '';
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closeHelp() {
    const section = document.getElementById('helpSection');
    section.classList.remove('visible');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function switchTab(index, btn) {
    document.querySelectorAll('.help-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.help-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    const panel = document.querySelector(`.help-panel[data-tab="${index}"]`);
    if (panel) {
        panel.classList.add('active');
        panel.style.animation = 'none';
        void panel.offsetHeight;
        panel.style.animation = '';
    }
}

function toggleFaq(el) {
    const wasOpen = el.classList.contains('open');
    // Close all
    document.querySelectorAll('.faq-item.open').forEach(f => f.classList.remove('open'));
    // Toggle clicked
    if (!wasOpen) el.classList.add('open');
}

function guideCopy(text, btn) {
    navigator.clipboard.writeText(text).then(() => {
        const icon = btn.querySelector('i');
        icon.classList.replace('fa-copy', 'fa-check');
        btn.classList.add('copied');
        toast('Copied!', 'success');
        setTimeout(() => {
            icon.classList.replace('fa-check', 'fa-copy');
            btn.classList.remove('copied');
        }, 1500);
    }).catch(() => fallbackCopy(text));
}

// =================== NAVIGATION ===================
function nextStep(step) {
    if (step === 2 && currentStep === 1) {
        if (!validate('apiKey', 'API Key is required') || !validate('creatorId', 'Creator ID is required')) return;
    }

    if (step === 3 && currentStep === 2) {
        if (!uploadedFile) {
            toast('Please select a file first', 'error');
            shake(document.getElementById('dropArea'));
            return;
        }
        if (!validate('assetName', 'Asset name is required')) return;
        startUpload();
        return;
    }

    currentStep = step;
    updateStepper(step);
    showPanel(step);
}

function validate(id, msg) {
    const el = document.getElementById(id);
    if (!el.value.trim()) {
        toast(msg, 'error');
        shake(el.closest('.input-glass, .drop-area'));
        el.focus();
        return false;
    }
    return true;
}

function shake(el) {
    if (!el) return;
    el.classList.remove('shake');
    void el.offsetWidth;
    el.classList.add('shake');
    setTimeout(() => el.classList.remove('shake'), 600);
}

function updateStepper(step) {
    const nodes = document.querySelectorAll('.step-node');
    const fill = document.getElementById('stepperFill');
    const pct = ((step - 1) / (nodes.length - 1)) * 100;
    fill.style.width = pct + '%';

    nodes.forEach(n => {
        const s = +n.dataset.step;
        n.classList.remove('active', 'done');
        if (s < step) n.classList.add('done');
        if (s === step) n.classList.add('active');
    });
}

function showPanel(step) {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    const panel = document.getElementById('panel-' + step);
    if (panel) {
        panel.classList.add('active');
        panel.style.animation = 'none';
        void panel.offsetHeight;
        panel.style.animation = '';
    }
}

// =================== FILE HANDLING ===================
(function initDrop() {
    const area = document.getElementById('dropArea');
    const input = document.getElementById('fileInput');

    area.addEventListener('click', () => input.click());
    area.addEventListener('dragover', e => { e.preventDefault(); area.classList.add('dragover'); });
    area.addEventListener('dragleave', () => area.classList.remove('dragover'));
    area.addEventListener('drop', e => {
        e.preventDefault();
        area.classList.remove('dragover');
        if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
    });
    input.addEventListener('change', e => {
        if (e.target.files.length) handleFile(e.target.files[0]);
    });
})();

function handleFile(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['rbxm', 'rbxmx'].includes(ext)) {
        toast('Only .rbxm and .rbxmx files are supported', 'error');
        return;
    }
    uploadedFile = file;
    document.getElementById('fpName').textContent = file.name;
    document.getElementById('fpSize').textContent = fmtSize(file.size);
    document.getElementById('filePreview').classList.add('show');
    document.getElementById('dropArea').style.display = 'none';
    const nameInput = document.getElementById('assetName');
    if (!nameInput.value) nameInput.value = file.name.replace(/\.(rbxm|rbxmx)$/i, '');
    toast('File loaded: ' + file.name, 'success');
}

function clearFile() {
    uploadedFile = null;
    document.getElementById('fileInput').value = '';
    document.getElementById('filePreview').classList.remove('show');
    document.getElementById('dropArea').style.display = '';
}

function fmtSize(b) {
    if (b < 1024) return b + ' B';
    if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
    return (b / 1048576).toFixed(2) + ' MB';
}

// =================== UPLOAD / CONVERT ===================
async function startUpload() {
    currentStep = 3;
    updateStepper(3);
    showPanel(3);

    const fill = document.getElementById('progressFill');
    const glow = document.getElementById('progressGlow');
    const label = document.getElementById('progressLabel');
    const pct = document.getElementById('progressPct');
    const list = document.getElementById('logList');
    const retryBtn = document.getElementById('retryBtn');

    fill.style.width = '0%';
    glow.style.opacity = '0';
    list.innerHTML = '';
    retryBtn.style.display = 'none';
    document.getElementById('convertTitle').textContent = 'Converting...';
    document.getElementById('convertSub').textContent = 'Uploading asset to Roblox';

    const apiKey = v('apiKey');
    const creatorId = v('creatorId');
    const creatorType = v('creatorType');
    const assetType = v('assetType');
    const assetName = v('assetName');
    const assetDesc = v('assetDesc');

    try {
        log('Initializing upload process...');
        await prog(0, 10, fill, glow, pct, label, 'Preparing...');

        log(`File: ${uploadedFile.name} (${fmtSize(uploadedFile.size)})`);
        await prog(10, 20, fill, glow, pct, label, 'Reading file...');

        log('Reading binary data...');
        const buf = await readFile(uploadedFile);
        log('File data loaded ✓', 'ok');
        await prog(20, 35, fill, glow, pct, label, 'File ready');

        log('Connecting to Roblox Open Cloud API...');
        await prog(35, 45, fill, glow, pct, label, 'Connecting...');

        log(`Creator: ${creatorType} (${creatorId})`);
        log(`Asset: ${assetName} [${assetType}]`);
        await prog(45, 55, fill, glow, pct, label, 'Uploading...');

        log('Sending asset to Roblox...');
        const result = await apiUpload({
            apiKey, creatorId, creatorType, assetType, assetName, assetDesc, buf, fileName: uploadedFile.name
        });

        await prog(55, 75, fill, glow, pct, label, 'Processing...');
        log('Upload received by Roblox ✓', 'ok');

        let assetId = result.assetId;
        let opPath = result.opPath;

        if (opPath && !assetId) {
            log('Waiting for Roblox to process asset...');
            assetId = await pollOp(apiKey, opPath);
        }

        await prog(75, 100, fill, glow, pct, label, 'Complete!');
        log(`Asset ID: ${assetId}`, 'ok');
        log('Done! 🎉', 'ok');

        setTimeout(() => showResult(assetId, assetName, assetType), 500);

    } catch (err) {
        log('Error: ' + err.message, 'err');
        label.textContent = 'Upload failed';
        document.getElementById('convertTitle').textContent = 'Upload Failed';
        document.getElementById('convertSub').textContent = err.message;
        retryBtn.style.display = '';
        toast('Upload failed: ' + err.message, 'error');
    }
}

function v(id) { return document.getElementById(id).value.trim(); }

function readFile(file) {
    return new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result);
        r.onerror = () => rej(r.error);
        r.readAsArrayBuffer(file);
    });
}

async function apiUpload({ apiKey, creatorId, creatorType, assetType, assetName, assetDesc, buf, fileName }) {
    const PROXY = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
        ? 'http://localhost:3000/api/upload' : '/api/upload';

    const fd = new FormData();
    fd.append('apiKey', apiKey);
    fd.append('creatorId', creatorId);
    fd.append('creatorType', creatorType);
    fd.append('assetType', assetType);
    fd.append('assetName', assetName);
    fd.append('assetDescription', assetDesc || '');
    fd.append('file', new Blob([buf]), fileName);

    let resp;
    try {
        resp = await fetch(PROXY, { method: 'POST', body: fd });
    } catch (e) {
        const boundary = '----B' + Date.now();
        const enc = new TextEncoder();
        const reqJson = JSON.stringify({
            assetType,
            displayName: assetName,
            description: assetDesc || assetName,
            creationContext: {
                creator: creatorType === 'Group'
                    ? { groupId: creatorId }
                    : { userId: creatorId }
            }
        });

        const parts = [
            enc.encode(`--${boundary}\r\nContent-Disposition: form-data; name="request"\r\nContent-Type: application/json\r\n\r\n${reqJson}\r\n`),
            enc.encode(`--${boundary}\r\nContent-Disposition: form-data; name="fileContent"; filename="${fileName}"\r\nContent-Type: application/octet-stream\r\n\r\n`),
            new Uint8Array(buf),
            enc.encode(`\r\n--${boundary}--\r\n`)
        ];

        let total = 0;
        parts.forEach(p => total += p.byteLength);
        const body = new Uint8Array(total);
        let off = 0;
        parts.forEach(p => { body.set(p instanceof Uint8Array ? p : new Uint8Array(p), off); off += p.byteLength; });

        resp = await fetch('https://apis.roblox.com/assets/v1/assets', {
            method: 'POST',
            headers: {
                'x-api-key': apiKey,
                'Content-Type': `multipart/form-data; boundary=${boundary}`
            },
            body: body
        });
    }

    if (!resp.ok) {
        let msg = `HTTP ${resp.status}`;
        try { const d = await resp.json(); msg = d.message || d.error || JSON.stringify(d); } catch (e) {
            try { msg = await resp.text(); } catch (e2) {}
        }
        throw new Error(msg);
    }

    const data = await resp.json();
    if (data.done && data.response) {
        return { assetId: data.response.assetId || data.response.path?.split('/').pop(), opPath: null };
    }
    return { assetId: data.response?.assetId || null, opPath: data.path || null };
}

async function pollOp(apiKey, path) {
    const PROXY = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
        ? 'http://localhost:3000/api/poll' : '/api/poll';

    for (let i = 0; i < 30; i++) {
        await sleep(2000);
        log(`Checking status... (${i + 1}/30)`);

        let resp;
        try {
            resp = await fetch(`${PROXY}?path=${encodeURIComponent(path)}&apiKey=${encodeURIComponent(apiKey)}`);
        } catch (e) {
            resp = await fetch(`https://apis.roblox.com/assets/v1/${path}`, {
                headers: { 'x-api-key': apiKey }
            });
        }

        if (!resp.ok) continue;
        const data = await resp.json();
        if (data.done && data.response) {
            return data.response.assetId || data.response.path?.split('/').pop();
        }
    }
    throw new Error('Timed out waiting for Roblox to process the asset');
}

// =================== PROGRESS HELPERS ===================
async function prog(from, to, fill, glow, pctEl, labelEl, text) {
    labelEl.textContent = text;
    const steps = 25;
    for (let i = 0; i <= steps; i++) {
        const val = from + (to - from) * (i / steps);
        fill.style.width = val + '%';
        glow.style.opacity = val > 5 ? '1' : '0';
        glow.style.left = `calc(${val}% - 8px)`;
        pctEl.textContent = Math.round(val) + '%';
        await sleep(600 / steps);
    }
}

function log(msg, type = '') {
    const list = document.getElementById('logList');
    const el = document.createElement('div');
    el.className = 'log-entry ' + type;
    const ts = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    el.innerHTML = `<span class="ts">${ts}</span>${msg}`;
    list.appendChild(el);
    list.scrollTop = list.scrollHeight;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// =================== RESULT ===================
function showResult(assetId, name, type) {
    currentStep = 4;
    updateStepper(4);
    showPanel(4);

    document.getElementById('resAssetId').textContent = assetId;
    document.getElementById('resName').textContent = name;
    document.getElementById('resType').textContent = type;
    document.getElementById('resTime').textContent = new Date().toLocaleTimeString();

    const link = `https://create.roblox.com/store/asset/${assetId}`;
    const a = document.getElementById('resLink');
    a.href = link;
    a.dataset.url = link;

    document.getElementById('resCode').textContent =
        `game:GetService("InsertService"):LoadAsset(${assetId})`;

    fireConfetti();
    toast('Asset uploaded successfully!', 'success');
}

// =================== COPY ===================
function copyText(id, label) {
    const text = document.getElementById(id).textContent;
    navigator.clipboard.writeText(text).then(() => {
        toast(label + ' copied!', 'success');
    }).catch(() => {
        fallbackCopy(text);
        toast(label + ' copied!', 'success');
    });
}

function copyLink() {
    const url = document.getElementById('resLink').dataset.url || document.getElementById('resLink').href;
    navigator.clipboard.writeText(url).then(() => toast('Link copied!', 'success'))
        .catch(() => { fallbackCopy(url); toast('Link copied!', 'success'); });
}

function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
}

// =================== TOGGLE PASSWORD ===================
function toggleVis(id, btn) {
    const inp = document.getElementById(id);
    const ico = btn.querySelector('i');
    if (inp.type === 'password') {
        inp.type = 'text';
        ico.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        inp.type = 'password';
        ico.classList.replace('fa-eye-slash', 'fa-eye');
    }
}

// =================== RESET ===================
function resetApp() {
    currentStep = 1;
    uploadedFile = null;
    document.getElementById('fileInput').value = '';
    document.getElementById('filePreview').classList.remove('show');
    document.getElementById('dropArea').style.display = '';
    document.getElementById('assetName').value = '';
    document.getElementById('assetDesc').value = '';
    updateStepper(1);
    showPanel(1);
}

// =================== TOAST ===================
function toast(msg, type = 'info') {
    const box = document.getElementById('toasts');
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info' };
    el.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i><span>${msg}</span>`;
    box.appendChild(el);
    setTimeout(() => {
        el.classList.add('out');
        setTimeout(() => el.remove(), 400);
    }, 3200);
}

// =================== CONFETTI ===================
function fireConfetti() {
    const c = document.getElementById('confetti');
    const ctx = c.getContext('2d');
    c.width = window.innerWidth;
    c.height = window.innerHeight;

    const colors = ['#a855f7', '#c084fc', '#e9d5ff', '#34d399', '#6ee7b7', '#fbbf24', '#f472b6', '#60a5fa', '#fff'];
    const particles = [];

    for (let i = 0; i < 180; i++) {
        particles.push({
            x: c.width * 0.5 + (Math.random() - 0.5) * 150,
            y: c.height * 0.45,
            vx: (Math.random() - 0.5) * 22,
            vy: Math.random() * -20 - 4,
            w: Math.random() * 8 + 3,
            h: Math.random() * 5 + 2,
            color: colors[Math.floor(Math.random() * colors.length)],
            rot: Math.random() * 360,
            rotV: (Math.random() - 0.5) * 14,
            g: 0.28 + Math.random() * 0.2,
            o: 1,
            d: 0.006 + Math.random() * 0.008,
        });
    }

    let f = 0;
    function loop() {
        ctx.clearRect(0, 0, c.width, c.height);
        let alive = false;
        particles.forEach(p => {
            if (p.o <= 0) return;
            alive = true;
            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.g;
            p.vx *= 0.99;
            p.rot += p.rotV;
            p.o -= p.d;

            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot * Math.PI / 180);
            ctx.globalAlpha = Math.max(0, p.o);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
            ctx.restore();
        });
        f++;
        if (alive && f < 350) requestAnimationFrame(loop);
        else ctx.clearRect(0, 0, c.width, c.height);
    }
    loop();
}
