const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
let fetch, FormData;

try { fetch = require('node-fetch'); } catch(e) { console.error('FATAL: npm install node-fetch@2.7.0'); process.exit(1); }
try { FormData = require('form-data'); } catch(e) { console.error('FATAL: npm install form-data'); process.exit(1); }

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files - serve dari root
app.use(express.static(path.join(__dirname), {
  index: 'index.html',
  extensions: ['html', 'css', 'js']
}));

// Upload folder
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname))
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.rbxm' && ext !== '.rbxmx') return cb(new Error('Only .rbxm/.rbxmx allowed'));
    cb(null, true);
  },
  limits: { fileSize: 50 * 1024 * 1024 }
});

function cleanup(fp) {
  if (fp && fs.existsSync(fp)) try { fs.unlinkSync(fp); } catch(e) {}
}

// ===== HEALTH CHECK =====
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: Date.now(), node: process.version });
});

// ===== VERIFY USER =====
app.post('/api/verify-user', async (req, res) => {
  const uid = String(req.body.userId || '').trim();
  if (!uid || !/^\d+$/.test(uid)) return res.json({ success: false, message: 'Enter a valid numeric User ID' });

  try {
    const r = await fetch('https://users.roblox.com/v1/users/' + uid);
    if (r.status === 404) return res.json({ success: false, message: 'User ID not found on Roblox' });
    if (!r.ok) return res.json({ success: false, message: 'Roblox API error: ' + r.status });
    const d = await r.json();
    if (d.isBanned) return res.json({ success: false, message: '"' + d.name + '" is banned' });
    res.json({
      success: true,
      message: 'Verified: ' + d.displayName + ' (@' + d.name + ')',
      user: { id: d.id, name: d.name, displayName: d.displayName, created: d.created, hasVerifiedBadge: d.hasVerifiedBadge || false }
    });
  } catch(e) {
    console.error('verify-user error:', e.message);
    res.json({ success: false, message: 'Cannot reach Roblox API: ' + e.message });
  }
});

// ===== VERIFY GROUP =====
app.post('/api/verify-group', async (req, res) => {
  const gid = String(req.body.groupId || '').trim();
  if (!gid || !/^\d+$/.test(gid)) return res.json({ success: false, message: 'Enter a valid numeric Group ID' });

  try {
    const r = await fetch('https://groups.roblox.com/v1/groups/' + gid);
    if (r.status === 404) return res.json({ success: false, message: 'Group ID not found' });
    if (!r.ok) return res.json({ success: false, message: 'Roblox API error: ' + r.status });
    const d = await r.json();
    if (d.isLocked) return res.json({ success: false, message: '"' + d.name + '" is locked' });
    res.json({
      success: true,
      message: 'Verified Group: ' + d.name,
      group: { id: d.id, name: d.name, memberCount: d.memberCount, owner: d.owner ? { id: d.owner.userId, name: d.owner.username, displayName: d.owner.displayName } : null }
    });
  } catch(e) {
    console.error('verify-group error:', e.message);
    res.json({ success: false, message: 'Cannot reach Roblox API: ' + e.message });
  }
});

// ===== AVATAR =====
app.get('/api/avatar/:uid', async (req, res) => {
  try {
    const r = await fetch('https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=' + req.params.uid + '&size=150x150&format=Png&isCircular=true');
    if (r.ok) { const d = await r.json(); if (d.data && d.data[0]) return res.json({ success: true, imageUrl: d.data[0].imageUrl }); }
    res.json({ success: false });
  } catch(e) { res.json({ success: false }); }
});

// ===== VALIDATE KEY =====
app.post('/api/validate-key', async (req, res) => {
  const { apiKey, creatorId, creatorType } = req.body;
  if (!apiKey || apiKey.trim().length < 10) return res.json({ success: false, message: 'API Key too short' });
  if (!creatorId) return res.json({ success: false, message: 'Verify Creator ID first' });

  try {
    const body = { assetType: 'Model', displayName: 'Test_' + Date.now(), description: 'test', creationContext: { creator: {} } };
    if (creatorType === 'Group') body.creationContext.creator.groupId = String(creatorId).trim();
    else body.creationContext.creator.userId = String(creatorId).trim();

    const fd = new FormData();
    fd.append('request', JSON.stringify(body), { contentType: 'application/json' });
    fd.append('fileContent', Buffer.from('test'), { filename: 'test.rbxm', contentType: 'application/octet-stream' });

    const r = await fetch('https://apis.roblox.com/assets/v1/assets', {
      method: 'POST',
      headers: { 'x-api-key': apiKey.trim(), ...fd.getHeaders() },
      body: fd
    });

    const status = r.status;
    const txt = await r.text();
    console.log('[validate-key] status:', status);

    if (status === 401) return res.json({ success: false, message: 'Invalid API Key' });
    if (status === 403) {
      let m = 'Forbidden - check permissions & IP whitelist';
      try { const e = JSON.parse(txt); if (e.message) m = e.message; } catch(x) {}
      return res.json({ success: false, message: m });
    }
    res.json({ success: true, message: 'API Key is valid!' });
  } catch(e) {
    console.error('validate-key error:', e.message);
    res.json({ success: false, message: 'Connection error: ' + e.message });
  }
});

