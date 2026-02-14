const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// ============ MIDDLEWARE ============
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve semua file static dari root folder
app.use(express.static(__dirname));

// ============ UPLOAD FOLDER ============
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, unique + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.rbxm' && ext !== '.rbxmx') {
      return cb(new Error('Only .rbxm and .rbxmx files allowed'));
    }
    cb(null, true);
  },
  limits: { fileSize: 50 * 1024 * 1024 }
});

// ============ LAZY LOAD node-fetch & form-data ============
// Ini mencegah crash kalau module belum terinstall
let fetch, FormData;

function loadDeps() {
  if (!fetch) {
    try {
      fetch = require('node-fetch');
    } catch (e) {
      console.error('ERROR: node-fetch not installed. Run: npm install');
      return false;
    }
  }
  if (!FormData) {
    try {
      FormData = require('form-data');
    } catch (e) {
      console.error('ERROR: form-data not installed. Run: npm install');
      return false;
    }
  }
  return true;
}

// ============ HEALTH CHECK ============
app.get('/api/health', (req, res) => {
  const depsOk = loadDeps();
  res.json({
    status: 'ok',
    server: 'running',
    port: PORT,
    time: new Date().toISOString(),
    dependencies: depsOk ? 'loaded' : 'missing - run npm install',
    node: process.version
  });
});

// ============ VERIFY USER ID ============
app.post('/api/verify-user', async (req, res) => {
  if (!loadDeps()) {
    return res.status(500).json({ success: false, message: 'Server dependencies missing. Run npm install.' });
  }

  const { userId } = req.body;

  if (!userId || !/^\d+$/.test(String(userId).trim())) {
    return res.json({ success: false, message: 'Please enter a valid numeric User ID' });
  }

  const uid = String(userId).trim();

  try {
    console.log('[VERIFY USER]', uid);

    const userRes = await fetch(`https://users.roblox.com/v1/users/${uid}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      timeout: 10000
    });

    console.log('[VERIFY USER] Status:', userRes.status);

    if (userRes.status === 404) {
      return res.json({ success: false, message: 'User ID not found. No Roblox account with this ID.' });
    }

    if (!userRes.ok) {
      const errText = await userRes.text();
      console.log('[VERIFY USER] Error:', errText);
      return res.json({ success: false, message: `Roblox API error (${userRes.status})` });
    }

    const userData = await userRes.json();
    console.log('[VERIFY USER] Found:', userData.name);

    if (userData.isBanned) {
      return res.json({ success: false, message: `Account "${userData.name}" is banned.` });
    }

    return res.json({
      success: true,
      message: `Verified: ${userData.displayName} (@${userData.name})`,
      user: {
        id: userData.id,
        name: userData.name,
        displayName: userData.displayName,
        created: userData.created,
        hasVerifiedBadge: userData.hasVerifiedBadge || false
      }
    });

  } catch (err) {
    console.error('[VERIFY USER] Error:', err.message);
    return res.json({ success: false, message: 'Connection to Roblox failed: ' + err.message });
  }
});

// ============ VERIFY GROUP ID ============
app.post('/api/verify-group', async (req, res) => {
  if (!loadDeps()) {
    return res.status(500).json({ success: false, message: 'Server dependencies missing.' });
  }

  const { groupId } = req.body;

  if (!groupId || !/^\d+$/.test(String(groupId).trim())) {
    return res.json({ success: false, message: 'Please enter a valid numeric Group ID' });
  }

  const gid = String(groupId).trim();

  try {
    console.log('[VERIFY GROUP]', gid);

    const groupRes = await fetch(`https://groups.roblox.com/v1/groups/${gid}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      timeout: 10000
    });

    console.log('[VERIFY GROUP] Status:', groupRes.status);

    if (groupRes.status === 404) {
      return res.json({ success: false, message: 'Group ID not found.' });
    }

    if (!groupRes.ok) {
      return res.json({ success: false, message: `Roblox API error (${groupRes.status})` });
    }

    const groupData = await groupRes.json();
    console.log('[VERIFY GROUP] Found:', groupData.name);

    if (groupData.isLocked) {
      return res.json({ success: false, message: `Group "${groupData.name}" is locked.` });
    }

    return res.json({
      success: true,
      message: `Verified Group: ${groupData.name}`,
      group: {
        id: groupData.id,
        name: groupData.name,
        memberCount: groupData.memberCount,
        owner: groupData.owner ? {
          id: groupData.owner.userId,
          name: groupData.owner.username,
          displayName: groupData.owner.displayName
        } : null
      }
    });

  } catch (err) {
    console.error('[VERIFY GROUP] Error:', err.message);
    return res.json({ success: false, message: 'Connection to Roblox failed: ' + err.message });
  }
});

