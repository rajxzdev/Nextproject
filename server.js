const express = require('express');
const multer = require('multer');
const fetch = require('node-fetch');
const FormData = require('form-data');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, unique + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.rbxm' && ext !== '.rbxmx') {
      return cb(new Error('Only .rbxm and .rbxmx files allowed'), false);
    }
    cb(null, true);
  },
  limits: { fileSize: 50 * 1024 * 1024 }
});

// ========== VERIFY ROBLOX USER ID ==========
app.post('/api/verify-user', async (req, res) => {
  const { userId } = req.body;

  if (!userId || !/^\d+$/.test(userId.toString().trim())) {
    return res.json({
      success: false,
      message: 'Please enter a valid numeric User ID'
    });
  }

  try {
    const userRes = await fetch(`https://users.roblox.com/v1/users/${userId.toString().trim()}`);

    if (userRes.status === 404) {
      return res.json({
        success: false,
        message: 'User ID not found. No Roblox account exists with this ID.'
      });
    }

    if (!userRes.ok) {
      return res.json({
        success: false,
        message: `Roblox API returned status ${userRes.status}`
      });
    }

    const userData = await userRes.json();

    if (userData.isBanned) {
      return res.json({
        success: false,
        message: `Account "${userData.name}" is banned and cannot upload assets.`
      });
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
    console.error('User verify error:', err);
    return res.json({
      success: false,
      message: 'Failed to connect to Roblox API: ' + err.message
    });
  }
});

// ========== VERIFY GROUP ID ==========
app.post('/api/verify-group', async (req, res) => {
  const { groupId } = req.body;

  if (!groupId || !/^\d+$/.test(groupId.toString().trim())) {
    return res.json({
      success: false,
      message: 'Please enter a valid numeric Group ID'
    });
  }

  try {
    const groupRes = await fetch(`https://groups.roblox.com/v1/groups/${groupId.toString().trim()}`);

    if (groupRes.status === 404) {
      return res.json({
        success: false,
        message: 'Group ID not found. No Roblox group exists with this ID.'
      });
    }

    if (!groupRes.ok) {
      return res.json({
        success: false,
        message: `Roblox API returned status ${groupRes.status}`
      });
    }

    const groupData = await groupRes.json();

    if (groupData.isLocked) {
      return res.json({
        success: false,
        message: `Group "${groupData.name}" is locked and cannot upload assets.`
      });
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
    console.error('Group verify error:', err);
    return res.json({
      success: false,
      message: 'Failed to connect to Roblox API: ' + err.message
    });
  }
});

// ========== VALIDATE API KEY ==========
app.post('/api/validate-key', async (req, res) => {
  const { apiKey, creatorId, creatorType } = req.body;

  if (!apiKey || apiKey.trim().length < 10) {
    return res.json({
      success: false,
      message: 'API Key is too short. Please check your key.'
    });
  }

  if (!creatorId) {
    return res.json({
      success: false,
      message: 'Please verify your Creator ID first.'
    });
  }

  try {
    // Test the API key with a minimal request
    const testBody = {
      assetType: 'Model',
      displayName: 'API_Key_Test_' + Date.now(),
      description: 'Testing API key validity',
      creationContext: {
        creator: {}
      }
    };

    if (creatorType === 'Group') {
      testBody.creationContext.creator.groupId = String(creatorId);
    } else {
      testBody.creationContext.creator.userId = String(creatorId);
    }

    // We create a minimal form data to test
    const formData = new FormData();
    formData.append('request', JSON.stringify(testBody), {
      contentType: 'application/json'
    });
    // Send a tiny buffer as file content - this will fail but tells us if key is valid
    formData.append('fileContent', Buffer.from('test'), {
      filename: 'test.rbxm',
      contentType: 'application/octet-stream'
    });

    const testRes = await fetch('https://apis.roblox.com/assets/v1/assets', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey.trim(),
        ...formData.getHeaders()
      },
      body: formData
    });

    const status = testRes.status;
    const responseText = await testRes.text();

    console.log('Key validation status:', status);
    console.log('Key validation response:', responseText);

    if (status === 401) {
      return res.json({
        success: false,
        message: 'Invalid API Key. The key was rejected by Roblox.'
      });
    }

    if (status === 403) {
      let msg = 'API Key lacks required permissions.';
      try {
        const errData = JSON.parse(responseText);
        if (errData.message && errData.message.includes('IP')) {
          msg = 'Your server IP is not whitelisted in the API key settings. Add your server IP or use 0.0.0.0/0 for all IPs.';
        } else if (errData.message) {
          msg = errData.message;
        }
      } catch (e) {}
      return res.json({ success: false, message: msg });
    }

    // Status 400 means key is valid but request was bad (expected since we sent fake data)
    // Status 200/202 means somehow it worked
    // Any other status besides 401/403 means the key itself is accepted
    return res.json({
      success: true,
      message: 'API Key is valid and has correct permissions!'
    });

  } catch (err) {
    console.error('Key validation error:', err);
    return res.json({
      success: false,
      message: 'Connection error: ' + err.message
    });
  }
});

