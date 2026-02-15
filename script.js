document.addEventListener('DOMContentLoaded',()=>{
    initBG();
    initApp();
});

// ═══════════════════════════════
//  GALAXY BACKGROUND (Canvas)
// ═══════════════════════════════
function initBG(){
    const c=document.getElementById('bgCanvas');
    const ctx=c.getContext('2d');
    let w,h,stars=[],nebs=[];

    function resize(){
        w=c.width=window.innerWidth;
        h=c.height=window.innerHeight;
    }
    resize();
    window.addEventListener('resize',resize);

    // stars
    for(let i=0;i<180;i++){
        stars.push({
            x:Math.random()*w,y:Math.random()*h,
            r:Math.random()*1.5+.3,
            a:Math.random(),
            s:Math.random()*.003+.001,
            d:Math.random()>.5?1:-1
        });
    }
    // nebulas
    nebs=[
        {x:w*.2,y:h*.3,r:250,c:'rgba(155,89,182,.06)',dx:.15,dy:.1},
        {x:w*.8,y:h*.7,r:200,c:'rgba(52,152,219,.04)',dx:-.1,dy:.12},
        {x:w*.5,y:h*.5,r:180,c:'rgba(231,76,60,.03)',dx:.08,dy:-.08}
    ];

    function draw(){
        ctx.clearRect(0,0,w,h);
        // bg gradient
        const g=ctx.createRadialGradient(w*.3,h*.4,0,w*.5,h*.5,w*.7);
        g.addColorStop(0,'#120625');
        g.addColorStop(.5,'#0a0418');
        g.addColorStop(1,'#06060f');
        ctx.fillStyle=g;
        ctx.fillRect(0,0,w,h);

        // nebulas
        nebs.forEach(n=>{
            n.x+=n.dx;n.y+=n.dy;
            if(n.x<-100||n.x>w+100)n.dx*=-1;
            if(n.y<-100||n.y>h+100)n.dy*=-1;
            const ng=ctx.createRadialGradient(n.x,n.y,0,n.x,n.y,n.r);
            ng.addColorStop(0,n.c);
            ng.addColorStop(1,'transparent');
            ctx.fillStyle=ng;
            ctx.fillRect(n.x-n.r,n.y-n.r,n.r*2,n.r*2);
        });

        // stars
        stars.forEach(s=>{
            s.a+=s.s*s.d;
            if(s.a>=1||s.a<=.1)s.d*=-1;
            ctx.beginPath();
            ctx.arc(s.x,s.y,s.r,0,Math.PI*2);
            ctx.fillStyle=`rgba(255,255,255,${s.a})`;
            ctx.fill();
        });

        requestAnimationFrame(draw);
    }
    draw();
}

// ═══════════════════════════════
//  APP LOGIC
// ═══════════════════════════════
let step=1, apiKey='', file=null;

function initApp(){
    // Step 1
    $('btnValidate').onclick=validateKey;
    $('inKey').onkeydown=e=>{if(e.key==='Enter')validateKey()};
    $('btnEye').onclick=()=>{
        const i=$('inKey');
        const ico=$('btnEye').querySelector('i');
        if(i.type==='password'){i.type='text';ico.className='fas fa-eye-slash'}
        else{i.type='password';ico.className='fas fa-eye'}
    };
    $('btnHowKey').onclick=()=>openHelp('apikey');

    // Step 2
    initDrop();
    $('btnRemove').onclick=removeFile;
    $('btn2next').onclick=()=>go(3);
    $('btn2back').onclick=()=>go(1);

    // Step 3
    $('inName').oninput=e=>$('cName').textContent=e.target.value.length;
    $('inDesc').oninput=e=>$('cDesc').textContent=e.target.value.length;
    $('inCreatorType').onchange=e=>{
        const g=e.target.value==='Group';
        $('lblCid').textContent=g?'Group ID':'User ID';
        $('inCid').placeholder=g?'Masukkan Group ID...':'Masukkan User ID...';
    };
    $('btnUpload').onclick=doUpload;
    $('btn3back').onclick=()=>go(2);

    // Help
    $('btnHelp').onclick=()=>openHelp('overview');
    $('btnCloseHelp').onclick=closeHelp;
    $('helpModal').onclick=e=>{if(e.target===$('helpModal'))closeHelp()};
    document.querySelectorAll('.htab').forEach(t=>t.onclick=()=>switchTab(t.dataset.t));
    document.querySelectorAll('.faq-q').forEach(b=>b.onclick=()=>b.parentElement.classList.toggle('open'));
    document.onkeydown=e=>{if(e.key==='Escape')closeHelp()};
}