// ============ GET AVATAR ============
app.get('/api/avatar/:userId', async (req, res) => {
  if (!loadDeps()) {
    return res.json({ success: false });
  }

  try {
    const uid = req.params.userId;
    const avatarRes = await fetch(
      `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${uid}&size=150x150&format=Png&isCircular=true`,
      { timeout: 8000 }
    );

    if (avatarRes.ok) {
      const data = await avatarRes.json();
      if (data.data && data.data[0] && data.data[0].imageUrl) {
        return res.json({ success: true, imageUrl: data.data[0].imageUrl });
      }
    }
    return res.json({ success: false });
  } catch (e) {
    return res.json({ success: false });
  }
});

// ============ VALIDATE API KEY ============
app.post('/api/validate-key', async (req, res) => {
  if (!loadDeps()) {
    return res.status(500).json({ success: false, message: 'Server dependencies missing.' });
  }

  const { apiKey, creatorId, creatorType } = req.body;

  if (!apiKey || apiKey.trim().length < 10) {
    return res.json({ success: false, message: 'API Key too short.' });
  }

  if (!creatorId) {
    return res.json({ success: false, message: 'Verify Creator ID first (Step 1).' });
  }

  try {
    console.log('[VALIDATE KEY] Testing key for', creatorType, creatorId);

    const testBody = {
      assetType: 'Model',
      displayName: 'KeyTest_' + Date.now(),
      description: 'API key validation test',
      creationContext: { creator: {} }
    };

    if (creatorType === 'Group') {
      testBody.creationContext.creator.groupId = String(creatorId).trim();
    } else {
      testBody.creationContext.creator.userId = String(creatorId).trim();
    }

    const formData = new FormData();
    formData.append('request', JSON.stringify(testBody), {
      contentType: 'application/json'
    });
    formData.append('fileContent', Buffer.from('RBXM_TEST'), {
      filename: 'test.rbxm',
      contentType: 'application/octet-stream'
    });

    const testRes = await fetch('https://apis.roblox.com/assets/v1/assets', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey.trim(),
        ...formData.getHeaders()
      },
      body: formData,
      timeout: 15000
    });

    const status = testRes.status;
    const responseText = await testRes.text();

    console.log('[VALIDATE KEY] Status:', status);
    console.log('[VALIDATE KEY] Response:', responseText.substring(0, 200));

    if (status === 401) {
      return res.json({ success: false, message: 'Invalid API Key. Rejected by Roblox.' });
    }

    if (status === 403) {
      let msg = 'API Key lacks permissions or IP not whitelisted.';
      try {
        const e = JSON.parse(responseText);
        if (e.message) msg = e.message;
      } catch (x) {}
      return res.json({ success: false, message: msg });
    }

    // 400 = key is valid, request format wrong (expected with fake data)
    // 200/202 = somehow worked
    return res.json({ success: true, message: 'API Key is valid and working!' });

  } catch (err) {
    console.error('[VALIDATE KEY] Error:', err.message);
    return res.json({ success: false, message: 'Connection error: ' + err.message });
  }
});