// ========== UPLOAD RBXM ==========
app.post('/api/upload', upload.single('rbxmFile'), async (req, res) => {
  let filePath = null;

  try {
    const { apiKey, assetName, assetDescription, creatorId, creatorType } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    filePath = req.file.path;

    if (!apiKey || apiKey.trim().length < 10) {
      return res.status(400).json({ success: false, message: 'Valid API Key is required' });
    }

    if (!creatorId || !/^\d+$/.test(creatorId.toString().trim())) {
      return res.status(400).json({ success: false, message: 'Valid Creator ID is required. Please verify it first.' });
    }

    const fileBuffer = fs.readFileSync(filePath);
    const name = (assetName || req.file.originalname.replace(/\.(rbxm|rbxmx)$/i, '')).substring(0, 50);
    const description = (assetDescription || 'Uploaded via RBXM Converter').substring(0, 1000);
    const type = creatorType || 'User';

    const requestBody = {
      assetType: 'Model',
      displayName: name,
      description: description,
      creationContext: {
        creator: {}
      }
    };

    if (type === 'Group') {
      requestBody.creationContext.creator.groupId = String(creatorId).trim();
    } else {
      requestBody.creationContext.creator.userId = String(creatorId).trim();
    }

    const formData = new FormData();
    formData.append('request', JSON.stringify(requestBody), {
      contentType: 'application/json'
    });
    formData.append('fileContent', fileBuffer, {
      filename: req.file.originalname,
      contentType: 'application/octet-stream'
    });

    console.log('=== UPLOAD REQUEST ===');
    console.log('Creator:', type, creatorId);
    console.log('Asset:', name);
    console.log('File:', req.file.originalname, '(' + fileBuffer.length + ' bytes)');

    const uploadRes = await fetch('https://apis.roblox.com/assets/v1/assets', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey.trim(),
        ...formData.getHeaders()
      },
      body: formData
    });

    const responseText = await uploadRes.text();
    console.log('Upload status:', uploadRes.status);
    console.log('Upload response:', responseText);

    // Clean up file
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    filePath = null;

    if (uploadRes.status === 401) {
      return res.status(401).json({
        success: false,
        message: 'API Key is invalid or expired. Please get a new key from Creator Dashboard.'
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

    if (!uploadRes.ok && uploadRes.status !== 200 && uploadRes.status !== 202) {
      let errMsg = `Upload failed (HTTP ${uploadRes.status})`;
      try {
        const e = JSON.parse(responseText);
        errMsg = e.message || e.error || e.Message || errMsg;
      } catch (x) {
        errMsg = responseText || errMsg;
      }
      return res.status(uploadRes.status).json({ success: false, message: errMsg });
    }

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      return res.status(500).json({
        success: false,
        message: 'Invalid JSON response from Roblox API'
      });
    }

    // Check if it's an operation (async processing)
    if (responseData.path || responseData.done !== undefined) {
      const operationPath = responseData.path;

      // If already done
      if (responseData.done && responseData.response) {
        const assetId = responseData.response.assetId || responseData.response.id;
        if (assetId) {
          return res.json({
            success: true,
            assetId: String(assetId),
            toolboxUrl: `https://www.roblox.com/library/${assetId}`,
            studioUrl: `rbxassetid://${assetId}`,
            message: 'Asset uploaded successfully!'
          });
        }
      }

      // Poll the operation
      let attempts = 0;
      const maxAttempts = 30;

      while (attempts < maxAttempts) {
        attempts++;
        await new Promise(r => setTimeout(r, 2000));

        try {
          const pollRes = await fetch(`https://apis.roblox.com/assets/v1/${operationPath}`, {
            headers: { 'x-api-key': apiKey.trim() }
          });

          if (pollRes.ok) {
            const pollData = await pollRes.json();
            console.log(`Poll #${attempts}:`, JSON.stringify(pollData));

            if (pollData.done) {
              const assetId = pollData.response?.assetId
                || pollData.response?.id
                || (JSON.stringify(pollData.response).match(/(\d{8,})/) || [])[1];

              if (assetId) {
                return res.json({
                  success: true,
                  assetId: String(assetId),
                  toolboxUrl: `https://www.roblox.com/library/${assetId}`,
                  studioUrl: `rbxassetid://${assetId}`,
                  message: 'Asset uploaded successfully!'
                });
              }
              return res.json({
                success: false,
                message: 'Operation completed but no Asset ID was returned.'
              });
            }
          }
        } catch (pollErr) {
          console.error(`Poll #${attempts} error:`, pollErr.message);
        }
      }

      return res.status(202).json({
        success: false,
        message: 'Asset is still processing. It may take a few minutes. Check your Roblox inventory later.',
        operationPath
      });
    }

    // Direct response
    const assetId = responseData.assetId || responseData.id;
    if (assetId) {
      return res.json({
        success: true,
        assetId: String(assetId),
        toolboxUrl: `https://www.roblox.com/library/${assetId}`,
        studioUrl: `rbxassetid://${assetId}`,
        message: 'Asset uploaded successfully!'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Unexpected response from Roblox. Check your inventory.',
      raw: responseData
    });

  } catch (error) {
    console.error('Upload error:', error);
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message
    });
  }
});

// ========== GET USER AVATAR FOR PROFILE CARD ==========
app.get('/api/avatar/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const avatarRes = await fetch(
      `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=true`
    );
    if (avatarRes.ok) {
      const data = await avatarRes.json();
      if (data.data && data.data[0]) {
        return res.json({ success: true, imageUrl: data.data[0].imageUrl });
      }
    }
    return res.json({ success: false });
  } catch (e) {
    return res.json({ success: false });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 RBXM Converter running at http://localhost:${PORT}`);
});