function $(id){return document.getElementById(id)}

// ═══════════════════════════════
//  NAVIGATION
// ═══════════════════════════════
function go(s){
    document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
    $('p'+s).classList.add('active');

    document.querySelectorAll('.stp').forEach((el,i)=>{
        const n=i+1;
        el.classList.remove('active','done');
        if(n<s)el.classList.add('done');
        else if(n===s)el.classList.add('active');
    });

    for(let i=1;i<=3;i++){
        const line=$('line'+i);
        if(line){
            if(i<s)line.classList.add('filled');
            else line.classList.remove('filled');
        }
    }
    step=s;
}

// ═══════════════════════════════
//  STEP 1: VALIDATE KEY
// ═══════════════════════════════
async function validateKey(){
    const key=$('inKey').value.trim();
    const st=$('keyStatus');
    const btn=$('btnValidate');

    if(!key){
        setStatus(st,'err','<i class="fas fa-exclamation-circle"></i> Masukkan API key');
        toast('err','Error','Masukkan API key kamu');
        return;
    }

    setStatus(st,'load','<i class="fas fa-spinner fa-spin"></i> Validating...');
    btn.disabled=true;
    btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> Checking...';

    try{
        const r=await fetch('/api/validate-key',{
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({apiKey:key})
        });
        const d=await r.json();

        if(d.valid){
            apiKey=key;
            setStatus(st,'ok','<i class="fas fa-check-circle"></i> '+d.message);
            toast('ok','Valid',d.message);
            setTimeout(()=>go(2),600);
        }else{
            setStatus(st,'err','<i class="fas fa-times-circle"></i> '+d.message);
            toast('err','Invalid',d.message);
        }
    }catch(e){
        apiKey=key;
        setStatus(st,'ok','<i class="fas fa-check-circle"></i> Key diterima');
        toast('info','OK','Key diterima, akan divalidasi saat upload');
        setTimeout(()=>go(2),600);
    }finally{
        btn.disabled=false;
        btn.innerHTML='<i class="fas fa-arrow-right"></i> Lanjut';
    }
}

function setStatus(el,type,html){
    el.className='status-msg '+type+' show';
    el.innerHTML=html;
}

// ═══════════════════════════════
//  STEP 2: FILE UPLOAD
// ═══════════════════════════════
function initDrop(){
    const z=$('dropZone'), fi=$('inFile');
    z.onclick=()=>fi.click();
    z.ondragover=e=>{e.preventDefault();z.classList.add('over')};
    z.ondragleave=e=>{e.preventDefault();z.classList.remove('over')};
    z.ondrop=e=>{e.preventDefault();z.classList.remove('over');if(e.dataTransfer.files.length)pickFile(e.dataTransfer.files[0])};
    fi.onchange=e=>{if(e.target.files.length)pickFile(e.target.files[0])};
}

function pickFile(f){
    const ext=f.name.split('.').pop().toLowerCase();
    if(ext!=='rbxm'&&ext!=='rbxmx'){toast('err','Error','Hanya .rbxm / .rbxmx');return}
    if(f.size>50*1024*1024){toast('err','Error','Max 50MB');return}

    file=f;
    $('fName').textContent=f.name;
    $('fSize').textContent=fmtSize(f.size);
    $('fileCard').style.display='flex';
    $('dropZone').style.display='none';
    $('btn2next').disabled=false;

    const base=f.name.replace(/\.(rbxm|rbxmx)$/i,'');
    if(!$('inName').value){
        $('inName').value=base.substring(0,50);
        $('cName').textContent=$('inName').value.length;
    }
    toast('ok','File dipilih',`${f.name} (${fmtSize(f.size)})`);
}

function removeFile(){
    file=null;
    $('inFile').value='';
    $('fileCard').style.display='none';
    $('dropZone').style.display='';
    $('btn2next').disabled=true;
}

function fmtSize(b){
    if(b<1024)return b+' B';
    if(b<1048576)return(b/1024).toFixed(1)+' KB';
    return(b/1048576).toFixed(2)+' MB';
}

