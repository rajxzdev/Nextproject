document.addEventListener('DOMContentLoaded', function() {
    initBG();
    initApp();
    fetch('/api/ping').then(function(r){return r.json()}).then(function(d){console.log('OK',d)}).catch(function(e){console.log('ping fail',e)});
});

function initBG(){
    var c=document.getElementById('bgCanvas');if(!c)return;
    var ctx=c.getContext('2d'),w,h,stars=[];
    function resize(){w=c.width=window.innerWidth;h=c.height=window.innerHeight}
    resize();window.addEventListener('resize',resize);
    for(var i=0;i<150;i++)stars.push({x:Math.random()*2000,y:Math.random()*2000,r:Math.random()*1.5+.3,a:Math.random(),s:Math.random()*.003+.001,d:Math.random()>.5?1:-1});
    function draw(){
        ctx.clearRect(0,0,w,h);
        var g=ctx.createRadialGradient(w*.3,h*.4,0,w*.5,h*.5,w*.7);
        g.addColorStop(0,'#120625');g.addColorStop(.5,'#0a0418');g.addColorStop(1,'#06060f');
        ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
        for(var i=0;i<stars.length;i++){var s=stars[i];s.a+=s.s*s.d;if(s.a>=1||s.a<=.1)s.d*=-1;ctx.beginPath();ctx.arc(s.x%w,s.y%h,s.r,0,Math.PI*2);ctx.fillStyle='rgba(255,255,255,'+s.a+')';ctx.fill()}
        requestAnimationFrame(draw);
    }
    draw();
}

var step=1,apiKey='',selFile=null;
function $(id){return document.getElementById(id)}

function initApp(){
    $('btnValidate').addEventListener('click',valKey);
    $('inKey').addEventListener('keydown',function(e){if(e.key==='Enter')valKey()});
    $('btnEye').addEventListener('click',function(){var i=$('inKey'),c=$('btnEye').querySelector('i');if(i.type==='password'){i.type='text';c.className='fas fa-eye-slash'}else{i.type='password';c.className='fas fa-eye'}});
    $('btnHowKey').addEventListener('click',function(){openHelp('apikey')});
    setupDrop();
    $('btnRemove').addEventListener('click',rmFile);
    $('btn2next').addEventListener('click',function(){go(3)});
    $('btn2back').addEventListener('click',function(){go(1)});
    $('inName').addEventListener('input',function(){$('cName').textContent=this.value.length});
    $('inDesc').addEventListener('input',function(){$('cDesc').textContent=this.value.length});
    $('inCreatorType').addEventListener('change',function(){var g=this.value==='Group';$('lblCid').textContent=g?'Group ID':'User ID';$('inCid').placeholder=g?'Masukkan Group ID...':'Masukkan User ID...'});
    $('btnUpload').addEventListener('click',upload);
    $('btn3back').addEventListener('click',function(){go(2)});
    $('btnHelp').addEventListener('click',function(){openHelp('overview')});
    $('btnCloseHelp').addEventListener('click',closeHelp);
    $('helpModal').addEventListener('click',function(e){if(e.target===$('helpModal'))closeHelp()});
    var tabs=document.querySelectorAll('.htab');for(var i=0;i<tabs.length;i++)tabs[i].addEventListener('click',function(){swTab(this.getAttribute('data-t'))});
    var faqs=document.querySelectorAll('.faq-q');for(var i=0;i<faqs.length;i++)faqs[i].addEventListener('click',function(){this.parentElement.classList.toggle('open')});
    document.addEventListener('keydown',function(e){if(e.key==='Escape')closeHelp()});
}

function go(s){
    var p=document.querySelectorAll('.panel');for(var i=0;i<p.length;i++)p[i].classList.remove('active');
    var t=$('p'+s);if(t)t.classList.add('active');
    var st=document.querySelectorAll('.stp');for(var i=0;i<st.length;i++){var n=i+1;st[i].classList.remove('active','done');if(n<s)st[i].classList.add('done');else if(n===s)st[i].classList.add('active')}
    for(var i=1;i<=3;i++){var l=$('line'+i);if(l){if(i<s)l.classList.add('filled');else l.classList.remove('filled')}}
    step=s;
}
window.go=go;

function valKey(){
    var key=$('inKey').value.trim(),st=$('keyStatus'),btn=$('btnValidate');
    if(!key){setSt(st,'err','<i class="fas fa-exclamation-circle"></i> Masukkan API key');msg('err','Error','Key kosong');return}
    setSt(st,'load','<i class="fas fa-spinner fa-spin"></i> Checking...');
    btn.disabled=true;btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> Wait...';
    fetch('/api/validate-key',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({apiKey:key})})
    .then(function(r){return r.json()})
    .then(function(d){
        if(d.valid){apiKey=key;setSt(st,'ok','<i class="fas fa-check-circle"></i> '+d.message);msg('ok','Valid!',d.message);setTimeout(function(){go(2)},600)}
        else{setSt(st,'err','<i class="fas fa-times-circle"></i> '+d.message);msg('err','Invalid',d.message)}
    })
    .catch(function(){apiKey=key;setSt(st,'ok','<i class="fas fa-check-circle"></i> Key diterima');setTimeout(function(){go(2)},600)})
    .finally(function(){btn.disabled=false;btn.innerHTML='<i class="fas fa-arrow-right"></i> Lanjut'});
}

