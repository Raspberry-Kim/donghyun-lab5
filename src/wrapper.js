/* 동현콥 바깥 SWF 만들기. 원본은 한 바이트도 고치지 않는다.
   바깥 SWF(400×300, 검정 배경)는 원본을 _level1로 불러오고, 원본이 Flash 4용 안내 프레임(4번)을 거치면
   원래 Flash 5 플레이어에서처럼 'start' 프레임(5번)으로 깨끗이 넘겨 준다. 초당 프레임 수가 곧 비행 속력이다. */
(function(g){
  const enc=s=>[...new TextEncoder().encode(s),0];
  const u16=n=>[n&255,(n>>8)&255];
  const u32=n=>[n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255];
  function tag(code,data){
    return data.length<63?[...u16((code<<6)|data.length),...data]:[...u16((code<<6)|63),...u32(data.length),...data];
  }
  const act=(op,data)=>op<0x80?[op]:[op,...u16(data.length),...data];
  function rect(x0,x1,y0,y1){
    const nb=15,bits=[];const put=(v,n)=>{for(let i=n-1;i>=0;i--)bits.push((v>>i)&1);};
    put(nb,5);[x0,x1,y0,y1].forEach(v=>put(v,nb));while(bits.length%8)bits.push(0);
    const out=[];for(let i=0;i<bits.length;i+=8)out.push(parseInt(bits.slice(i,i+8).join(''),2));return out;
  }
  function pushStr(s){return act(0x96,[0,...enc(s)]);}
  function pushInt(n){return act(0x96,[7,...u32(n)]);}
  function makeWrapper(fps,url,labelUrl){
    const f=Math.max(1,Math.min(255,fps));
    const whole=Math.floor(f),frac=Math.round((f-whole)*256)&255;
    // 1번 프레임: 원본을 _level1로 불러오고, 정리 여부 done을 0으로 둔다.
    const a1=[...act(0x83,[...enc(url),...enc('_level1')]),...pushStr('done'),...pushInt(0),0x1D,0];
    // 2·3번 프레임(매 프레임): 원본을 다 받은 뒤
    //   if(_level1._currentframe==4 || (!done && _level1._currentframe>4)){ done=1; tellTarget("_level1"){ gotoAndStop(3); gotoAndPlay(5) } }
    // Ruffle에서는 원본 3번 프레임의 _root.gotoAndPlay(5)가 4번 프레임을 그린 뒤에 실행되어, 안내 화면이 'start' 화면 위에 남는 일이 있다.
    // 3번으로 한 번 되감았다가 5번으로 넘기면 Flash 5에서처럼 4번 프레임을 건너뛴 화면이 된다.
    const prop=(i)=>[...pushStr('_level1'),...pushInt(i),0x22];
    const cond=[...prop(12),...prop(5),0x49,
      ...prop(4),...pushInt(4),0x49,
      ...pushStr('done'),0x1C,0x12,...prop(4),...pushInt(4),0x67,0x10,
      0x11,0x10];
    const body=[...pushStr('done'),...pushInt(1),0x1D,
      ...act(0x8B,enc('_level1')),...act(0x81,u16(2)),0x07,...act(0x81,u16(4)),0x06,...act(0x8B,enc(''))];
    const check=[...cond,0x12,...act(0x9D,u16(body.length)),...body];
    // 상단 띠: 원본이 게임 프레임(5번)에 들어오면
    //   if(_level1._currentframe==5 && typeof(_level1.copLabel)!="movieclip"){ _level1.createEmptyMovieClip("copLabel",54); loadMovie(labelUrl,"_level1.copLabel") }
    // 54번 층은 원본 저작권 단추(53번) 바로 위, 동굴 벽(100번부터) 아래라서 시작·추락 화면에서만 보이고 비행 중에는 벽이 덮는다.
    let label=[];
    if(labelUrl){
      const make=[...pushInt(54),...pushStr('copLabel'),...pushInt(2),...pushStr('_level1'),0x1C,...pushStr('createEmptyMovieClip'),0x52,0x17,
        ...pushStr(labelUrl),...pushStr('_level1.copLabel'),...act(0x9A,[0x40])];
      const has=[...pushStr('_level1'),0x1C,...pushStr('copLabel'),0x4E,0x44,...pushStr('movieclip'),0x49,...act(0x9D,u16(make.length)),...make];
      label=[...prop(4),...pushInt(5),0x49,0x12,...act(0x9D,u16(has.length)),...has];
    }
    const a2=[...check,...label,0];
    // 3번 프레임: 한 번 더 살피고 2번으로 돌아간다.
    const a3=[...check,...label,...act(0x81,u16(1)),0x06,0];
    const swfBody=[...rect(0,8000,0,6000),frac,whole,...u16(3),
      ...tag(9,[0,0,0]),
      ...tag(12,a1),...tag(1,[]),
      ...tag(12,a2),...tag(1,[]),
      ...tag(12,a3),...tag(1,[]),
      ...tag(0,[])];
    const head=[0x46,0x57,0x53,6,...u32(8+swfBody.length)];
    return new Uint8Array([...head,...swfBody]);
  }
  g.makeWrapper=makeWrapper;
  if(typeof module!=='undefined')module.exports={makeWrapper};
})(typeof window!=='undefined'?window:globalThis);
