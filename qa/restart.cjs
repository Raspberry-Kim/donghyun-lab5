// 추락 뒤 다시 누르면 새 비행이 시작되는지, 모바일 터치로도 되는지 본다.
const {chromium,devices}=require('playwright');
(async()=>{
  const b=await chromium.launch();
  const p=await b.newPage({viewport:{width:1280,height:1000}});
  await p.goto('http://localhost:8765/');await p.waitForTimeout(6000);
  const st=await p.$('#stage');const bx=await st.boundingBox();const cx=bx.x+bx.width/2,cy=bx.y+bx.height/2;
  for(let round=0;round<3;round++){
    await p.mouse.move(cx,cy);await p.mouse.click(cx,cy);await p.waitForTimeout(6000); // 놓아두면 떨어진다
    await st.screenshot({path:'r-'+round+'.png'});
  }
  await b.close();
  const b2=await chromium.launch();
  const ctx=await b2.newContext({...devices['iPhone 13']});const m=await ctx.newPage();
  await m.goto('http://localhost:8765/');await m.waitForTimeout(7000);
  await m.screenshot({path:'m-0.png',fullPage:false});
  const s2=await m.$('#stage');await s2.scrollIntoViewIfNeeded();const b3=await s2.boundingBox();
  const cdp=await ctx.newCDPSession(m);
  const tp={x:b3.x+b3.width/2,y:b3.y+b3.height/2};
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[tp]});await m.waitForTimeout(150);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await m.waitForTimeout(300);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[tp]});await m.waitForTimeout(800);
  await m.screenshot({path:'m-1.png'});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await m.waitForTimeout(600);
  console.log('scrollY',await m.evaluate(()=>scrollY));
  await m.screenshot({path:'m-2.png',fullPage:true});
  await b2.close();
})();