// ===== UPLOAD =====
app.post('/api/upload', upload.single('rbxmFile'), async (req, res) => {
  let fp = null;
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    fp = req.file.path;

    const { apiKey, assetName, assetDescription, creatorId, creatorType } = req.body;
    if (!apiKey || apiKey.trim().length < 10) return res.status(400).json({ success: false, message: 'Valid API Key required' });
    if (!creatorId || !/^\d+$/.test(String(creatorId).trim())) return res.status(400).json({ success: false, message: 'Valid Creator ID required' });

    const buf = fs.readFileSync(fp);
    const name = (assetName || req.file.originalname.replace(/\.(rbxm|rbxmx)$/i, '')).substring(0, 50);
    const desc = (assetDescription || 'Uploaded via RBXM Converter').substring(0, 1000);
    const cid = String(creatorId).trim();
    const ct = creatorType || 'User';

    console.log('\n=== UPLOAD ===');
    console.log('Creator:', ct, cid, '| File:', req.file.originalname, '(' + buf.length + 'b)');

    const body = { assetType: 'Model', displayName: name, description: desc, creationContext: { creator: {} } };
    if (ct === 'Group') body.creationContext.creator.groupId = cid;
    else body.creationContext.creator.userId = cid;

    const fd = new FormData();
    fd.append('request', JSON.stringify(body), { contentType: 'application/json' });
    fd.append('fileContent', buf, { filename: req.file.originalname, contentType: 'application/octet-stream' });

    const r = await fetch('https://apis.roblox.com/assets/v1/assets', {
      method: 'POST',
      headers: { 'x-api-key': apiKey.trim(), ...fd.getHeaders() },
      body: fd
    });

    const txt = await r.text();
    console.log('Status:', r.status, '| Body:', txt.substring(0, 300));
    cleanup(fp); fp = null;

    if (r.status === 401) return res.status(401).json({ success: false, message: 'API Key invalid or expired' });
    if (r.status === 403) { let m = 'Forbidden'; try { m = JSON.parse(txt).message || m; } catch(x) {} return res.status(403).json({ success: false, message: m }); }
    if (r.status === 400) { let m = 'Bad request'; try { m = JSON.parse(txt).message || m; } catch(x) {} return res.status(400).json({ success: false, message: m }); }
    if (r.status >= 500) return res.status(502).json({ success: false, message: 'Roblox server error ' + r.status });

    let data;
    try { data = JSON.parse(txt); } catch(e) { return res.status(500).json({ success: false, message: 'Invalid response from Roblox' }); }

    // Direct asset ID
    if (data.assetId || data.id) {
      const aid = String(data.assetId || data.id);
      return res.json({ success: true, assetId: aid, toolboxUrl: 'https://www.roblox.com/library/' + aid, studioUrl: 'rbxassetid://' + aid, message: 'Upload successful!' });
    }

    // Operation polling
    if (data.path) {
      if (data.done && data.response) {
        const aid = data.response.assetId || data.response.id;
        if (aid) return res.json({ success: true, assetId: String(aid), toolboxUrl: 'https://www.roblox.com/library/' + aid, studioUrl: 'rbxassetid://' + aid, message: 'Upload successful!' });
      }

      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 2000));
        try {
          const pr = await fetch('https://apis.roblox.com/assets/v1/' + data.path, { headers: { 'x-api-key': apiKey.trim() } });
          if (pr.ok) {
            const pd = await pr.json();
            console.log('Poll', i + 1, '| done:', pd.done);
            if (pd.done) {
              const aid = pd.response && (pd.response.assetId || pd.response.id);
              if (aid) return res.json({ success: true, assetId: String(aid), toolboxUrl: 'https://www.roblox.com/library/' + aid, studioUrl: 'rbxassetid://' + aid, message: 'Upload successful!' });
              return res.json({ success: false, message: 'Completed but no Asset ID returned' });
            }
          }
        } catch(pe) { console.error('Poll error:', pe.message); }
      }
      return res.json({ success: false, message: 'Still processing. Check Roblox inventory later.' });
    }

    res.status(500).json({ success: false, message: 'Unexpected response from Roblox' });
  } catch(e) {
    console.error('Upload error:', e);
    cleanup(fp);
    res.status(500).json({ success: false, message: 'Server error: ' + e.message });
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ success: false, message: 'File too large (max 50MB)' });
  res.status(400).json({ success: false, message: err.message });
});

// Fallback
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// START
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('================================');
  console.log('  RBXM Converter Server Ready!');
  console.log('  http://localhost:' + PORT);
  console.log('  Node ' + process.version);
  console.log('================================');
  console.log('');
  ['index.html','style.css','script.js'].forEach(f => {
    console.log(fs.existsSync(path.join(__dirname, f)) ? '  ✅ ' + f : '  ❌ ' + f + ' MISSING!');
  });
  console.log('');
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error('❌ Port ' + PORT + ' already in use!');
    console.error('   Kill it: npx kill-port ' + PORT);
    console.error('   Or use different port: PORT=3001 node server.js');
  } else {
    console.error('Server error:', e);
  }
  process.exit(1);
});
