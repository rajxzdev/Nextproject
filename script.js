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

// =================== FIX LINKS + INIT HELP ===================
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('a[href*="create.roblox.com/credentials"]').forEach(a => {
        a.href = 'https://create.roblox.com/dashboard/credentials';
    });
    initHelpModal();
});

// =================== HELP MODAL SYSTEM ===================
function initHelpModal() {
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.id = 'helpOverlay';
    overlay.className = 'help-overlay';
    overlay.innerHTML = `
        <div class="help-modal">
            <div class="help-modal-glow"></div>
            <div class="help-modal-content">
                <div class="help-modal-header">
                    <div class="help-header-left">
                        <div class="help-icon-wrap">
                            <i class="fas fa-book-open"></i>
                        </div>
                        <div>
                            <h2>Help Guide</h2>
                            <p>Step-by-step tutorial</p>
                        </div>
                    </div>
                    <button class="help-close" onclick="closeHelp()">
                        <i class="fas fa-xmark"></i>
                    </button>
                </div>

                <div class="help-tabs">
                    <button class="help-tab active" onclick="switchHelpTab(0, this)">
                        <i class="fas fa-key"></i>
                        API Key
                    </button>
                    <button class="help-tab" onclick="switchHelpTab(1, this)">
                        <i class="fas fa-id-badge"></i>
                        User ID
                    </button>
                    <button class="help-tab" onclick="switchHelpTab(2, this)">
                        <i class="fas fa-file-export"></i>
                        RBXM File
                    </button>
                    <button class="help-tab" onclick="switchHelpTab(3, this)">
                        <i class="fas fa-circle-question"></i>
                        FAQ
                    </button>
                </div>

                <div class="help-panels">
                    <!-- Tab 0: API Key Guide -->
                    <div class="help-panel active" data-panel="0">
                        <div class="guide-title">
                            <span class="guide-badge">Guide</span>
                            How to Get Your API Key
                        </div>

                        <div class="guide-steps">
                            <div class="guide-step">
                                <div class="guide-step-num">1</div>
                                <div class="guide-step-body">
                                    <h4>Open Roblox Creator Dashboard</h4>
                                    <p>Go to the credentials page to create a new API key.</p>
                                    <a href="https://create.roblox.com/dashboard/credentials" target="_blank" rel="noopener" class="guide-link">
                                        <i class="fas fa-arrow-up-right-from-square"></i>
                                        create.roblox.com/dashboard/credentials
                                    </a>
                                </div>
                            </div>

                            <div class="guide-step">
                                <div class="guide-step-num">2</div>
                                <div class="guide-step-body">
                                    <h4>Click "CREATE API KEY"</h4>
                                    <p>You'll see a blue button at the top right. Click it to start creating a new key.</p>
                                </div>
                            </div>

                            <div class="guide-step">
                                <div class="guide-step-num">3</div>
                                <div class="guide-step-body">
                                    <h4>Fill in the Details</h4>
                                    <p>Give your key a name (e.g. "RBXM Converter") so you can identify it later.</p>
                                </div>
                            </div>

                            <div class="guide-step">
                                <div class="guide-step-num">4</div>
                                <div class="guide-step-body">
                                    <h4>Add API System: "Assets"</h4>
                                    <p>Under <strong>Access Permissions</strong>, click <strong>"Add API System"</strong> and select <strong>"Assets"</strong>.</p>
                                    <div class="guide-note">
                                        <i class="fas fa-triangle-exclamation"></i>
                                        <span>Make sure to enable both <strong>Read</strong> and <strong>Write</strong> permissions for Assets.</span>
                                    </div>
                                </div>
                            </div>

                            <div class="guide-step">
                                <div class="guide-step-num">5</div>
                                <div class="guide-step-body">
                                    <h4>Set Accepted IP Addresses</h4>
                                    <p>For testing, you can use <code>0.0.0.0/0</code> to allow all IPs. For production, use your server's IP.</p>
                                    <div class="guide-code">
                                        <code>0.0.0.0/0</code>
                                        <button class="copy-btn-sm" onclick="quickCopy('0.0.0.0/0', this)">
                                            <i class="far fa-copy"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div class="guide-step">
                                <div class="guide-step-num">6</div>
                                <div class="guide-step-body">
                                    <h4>Save & Copy Your Key</h4>
                                    <p>Click <strong>"SAVE & GENERATE KEY"</strong>. Your API key will be shown <strong>only once</strong> — copy it immediately and paste it into this converter.</p>
                                    <div class="guide-note warn">
                                        <i class="fas fa-lock"></i>
                                        <span>Never share your API key with anyone. It gives full access to upload assets to your account.</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Tab 1: User ID Guide -->
                    <div class="help-panel" data-panel="1">
                        <div class="guide-title">
                            <span class="guide-badge blue">Guide</span>
                            How to Find Your User ID
                        </div>

                        <div class="guide-steps">
                            <div class="guide-step">
                                <div class="guide-step-num">1</div>
                                <div class="guide-step-body">
                                    <h4>Open Your Roblox Profile</h4>
                                    <p>Go to roblox.com and click on your avatar/username to open your profile page.</p>
                                    <a href="https://www.roblox.com/home" target="_blank" rel="noopener" class="guide-link">
                                        <i class="fas fa-arrow-up-right-from-square"></i>
                                        roblox.com/home
                                    </a>
                                </div>
                            </div>

                            <div class="guide-step">
                                <div class="guide-step-num">2</div>
                                <div class="guide-step-body">
                                    <h4>Look at the URL</h4>
                                    <p>Your profile URL contains your User ID. It looks like this:</p>
                                    <div class="guide-code">
                                        <code>roblox.com/users/<strong>123456789</strong>/profile</code>
                                    </div>
                                    <p style="margin-top:8px">The number <strong>123456789</strong> is your User ID.</p>
                                </div>
                            </div>

                            <div class="guide-step">
                                <div class="guide-step-num">3</div>
                                <div class="guide-step-body">
                                    <h4>Alternative: Use Settings</h4>
                                    <p>You can also find your User ID in Roblox Studio:</p>
                                    <ol class="guide-list">
                                        <li>Open Roblox Studio</li>
                                        <li>Go to <strong>File → Settings</strong></li>
                                        <li>Your User ID is displayed there</li>
                                    </ol>
                                </div>
                            </div>

                            <div class="guide-step">
                                <div class="guide-step-num">💡</div>
                                <div class="guide-step-body">
                                    <h4>For Group Upload</h4>
                                    <p>If you want to upload to a <strong>Group</strong> instead of your personal account:</p>
                                    <ol class="guide-list">
                                        <li>Go to your group page on Roblox</li>
                                        <li>The URL looks like: <code>roblox.com/groups/<strong>7654321</strong>/...</code></li>
                                        <li>Use that number as Creator ID</li>
                                        <li>Change Creator Type to <strong>"Group"</strong></li>
                                    </ol>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Tab 2: RBXM File Guide -->
                    <div class="help-panel" data-panel="2">
                        <div class="guide-title">
                            <span class="guide-badge green">Guide</span>
                            How to Get a .rbxm File
                        </div>

                        <div class="guide-steps">
                            <div class="guide-step">
                                <div class="guide-step-num">1</div>
                                <div class="guide-step-body">
                                    <h4>Open Roblox Studio</h4>
                                    <p>Launch Roblox Studio and open the place that contains the model you want to export.</p>
                                </div>
                            </div>

                            <div class="guide-step">
                                <div class="guide-step-num">2</div>
                                <div class="guide-step-body">
                                    <h4>Select Your Model</h4>
                                    <p>In the <strong>Explorer</strong> panel, click on the model, part, or object you want to export.</p>
                                    <div class="guide-note info">
                                        <i class="fas fa-lightbulb"></i>
                                        <span>You can select multiple objects by holding <strong>Ctrl</strong> and clicking each one.</span>
                                    </div>
                                </div>
                            </div>

                            <div class="guide-step">
                                <div class="guide-step-num">3</div>
                                <div class="guide-step-body">
                                    <h4>Right Click → "Save to File"</h4>
                                    <p>Right-click on the selected object in Explorer and choose <strong>"Save to File..."</strong></p>
                                </div>
                            </div>

                            <div class="guide-step">
                                <div class="guide-step-num">4</div>
                                <div class="guide-step-body">
                                    <h4>Save as .rbxm</h4>
                                    <p>In the save dialog, make sure the file format is set to:</p>
                                    <div class="guide-code">
                                        <code>Roblox Model (*.rbxm)</code>
                                    </div>
                                    <p style="margin-top:8px">Choose a location and save the file. Then upload it here!</p>
                                </div>
                            </div>

                            <div class="guide-step">
                                <div class="guide-step-num">📝</div>
                                <div class="guide-step-body">
                                    <h4>.rbxm vs .rbxmx — What's the difference?</h4>
                                    <div class="guide-compare">
                                        <div class="compare-item">
                                            <span class="compare-label">.rbxm</span>
                                            <span>Binary format — smaller file size, faster</span>
                                        </div>
                                        <div class="compare-item">
                                            <span class="compare-label">.rbxmx</span>
                                            <span>XML format — human-readable, larger file</span>
                                        </div>
                                    </div>
                                    <p style="margin-top:8px">Both formats work with this converter. <strong>.rbxm is recommended.</strong></p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Tab 3: FAQ -->
                    <div class="help-panel" data-panel="3">
                        <div class="guide-title">
                            <span class="guide-badge orange">FAQ</span>
                            Frequently Asked Questions
                        </div>

                        <div class="faq-list">
                            <div class="faq-item" onclick="toggleFaq(this)">
                                <div class="faq-q">
                                    <span>What does this tool do?</span>
                                    <i class="fas fa-chevron-down"></i>
                                </div>
                                <div class="faq-a">
                                    <p>This tool uploads your .rbxm model file to Roblox using the Open Cloud API and gives you an <strong>Asset ID</strong>. You can then use that ID to insert the model into any Roblox game via the Toolbox or scripts.</p>
                                </div>
                            </div>

                            <div class="faq-item" onclick="toggleFaq(this)">
                                <div class="faq-q">
                                    <span>Is this safe? Will my API key be stolen?</span>
                                    <i class="fas fa-chevron-down"></i>
                                </div>
                                <div class="faq-a">
                                    <p>Your API key is sent directly to Roblox's servers (or through the local backend proxy). It is <strong>never stored</strong> anywhere. However, always keep your API key private and never share it.</p>
                                </div>
                            </div>

                            <div class="faq-item" onclick="toggleFaq(this)">
                                <div class="faq-q">
                                    <span>Why do I get "HTTP 401" or "Unauthorized" error?</span>
                                    <i class="fas fa-chevron-down"></i>
                                </div>
                                <div class="faq-a">
                                    <p>This means your API key is invalid or expired. Make sure:</p>
                                    <ul>
                                        <li>You copied the full API key</li>
                                        <li>The key has <strong>Assets (Read + Write)</strong> permission</li>
                                        <li>Your IP is in the allowed list (use <code>0.0.0.0/0</code> for testing)</li>
                                    </ul>
                                </div>
                            </div>

                            <div class="faq-item" onclick="toggleFaq(this)">
                                <div class="faq-q">
                                    <span>Why do I get "HTTP 403" or "Forbidden" error?</span>
                                    <i class="fas fa-chevron-down"></i>
                                </div>
                                <div class="faq-a">
                                    <p>This usually means:</p>
                                    <ul>
                                        <li>Your Creator ID is wrong</li>
                                        <li>You don't have permission to upload to that group</li>
                                        <li>Your API key doesn't have the right permissions</li>
                                    </ul>
                                </div>
                            </div>

                            <div class="faq-item" onclick="toggleFaq(this)">
                                <div class="faq-q">
                                    <span>Do I need the backend server (server.js)?</span>
                                    <i class="fas fa-chevron-down"></i>
                                </div>
                                <div class="faq-a">
                                    <p><strong>Yes, recommended.</strong> Roblox's API doesn't allow direct browser requests (CORS). The backend server acts as a proxy. Run it with:</p>
                                    <div class="guide-code" style="margin-top:8px">
                                        <code>npm install && npm start</code>
                                    </div>
                                </div>
                            </div>

                            <div class="faq-item" onclick="toggleFaq(this)">
                                <div class="faq-q">
                                    <span>What's the max file size?</span>
                                    <i class="fas fa-chevron-down"></i>
                                </div>
                                <div class="faq-a">
                                    <p>The server allows up to <strong>50 MB</strong>. Roblox's own limit depends on asset type but models are generally accepted up to ~50 MB.</p>
                                </div>
                            </div>

                            <div class="faq-item" onclick="toggleFaq(this)">
                                <div class="faq-q">
                                    <span>Can I upload Decals or Audio too?</span>
                                    <i class="fas fa-chevron-down"></i>
                                </div>
                                <div class="faq-a">
                                    <p><strong>Yes!</strong> Change the "Asset Type" dropdown in Step 1. For Decals, use image files (.png, .jpg). For Audio, use .mp3 or .ogg files.</p>
                                </div>
                            </div>

                            <div class="faq-item" onclick="toggleFaq(this)">
                                <div class="faq-q">
                                    <span>How do I use the Asset ID in my game?</span>
                                    <i class="fas fa-chevron-down"></i>
                                </div>
                                <div class="faq-a">
                                    <p>Use this script in a Roblox Script or LocalScript:</p>
                                    <div class="guide-code" style="margin-top:8px">
                                        <code>local asset = game:GetService("InsertService"):LoadAsset(YOUR_ID)<br>asset.Parent = workspace</code>
                                    </div>
                                    <p style="margin-top:8px">Or search the Asset ID in the <strong>Toolbox</strong> inside Roblox Studio.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    // Create help button (floating)
    const helpBtn = document.createElement('button');
    helpBtn.id = 'helpBtn';
    helpBtn.className = 'help-float-btn';
    helpBtn.onclick = openHelp;
    helpBtn.innerHTML = `
        <i class="fas fa-question"></i>
        <span>Help</span>
    `;
    document.body.appendChild(helpBtn);

    // Inject help styles
    injectHelpStyles();

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeHelp();
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeHelp();
    });
}

function openHelp() {
    const overlay = document.getElementById('helpOverlay');
    overlay.classList.add('visible');
    document.body.style.overflow = 'hidden';
}

function closeHelp() {
    const overlay = document.getElementById('helpOverlay');
    overlay.classList.remove('visible');
    document.body.style.overflow = '';
}

function switchHelpTab(index, btn) {
    document.querySelectorAll('.help-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.help-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    const panel = document.querySelector(`.help-panel[data-panel="${index}"]`);
    if (panel) {
        panel.classList.add('active');
        panel.style.animation = 'none';
        void panel.offsetWidth;
        panel.style.animation = '';
    }
}

function toggleFaq(el) {
    el.classList.toggle('open');
}

function quickCopy(text, btn) {
    navigator.clipboard.writeText(text).then(() => {
        const icon = btn.querySelector('i');
        icon.classList.replace('fa-copy', 'fa-check');
        btn.style.color = 'var(--green)';
        setTimeout(() => {
            icon.classList.replace('fa-check', 'fa-copy');
            btn.style.color = '';
        }, 1500);
    }).catch(() => {
        fallbackCopy(text);
    });
}

function injectHelpStyles() {
    const style = document.createElement('style');
    style.textContent = `
        /* ===== Help Float Button ===== */
        .help-float-btn {
            position: fixed;
            bottom: 24px;
            right: 24px;
            z-index: 500;
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 12px 20px;
            background: linear-gradient(135deg, rgba(168,85,247,0.2), rgba(139,92,246,0.12));
            border: 1.5px solid rgba(168,85,247,0.25);
            border-radius: 100px;
            color: var(--purple-200);
            font-family: inherit;
            font-size: 13px;
            font-weight: 650;
            cursor: pointer;
            backdrop-filter: blur(30px) saturate(180%);
            -webkit-backdrop-filter: blur(30px) saturate(180%);
            box-shadow: 0 4px 24px rgba(168,85,247,0.15),
                        inset 0 1px 0 rgba(255,255,255,0.08);
            transition: all 0.4s var(--ease);
            animation: helpBtnIn 0.8s var(--ease) 1s both;
        }

        .help-float-btn:hover {
            transform: translateY(-3px) scale(1.03);
            box-shadow: 0 8px 35px rgba(168,85,247,0.25),
                        inset 0 1px 0 rgba(255,255,255,0.12);
            background: linear-gradient(135deg, rgba(168,85,247,0.3), rgba(139,92,246,0.2));
        }

        .help-float-btn:active {
            transform: translateY(0) scale(0.97);
        }

        .help-float-btn i {
            width: 20px;
            height: 20px;
            display: grid;
            place-items: center;
            background: rgba(168,85,247,0.25);
            border-radius: 50%;
            font-size: 10px;
        }

        @keyframes helpBtnIn {
            from { opacity: 0; transform: translateY(20px) scale(0.9); }
            to { opacity: 1; transform: translateY(0) scale(1); }
        }

        /* ===== Help Overlay ===== */
        .help-overlay {
            position: fixed;
            inset: 0;
            z-index: 9000;
            background: rgba(5,0,14,0.7);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            opacity: 0;
            visibility: hidden;
            transition: all 0.4s var(--ease);
        }

        .help-overlay.visible {
            opacity: 1;
            visibility: visible;
        }

        .help-overlay.visible .help-modal {
            transform: translateY(0) scale(1);
            opacity: 1;
        }

        /* ===== Help Modal ===== */
        .help-modal {
            position: relative;
            width: 100%;
            max-width: 560px;
            max-height: 85vh;
            border-radius: var(--radius-xl);
            overflow: hidden;
            transform: translateY(30px) scale(0.96);
            opacity: 0;
            transition: all 0.5s var(--ease);
        }

        .help-modal::before {
            content: '';
            position: absolute;
            inset: 0;
            border-radius: var(--radius-xl);
            background: linear-gradient(160deg, rgba(255,255,255,0.06), rgba(255,255,255,0.015) 40%, rgba(255,255,255,0.03));
            backdrop-filter: blur(60px) saturate(200%);
            -webkit-backdrop-filter: blur(60px) saturate(200%);
            border: 1px solid rgba(255,255,255,0.08);
            box-shadow: 0 20px 70px rgba(0,0,0,0.4),
                        inset 0 1px 0 rgba(255,255,255,0.1);
            z-index: 0;
        }

        .help-modal::after {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0;
            height: 1px;
            background: linear-gradient(90deg, transparent 10%, rgba(255,255,255,0.15) 50%, transparent 90%);
            z-index: 1;
        }

        .help-modal-glow {
            position: absolute;
            top: -40%; left: -20%;
            width: 140%; height: 100%;
            background: radial-gradient(ellipse at 40% 0%, rgba(168,85,247,0.08), transparent 65%);
            z-index: 0;
            pointer-events: none;
        }

        .help-modal-content {
            position: relative;
            z-index: 2;
            max-height: 85vh;
            overflow-y: auto;
        }

        .help-modal-content::-webkit-scrollbar { width: 4px; }
        .help-modal-content::-webkit-scrollbar-thumb {
            background: rgba(168,85,247,0.2);
            border-radius: 2px;
        }

        /* ===== Help Header ===== */
        .help-modal-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 22px 24px 0;
            position: sticky;
            top: 0;
            z-index: 10;
        }

        .help-header-left {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .help-icon-wrap {
            width: 42px;
            height: 42px;
            border-radius: 12px;
            display: grid;
            place-items: center;
            background: linear-gradient(135deg, rgba(168,85,247,0.15), rgba(168,85,247,0.05));
            border: 1px solid rgba(168,85,247,0.15);
            color: var(--purple-400);
            font-size: 17px;
        }

        .help-modal-header h2 {
            font-size: 18px;
            font-weight: 700;
        }

        .help-modal-header p {
            font-size: 11px;
            color: var(--text-3);
            margin-top: 1px;
        }

        .help-close {
            width: 36px;
            height: 36px;
            border-radius: 10px;
            display: grid;
            place-items: center;
            background: rgba(255,255,255,0.04);
            border: 1px solid rgba(255,255,255,0.06);
            color: var(--text-2);
            cursor: pointer;
            font-size: 15px;
            transition: all 0.25s;
        }

        .help-close:hover {
            background: rgba(248,113,113,0.1);
            border-color: rgba(248,113,113,0.15);
            color: var(--red);
            transform: rotate(90deg);
        }

        /* ===== Help Tabs ===== */
        .help-tabs {
            display: flex;
            gap: 6px;
            padding: 18px 24px 0;
            overflow-x: auto;
        }

        .help-tabs::-webkit-scrollbar { height: 0; }

        .help-tab {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 9px 16px;
            border-radius: 10px;
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.05);
            color: var(--text-3);
            font-family: inherit;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s var(--ease);
            white-space: nowrap;
        }

        .help-tab i { font-size: 11px; }

        .help-tab:hover {
            background: rgba(255,255,255,0.06);
            color: var(--text-2);
        }

        .help-tab.active {
            background: rgba(168,85,247,0.12);
            border-color: rgba(168,85,247,0.2);
            color: var(--purple-300);
        }

        /* ===== Help Panels ===== */
        .help-panels {
            padding: 18px 24px 24px;
        }

        .help-panel {
            display: none;
            animation: panelEnter 0.4s var(--ease);
        }

        .help-panel.active {
            display: block;
        }

        /* ===== Guide Styles ===== */
        .guide-title {
            font-size: 16px;
            font-weight: 700;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .guide-badge {
            padding: 4px 10px;
            border-radius: 6px;
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            background: rgba(168,85,247,0.12);
            color: var(--purple-400);
            border: 1px solid rgba(168,85,247,0.15);
        }

        .guide-badge.blue {
            background: rgba(96,165,250,0.12);
            color: var(--blue);
            border-color: rgba(96,165,250,0.15);
        }

        .guide-badge.green {
            background: rgba(52,211,153,0.12);
            color: var(--green);
            border-color: rgba(52,211,153,0.15);
        }

        .guide-badge.orange {
            background: rgba(251,191,36,0.12);
            color: var(--orange);
            border-color: rgba(251,191,36,0.15);
        }

        /* ===== Guide Steps ===== */
        .guide-steps {
            display: flex;
            flex-direction: column;
            gap: 2px;
        }

        .guide-step {
            display: flex;
            gap: 14px;
            padding: 16px 0;
            border-bottom: 1px solid rgba(255,255,255,0.03);
        }

        .guide-step:last-child {
            border-bottom: none;
        }

        .guide-step-num {
            width: 32px;
            height: 32px;
            border-radius: 9px;
            display: grid;
            place-items: center;
            background: rgba(168,85,247,0.1);
            border: 1px solid rgba(168,85,247,0.12);
            color: var(--purple-400);
            font-size: 13px;
            font-weight: 800;
            flex-shrink: 0;
        }

        .guide-step-body {
            flex: 1;
            min-width: 0;
        }

        .guide-step-body h4 {
            font-size: 14px;
            font-weight: 700;
            margin-bottom: 5px;
        }

        .guide-step-body p {
            font-size: 12px;
            color: var(--text-2);
            line-height: 1.6;
        }

        .guide-step-body strong {
            color: var(--text-1);
        }

        .guide-step-body code {
            font-family: 'JetBrains Mono', monospace;
            font-size: 11px;
            padding: 2px 6px;
            background: rgba(168,85,247,0.08);
            border-radius: 4px;
            color: var(--purple-300);
        }

        .guide-link {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            margin-top: 8px;
            padding: 8px 14px;
            border-radius: 9px;
            background: rgba(168,85,247,0.06);
            border: 1px solid rgba(168,85,247,0.1);
            color: var(--purple-300);
            font-size: 12px;
            font-weight: 600;
            text-decoration: none;
            transition: all 0.25s;
        }

        .guide-link:hover {
            background: rgba(168,85,247,0.12);
            border-color: rgba(168,85,247,0.2);
            color: var(--purple-200);
        }

        .guide-link i { font-size: 10px; }

        .guide-note {
            display: flex;
            align-items: flex-start;
            gap: 10px;
            margin-top: 10px;
            padding: 10px 14px;
            border-radius: 10px;
            background: rgba(251,191,36,0.05);
            border: 1px solid rgba(251,191,36,0.1);
            font-size: 11px;
            color: var(--text-2);
            line-height: 1.6;
        }

        .guide-note i {
            color: var(--orange);
            font-size: 12px;
            margin-top: 2px;
            flex-shrink: 0;
        }

        .guide-note.warn {
            background: rgba(248,113,113,0.05);
            border-color: rgba(248,113,113,0.1);
        }

        .guide-note.warn i { color: var(--red); }

        .guide-note.info {
            background: rgba(96,165,250,0.05);
            border-color: rgba(96,165,250,0.1);
        }

        .guide-note.info i { color: var(--blue); }

        .guide-code {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-top: 8px;
            padding: 9px 14px;
            border-radius: 9px;
            background: rgba(0,0,0,0.25);
            border: 1px solid rgba(255,255,255,0.04);
        }

        .guide-code code {
            flex: 1;
            font-family: 'JetBrains Mono', monospace;
            font-size: 12px;
            color: var(--purple-300);
            background: none;
            padding: 0;
        }

        .copy-btn-sm {
            background: none;
            border: none;
            color: var(--text-3);
            cursor: pointer;
            padding: 4px;
            font-size: 12px;
            transition: color 0.25s;
        }

        .copy-btn-sm:hover { color: var(--purple-400); }

        .guide-list {
            margin-top: 8px;
            padding-left: 18px;
            font-size: 12px;
            color: var(--text-2);
            line-height: 1.8;
        }

        .guide-list li { margin-bottom: 2px; }

        .guide-compare {
            display: flex;
            flex-direction: column;
            gap: 6px;
            margin-top: 8px;
        }

        .compare-item {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px 12px;
            background: rgba(255,255,255,0.02);
            border-radius: 8px;
            font-size: 12px;
            color: var(--text-2);
        }

        .compare-label {
            padding: 3px 8px;
            border-radius: 5px;
            background: rgba(168,85,247,0.1);
            color: var(--purple-300);
            font-family: 'JetBrains Mono', monospace;
            font-size: 11px;
            font-weight: 600;
            flex-shrink: 0;
        }

        /* ===== FAQ ===== */
        .faq-list {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        .faq-item {
            border-radius: 12px;
            background: rgba(255,255,255,0.02);
            border: 1px solid rgba(255,255,255,0.04);
            overflow: hidden;
            cursor: pointer;
            transition: all 0.3s var(--ease);
        }

        .faq-item:hover {
            border-color: rgba(255,255,255,0.08);
        }

        .faq-q {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 14px 16px;
            font-size: 13px;
            font-weight: 600;
            color: var(--text-1);
        }

        .faq-q i {
            font-size: 11px;
            color: var(--text-3);
            transition: transform 0.3s var(--ease);
            flex-shrink: 0;
        }

        .faq-item.open .faq-q i {
            transform: rotate(180deg);
            color: var(--purple-400);
        }

        .faq-a {
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.4s var(--ease), padding 0.3s;
            padding: 0 16px;
        }

        .faq-item.open .faq-a {
            max-height: 400px;
            padding: 0 16px 16px;
        }

        .faq-a p {
            font-size: 12px;
            color: var(--text-2);
            line-height: 1.7;
        }

        .faq-a ul {
            margin-top: 6px;
            padding-left: 18px;
            font-size: 12px;
            color: var(--text-2);
            line-height: 1.8;
        }

        .faq-a code {
            font-family: 'JetBrains Mono', monospace;
            font-size: 11px;
            padding: 2px 6px;
            background: rgba(168,85,247,0.08);
            border-radius: 4px;
            color: var(--purple-300);
        }

        /* ===== Responsive ===== */
        @media (max-width: 500px) {
            .help-overlay { padding: 10px; }
            .help-modal { max-height: 90vh; border-radius: 20px; }
            .help-modal-header { padding: 18px 18px 0; }
            .help-tabs { padding: 14px 18px 0; }
            .help-panels { padding: 14px 18px 20px; }
            .help-float-btn {
                bottom: 16px;
                right: 16px;
                padding: 10px 16px;
                font-size: 12px;
            }
            .help-float-btn span { display: none; }
            .help-float-btn i { margin: 0; }
        }
    `;
    document.head.appendChild(style);
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
        void panel.offsetWidth;
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
