const {chromium}=require('playwright');
(async()=>{
  const b=await chromium.launch();
  const p=await b.newPage({viewport:{width:1280,height:900}});
  await p.goto('http://localhost:8765/');await p.waitForTimeout(5000);
  await p.screenshot({path:'t-play.png',fullPage:true});
  for(const t of ['protocol','controls','about']){await p.click(`.tabs button[data-tab="${t}"]`);await p.waitForTimeout(300);await p.screenshot({path:`t-${t}.png`,fullPage:true});}
  await b.close();
})();