// ============ UPLOAD RBXM ============
app.post('/api/upload', upload.single('rbxmFile'), async (req, res) => {
  if (!loadDeps()) {
    return res.status(500).json({ success: false, message: 'Server dependencies missing.' });
  }

  let filePath = null;

  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    filePath = req.file.path;

    const { apiKey, assetName, assetDescription, creatorId, creatorType } = req.body;

    if (!apiKey || apiKey.trim().length < 10) {
      return res.status(400).json({ success: false, message: 'Valid API Key required.' });
    }

    if (!creatorId || !/^\d+$/.test(String(creatorId).trim())) {
      return res.status(400).json({ success: false, message: 'Valid Creator ID required. Verify first.' });
    }

    const fileBuffer = fs.readFileSync(filePath);
    const name = (assetName || req.file.originalname.replace(/\.(rbxm|rbxmx)$/i, '')).substring(0, 50);
    const desc = (assetDescription || 'Uploaded via RBXM Converter').substring(0, 1000);
    const type = creatorType || 'User';
    const cid = String(creatorId).trim();

    console.log('');
    console.log('========== UPLOAD START ==========');
    console.log('Creator:', type, cid);
    console.log('Asset Name:', name);
    console.log('File:', req.file.originalname, '(' + fileBuffer.length + ' bytes)');

    const requestBody = {
      assetType: 'Model',
      displayName: name,
      description: desc,
      creationContext: { creator: {} }
    };

    if (type === 'Group') {
      requestBody.creationContext.creator.groupId = cid;
    } else {
      requestBody.creationContext.creator.userId = cid;
    }

    const formData = new FormData();
    formData.append('request', JSON.stringify(requestBody), {
      contentType: 'application/json'
    });
    formData.append('fileContent', fileBuffer, {
      filename: req.file.originalname,
      contentType: 'application/octet-stream'
    });

    console.log('Sending to Roblox API...');

    const uploadRes = await fetch('https://apis.roblox.com/assets/v1/assets', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey.trim(),
        ...formData.getHeaders()
      },
      body: formData,
      timeout: 30000
    });

    const responseText = await uploadRes.text();
    console.log('Response Status:', uploadRes.status);
    console.log('Response Body:', responseText.substring(0, 500));

    // Cleanup file
    cleanupFile(filePath);
    filePath = null;

    // Handle errors
    if (uploadRes.status === 401) {
      return res.status(401).json({
        success: false,
        message: 'API Key invalid or expired. Get a new one from Creator Dashboard.'
      });
    }

    if (uploadRes.status === 403) {
      let msg = 'Access denied. Check API key permissions and IP whitelist.';
      try {
        const e = JSON.parse(responseText);
        if (e.message) msg = e.message;
      } catch (x) {}
      return res.status(403).json({ success: false, message: msg });
    }

    if (uploadRes.status === 400) {
      let msg = 'Bad request.';
      try {
        const e = JSON.parse(responseText);
        msg = e.message || e.error || JSON.stringify(e);
      } catch (x) {
        msg = responseText;
      }
      return res.status(400).json({ success: false, message: 'Roblox rejected: ' + msg });
    }

    if (uploadRes.status >= 500) {
      return res.status(502).json({
        success: false,
        message: 'Roblox servers returned error ' + uploadRes.status + '. Try again later.'
      });
    }

    // Parse response
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      return res.status(500).json({
        success: false,
        message: 'Invalid JSON from Roblox: ' + responseText.substring(0, 100)
      });
    }

    // Check for direct asset ID
    if (responseData.assetId || responseData.id) {
      const assetId = String(responseData.assetId || responseData.id);
      console.log('Direct asset ID:', assetId);
      return res.json(makeSuccess(assetId));
    }

    // Check for operation (async processing)
    if (responseData.path) {
      console.log('Operation path:', responseData.path);

      // If already done
      if (responseData.done && responseData.response) {
        const aid = responseData.response.assetId || responseData.response.id;
        if (aid) {
          console.log('Already done. Asset ID:', aid);
          return res.json(makeSuccess(String(aid)));
        }
      }

      // Poll operation
      const result = await pollOperation(responseData.path, apiKey.trim());

      if (result.success) {
        return res.json(makeSuccess(result.assetId));
      } else {
        return res.status(202).json({
          success: false,
          message: result.message
        });
      }
    }

    // Unknown response format
    console.log('Unknown response format:', JSON.stringify(responseData));
    return res.status(500).json({
      success: false,
      message: 'Unexpected response from Roblox. Check your inventory.',
      debug: responseData
    });

  } catch (error) {
    console.error('UPLOAD ERROR:', error);
    cleanupFile(filePath);
    return res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message
    });
  }
});

