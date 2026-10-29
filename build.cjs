// 동현콥 묶기: src의 HTML·CSS·JS를 index.html 한 장으로 합친다(글꼴·아이콘 내장).
// 원본 SWF와 Ruffle 파일은 고치지 않고 그대로 옆에 둔다.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const {copyIcons}=require('./icon-files.cjs');
const root=__dirname,out=path.join(root,'dist'),src=n=>fs.readFileSync(path.join(root,'src',n),'utf8');
const SHA='ed5fbfd0ca488edc6d94c275c609d894d43d87e72922f76332333034cca7e071';
const swf=fs.readFileSync(path.join(root,'swf','helicopter-game.swf'));
const got=crypto.createHash('sha256').update(swf).digest('hex');
if(got!==SHA) throw new Error('원본 SWF가 바뀌었다: '+got);
let css=src('style.css');
for(const name of fs.readdirSync(path.join(root,'fonts')))
  css=css.replaceAll('./fonts/'+name,'data:font/woff2;base64,'+fs.readFileSync(path.join(root,'fonts',name)).toString('base64'));
const html=src('index.html')
  .replace('__SERIES_NAV__',()=>src('series.html'))
  .replace('__BRAND_ICON__',()=>src('brand-icon.txt').trim())
  .replace('<link rel="stylesheet" href="./style.css">',()=>`<style>${css}</style>`)
  .replace('<script src="./app.js"></script>',()=>['donghyun.js','examples.js','label.js','dog.js','segfont.js','wrapper.js','app.js'].map(n=>'<script>'+src(n).replaceAll('</script','<\\/script')+'</script>').join('\n'));
fs.writeFileSync(path.join(root,'index.html'),html);
fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'index.html'),html);
copyIcons(out);
for(const d of ['swf','ruffle','licenses']) fs.cpSync(path.join(root,d),path.join(out,d),{recursive:true});
console.log(JSON.stringify({bytes:Buffer.byteLength(html),swf:got.slice(0,12)}));
