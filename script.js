// =============================================
// RBXM → Asset ID Converter | Final Edition
// =============================================

// ========== GALAXY ==========
(function(){
    const c=document.getElementById('galaxyCanvas'),ctx=c.getContext('2d');
    let w,h,stars=[],mx=-1e3,my=-1e3;
    function resize(){w=c.width=innerWidth;h=c.height=innerHeight;initStars()}
    function initStars(){stars=[];const n=Math.min(~~((w*h)/4e3),350);for(let i=0;i<n;i++)stars.push({x:Math.random()*w,y:Math.random()*h,r:Math.random()*1.4+.3,ba:Math.random()*.6+.2,a:0,s:Math.random()*.0015+.0008,p:Math.random()*Math.PI*2,d:(Math.random()-.5)*.08})}
    function draw(t){ctx.clearRect(0,0,w,h);stars.forEach(s=>{s.a=s.ba+Math.sin(t*s.s+s.p)*.3;s.y+=s.d;if(s.y>h+5){s.y=-5;s.x=Math.random()*w}if(s.y<-5){s.y=h+5;s.x=Math.random()*w}const dx=s.x-mx,dy=s.y-my,dist=Math.sqrt(dx*dx+dy*dy),g=dist<150?(1-dist/150)*.6:0;ctx.beginPath();ctx.arc(s.x,s.y,s.r+g*2,0,Math.PI*2);ctx.fillStyle=`rgba(210,180,255,${Math.max(0,Math.min(1,s.a+g))})`;ctx.fill();if(g>.1){ctx.beginPath();ctx.arc(s.x,s.y,s.r+g*6,0,Math.PI*2);ctx.fillStyle=`rgba(168,85,247,${g*.2})`;ctx.fill()}});requestAnimationFrame(draw)}
    resize();requestAnimationFrame(draw);
    addEventListener('resize',resize);
    document.addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY});
    document.addEventListener('mouseleave',()=>{mx=-1e3;my=-1e3});
})();

// ========== STATE ==========
let step=1,file=null;

// ========== HELP ==========
function toggleHelp(){
    const card=document.getElementById('helpCard');
    const btn=document.getElementById('navHelpBtn');
    const isOpen=card.classList.contains('open');
    if(isOpen){
        card.classList.remove('open');
        btn.classList.remove('on');
    }else{
        card.classList.add('open');
        btn.classList.add('on');
        card.style.animation='none';
        void card.offsetHeight;
        card.style.animation='';
        card.scrollIntoView({behavior:'smooth',block:'nearest'});
    }
}

function htab(i,btn){
    document.querySelectorAll('.htab').forEach(t=>t.classList.remove('on'));
    document.querySelectorAll('.hpanel').forEach(p=>p.classList.remove('show'));
    btn.classList.add('on');
    const p=document.querySelector(`.hpanel[data-hp="${i}"]`);
    if(p){p.classList.add('show');p.style.animation='none';void p.offsetHeight;p.style.animation=''}
}

function faqToggle(el){
    const was=el.classList.contains('open');
    document.querySelectorAll('.faq.open').forEach(f=>f.classList.remove('open'));
    if(!was)el.classList.add('open');
}

function hcopy(txt,btn){
    navigator.clipboard.writeText(txt).then(()=>{
        const i=btn.querySelector('i');
        i.classList.replace('fa-copy','fa-check');
        btn.style.color='#34d399';
        toast('Copied!','success');
        setTimeout(()=>{i.classList.replace('fa-check','fa-copy');btn.style.color=''},1500);
    }).catch(()=>fbCopy(txt));
}

// ========== NAV ==========
function nextStep(s){
    if(s===2&&step===1){if(!val('apiKey','API Key is required')||!val('creatorId','Creator ID is required'))return}
    if(s===3&&step===2){if(!file){toast('Please select a file first','error');shake(document.getElementById('dropArea'));return}if(!val('assetName','Asset name is required'))return;doUpload();return}
    step=s;updStep(s);showP(s);
}

function val(id,msg){const el=document.getElementById(id);if(!el.value.trim()){toast(msg,'error');shake(el.closest('.input-glass,.drop-area'));el.focus();return false}return true}
function shake(el){if(!el)return;el.classList.remove('shake');void el.offsetWidth;el.classList.add('shake');setTimeout(()=>el.classList.remove('shake'),600)}

