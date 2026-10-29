// 새 브라우저로 여러 번 열어 첫 화면이 'CLICK TO START'에 닿는지 본다(색 표본: 위쪽 초록 띠).
const {chromium}=require('playwright');
(async()=>{
  const N=+process.env.N||5,res=[];
  for(let i=0;i<N;i++){
    const b=await chromium.launch({args:['--autoplay-policy=user-gesture-required']});
    const p=await b.newPage({viewport:{width:1280,height:1000}});
    await p.goto(process.env.U||'http://localhost:8765/');await p.waitForTimeout(7000);
    const el=await p.$('#stage');const buf=await el.screenshot({path:'cold-'+i+'.png'});
    const g=await p.evaluate(async b64=>{const im=new Image();im.src='data:image/png;base64,'+b64;await im.decode();const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const x=c.getContext('2d');x.drawImage(im,0,0);const d=x.getImageData(im.width/2,8,1,1).data;return [...d].slice(0,3)},buf.toString('base64'));
    res.push(g[1]>200&&g[0]<150?'OK':'STUCK '+g);await b.close();
  }
  console.log(res.join(' | '));
})();
