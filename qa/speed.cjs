// 속력 50/100/200·오류 규약을 확인하고 화면을 남긴다.
const {chromium}=require('playwright');
const U=process.env.U||'http://localhost:8765/';
(async()=>{
  const b=await chromium.launch({args:['--autoplay-policy=user-gesture-required']});
  const p=await b.newPage({viewport:{width:1280,height:1000}});
  const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await p.addInitScript(()=>{const A=window.AudioContext;window.__ac=[];window.AudioContext=class extends A{constructor(...a){super(...a);window.__ac.push(this)}};});
  await p.goto(U);
  await p.waitForFunction(()=>/속력 \d+%/.test(document.querySelector('#status').textContent),null,{timeout:40000});
  await p.waitForTimeout(3000);
  console.log('init',await p.textContent('#status'),'|',await p.textContent('#speed-card'));
  await p.screenshot({path:'s-100.png'});
  const box=await (await p.$('#stage')).boundingBox();const cx=box.x+box.width/2,cy=box.y+box.height/2;
  await p.mouse.click(cx,cy);await p.waitForTimeout(300);
  await p.mouse.move(cx,cy);await p.mouse.down();await p.waitForTimeout(700);await p.mouse.up();
  for(let i=0;i<4;i++){await p.mouse.down();await p.waitForTimeout(250);await p.mouse.up();await p.waitForTimeout(250);}
  await p.screenshot({path:'s-100b.png'});
  console.log('audio',await p.evaluate(()=>window.__ac.map(a=>a.state)));
  const E=n=>{const e=x=>x<=10?'도'+'오'.repeat(x-1)+'옹':null;return n};
  for(const [label,code] of [['200','나는 동현이냐?\n뿡뿡 도오오오오오오오오오옹 도오오오오오오오오오옹 도오옹~뿡뿡뿡\n동현이구나'],['50','나는 동현이냐?\n뿡뿡 도오오오오오오오오오옹 도오오오오옹~뿡뿡뿡\n동현이구나'],['300','나는 동현이냐?\n뿡뿡 도오오오오오오오오오옹 도오오오오오오오오오옹 도오오옹~뿡뿡뿡\n동현이구나'],['two','나는 동현이냐?\n뿡뿡 도오옹~뿡뿡뿡\n뿡뿡 도오옹~뿡뿡뿡\n동현이구나']]){
    await p.fill('#code',code);await p.click('#run');await p.waitForTimeout(4000);
    console.log(label,'|',await p.textContent('#status'),'|',await p.textContent('#result'),'|',await p.textContent('#speed-card'));
    await p.screenshot({path:'s-'+label+'.png'});
  }
  console.log('errors',errs);await b.close();
})();
