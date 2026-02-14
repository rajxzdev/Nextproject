// =============================================
// STATE
// =============================================
let selectedFile = null;
let creatorVerified = false;
let apiKeyValidated = false;
let serverOnline = false;

// =============================================
// INIT
// =============================================
document.addEventListener('DOMContentLoaded', () => {
  initStarsCanvas();
  initDropZone();
  initCounters();
  initHelpTabs();
  loadSaved();
  checkServer();
});

// =============================================
// SERVER CONNECTION CHECK
// =============================================
async function checkServer() {
  const dot = document.getElementById('serverDot');
  const banner = document.getElementById('connBanner');
  const connMsg = document.getElementById('connMsg');

  dot.className = 'server-dot';
  dot.title = 'Checking server...';

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch('/api/health', {
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      serverOnline = true;
      dot.className = 'server-dot online';
      dot.title = 'Server online (' + data.node + ')';
      banner.style.display = 'none';

      if (data.dependencies === 'missing - run npm install') {
        banner.style.display = 'flex';
        connMsg.textContent = 'Server running but dependencies missing. Run: npm install';
        banner.style.background = 'rgba(245,158,11,.15)';
        banner.style.borderColor = 'rgba(245,158,11,.3)';
        connMsg.style.color = '#fbbf24';
      }

      console.log('✅ Server online:', data);
      return true;
    } else {
      throw new Error('HTTP ' + res.status);
    }
  } catch (err) {
    serverOnline = false;
    dot.className = 'server-dot offline';
    dot.title = 'Server offline';
    banner.style.display = 'flex';
    connMsg.textContent = 'Cannot connect to server. Make sure server.js is running.';
    banner.style.background = 'rgba(239,68,68,.15)';
    banner.style.borderColor = 'rgba(239,68,68,.3)';
    connMsg.style.color = '#fca5a5';

    console.error('❌ Server offline:', err.message);
    return false;
  }
}