function setSt(el,t,h){el.className='status-msg '+t+' show';el.innerHTML=h}

function setupDrop(){
    var z=$('dropZone'),inp=$('inFile');
    z.addEventListener('click',function(){inp.click()});
    z.addEventListener('dragover',function(e){e.preventDefault();z.classList.add('over')});
    z.addEventListener('dragleave',function(e){e.preventDefault();z.classList.remove('over')});
    z.addEventListener('drop',function(e){e.preventDefault();z.classList.remove('over');if(e.dataTransfer.files.length)pick(e.dataTransfer.files[0])});
    inp.addEventListener('change',function(){if(this.files.length)pick(this.files[0])});
}

function pick(f){
    var n=f.name.toLowerCase();
    if(!n.endsWith('.rbxm')&&!n.endsWith('.rbxmx')){msg('err','Error','Hanya .rbxm/.rbxmx');return}
    if(f.size>50*1024*1024){msg('err','Error','Max 50MB');return}
    selFile=f;$('fName').textContent=f.name;$('fSize').textContent=fmtSz(f.size);
    $('fileCard').style.display='flex';$('dropZone').style.display='none';$('btn2next').disabled=false;
    if(!$('inName').value){var b=f.name.replace(/\.(rbxm|rbxmx)$/i,'');$('inName').value=b.substring(0,50);$('cName').textContent=$('inName').value.length}
    msg('ok','OK',f.name);
}

function rmFile(){selFile=null;$('inFile').value='';$('fileCard').style.display='none';$('dropZone').style.display='';$('btn2next').disabled=true}
function fmtSz(b){if(b<1024)return b+' B';if(b<1048576)return(b/1024).toFixed(1)+' KB';return(b/1048576).toFixed(2)+' MB'}

function upload(){
    var name=$('inName').value.trim(),desc=$('inDesc').value.trim(),ct=$('inCreatorType').value,cid=$('inCid').value.trim();
    if(!name){msg('err','Error','Nama asset');return}
    if(!cid){msg('err','Error',ct+' ID');return}
    if(!/^\d+$/.test(cid)){msg('err','Error','ID harus angka');return}
    if(!selFile){msg('err','Error','Pilih file');go(2);return}

    showL('Uploading...','Mengirim ke Roblox');
    var fd=new FormData();
    fd.append('rbxmFile',selFile);fd.append('apiKey',apiKey);fd.append('assetName',name);
    fd.append('assetDescription',desc);fd.append('creatorType',ct);fd.append('creatorId',cid);

    var prog=0,pt=setInterval(function(){if(prog<80){prog+=Math.random()*6+1;if(prog>80)prog=80;setP(prog)}},600);

    var xhr=new XMLHttpRequest();
    xhr.open('POST','/api/upload');
    xhr.timeout=120000;
    xhr.onload=function(){
        clearInterval(pt);setP(95);
        var d;try{d=JSON.parse(xhr.responseText)}catch(e){d={success:false,message:'Response error'}}
        setTimeout(function(){setP(100);setTimeout(function(){hideL();showRes(d);go(4);if(d.success&&d.assetId)confetti()},300)},400);
    };
    xhr.onerror=function(){clearInterval(pt);hideL();showRes({success:false,message:'Network error. Cek koneksi.'});go(4)};
    xhr.ontimeout=function(){clearInterval(pt);hideL();showRes({success:false,message:'Timeout'});go(4)};
    xhr.send(fd);
}

function showL(t,m){$('loadTitle').textContent=t;$('loadMsg').textContent=m;$('progFill').style.width='0%';$('progPct').textContent='0%';$('loadingOverlay').classList.add('show')}
function setP(p){$('progFill').style.width=p+'%';$('progPct').textContent=Math.round(p)+'%'}
function hideL(){$('loadingOverlay').classList.remove('show')}