// ═══════════════════════════════
//  STEP 3: UPLOAD
// ═══════════════════════════════
async function doUpload(){
    const name=$('inName').value.trim();
    const desc=$('inDesc').value.trim();
    const ctype=$('inCreatorType').value;
    const cid=$('inCid').value.trim();

    if(!name){toast('err','Error','Masukkan nama asset');return}
    if(!cid){toast('err','Error','Masukkan '+ctype+' ID');return}
    if(!/^\d+$/.test(cid)){toast('err','Error','ID harus angka');return}
    if(!file){toast('err','Error','Pilih file dulu');go(2);return}

    showLoad('Uploading...','Mengirim file ke Roblox');

    const fd=new FormData();
    fd.append('rbxmFile',file);
    fd.append('apiKey',apiKey);
    fd.append('assetName',name);
    fd.append('assetDescription',desc);
    fd.append('creatorType',ctype);
    fd.append('creatorId',cid);

    let prog=0;
    const pi=setInterval(()=>{
        if(prog<85){
            prog+=Math.random()*7+2;
            if(prog>85)prog=85;
            setProg(prog);
            if(prog>30&&prog<37)setLoadText('Uploading...','Mengirim ke server Roblox');
            if(prog>60&&prog<67)setLoadText('Processing...','Roblox memproses model kamu');
        }
    },500);

    try{
        const r=await fetch('/api/upload',{method:'POST',body:fd});
        clearInterval(pi);
        setProg(95);
        setLoadText('Finishing...','Hampir selesai!');

        const d=await r.json();

        setTimeout(()=>{
            setProg(100);
            setTimeout(()=>{
                hideLoad();
                showResult(d);
                go(4);
                if(d.success&&d.assetId)confetti();
            },350);
        },400);
    }catch(e){
        clearInterval(pi);
        hideLoad();
        showResult({success:false,message:'Network error: pastikan server berjalan.'});
        go(4);
    }
}

// ═══════════════════════════════
//  LOADING OVERLAY
// ═══════════════════════════════
function showLoad(t,m){
    $('loadTitle').textContent=t;
    $('loadMsg').textContent=m;
    $('progFill').style.width='0%';
    $('progPct').textContent='0%';
    $('loadingOverlay').classList.add('show');
}
function setLoadText(t,m){$('loadTitle').textContent=t;$('loadMsg').textContent=m}
function setProg(p){$('progFill').style.width=p+'%';$('progPct').textContent=Math.round(p)+'%'}
function hideLoad(){$('loadingOverlay').classList.remove('show')}

// ═══════════════════════════════
//  RESULT
// ═══════════════════════════════
function showResult(d){
    const box=$('resultBox');

    if(d.success&&d.assetId){
        box.innerHTML=`
        <div class="result">
            <div class="res-ico ok"><i class="fas fa-check-circle"></i></div>
            <h2 class="res-title">Upload Berhasil! 🎉</h2>
            <p class="res-msg">${d.message||'Asset berhasil diupload ke Roblox'}</p>
            <div class="res-details">
                <div class="res-row">
                    <span class="res-label">Asset ID</span>
                    <span class="res-val">${d.assetId} <button class="btn-ico copy-btn" onclick="copyTxt('${d.assetId}','Asset ID')"><i class="fas fa-copy"></i></button></span>
                </div>
                ${d.toolboxUrl?`<div class="res-row"><span class="res-label">Library</span><span class="res-val"><a href="${d.toolboxUrl}" target="_blank">${d.toolboxUrl}</a> <button class="btn-ico copy-btn" onclick="copyTxt('${d.toolboxUrl}','URL')"><i class="fas fa-copy"></i></button></span></div>`:''}
                ${d.studioUrl?`<div class="res-row"><span class="res-label">Studio URL</span><span class="res-val"><code>${d.studioUrl}</code> <button class="btn-ico copy-btn" onclick="copyTxt('${d.studioUrl}','Studio URL')"><i class="fas fa-copy"></i></button></span></div>`:''}
            </div>
            <div class="res-actions">
                ${d.toolboxUrl?`<a href="${d.toolboxUrl}" target="_blank" class="btn btn-primary" style="text-decoration:none"><i class="fas fa-external-link-alt"></i> Buka di Roblox</a>`:''}
                <button class="btn btn-ghost" onclick="resetAll()"><i class="fas fa-redo"></i> Convert Lagi</button>
            </div>
        </div>`;
        toast('ok','Berhasil!','Asset ID: '+d.assetId);

    }else if(d.success&&!d.assetId){
        box.innerHTML=`
        <div class="result">
            <div class="res-ico wait"><i class="fas fa-clock"></i></div>
            <h2 class="res-title">Upload Dikirim ⏳</h2>
            <p class="res-msg">${d.message||'Asset sedang diproses Roblox. Cek inventory dalam beberapa menit.'}</p>
            <div class="res-actions">
                <a href="https://create.roblox.com/dashboard/creations" target="_blank" class="btn btn-primary" style="text-decoration:none"><i class="fas fa-external-link-alt"></i> Cek Dashboard</a>
                <button class="btn btn-ghost" onclick="resetAll()"><i class="fas fa-redo"></i> Convert Lagi</button>
            </div>
        </div>`;
        toast('info','Processing','Cek inventory Roblox kamu');

    }else{
        box.innerHTML=`
        <div class="result">
            <div class="res-ico err"><i class="fas fa-exclamation-triangle"></i></div>
            <h2 class="res-title">Upload Gagal</h2>
            <p class="res-msg">${d.message||'Terjadi kesalahan'}</p>
            <div class="info-box yellow" style="margin-bottom:18px;text-align:left">
                <i class="fas fa-lightbulb"></i>
                <div>
                    <b>Tips Troubleshoot</b>
                    <p>• Cek permission API key (Assets Read+Write)<br>• Pastikan IP 0.0.0.0/0 di allowed IPs<br>• Pastikan User/Group ID benar<br>• Coba file yang lebih kecil</p>
                </div>
            </div>
            <div class="res-actions">
                <button class="btn btn-ghost" onclick="go(1)"><i class="fas fa-key"></i> Cek API Key</button>
                <button class="btn btn-primary" onclick="go(3)"><i class="fas fa-redo"></i> Coba Lagi</button>
            </div>
        </div>`;
        toast('err','Gagal',d.message||'Upload error');
    }
}