function updStep(s){
    const nodes=document.querySelectorAll('.step-node');
    document.getElementById('stepperFill').style.width=((s-1)/(nodes.length-1))*100+'%';
    nodes.forEach(n=>{const ns=+n.dataset.step;n.classList.remove('active','done');if(ns<s)n.classList.add('done');if(ns===s)n.classList.add('active')});
}

function showP(s){
    document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
    const p=document.getElementById('panel-'+s);
    if(p){p.classList.add('active');p.style.animation='none';void p.offsetHeight;p.style.animation=''}
}

// ========== FILE ==========
(function(){
    const area=document.getElementById('dropArea'),inp=document.getElementById('fileInput');
    area.addEventListener('click',()=>inp.click());
    area.addEventListener('dragover',e=>{e.preventDefault();area.classList.add('dragover')});
    area.addEventListener('dragleave',()=>area.classList.remove('dragover'));
    area.addEventListener('drop',e=>{e.preventDefault();area.classList.remove('dragover');if(e.dataTransfer.files.length)pick(e.dataTransfer.files[0])});
    inp.addEventListener('change',e=>{if(e.target.files.length)pick(e.target.files[0])});
})();

function pick(f){
    const ext=f.name.split('.').pop().toLowerCase();
    if(!['rbxm','rbxmx'].includes(ext)){toast('Only .rbxm/.rbxmx supported','error');return}
    file=f;
    document.getElementById('fpName').textContent=f.name;
    document.getElementById('fpSize').textContent=fmtSz(f.size);
    document.getElementById('filePreview').classList.add('show');
    document.getElementById('dropArea').style.display='none';
    const n=document.getElementById('assetName');if(!n.value)n.value=f.name.replace(/\.(rbxm|rbxmx)$/i,'');
    toast('File loaded: '+f.name,'success');
}

function clearFile(){
    file=null;document.getElementById('fileInput').value='';
    document.getElementById('filePreview').classList.remove('show');
    document.getElementById('dropArea').style.display='';
}

function fmtSz(b){if(b<1024)return b+' B';if(b<1048576)return(b/1024).toFixed(1)+' KB';return(b/1048576).toFixed(2)+' MB'}

// ========== UPLOAD ==========
async function doUpload(){
    step=3;updStep(3);showP(3);
    const fl=document.getElementById('progressFill'),gl=document.getElementById('progressGlow'),lb=document.getElementById('progressLabel'),pc=document.getElementById('progressPct'),ll=document.getElementById('logList'),rb=document.getElementById('retryBtn');
    fl.style.width='0%';gl.style.opacity='0';ll.innerHTML='';rb.style.display='none';
    document.getElementById('convertTitle').textContent='Converting...';
    document.getElementById('convertSub').textContent='Uploading asset to Roblox';
    const ak=g('apiKey'),ci=g('creatorId'),ct=g('creatorType'),at=g('assetType'),an=g('assetName'),ad=g('assetDesc');
    try{
        lg('Initializing...');await prg(0,10,fl,gl,pc,lb,'Preparing...');
        lg(`File: ${file.name} (${fmtSz(file.size)})`);await prg(10,20,fl,gl,pc,lb,'Reading...');
        lg('Reading binary data...');const buf=await rdFile(file);lg('File loaded ✓','ok');await prg(20,35,fl,gl,pc,lb,'File ready');
        lg('Connecting to Roblox API...');await prg(35,45,fl,gl,pc,lb,'Connecting...');
        lg(`Creator: ${ct} (${ci})`);lg(`Asset: ${an} [${at}]`);await prg(45,55,fl,gl,pc,lb,'Uploading...');
        lg('Sending to Roblox...');
        const res=await apiUp({ak,ci,ct,at,an,ad,buf,fn:file.name});
        await prg(55,75,fl,gl,pc,lb,'Processing...');lg('Upload received ✓','ok');
        let id=res.assetId,op=res.opPath;
        if(op&&!id){lg('Waiting for processing...');id=await poll(ak,op)}
        await prg(75,100,fl,gl,pc,lb,'Complete!');lg(`Asset ID: ${id}`,'ok');lg('Done! 🎉','ok');
        setTimeout(()=>showRes(id,an,at),500);
    }catch(e){
        lg('Error: '+e.message,'err');lb.textContent='Failed';
        document.getElementById('convertTitle').textContent='Upload Failed';
        document.getElementById('convertSub').textContent=e.message;
        rb.style.display='';toast('Failed: '+e.message,'error');
    }
}