function showRes(d){
    var b=$('resultBox');
    if(d.success&&d.assetId){
        b.innerHTML='<div class="result"><div class="res-ico ok"><i class="fas fa-check-circle"></i></div><h2 class="res-title">Berhasil! 🎉</h2><p class="res-msg">'+(d.message||'')+'</p><div class="res-details"><div class="res-row"><span class="res-label">Asset ID</span><span class="res-val">'+d.assetId+' <button class="btn-ico copy-btn" onclick="cp(\''+d.assetId+'\',\'Asset ID\')"><i class="fas fa-copy"></i></button></span></div>'+(d.toolboxUrl?'<div class="res-row"><span class="res-label">Library</span><span class="res-val"><a href="'+d.toolboxUrl+'" target="_blank">'+d.toolboxUrl+'</a> <button class="btn-ico copy-btn" onclick="cp(\''+d.toolboxUrl+'\',\'URL\')"><i class="fas fa-copy"></i></button></span></div>':'')+(d.studioUrl?'<div class="res-row"><span class="res-label">Studio</span><span class="res-val"><code>'+d.studioUrl+'</code> <button class="btn-ico copy-btn" onclick="cp(\''+d.studioUrl+'\',\'Studio URL\')"><i class="fas fa-copy"></i></button></span></div>':'')+'</div><div class="res-actions">'+(d.toolboxUrl?'<a href="'+d.toolboxUrl+'" target="_blank" class="btn btn-primary" style="text-decoration:none"><i class="fas fa-external-link-alt"></i> Buka</a>':'')+'<button class="btn btn-ghost" onclick="rst()"><i class="fas fa-redo"></i> Lagi</button></div></div>';
        msg('ok','Berhasil!','ID: '+d.assetId);
    }else if(d.success){
        b.innerHTML='<div class="result"><div class="res-ico wait"><i class="fas fa-clock"></i></div><h2 class="res-title">Terkirim ⏳</h2><p class="res-msg">'+(d.message||'')+'</p><div class="res-actions"><a href="https://create.roblox.com/dashboard/creations" target="_blank" class="btn btn-primary" style="text-decoration:none"><i class="fas fa-external-link-alt"></i> Dashboard</a><button class="btn btn-ghost" onclick="rst()"><i class="fas fa-redo"></i> Lagi</button></div></div>';
    }else{
        b.innerHTML='<div class="result"><div class="res-ico err"><i class="fas fa-exclamation-triangle"></i></div><h2 class="res-title">Gagal</h2><p class="res-msg">'+(d.message||'Error')+'</p><div class="info-box yellow" style="margin-bottom:18px;text-align:left"><i class="fas fa-lightbulb"></i><div><b>Tips:</b><p>• API key Assets Read+Write<br>• IP 0.0.0.0/0<br>• ID benar</p></div></div><div class="res-actions"><button class="btn btn-ghost" onclick="go(1)"><i class="fas fa-key"></i> Key</button><button class="btn btn-primary" onclick="go(3)"><i class="fas fa-redo"></i> Coba Lagi</button></div></div>';
        msg('err','Gagal',d.message||'');
    }
}

function cp(t,l){if(navigator.clipboard)navigator.clipboard.writeText(t).then(function(){msg('ok','Copied!',l)});else{var a=document.createElement('textarea');a.value=t;document.body.appendChild(a);a.select();document.execCommand('copy');document.body.removeChild(a);msg('ok','Copied!',l)}}
window.cp=cp;

function rst(){selFile=null;try{$('inFile').value=''}catch(e){}$('fileCard').style.display='none';$('dropZone').style.display='';$('btn2next').disabled=true;$('inName').value='';$('inDesc').value='';$('cName').textContent='0';$('cDesc').textContent='0';go(1)}
window.rst=rst;

function openHelp(t){$('helpModal').classList.add('show');swTab(t||'overview');document.body.style.overflow='hidden'}
function closeHelp(){$('helpModal').classList.remove('show');document.body.style.overflow=''}
function swTab(t){var tabs=document.querySelectorAll('.htab');for(var i=0;i<tabs.length;i++)tabs[i].classList.toggle('active',tabs[i].getAttribute('data-t')===t);var p=document.querySelectorAll('.hpanel');for(var i=0;i<p.length;i++)p[i].classList.toggle('active',p[i].id==='ht-'+t)}

function msg(type,title,text){
    var ic={ok:'fas fa-check-circle',err:'fas fa-exclamation-circle',info:'fas fa-info-circle'};
    var el=document.createElement('div');el.className='toast '+type;
    el.innerHTML='<i class="'+(ic[type]||ic.info)+' toast-i"></i><div class="toast-c"><div class="toast-t">'+title+'</div><div class="toast-m">'+text+'</div></div><button class="toast-x" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>';
    $('toasts').appendChild(el);setTimeout(function(){try{el.remove()}catch(e){}},4000);
}

function confetti(){
    var b=document.createElement('div');b.className='confetti-box';document.body.appendChild(b);
    var c=['#9b59b6','#3498db','#2ecc71','#f39c12','#e74c3c'];
    for(var i=0;i<60;i++){var e=document.createElement('div');e.className='conf';var s=Math.random()*6+3;e.style.cssText='left:'+Math.random()*100+'%;width:'+s+'px;height:'+s*(Math.random()*.5+.5)+'px;background:'+c[Math.floor(Math.random()*c.length)]+';animation-duration:'+(Math.random()*2+2)+'s;animation-delay:'+Math.random()*.8+'s';b.appendChild(e)}
    setTimeout(function(){try{b.remove()}catch(e){}},5000);
}
