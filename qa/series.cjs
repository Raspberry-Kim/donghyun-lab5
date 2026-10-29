// 시리즈 6칸 띠를 다섯 사이트에서 데스크톱·모바일로 찍는다.
const {chromium}=require('playwright');const path=require('path');
const sites={lang:'/home/user/workspace/series/donghyun-lang/index.html',lab1:'/home/user/workspace/series/donghyun-lab1/index.html',lab2:'/home/user/workspace/series/donghyun-lab2/index.html',lab3:'/home/user/workspace/series/donghyun-lab3/index.html',jeon:'/home/user/workspace/donghyun-jeon/dist/index.html'};
(async()=>{const b=await chromium.launch();
for(const [k,f] of Object.entries(sites)){for(const [w,h,tag] of [[1280,800,'d'],[390,844,'m']]){
  const p=await b.newPage({viewport:{width:w,height:h}});await p.goto('file://'+f);await p.waitForTimeout(800);
  const el=await p.$('.series-strip');if(!el){console.log(k,'no strip');continue;}
  await el.screenshot({path:`qa/sr-${k}-${tag}.png`});
  console.log(k,tag,await p.evaluate(()=>[...document.querySelectorAll('.series-item')].map(e=>e.getBoundingClientRect().top|0).join(',')));await p.close();}}
await b.close();})();
