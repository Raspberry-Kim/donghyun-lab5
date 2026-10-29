// 데스크톱: 원본 확인 → Ruffle 실행 → 누르고 있기 → 떼기, 소리 상태와 화면을 기록
const {chromium}=require('playwright');
const U=process.env.U||'http://localhost:8765/';
(async()=>{
  const b=await chromium.launch({args:['--autoplay-policy=user-gesture-required']});
  const p=await b.newPage({viewport:{width:1280,height:1000}});
  const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await p.addInitScript(()=>{const A=window.AudioContext;window.__ac=[];window.AudioContext=class extends A{constructor(...a){super(...a);window.__ac.push(this)}};});
  await p.goto(U);await p.waitForFunction(()=>document.querySelector('#status').textContent.includes('Ruffle')||document.querySelector('#status').textContent.includes('다')||document.querySelector('#status').textContent.includes('누르면'),null,{timeout:30000});
  await p.waitForTimeout(2500);
  console.log('status',await p.textContent('#status'),'|',await p.textContent('#hash'));
  await p.screenshot({path:'d-0.png'});
  const box=await (await p.$('#stage')).boundingBox();
  const cx=box.x+box.width/2,cy=box.y+box.height/2;
  await p.mouse.move(cx,cy);await p.mouse.down();await p.waitForTimeout(600);
  await p.screenshot({path:'d-1.png'});
  await p.mouse.up();await p.waitForTimeout(500);
  for(let i=0;i<6;i++){await p.mouse.down();await p.waitForTimeout(250);await p.mouse.up();await p.waitForTimeout(250);}
  await p.screenshot({path:'d-2.png'});
  await p.waitForTimeout(4000);await p.screenshot({path:'d-3.png'});
  console.log('audio',await p.evaluate(()=>window.__ac.map(a=>a.state)));
  console.log('errors',errs);
  await b.close();
})();