// ═══════════════════════════════
//  UTILITIES
// ═══════════════════════════════
function copyTxt(txt,label){
    navigator.clipboard.writeText(txt).then(()=>{
        toast('ok','Copied!',label+' disalin ke clipboard');
    }).catch(()=>{
        const ta=document.createElement('textarea');
        ta.value=txt;document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);
        toast('ok','Copied!',label+' disalin');
    });
}

function resetAll(){
    file=null;
    $('inFile').value='';
    $('fileCard').style.display='none';
    $('dropZone').style.display='';
    $('btn2next').disabled=true;
    $('inName').value='';$('inDesc').value='';
    $('cName').textContent='0';$('cDesc').textContent='0';
    go(1);
}

// expose to onclick in HTML
window.go=go;
window.copyTxt=copyTxt;
window.resetAll=resetAll;

// ═══════════════════════════════
//  HELP MODAL
// ═══════════════════════════════
function openHelp(tab){
    $('helpModal').classList.add('show');
    switchTab(tab||'overview');
    document.body.style.overflow='hidden';
}
function closeHelp(){
    $('helpModal').classList.remove('show');
    document.body.style.overflow='';
}
function switchTab(t){
    document.querySelectorAll('.htab').forEach(b=>b.classList.toggle('active',b.dataset.t===t));
    document.querySelectorAll('.hpanel').forEach(p=>p.classList.toggle('active',p.id==='ht-'+t));
}

// ═══════════════════════════════
//  TOASTS
// ═══════════════════════════════
function toast(type,title,msg){
    const icons={ok:'fas fa-check-circle',err:'fas fa-exclamation-circle',info:'fas fa-info-circle',warn:'fas fa-exclamation-triangle'};
    const el=document.createElement('div');
    el.className='toast '+type;
    el.innerHTML=`
        <i class="${icons[type]||icons.info} toast-i"></i>
        <div class="toast-c"><div class="toast-t">${title}</div><div class="toast-m">${msg}</div></div>
        <button class="toast-x" onclick="this.parentElement.classList.add('out');setTimeout(()=>this.parentElement.remove(),250)"><i class="fas fa-times"></i></button>
    `;
    $('toasts').appendChild(el);
    setTimeout(()=>{if(el.parentElement){el.classList.add('out');setTimeout(()=>el.remove(),250)}},4500);
}

// ═══════════════════════════════
//  CONFETTI
// ═══════════════════════════════
function confetti(){
    const box=document.createElement('div');
    box.className='confetti-box';
    document.body.appendChild(box);
    const colors=['#9b59b6','#3498db','#2ecc71','#f39c12','#e74c3c','#c39bd3','#8e44ad','#1abc9c'];
    for(let i=0;i<70;i++){
        const c=document.createElement('div');
        c.className='conf';
        const sz=Math.random()*7+3;
        c.style.cssText=`left:${Math.random()*100}%;width:${sz}px;height:${sz*(Math.random()*.5+.5)}px;background:${colors[Math.floor(Math.random()*colors.length)]};animation-duration:${Math.random()*2+2}s;animation-delay:${Math.random()*.8}s;border-radius:${Math.random()>.5?'50%':'2px'}`;
        box.appendChild(c);
    }
    setTimeout(()=>box.remove(),5000);
}
