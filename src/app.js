/* 동현콥: 동현랭으로 속력을 정하고, 원본 SWF를 고치지 않은 채 바깥 SWF로 띄운다. */
(function(){
const $=s=>document.querySelector(s);
const SWF='swf/helicopter-game.swf';
const SHA256='ed5fbfd0ca488edc6d94c275c609d894d43d87e72922f76332333034cca7e071';
const SIZE=44807, BASE_FPS=30, MIN=50, MAX=200, DEFAULT=100;

/* ---------- 화면 전환과 탭 ---------- */
$('#theme').onclick=()=>{const dark=document.documentElement.dataset.theme!=='dark';document.documentElement.dataset.theme=dark?'dark':'light';$('#theme').setAttribute('aria-pressed',String(dark));};
function showTab(name){
  document.querySelectorAll('.tabs button').forEach(b=>{const on=b.dataset.tab===name;b.classList.toggle('active',on);on?b.setAttribute('aria-current','page'):b.removeAttribute('aria-current');});
  document.querySelectorAll('.tab-panel').forEach(p=>p.hidden=p.id!=='tab-'+name);
}
document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>showTab(b.dataset.tab));
$('.brand').onclick=e=>{e.preventDefault();showTab('play');scrollTo({top:0,behavior:'smooth'});};

/* ---------- 동현랭 편집기(동현랭 시리즈와 같은 모양) ---------- */
for(const ex of examples){const o=document.createElement('option');o.value=ex.id;o.textContent=ex.title;$('#example').append(o);}
const DH_TOKEN=/(ㅋㅋ.*$)|(나는 동현이냐\?|동현이구나)|(오겡끼데스까)|(신중동역|신중동|뭉치)|(뿡뿡뿡|뿡뿡|포동이)|(꽥꽥)|(동+현아)|(동+현)|(도오*옹)|(ㅠ+)|(뚱띠|또치)/g;
const DH_CLS=[null,'t-cmt','t-frame','t-halt','t-ctl','t-out','t-in','t-assign','t-var','t-num','t-minus','t-op'];
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
function dhLine(line){let html='',last=0;line.replace(DH_TOKEN,(m,...gr)=>{const idx=gr[gr.length-2];html+=esc(line.slice(last,idx));const k=gr.slice(0,11).findIndex(x=>x!==undefined)+1;html+=`<span class="${DH_CLS[k]}">${esc(m)}</span>`;last=idx+m.length;return m;});return html+esc(line.slice(last));}
const code=$('#code'), area=document.createElement('div'), hl=document.createElement('div');
area.className='code-area'; hl.id='hl'; hl.setAttribute('aria-hidden','true'); code.parentNode.insertBefore(area,code); area.append(hl,code);
function hlSync(){hl.scrollTop=code.scrollTop;hl.scrollLeft=code.scrollLeft;}
function hlMetrics(){const cs=getComputedStyle(code);for(const p of ['paddingTop','paddingRight','paddingBottom','paddingLeft','fontFamily','fontSize','lineHeight','tabSize','letterSpacing'])hl.style[p]=cs[p];}
function highlight(){hlMetrics();hl.innerHTML=code.value.split('\n').map(l=>`<span class="ln">${dhLine(l)||' '}</span>`).join('')+'<span class="ln"> </span>';hlSync();}
code.addEventListener('scroll',()=>{hlSync();$('#lines').scrollTop=code.scrollTop;});addEventListener('resize',highlight);
function codeChanged(){const n=code.value.split('\n').length;$('#line-count').textContent=n+'줄';$('#lines').textContent=Array.from({length:n},(_,i)=>i+1).join('\n');highlight();}
code.addEventListener('compositionend',codeChanged);
code.oninput=codeChanged;
code.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key==='Enter'){e.preventDefault();takeoff();}});
function selectExample(){const ex=examples.find(e=>e.id===$('#example').value);code.value=ex.code;$('#example-note').textContent=ex.note;codeChanged();}
$('#example').onchange=selectExample; selectExample();
$('#save').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([code.value+'\n'],{type:'text/plain;charset=utf-8'}));a.download='speed.dh';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);};
$('#open').onchange=async e=>{const f=e.target.files[0];if(!f)return;code.value=(await f.text()).replace(/\r/g,'').replace(/\n$/,'');codeChanged();e.target.value='';};
$('#run').onclick=()=>takeoff();

/* ---------- 속력 규약 ---------- */
function parseSpeed(out){
  const tok=out.split(/\s+/).filter(Boolean).map(Number);
  if(!tok.length) return {v:DEFAULT,note:'출력이 없어 원본 속력 100으로 난다.'};
  if(tok.length>1) return {err:`정수를 ${tok.length}개 출력했다. 속력 하나만 출력하자.`};
  const v=tok[0];
  if(!Number.isInteger(v)||v<MIN||v>MAX) return {err:`속력 ${v}은 쓸 수 없다. ${MIN}부터 ${MAX}까지만 된다.`};
  return {v};
}
const fpsOf=v=>BASE_FPS*v/100;
function speedCard(v){
  const f=fpsOf(v), x=v/100;
  $('#speed-card').innerHTML=[['속력',v+'%'],['초당 프레임',(Number.isInteger(f)?f:f.toFixed(1))],['원본 대비',v===100?'원본 그대로':(+x.toFixed(2))+'배']].map(([a,b])=>`<div><span>${a}</span><strong>${b}</strong></div>`).join('');
  $('#stamp-speed').innerHTML=`${v} <span>% 속력</span>`;
}
const result=(t,kind)=>{const r=$('#result');r.textContent=t;r.dataset.kind=kind||'';};
const status=(t,kind)=>{const s=$('#status');s.textContent=t;s.dataset.kind=kind||'';};