function g(id){return document.getElementById(id).value.trim()}
function rdFile(f){return new Promise((r,j)=>{const rd=new FileReader();rd.onload=()=>r(rd.result);rd.onerror=()=>j(rd.error);rd.readAsArrayBuffer(f)})}

async function apiUp({ak,ci,ct,at,an,ad,buf,fn}){
    const PX=(location.hostname==='localhost'||location.hostname==='127.0.0.1')?'http://localhost:3000/api/upload':'/api/upload';
    const fd=new FormData();
    fd.append('apiKey',ak);fd.append('creatorId',ci);fd.append('creatorType',ct);
    fd.append('assetType',at);fd.append('assetName',an);fd.append('assetDescription',ad||'');
    fd.append('file',new Blob([buf]),fn);
    let r;
    try{r=await fetch(PX,{method:'POST',body:fd})}catch(e){
        const bd='----B'+Date.now(),enc=new TextEncoder(),
        rj=JSON.stringify({assetType:at,displayName:an,description:ad||an,creationContext:{creator:ct==='Group'?{groupId:ci}:{userId:ci}}}),
        parts=[enc.encode(`--${bd}\r\nContent-Disposition: form-data; name="request"\r\nContent-Type: application/json\r\n\r\n${rj}\r\n`),enc.encode(`--${bd}\r\nContent-Disposition: form-data; name="fileContent"; filename="${fn}"\r\nContent-Type: application/octet-stream\r\n\r\n`),new Uint8Array(buf),enc.encode(`\r\n--${bd}--\r\n`)];
        let t=0;parts.forEach(p=>t+=p.byteLength);const body=new Uint8Array(t);let o=0;parts.forEach(p=>{body.set(p instanceof Uint8Array?p:new Uint8Array(p),o);o+=p.byteLength});
        r=await fetch('https://apis.roblox.com/assets/v1/assets',{method:'POST',headers:{'x-api-key':ak,'Content-Type':`multipart/form-data; boundary=${bd}`},body})
    }
    if(!r.ok){let m=`HTTP ${r.status}`;try{const d=await r.json();m=d.message||d.error||JSON.stringify(d)}catch(e){try{m=await r.text()}catch(e2){}}throw new Error(m)}
    const d=await r.json();
    if(d.done&&d.response)return{assetId:d.response.assetId||d.response.path?.split('/').pop(),opPath:null};
    return{assetId:d.response?.assetId||null,opPath:d.path||null};
}

async function poll(ak,path){
    const PX=(location.hostname==='localhost'||location.hostname==='127.0.0.1')?'http://localhost:3000/api/poll':'/api/poll';
    for(let i=0;i<30;i++){
        await slp(2000);lg(`Checking... (${i+1}/30)`);
        let r;try{r=await fetch(`${PX}?path=${encodeURIComponent(path)}&apiKey=${encodeURIComponent(ak)}`)}catch(e){r=await fetch(`https://apis.roblox.com/assets/v1/${path}`,{headers:{'x-api-key':ak}})}
        if(!r.ok)continue;const d=await r.json();
        if(d.done&&d.response)return d.response.assetId||d.response.path?.split('/').pop();
    }
    throw new Error('Timed out waiting for Roblox');
}

// ========== PROGRESS ==========
async function prg(from,to,fl,gl,pc,lb,txt){
    lb.textContent=txt;const s=25;
    for(let i=0;i<=s;i++){const v=from+(to-from)*(i/s);fl.style.width=v+'%';gl.style.opacity=v>5?'1':'0';gl.style.left=`calc(${v}% - 8px)`;pc.textContent=Math.round(v)+'%';await slp(600/s)}
}