// =============================================
// STARS CANVAS
// =============================================
function initStarsCanvas() {
  const canvas = document.getElementById('starsCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let stars = [], w, h;

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }

  function make() {
    const count = Math.min(Math.floor((w * h) / 5000), 250);
    stars = [];
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * w, y: Math.random() * h,
        r: Math.random() * 1.8 + 0.3,
        a: Math.random(), da: (Math.random() - .5) * .012,
        dx: (Math.random() - .5) * .06
      });
    }
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    for (const s of stars) {
      s.a += s.da;
      if (s.a > 1 || s.a < .1) s.da *= -1;
      s.x += s.dx;
      if (s.x < 0) s.x = w;
      if (s.x > w) s.x = 0;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${Math.max(0, Math.min(1, s.a))})`;
      ctx.fill();
    }
    requestAnimationFrame(draw);
  }

  resize(); make(); draw();
  window.addEventListener('resize', () => { resize(); make(); });

  // Shooting stars
  function shoot() {
    const sx = Math.random() * w * .7 + w * .15;
    const sy = Math.random() * h * .3;
    const len = Math.random() * 60 + 30;
    const spd = Math.random() * 5 + 3;
    const ang = Math.PI / 4 + (Math.random() - .5) * .3;
    let p = 0;
    function anim() {
      p += spd;
      const x = sx + Math.cos(ang) * p;
      const y = sy + Math.sin(ang) * p;
      const al = Math.max(0, 1 - p / (len * 8));
      ctx.save();
      ctx.globalAlpha = al;
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - Math.cos(ang) * len, y - Math.sin(ang) * len);
      ctx.stroke();
      ctx.restore();
      if (al > 0) requestAnimationFrame(anim);
    }
    anim();
    setTimeout(shoot, Math.random() * 6000 + 3000);
  }
  setTimeout(shoot, 2000);
}

// =============================================
// DROP ZONE
// =============================================
function initDropZone() {
  const zone = document.getElementById('dropZone');
  const input = document.getElementById('fileInput');
  if (!zone || !input) return;

  zone.addEventListener('click', () => input.click());
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('over'); });
  zone.addEventListener('dragleave', e => { e.preventDefault(); zone.classList.remove('over'); });
  zone.addEventListener('drop', e => {
    e.preventDefault(); zone.classList.remove('over');
    if (e.dataTransfer.files.length) pickFile(e.dataTransfer.files[0]);
  });
  input.addEventListener('change', e => { if (e.target.files.length) pickFile(e.target.files[0]); });
}

function pickFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (ext !== 'rbxm' && ext !== 'rbxmx') { toast('Only .rbxm and .rbxmx files', 'err'); return; }
  if (file.size > 50 * 1024 * 1024) { toast('File too large (max 50MB)', 'err'); return; }

  selectedFile = file;
  document.getElementById('dropZone').style.display = 'none';
  document.getElementById('filePreview').style.display = 'flex';
  document.getElementById('fpName').textContent = file.name;
  document.getElementById('fpSize').textContent = fmtSize(file.size);

  const n = document.getElementById('assetName');
  if (!n.value.trim()) { n.value = file.name.replace(/\.(rbxm|rbxmx)$/i, ''); updateCount('assetName', 'nameLen', 50); }
  toast('File: ' + file.name, 'ok');
}

function clearFile() {
  selectedFile = null;
  document.getElementById('fileInput').value = '';
  document.getElementById('filePreview').style.display = 'none';
  document.getElementById('dropZone').style.display = '';
  toast('File removed', 'inf');
}

function fmtSize(b) {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(1) + ' MB';
}

// =============================================
// CHAR COUNTERS
// =============================================
function initCounters() {
  const a = document.getElementById('assetName');
  const b = document.getElementById('assetDesc');
  if (a) a.addEventListener('input', () => updateCount('assetName', 'nameLen', 50));
  if (b) b.addEventListener('input', () => updateCount('assetDesc', 'descLen', 1000));
}

function updateCount(iid, sid, max) {
  const len = document.getElementById(iid).value.length;
  const s = document.getElementById(sid);
  s.textContent = len;
  s.style.color = len >= max ? 'var(--red)' : '';
}

// =============================================
// VERIFY CREATOR
// =============================================
async function verifyCreator() {
  const id = document.getElementById('creatorId').value.trim();
  const type = document.getElementById('creatorType').value;
  const status = document.getElementById('verifyStatus');
  const card = document.getElementById('profileCard');
  const btn = document.getElementById('verifyBtn');

  creatorVerified = false;
  card.style.display = 'none';

  if (!id) { setStatus(status, 'err', 'Please enter a Creator ID'); return; }
  if (!/^\d+$/.test(id)) { setStatus(status, 'err', 'ID must be numbers only (e.g. 123456789)'); return; }

  // Check server first
  if (!serverOnline) {
    const online = await checkServer();
    if (!online) {
      setStatus(status, 'err', 'Server not running. Start with: node server.js');
      toast('Server offline! Run: node server.js', 'err');
      return;
    }
  }

  btn.disabled = true;
  setStatus(status, 'load', 'Verifying with Roblox...');

  try {
    const endpoint = type === 'Group' ? '/api/verify-group' : '/api/verify-user';
    const body = type === 'Group' ? { groupId: id } : { userId: id };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal
    });

    clearTimeout(timeout);

    const data = await res.json();

    if (data.success) {
      creatorVerified = true;
      setStatus(status, 'ok', data.message);

      if (type === 'User' && data.user) {
        document.getElementById('profileName').textContent = data.user.displayName;
        document.getElementById('profileSub').textContent = '@' + data.user.name;
        const d = new Date(data.user.created);
        document.getElementById('profileMeta').textContent = 'Joined ' + d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        document.getElementById('profileBadge').innerHTML = '<i class="fas fa-check-circle"></i> Verified';

        // Avatar
        try {
          const avRes = await fetch('/api/avatar/' + data.user.id);
          const avData = await avRes.json();
          document.getElementById('profileAvatar').src = avData.success && avData.imageUrl ? avData.imageUrl : '';
        } catch (e) { document.getElementById('profileAvatar').src = ''; }

        card.style.display = 'flex';
      } else if (type === 'Group' && data.group) {
        document.getElementById('profileName').textContent = data.group.name;
        document.getElementById('profileSub').textContent = data.group.memberCount + ' members';
        document.getElementById('profileMeta').textContent = data.group.owner ? 'Owner: ' + data.group.owner.displayName : '';
        document.getElementById('profileBadge').innerHTML = '<i class="fas fa-check-circle"></i> Verified';
        document.getElementById('profileAvatar').src = '';
        card.style.display = 'flex';
      }

      saveLocal();
      toast(data.message, 'ok');
    } else {
      setStatus(status, 'err', data.message);
      toast(data.message, 'err');
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      setStatus(status, 'err', 'Request timed out. Server may be slow.');
    } else {
      setStatus(status, 'err', 'Connection failed: ' + err.message);
      await checkServer();
    }
    toast('Verification failed', 'err');
  } finally {
    btn.disabled = false;
  }
}

// =============================================
// API KEY
// =============================================
function toggleEye() {
  const inp = document.getElementById('apiKey');
  const ico = document.getElementById('eyeIcon');
  if (inp.type === 'password') { inp.type = 'text'; ico.className = 'fas fa-eye-slash'; }
  else { inp.type = 'password'; ico.className = 'fas fa-eye'; }
}

async function validateApiKey() {
  const apiKey = document.getElementById('apiKey').value.trim();
  const cid = document.getElementById('creatorId').value.trim();
  const ctype = document.getElementById('creatorType').value;
  const status = document.getElementById('keyStatus');

  apiKeyValidated = false;

  if (!apiKey) { setStatus(status, 'err', 'Please enter your API key'); return; }
  if (apiKey.length < 10) { setStatus(status, 'err', 'API key too short'); return; }
  if (!creatorVerified || !cid) { setStatus(status, 'err', 'Verify Creator ID first (Step 1)'); return; }

  if (!serverOnline) {
    const online = await checkServer();
    if (!online) { setStatus(status, 'err', 'Server offline'); return; }
  }

  setStatus(status, 'load', 'Validating with Roblox API...');

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    const res = await fetch('/api/validate-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey, creatorId: cid, creatorType: ctype }),
      signal: controller.signal
    });

    clearTimeout(timeout);
    const data = await res.json();

    if (data.success) {
      apiKeyValidated = true;
      setStatus(status, 'ok', data.message);
      saveLocal();
      toast('API Key valid!', 'ok');
    } else {
      setStatus(status, 'err', data.message);
      toast(data.message, 'err');
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      setStatus(status, 'err', 'Timed out. Roblox API may be slow.');
    } else {
      setStatus(status, 'err', 'Connection failed: ' + err.message);
      await checkServer();
    }
  }
}

// =============================================
// CONVERT & UPLOAD
// =============================================
async function doConvert() {
  const apiKey = document.getElementById('apiKey').value.trim();
  const cid = document.getElementById('creatorId').value.trim();
  const ctype = document.getElementById('creatorType').value;
  const aName = document.getElementById('assetName').value.trim();
  const aDesc = document.getElementById('assetDesc').value.trim();

  if (!creatorVerified) { toast('Verify Creator ID first (Step 1)', 'err'); return; }
  if (!apiKey) { toast('Enter your API Key (Step 2)', 'err'); return; }
  if (!selectedFile) { toast('Select an RBXM file (Step 3)', 'err'); return; }

  if (!serverOnline) {
    const online = await checkServer();
    if (!online) { toast('Server offline! Run: node server.js', 'err'); return; }
  }

  saveLocal();

  const btn = document.getElementById('megaBtn');
  btn.disabled = true;

  const prog = document.getElementById('progressCard');
  const res = document.getElementById('resultCard');
  res.style.display = 'none';
  prog.style.display = '';
  prog.scrollIntoView({ behavior: 'smooth', block: 'center' });

  setProg('Preparing...', 'Packaging file for upload', 5);

  try {
    const fd = new FormData();
    fd.append('rbxmFile', selectedFile);
    fd.append('apiKey', apiKey);
    fd.append('creatorId', cid);
    fd.append('creatorType', ctype);
    fd.append('assetName', aName || selectedFile.name.replace(/\.(rbxm|rbxmx)$/i, ''));
    fd.append('assetDescription', aDesc || 'Uploaded via RBXM Converter');

    setProg('Uploading...', 'Sending to server', 15);

    let fakeProg = 15;
    const progTimer = setInterval(() => {
      fakeProg = Math.min(fakeProg + Math.random() * 6, 85);
      setProg('Processing...', 'Roblox is processing your asset', fakeProg);
    }, 1500);

    const response = await fetch('/api/upload', { method: 'POST', body: fd });

    clearInterval(progTimer);

    const data = await response.json();

    if (data.success) {
      setProg('Finalizing...', 'Almost done!', 95);
      await sleep(400);
      setProg('Complete!', 'Asset ready!', 100);
      await sleep(500);
      prog.style.display = 'none';
      showResult(true, data);
    } else {
      prog.style.display = 'none';
      showResult(false, data);
    }
  } catch (err) {
    console.error(err);
    document.getElementById('progressCard').style.display = 'none';
    showResult(false, { message: 'Connection error: ' + err.message });
    await checkServer();
  } finally {
    btn.disabled = false;
  }
}

function setProg(title, text, pct) {
  document.getElementById('progTitle').textContent = title;
  document.getElementById('progText').textContent = text;
  document.getElementById('progFill').style.width = pct + '%';
  document.getElementById('progPct').textContent = Math.round(pct) + '%';
}

function showResult(ok, data) {
  const card = document.getElementById('resultCard');
  card.style.display = '';

  const icon = document.getElementById('resultIcon');
  if (ok) {
    icon.className = 'result-icon ok';
    icon.innerHTML = '<i class="fas fa-check-circle"></i>';
    document.getElementById('resTitle').textContent = 'Upload Successful!';
    document.getElementById('resMsg').textContent = data.message || '';
    document.getElementById('resultGrid').style.display = '';
    document.getElementById('resAssetId').textContent = data.assetId;
    const tb = document.getElementById('resToolbox');
    tb.href = data.toolboxUrl; tb.textContent = data.toolboxUrl;
    document.getElementById('resStudio').textContent = data.studioUrl;
    toast('Asset ID: ' + data.assetId, 'ok');
  } else {
    icon.className = 'result-icon fail';
    icon.innerHTML = '<i class="fas fa-times-circle"></i>';
    document.getElementById('resTitle').textContent = 'Upload Failed';
    document.getElementById('resMsg').textContent = data.message || 'Unknown error';
    document.getElementById('resultGrid').style.display = 'none';
    toast(data.message || 'Failed', 'err');
  }

  card.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function resetAll() {
  clearFile();
  document.getElementById('assetName').value = '';
  document.getElementById('assetDesc').value = '';
  document.getElementById('nameLen').textContent = '0';
  document.getElementById('descLen').textContent = '0';
  document.getElementById('resultCard').style.display = 'none';
  document.getElementById('progressCard').style.display = 'none';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// =============================================
// HELPERS
// =============================================
function setStatus(el, type, msg) {
  const icons = { ok: 'fa-check-circle', err: 'fa-times-circle', load: 'fa-spinner fa-spin' };
  el.className = 'status-msg ' + type;
  el.innerHTML = '<i class="fas ' + icons[type] + '"></i> ' + msg;
}

function copyEl(id) {
  const el = document.getElementById(id);
  const text = el.textContent || el.innerText;
  navigator.clipboard.writeText(text).then(() => {
    const btn = el.closest('.res-row').querySelector('.copy-btn');
    btn.classList.add('copied');
    btn.innerHTML = '<i class="fas fa-check"></i>';
    setTimeout(() => { btn.classList.remove('copied'); btn.innerHTML = '<i class="fas fa-copy"></i>'; }, 2000);
    toast('Copied!', 'ok');
  }).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.cssText = 'position:fixed;left:-9999px';
    document.body.appendChild(ta); ta.select(); document.execCommand('copy');
    document.body.removeChild(ta); toast('Copied!', 'ok');
  });
}

function toast(msg, type) {
  const stack = document.getElementById('toastStack');
  const icons = { ok: 'fa-check-circle', err: 'fa-exclamation-circle', inf: 'fa-info-circle' };
  const el = document.createElement('div');
  el.className = 'toast ' + (type || 'inf');
  el.innerHTML = '<i class="fas ' + (icons[type] || icons.inf) + '"></i><span>' + msg + '</span>';
  stack.appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, 4000);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// =============================================
// HELP MODAL
// =============================================
function openHelp() { document.getElementById('helpModal').classList.add('show'); document.body.style.overflow = 'hidden'; }
function closeHelp() { document.getElementById('helpModal').classList.remove('show'); document.body.style.overflow = ''; }
document.getElementById('helpModal').addEventListener('click', e => { if (e.target === e.currentTarget) closeHelp(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeHelp(); });

function initHelpTabs() {
  document.querySelectorAll('.help-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.help-nav-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.help-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('panel-' + btn.dataset.tab).classList.add('active');
    });
  });
}

// =============================================
// LOCAL STORAGE
// =============================================
function saveLocal() {
  const k = document.getElementById('apiKey').value;
  const c = document.getElementById('creatorId').value;
  const t = document.getElementById('creatorType').value;
  if (k) localStorage.setItem('rc_k', k);
  if (c) localStorage.setItem('rc_c', c);
  localStorage.setItem('rc_t', t);
}

function loadSaved() {
  const k = localStorage.getItem('rc_k');
  const c = localStorage.getItem('rc_c');
  const t = localStorage.getItem('rc_t');
  if (k) document.getElementById('apiKey').value = k;
  if (c) document.getElementById('creatorId').value = c;
  if (t) document.getElementById('creatorType').value = t;
}