/* ---------- 원본 확인과 실행 ---------- */
const hex=buf=>[...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('');
let verified=null, player=null, speed=DEFAULT, swfUrl=null, labelUrl=null, segFontUrl=null, dogUrl=null;
async function verify(){
  if(verified!==null) return verified;
  try{
    const res=await fetch(SWF,{cache:'no-cache'}); if(!res.ok) throw new Error('HTTP '+res.status);
    const data=await res.arrayBuffer();
    let ok=data.byteLength===SIZE, digest='';
    if(crypto.subtle){ digest=hex(await crypto.subtle.digest('SHA-256',data)); ok=ok&&digest===SHA256; }
    $('#hash').textContent=digest?(ok?'원본과 같음 · SHA-256 '+digest.slice(0,12)+'…':'원본과 다름'):'크기 '+data.byteLength.toLocaleString()+'바이트';
    $('#hash').classList.toggle('ok',ok);
    if(ok) swfUrl=URL.createObjectURL(new Blob([data],{type:'application/x-shockwave-flash'})); // 확인한 바로 그 바이트를 띄운다
    verified=ok;
  }catch(e){ verified=false; $('#hash').textContent='원본을 받지 못했다'; }
  return verified;
}
async function launch(v){
  const stage=$('#stage');
  if(!await verify()){ status('원본 확인 실패','error'); stage.innerHTML='<p class="stage-msg">받은 파일이 원본과 같은지 확인하지 못했다. 게임을 띄우지 않았다.</p>'; return; }
  if(player){ try{player.remove();}catch(e){} player=null; }
  stage.innerHTML='';
  window.RufflePlayer=window.RufflePlayer||{};
  window.RufflePlayer.config=Object.assign({},window.RufflePlayer.config,{publicPath:'./ruffle/',polyfills:false});
  player=window.RufflePlayer.newest().createPlayer();
  player.id='player';
  stage.appendChild(player);
  if(!labelUrl) labelUrl=URL.createObjectURL(new Blob([Uint8Array.from(atob(COP_LABEL_SWF),c=>c.charCodeAt(0))],{type:'application/x-shockwave-flash'}));
  // DISTANCE·BEST 숫자 칸은 SWF 안에 글꼴 모양이 없는 기기 글꼴 칸이다. 같은 세그먼트 숫자 글꼴을 기본 글꼴로 넘긴다.
  if(!segFontUrl&&window.DONGHYUN_SEGFONT_B64) segFontUrl=URL.createObjectURL(new Blob([Uint8Array.from(atob(window.DONGHYUN_SEGFONT_B64),c=>c.charCodeAt(0))],{type:'font/ttf'}));
  const segName=window.DONGHYUN_SEGFONT_NAME;
  const fontCfg=segFontUrl?{fontSources:[segFontUrl],defaultFonts:{sans:[segName],serif:[segName],typewriter:[segName]}}:{};
  if(!dogUrl&&typeof COP_DOG_SWF!=='undefined') dogUrl=URL.createObjectURL(new Blob([Uint8Array.from(atob(COP_DOG_SWF),c=>c.charCodeAt(0))],{type:'application/x-shockwave-flash'}));
  const wrapper=makeWrapper(fpsOf(v),swfUrl,labelUrl,dogUrl);
  await player.ruffle().load({
    data:wrapper, swfFileName:'donghyuncop.swf', base:new URL('./',location.href).href,
    autoplay:'on', unmuteOverlay:'hidden', splashScreen:false, contextMenu:'off', letterbox:'on',
    allowFullscreen:false, openUrlMode:'deny', allowNetworking:'all', warnOnUnsupportedContent:false,
    showSwfDownload:false, quality:'high', publicPath:'./ruffle/', ...fontCfg
  });
  speed=v; status(`속력 ${v}% · 누르면 시작`);
}
function takeoff(){
  let out;
  try{ out=Donghyun.run(code.value,{maxSteps:300000}).output; }
  catch(e){ result(`동현랭 오류${e.line?` (${e.line}줄)`:''}: ${e.message}`,'error'); status('동현랭 오류','error'); return; }
  const p=parseSpeed(out);
  if(p.err){ result('속력 규약 오류: '+p.err,'error'); status('속력 규약 오류','error'); return; }
  speedCard(p.v);
  result((p.note?p.note+' ':'')+`속력 ${p.v}%(초당 ${+fpsOf(p.v).toFixed(1)}프레임)로 이륙한다. 게임 화면을 누르면 시작된다.`);
  launch(p.v);
}

/* 터치: 게임 화면 위에서는 스크롤·확대·길게 누르기 메뉴를 막는다. 누르기 신호는 Ruffle이 그대로 받는다. */
const stage=$('#stage');
['touchstart','touchmove','touchend'].forEach(t=>stage.addEventListener(t,e=>{if(e.cancelable)e.preventDefault();},{passive:false}));
stage.addEventListener('contextmenu',e=>e.preventDefault());

takeoff();
})();