// ============ POLL OPERATION ============
async function pollOperation(operationPath, apiKey) {
  const maxAttempts = 30;

  for (let i = 1; i <= maxAttempts; i++) {
    await sleep(2000);

    try {
      console.log(`[POLL ${i}/${maxAttempts}] Checking...`);

      const pollRes = await fetch(`https://apis.roblox.com/assets/v1/${operationPath}`, {
        method: 'GET',
        headers: {
          'x-api-key': apiKey,
          'Accept': 'application/json'
        },
        timeout: 10000
      });

      if (!pollRes.ok) {
        console.log(`[POLL ${i}] HTTP ${pollRes.status}`);
        continue;
      }

      const pollData = await pollRes.json();
      console.log(`[POLL ${i}] Done:`, pollData.done);

      if (pollData.done) {
        let assetId = null;

        if (pollData.response) {
          assetId = pollData.response.assetId || pollData.response.id;

          if (!assetId) {
            // Try to extract from stringified response
            const str = JSON.stringify(pollData.response);
            const match = str.match(/(\d{8,})/);
            if (match) assetId = match[1];
          }
        }

        if (assetId) {
          console.log(`[POLL ${i}] Asset ID found:`, assetId);
          return { success: true, assetId: String(assetId) };
        }

        return { success: false, message: 'Completed but no Asset ID returned.' };
      }

    } catch (pollErr) {
      console.error(`[POLL ${i}] Error:`, pollErr.message);
    }
  }

  return {
    success: false,
    message: 'Still processing after 60 seconds. Check your Roblox inventory later.'
  };
}

// ============ HELPERS ============
function makeSuccess(assetId) {
  return {
    success: true,
    assetId: assetId,
    toolboxUrl: `https://www.roblox.com/library/${assetId}`,
    studioUrl: `rbxassetid://${assetId}`,
    message: 'Asset uploaded successfully!'
  };
}

function cleanupFile(filePath) {
  if (filePath && fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      console.log('Cleaned up:', filePath);
    } catch (e) {
      console.error('Cleanup error:', e.message);
    }
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============ ERROR HANDLER ============
app.use((err, req, res, next) => {
  console.error('Express error:', err.message);

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ success: false, message: 'File too large (max 50MB)' });
  }

  if (err.message && err.message.includes('Only .rbxm')) {
    return res.status(400).json({ success: false, message: err.message });
  }

  res.status(500).json({ success: false, message: 'Server error: ' + err.message });
});

// ============ CATCH ALL - serve index.html ============
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ============ START SERVER ============
app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('╔══════════════════════════════════════╗');
  console.log('║   RBXM Converter Server Running!     ║');
  console.log('╠══════════════════════════════════════╣');
  console.log(`║   Local:  http://localhost:${PORT}        ║`);
  console.log(`║   Node:   ${process.version.padEnd(24)}║`);
  console.log(`║   Dir:    ${__dirname.substring(__dirname.length - 24).padEnd(24)}║`);
  console.log('╚══════════════════════════════════════╝');
  console.log('');

  // Check dependencies
  if (loadDeps()) {
    console.log('✅ All dependencies loaded');
  } else {
    console.log('❌ Missing dependencies! Run: npm install');
  }

  // Check files
  const files = ['index.html', 'style.css', 'script.js'];
  files.forEach(f => {
    const exists = fs.existsSync(path.join(__dirname, f));
    console.log(exists ? `✅ ${f}` : `❌ ${f} MISSING`);
  });

  console.log('');
  console.log('Test health: http://localhost:' + PORT + '/api/health');
  console.log('');
});
