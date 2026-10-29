const {chromium}=require('playwright');
(async()=>{
  const b=await chromium.launch();
  const p=await b.newPage({viewport:{width:1280,height:1000}});
  await p.goto('http://localhost:8765/');await p.waitForTimeout(6000);
  const st=await p.$('#stage');const bx=await st.boundingBox();const cx=bx.x+bx.width/2,cy=bx.y+bx.height/2;
  await p.mouse.move(cx,cy);
  const shots=[];let k=0;
  const snap=async()=>{await st.screenshot({path:`q-${k++}.png`});};
  await p.mouse.down();await p.waitForTimeout(400);await p.mouse.up();await snap();
  for(let i=0;i<5;i++){await p.waitForTimeout(1000);await snap();}
  await p.mouse.down();await p.waitForTimeout(400);await p.mouse.up();await snap();
  for(let i=0;i<4;i++){await p.waitForTimeout(1000);await snap();}
  await b.close();
})();
