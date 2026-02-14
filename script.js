// =============================================
// STATE
// =============================================
let selectedFile = null;
let creatorVerified = false;
let apiKeyValidated = false;
let verifiedCreatorData = null;

// =============================================
// INIT
// =============================================
document.addEventListener('DOMContentLoaded', () => {
  initStarsCanvas();
  initDropZone();
  initCounters();
  initHelpTabs();
  loadSaved();
});

// =============================================
// STARS CANVAS (Animated)
// =============================================
function initStarsCanvas() {
  const canvas = document.getElementById('starsCanvas');
  const ctx = canvas.getContext('2d');
  let stars = [];
  let w, h;

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }

  function createStars() {
    const count = Math.min(Math.floor((w * h) / 4000), 300);
    stars = [];
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.8 + 0.3,
        alpha: Math.random(),
        da: (Math.random() - 0.5) * 0.015,
        drift: (Math.random() - 0.5) * 0.08
      });
    }
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    for (const s of stars) {
      s.alpha += s.da;
      if (s.alpha > 1 || s.alpha < 0.1) s.da *= -1;
      s.x += s.drift;
      if (s.x < 0) s.x = w;
      if (s.x > w) s.x = 0;

      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${Math.max(0, Math.min(1, s.alpha))})`;
      ctx.fill();
    }
    requestAnimationFrame(draw);
  }

  resize();
  createStars();
  draw();

  window.addEventListener('resize', () => {
    resize();
    createStars();
  });

  // Shooting stars
  function shootingStar() {
    const sx = Math.random() * w * 0.7 + w * 0.2;
    const sy = Math.random() * h * 0.3;
    const len = Math.random() * 80 + 40;
    const speed = Math.random() * 6 + 4;
    const angle = Math.PI / 4 + (Math.random() - 0.5) * 0.3;
    let progress = 0;

    function animate() {
      progress += speed;
      const x = sx + Math.cos(angle) * progress;
      const y = sy + Math.sin(angle) * progress;
      const alpha = Math.max(0, 1 - progress / (len * 8));

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - Math.cos(angle) * len, y - Math.sin(angle) * len);
      ctx.stroke();
      ctx.restore();

      if (alpha > 0) requestAnimationFrame(animate);
    }
    animate();
    setTimeout(shootingStar, Math.random() * 5000 + 3000);
  }
  setTimeout(shootingStar, 1500);
}

// =============================================
// DROP ZONE
// =============================================
function initDropZone() {
  const zone = document.getElementById('dropZone');
  const input = document.getElementById('fileInput');

  zone.addEventListener('click', () => input.click());

  zone.addEventListener('dragover', e => {
    e.preventDefault();
    zone.classList.add('over');
  });

  zone.addEventListener('dragleave', e => {
    e.preventDefault();
    zone.classList.remove('over');
  });

  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('over');
    if (e.dataTransfer.files.length) pickFile(e.dataTransfer.files[0]);
  });

  input.addEventListener('change', e => {
    if (e.target.files.length) pickFile(e.target.files[0]);
  });
}

function pickFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (ext !== 'rbxm' && ext !== 'rbxmx') {
    toast('Only .rbxm and .rbxmx files allowed', 'err');
    return;
  }
  if (file.size > 50 * 1024 * 1024) {
    toast('File too large (max 50MB)', 'err');
    return;
  }

  selectedFile = file;
  document.getElementById('dropZone').style.display = 'none';
  const fp = document.getElementById('filePreview');
  fp.style.display = 'flex';
  document.getElementById('fpName').textContent = file.name;
  document.getElementById('fpSize').textContent = fmtSize(file.size);

  // Auto fill name
  const nameInput = document.getElementById('assetName');
  if (!nameInput.value.trim()) {
    nameInput.value = file.name.replace(/\.(rbxm|rbxmx)$/i, '');
    updateCount('assetName', 'nameLen', 50);
  }

  toast('File selected: ' + file.name, 'ok');
}

function clearFile() {
  selectedFile = null;
  document.getElementById('fileInput').value = '';
  document.getElementById('filePreview').style.display = 'none';
  document.getElementById('dropZone').style.display = '';
  document.getElementById('dropZone').classList.remove('has-file');
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
  document.getElementById('assetName').addEventListener('input', () => updateCount('assetName', 'nameLen', 50));
  document.getElementById('assetDesc').addEventListener('input', () => updateCount('assetDesc', 'descLen', 1000));
}

function updateCount(inputId, spanId, max) {
  const len = document.getElementById(inputId).value.length;
  const span = document.getElementById(spanId);
  span.textContent = len;
  span.style.color = len >= max ? 'var(--red)' : '';
}

// =============================================
// VERIFY CREATOR (USER/GROUP)
// =============================================
async function verifyCreator() {
  const id = document.getElementById('creatorId').value.trim();
  const type = document.getElementById('creatorType').value;
  const status = document.getElementById('verifyStatus');
  const profileCard = document.getElementById('profileCard');
  const btn = document.getElementById('verifyBtn');

  // Reset
  creatorVerified = false;
  verifiedCreatorData = null;
  profileCard.style.display = 'none';

  if (!id) {
    status.className = 'status-msg err';
    status.innerHTML = '<i class="fas fa-exclamation-circle"></i> Please enter a Creator ID';
    return;
  }

  if (!/^\d+$/.test(id)) {
    status.className = 'status-msg err';
    status.innerHTML = '<i class="fas fa-exclamation-circle"></i> ID must be a number (e.g. 123456789)';
    return;
  }

  btn.disabled = true;
  status.className = 'status-msg load';
  status.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying with Roblox...';

  try {
    const endpoint = type === 'Group' ? '/api/verify-group' : '/api/verify-user';
    const body = type === 'Group' ? { groupId: id } : { userId: id };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await res.json();

    if (data.success) {
      creatorVerified = true;
      status.className = 'status-msg ok';
      status.innerHTML = '<i class="fas fa-check-circle"></i> ' + data.message;

      // Show profile card
      if (type === 'User' && data.user) {
        verifiedCreatorData = data.user;
        document.getElementById('profileName').textContent = data.user.displayName;
        document.getElementById('profileUsername').textContent = '@' + data.user.name;

        const created = new Date(data.user.created);
        document.getElementById('profileMeta').textContent = 'Joined ' + created.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

        // Fetch avatar
        try {
          const avatarRes = await fetch('/api/avatar/' + data.user.id);
          const avatarData = await avatarRes.json();
          if (avatarData.success && avatarData.imageUrl) {
            document.getElementById('profileAvatar').src = avatarData.imageUrl;
          } else {
            document.getElementById('profileAvatar').src = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="52" height="52" fill="%236366f1" viewBox="0 0 16 16"><circle cx="8" cy="5" r="3"/><path d="M2 14s1-4 6-4 6 4 6 4z"/></svg>');
          }
        } catch (e) {
          document.getElementById('profileAvatar').src = '';
        }

        const badge = document.getElementById('profileBadge');
        if (data.user.hasVerifiedBadge) {
          badge.innerHTML = '<i class="fas fa-badge-check"></i> Verified';
        } else {
          badge.innerHTML = '<i class="fas fa-check-circle"></i> Found';
        }

        profileCard.style.display = 'flex';
      } else if (type === 'Group' && data.group) {
        verifiedCreatorData = data.group;
        document.getElementById('profileName').textContent = data.group.name;
        document.getElementById('profileUsername').textContent = data.group.memberCount + ' members';
        document.getElementById('profileMeta').textContent = data.group.owner ? 'Owner: ' + data.group.owner.displayName : '';
        document.getElementById('profileAvatar').src = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="52" height="52" fill="%2322d3ee" viewBox="0 0 16 16"><path d="M7 14s-1 0-1-1 1-4 5-4 5 3 5 4-1 1-1 1H7zm4-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><path fill-rule="evenodd" d="M5.216 14A2.238 2.238 0 0 1 5 13c0-1.355.68-2.75 1.936-3.72A6.325 6.325 0 0 0 5 9c-4 0-5 3-5 4s1 1 1 1h4.216z"/><path d="M4.5 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"/></svg>');

        const badge = document.getElementById('profileBadge');
        badge.innerHTML = '<i class="fas fa-check-circle"></i> Verified';
        profileCard.style.display = 'flex';
      }

      saveLocal();
      toast(data.message, 'ok');
    } else {
      status.className = 'status-msg err';
      status.innerHTML = '<i class="fas fa-times-circle"></i> ' + data.message;
      toast(data.message, 'err');
    }
  } catch (err) {
    status.className = 'status-msg err';
    status.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Connection failed. Is the server running?';
    toast('Server connection failed', 'err');
  } finally {
    btn.disabled = false;
  }
}

// =============================================
// API KEY
// =============================================
function toggleEye() {
  const input = document.getElementById('apiKey');
  const icon = document.getElementById('eyeBtn').querySelector('i');
  if (input.type === 'password') {
    input.type = 'text';
    icon.className = 'fas fa-eye-slash';
  } else {
    input.type = 'password';
    icon.className = 'fas fa-eye';
  }
}

async function validateApiKey() {
  const apiKey = document.getElementById('apiKey').value.trim();
  const creatorId = document.getElementById('creatorId').value.trim();
  const creatorType = document.getElementById('creatorType').value;
  const status = document.getElementById('keyStatus');

  apiKeyValidated = false;

  if (!apiKey) {
    status.className = 'status-msg err';
    status.innerHTML = '<i class="fas fa-exclamation-circle"></i> Please enter your API key';
    return;
  }

  if (apiKey.length < 10) {
    status.className = 'status-msg err';
    status.innerHTML = '<i class="fas fa-exclamation-circle"></i> API key is too short';
    return;
  }

  if (!creatorVerified || !creatorId) {
    status.className = 'status-msg err';
    status.innerHTML = '<i class="fas fa-exclamation-circle"></i> Please verify your Creator ID first (Step 1)';
    return;
  }

  status.className = 'status-msg load';
  status.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Validating with Roblox API...';

  try {
    const res = await fetch('/api/validate-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey, creatorId, creatorType })
    });

    const data = await res.json();

    if (data.success) {
      apiKeyValidated = true;
      status.className = 'status-msg ok';
      status.innerHTML = '<i class="fas fa-check-circle"></i> ' + data.message;
      saveLocal();
      toast('API Key validated!', 'ok');
    } else {
      status.className = 'status-msg err';
      status.innerHTML = '<i class="fas fa-times-circle"></i> ' + data.message;
      toast(data.message, 'err');
    }
  } catch (err) {
    status.className = 'status-msg err';
    status.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Connection failed';
    toast('Server connection failed', 'err');
  }
}

// =============================================
// CONVERT & UPLOAD
// =============================================
async function doConvert() {
  const apiKey = document.getElementById('apiKey').value.trim();
  const creatorId = document.getElementById('creatorId').value.trim();
  const creatorType = document.getElementById('creatorType').value;
  const assetName = document.getElementById('assetName').value.trim();
  const assetDesc = document.getElementById('assetDesc').value.trim();

  // Validations
  if (!creatorVerified) {
    toast('Please verify your Creator ID first (Step 1)', 'err');
    document.getElementById('creatorId').focus();
    return;
  }

  if (!apiKey) {
    toast('Please enter your API Key (Step 2)', 'err');
    document.getElementById('apiKey').focus();
    return;
  }

  if (!selectedFile) {
    toast('Please select an RBXM file (Step 3)', 'err');
    return;
  }

  // Warn if key not validated
  if (!apiKeyValidated) {
    toast('Tip: Validate your API key first to catch errors early', 'inf');
  }

  saveLocal();

  const megaBtn = document.getElementById('megaBtn');
  megaBtn.disabled = true;

  const progCard = document.getElementById('progressCard');
  const resCard = document.getElementById('resultCard');
  resCard.style.display = 'none';
  progCard.style.display = '';
  progCard.scrollIntoView({ behavior: 'smooth', block: 'center' });

  setProg('Preparing...', 'Packaging your file for upload', 5);

  try {
    const fd = new FormData();
    fd.append('rbxmFile', selectedFile);
    fd.append('apiKey', apiKey);
    fd.append('creatorId', creatorId);
    fd.append('creatorType', creatorType);
    fd.append('assetName', assetName || selectedFile.name.replace(/\.(rbxm|rbxmx)$/i, ''));
    fd.append('assetDescription', assetDesc || 'Uploaded via RBXM Converter');

    setProg('Uploading...', 'Sending file to server', 20);

    // Simulated progress
    let fakeProgress = 20;
    const progressInterval = setInterval(() => {
      fakeProgress = Math.min(fakeProgress + Math.random() * 8, 85);
      setProg('Processing...', 'Roblox is processing your asset', fakeProgress);
    }, 1500);

    const res = await fetch('/api/upload', {
      method: 'POST',
      body: fd
    });

    clearInterval(progressInterval);

    const data = await res.json();

    if (data.success) {
      setProg('Finalizing...', 'Almost done!', 95);
      await sleep(400);
      setProg('Complete!', 'Your asset is ready!', 100);
      await sleep(500);
      progCard.style.display = 'none';
      showResult(true, data);
    } else {
      progCard.style.display = 'none';
      showResult(false, data);
    }
  } catch (err) {
    console.error(err);
    document.getElementById('progressCard').style.display = 'none';
    showResult(false, { message: 'Connection error: ' + err.message });
  } finally {
    megaBtn.disabled = false;
  }
}

function setProg(title, text, pct) {
  document.getElementById('progTitle').textContent = title;
  document.getElementById('progText').textContent = text;
  document.getElementById('progFill').style.width = pct + '%';
  document.getElementById('progPercent').textContent = Math.round(pct) + '%';
}

function showResult(success, data) {
  const card = document.getElementById('resultCard');
  card.style.display = '';

  const icon = document.getElementById('resultIcon');
  const title = document.getElementById('resTitle');
  const msg = document.getElementById('resMsg');
  const grid = document.getElementById('resultGrid');

  if (success) {
    icon.className = 'result-icon ok';
    icon.innerHTML = '<i class="fas fa-check-circle"></i>';
    title.textContent = 'Upload Successful!';
    msg.textContent = data.message || 'Your model is now on Roblox!';
    grid.style.display = '';

    document.getElementById('resAssetId').textContent = data.assetId;
    const toolbox = document.getElementById('resToolbox');
    toolbox.href = data.toolboxUrl;
    toolbox.textContent = data.toolboxUrl;
    document.getElementById('resStudio').textContent = data.studioUrl;

    toast('Asset ID: ' + data.assetId, 'ok');
  } else {
    icon.className = 'result-icon fail';
    icon.innerHTML = '<i class="fas fa-times-circle"></i>';
    title.textContent = 'Upload Failed';
    msg.textContent = data.message || 'Something went wrong.';
    grid.style.display = 'none';
    toast(data.message || 'Upload failed', 'err');
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
// COPY
// =============================================
function copyText(elId) {
  const el = document.getElementById(elId);
  const text = el.textContent || el.innerText;

  navigator.clipboard.writeText(text).then(() => {
    const btn = el.closest('.res-row').querySelector('.copy-btn');
    btn.classList.add('copied');
    btn.innerHTML = '<i class="fas fa-check"></i>';
    setTimeout(() => {
      btn.classList.remove('copied');
      btn.innerHTML = '<i class="fas fa-copy"></i>';
    }, 2000);
    toast('Copied!', 'ok');
  }).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;left:-9999px';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    toast('Copied!', 'ok');
  });
}

// =============================================
// HELP MODAL
// =============================================
function openHelp() {
  document.getElementById('helpModal').classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeHelp() {
  document.getElementById('helpModal').classList.remove('show');
  document.body.style.overflow = '';
}

document.getElementById('helpModal').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeHelp();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeHelp();
});

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
// TOAST
// =============================================
function toast(msg, type = 'inf') {
  const stack = document.getElementById('toastStack');
  const icons = { ok: 'fas fa-check-circle', err: 'fas fa-exclamation-circle', inf: 'fas fa-info-circle' };

  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.innerHTML = `<i class="${icons[type]}"></i><span>${msg}</span>`;
  stack.appendChild(el);

  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 300);
  }, 4000);
}

// =============================================
// LOCAL STORAGE
// =============================================
function saveLocal() {
  const key = document.getElementById('apiKey').value;
  const cid = document.getElementById('creatorId').value;
  const ctype = document.getElementById('creatorType').value;
  if (key) localStorage.setItem('rc_key', key);
  if (cid) localStorage.setItem('rc_cid', cid);
  localStorage.setItem('rc_ctype', ctype);
}

function loadSaved() {
  const key = localStorage.getItem('rc_key');
  const cid = localStorage.getItem('rc_cid');
  const ctype = localStorage.getItem('rc_ctype');
  if (key) document.getElementById('apiKey').value = key;
  if (cid) document.getElementById('creatorId').value = cid;
  if (ctype) document.getElementById('creatorType').value = ctype;
}

// =============================================
// UTILS
// =============================================
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