function lg(m,t=''){const l=document.getElementById('logList'),el=document.createElement('div');el.className='log-entry '+t;const ts=new Date().toLocaleTimeString('en-US',{hour12:false,hour:'2-digit',minute:'2-digit',second:'2-digit'});el.innerHTML=`<span class="ts">${ts}</span>${m}`;l.appendChild(el);l.scrollTop=l.scrollHeight}
function slp(ms){return new Promise(r=>setTimeout(r,ms))}

// ========== RESULT ==========
function showRes(id,name,type){
    step=4;updStep(4);showP(4);
    document.getElementById('resAssetId').textContent=id;
    document.getElementById('resName').textContent=name;
    document.getElementById('resType').textContent=type;
    document.getElementById('resTime').textContent=new Date().toLocaleTimeString();
    const link=`https://create.roblox.com/store/asset/${id}`;
    const a=document.getElementById('resLink');a.href=link;a.dataset.url=link;
    document.getElementById('resCode').textContent=`game:GetService("InsertService"):LoadAsset(${id})`;
    confetti();toast('Asset uploaded successfully!','success');
}

// ========== COPY ==========
function copyText(id,lbl){const t=document.getElementById(id).textContent;navigator.clipboard.writeText(t).then(()=>toast(lbl+' copied!','success')).catch(()=>{fbCopy(t);toast(lbl+' copied!','success')})}
function copyLink(){const u=document.getElementById('resLink').dataset.url||document.getElementById('resLink').href;navigator.clipboard.writeText(u).then(()=>toast('Link copied!','success')).catch(()=>{fbCopy(u);toast('Link copied!','success')})}
function fbCopy(t){const ta=document.createElement('textarea');ta.value=t;ta.style.cssText='position:fixed;opacity:0';document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta)}

// ========== MISC ==========
function toggleVis(id,btn){const inp=document.getElementById(id),ico=btn.querySelector('i');if(inp.type==='password'){inp.type='text';ico.classList.replace('fa-eye','fa-eye-slash')}else{inp.type='password';ico.classList.replace('fa-eye-slash','fa-eye')}}

function resetApp(){step=1;file=null;document.getElementById('fileInput').value='';document.getElementById('filePreview').classList.remove('show');document.getElementById('dropArea').style.display='';document.getElementById('assetName').value='';document.getElementById('assetDesc').value='';updStep(1);showP(1)}

function toast(m,type='info'){const box=document.getElementById('toasts'),el=document.createElement('div');el.className='toast '+type;const icons={success:'fa-circle-check',error:'fa-circle-xmark',info:'fa-circle-info'};el.innerHTML=`<i class="fas ${icons[type]||icons.info}"></i><span>${m}</span>`;box.appendChild(el);setTimeout(()=>{el.classList.add('out');setTimeout(()=>el.remove(),400)},3200)}

// ========== CONFETTI ==========
function confetti(){
    const c=document.getElementById('confetti'),ctx=c.getContext('2d');c.width=innerWidth;c.height=innerHeight;
    const cols=['#a855f7','#c084fc','#e9d5ff','#34d399','#6ee7b7','#fbbf24','#f472b6','#60a5fa','#fff'],ps=[];
    for(let i=0;i<180;i++)ps.push({x:c.width*.5+(Math.random()-.5)*150,y:c.height*.45,vx:(Math.random()-.5)*22,vy:Math.random()*-20-4,w:Math.random()*8+3,h:Math.random()*5+2,c:cols[~~(Math.random()*cols.length)],r:Math.random()*360,rv:(Math.random()-.5)*14,g:.28+Math.random()*.2,o:1,d:.006+Math.random()*.008});
    let f=0;
    function loop(){ctx.clearRect(0,0,c.width,c.height);let alive=false;ps.forEach(p=>{if(p.o<=0)return;alive=true;p.x+=p.vx;p.y+=p.vy;p.vy+=p.g;p.vx*=.99;p.r+=p.rv;p.o-=p.d;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.r*Math.PI/180);ctx.globalAlpha=Math.max(0,p.o);ctx.fillStyle=p.c;ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h);ctx.restore()});f++;if(alive&&f<350)requestAnimationFrame(loop);else ctx.clearRect(0,0,c.width,c.height)}
    loop();
}
