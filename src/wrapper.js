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
  function makeWrapper(fps,url,labelUrl,dogUrl){
    const f=Math.max(1,Math.min(255,fps));
    const whole=Math.floor(f),frac=Math.round((f-whole)*256)&255;
    // 1번 프레임: 원본을 _level1로 불러오고, 정리 여부 done을 0으로 둔다.
    // 포동이를 쓰면 1번 프레임에서 MovieClip.prototype.swapDepths를 한 번 감싼다. 원본 헬리콥터는 생길 때 onLoad에서
    // this.swapDepths(500)를 부르므로, 이름이 helicopter이면 그 자리에서 _alpha=0으로 감춘다(다시 시작한 첫 프레임에도 안 보인다).
    //   if(typeof(MovieClip.prototype.copSwap)=="undefined"){ MovieClip.prototype.copSwap=MovieClip.prototype.swapDepths;
    //     MovieClip.prototype.swapDepths=function(d){ if(this._name=="helicopter") this._alpha=0; this.copSwap(d); } }
    let hook=[];
    if(dogUrl){
      const proto=[...pushStr('MovieClip'),0x1C,...pushStr('prototype'),0x4E];
      const hide=[...pushStr('this'),0x1C,...pushStr('_alpha'),...pushInt(0),0x4F];
      const fbody=[...pushStr('this'),0x1C,...pushStr('_name'),0x4E,...pushStr('helicopter'),0x49,0x12,...act(0x9D,u16(hide.length)),...hide,
        ...pushStr('d'),0x1C,...pushInt(1),...pushStr('this'),0x1C,...pushStr('copSwap'),0x52,0x17];
      const fn=act(0x9B,[0,...u16(1),...enc('d'),...u16(fbody.length)]);
      const inst=[...proto,...pushStr('copSwap'),...proto,...pushStr('swapDepths'),0x4E,0x4F,
        ...proto,...pushStr('swapDepths'),...fn,...fbody,0x4F];
      hook=[...proto,...pushStr('copSwap'),0x4E,0x44,...pushStr('undefined'),0x49,0x12,...act(0x9D,u16(inst.length)),...inst];
    }
    const a1=[...hook,...act(0x83,[...enc(url),...enc('_level1')]),...pushStr('done'),...pushInt(0),0x1D,0];
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
    function loader(name,depth,u){
      if(!u) return [];
      const make=[...pushInt(depth),...pushStr(name),...pushInt(2),...pushStr('_level1'),0x1C,...pushStr('createEmptyMovieClip'),0x52,0x17,
        ...pushStr(u),...pushStr('_level1.'+name),...act(0x9A,[0x40])];
      const has=[...pushStr('_level1'),0x1C,...pushStr(name),0x4E,0x44,...pushStr('movieclip'),0x49,...act(0x9D,u16(make.length)),...make];
      return [...prop(4),...pushInt(5),0x49,0x12,...act(0x9D,u16(has.length)),...has];
    }
    // 포동이의 꼬리콥터: 같은 방식으로 _level1.copDog(501번 층)에 불러온다. 원본 헬리콥터는 onLoad에서 500번 층으로 옮겨지므로 그 바로 위다.
    // 포동이 SWF가 매 프레임 헬리콥터를 따라가고 원본 헬리콥터는 _alpha=0으로만 감춘다(경계·충돌 판정은 원본 그대로).
    // 동굴 벽·장애물 색: 원본 도형(0x66FF66 단색, 줄무늬 0x61F261)은 그대로 두고, 클립에 색 변환만 덧씌운다.
    // 대상: wallA·wallB(위아래 띠), wallBlock…(위아래 벽 조각), obstacle…(장애물), blockController. 양옆의 wall1–4는 뺀다(검은 선이 물든다).
    //   for(n in _level1){ p=substring(n,1,5); m=_level1[n];
    //     if((p=="wallA"||p=="wallB"||p=="obsta"||p=="block") && typeof(m)=="movieclip" && m.copTint!=1){ m.copTint=1;
    //       new Color(m).setTransform({ra:100,rb:99,ga:70.6,gb:0,ba:100,bb:38}) } }
    // 0x66FF66 → 0xC9B48C(짙은 크림). 알파는 건드리지 않아 원본의 _alpha 바꾸기는 그대로 산다.
    const reg=(r)=>act(0x96,[4,r]);
    const store=(r)=>act(0x87,[r]);  // 레지스터 0: 이름, 1: 앞 다섯 글자, 2: 클립
    const pushNum=(x)=>{const b=new ArrayBuffer(8),v=new DataView(b);v.setFloat64(0,x,true);const a=[...new Uint8Array(b)];return act(0x96,[6,...a.slice(4),...a.slice(0,4)]);};
    const tintCall=(tf)=>[...reg(2),...pushStr('copTint'),...pushInt(1),0x4F,
      ...tf.flatMap(([k,x])=>[...pushStr(k),...(Number.isInteger(x)&&x>=0?pushInt(x):pushNum(x))]),...pushInt(tf.length),0x43,
      ...pushInt(1),...reg(2),...pushInt(1),...pushStr('Color'),0x40,...pushStr('setTransform'),0x52,0x17];
    const wallTint=tintCall([['ra',100],['rb',99],['ga',70.6],['gb',0],['ba',100],['bb',38]]);
    // 시작 문구(CLICK TO START, CLICK AND HOLD…): 원본 45번 층의 이름 없는 클립(글자 0x33CCFF·0x33FFFF)을 한 가지 색 0xF09A7C로.
    // 크림 0xC9B48C와 포동이 옷 빨강 0xE83B32의 중간(0xD9785F)을 검은 바탕에서 잘 보이게 밝힌 색이다. AS에서 45번 층은 getDepth()==45-16384.
    const textTint=tintCall([['ra',0],['rb',240],['ga',0],['gb',154],['ba',0],['bb',124]]);
    const isPre=(w)=>[...reg(1),...pushStr(w),0x49];
    const okClip=[...reg(2),0x44,...pushStr('movieclip'),0x49,
      ...reg(2),...pushStr('copTint'),0x4E,...pushInt(1),0x49,0x12,0x10];
    const isWall=[...isPre('wallA'),...isPre('wallB'),0x11,...isPre('obsta'),0x11,...isPre('block'),0x11];
    const isText=[...pushInt(0),...reg(2),...pushStr('getDepth'),0x52,...pushNum(45-16384),0x49];
    const txtPart=[...isText,0x12,...act(0x9D,u16(textTint.length)),...textTint];
    const wallPart=[...isWall,0x12,...act(0x9D,u16(wallTint.length+5)),...wallTint,...act(0x99,u16(txtPart.length))];
    const inner=[...wallPart,...txtPart];
    const tbodyIn=[...okClip,0x12,...act(0x9D,u16(inner.length)),...inner];
    const tbody=[...reg(0),...pushInt(1),...pushInt(5),0x15,...store(1),0x17,
      ...pushStr('_level1'),0x1C,...reg(0),0x4E,...store(2),0x17,...tbodyIn];
    const head1=[...store(0),...act(0x96,[2]),0x49];
    const jumpBack=(n)=>act(0x99,u16((-(n))&0xFFFF));
    const loopLen=head1.length+5+tbody.length+5;
    const tint=[...pushStr('_level1'),0x1C,0x55,
      ...head1,...act(0x9D,u16(tbody.length+5)),...tbody,...jumpBack(loopLen)];
    const label=[...loader('copLabel',54,labelUrl),...loader('copDog',501,dogUrl),...tint];
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
