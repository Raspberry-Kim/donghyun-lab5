import sys,struct
d=open('swf/helicopter-game.swf','rb').read();body=d[8:]
nb=body[0]>>3;o=(5+4*nb+7)//8+4
def tags(buf,p,end):
    while p<end:
        h=struct.unpack('<H',buf[p:p+2])[0];t=h>>6;l=h&63;p+=2
        if l==63:l=struct.unpack('<I',buf[p:p+4])[0];p+=4
        yield t,buf[p:p+l];p+=l
        if t==0:break
names={0x04:'nextFrame',0x05:'prevFrame',0x06:'play',0x07:'stop',0x81:'gotoFrame',0x83:'getURL',0x8C:'gotoLabel',0x96:'push',0x17:'pop',0x1C:'getVariable',0x1D:'setVariable',0x9D:'if',0x99:'jump',0x12:'not',0x48:'less2',0x49:'equals2',0x0E:'equals',0x0F:'less',0x9F:'gotoFrame2',0x88:'constantPool',0x4E:'getMember',0x4F:'setMember',0x52:'callMethod',0x3D:'callFunction',0x8A:'waitForFrame',0x8D:'waitForFrame2',0x9B:'defineFunction',0x3E:'return',0x67:'greater',0x47:'add2',0x0A:'add',0x0B:'subtract',0x21:'stringAdd',0x22:'getProperty',0x23:'setProperty',0x8B:'setTarget',0x20:'setTarget2',0x3C:'defineLocal',0x96:'push',0x26:'trace',0x34:'getTime',0x30:'random',0x24:'cloneSprite',0x25:'removeSprite',0x10:'and',0x11:'or',0x13:'stringEquals',0x14:'stringLength',0x15:'substring',0x18:'toInteger',0x9A:'getURL2',0x40:'newObject',0x42:'initArray',0x43:'initObject',0x44:'typeof',0x4C:'pushDup',0x4D:'swap',0x87:'storeRegister',0x29:'stringLess',0x50:'increment',0x51:'decrement',0x94:'with',0x9E:'call',0x0C:'multiply',0x0D:'divide',0x3F:'modulo',0x41:'declareLocal'}
def dis(a,pool=[]):
    p=0;out=[]
    while p<len(a):
        op=a[p];p+=1
        if op==0:break
        L=0;arg=b''
        if op>=0x80:L=struct.unpack('<H',a[p:p+2])[0];p+=2;arg=a[p:p+L];p+=L
        n=names.get(op,hex(op));s=''
        if op==0x88:
            c=struct.unpack('<H',arg[:2])[0];pool=arg[2:].split(b'\0')[:c];s=str([x.decode('latin1') for x in pool])
        elif op==0x96:
            q=0;vals=[]
            while q<len(arg):
                t=arg[q];q+=1
                if t==0:e=arg.index(b'\0',q);vals.append(repr(arg[q:e].decode('latin1')));q=e+1
                elif t==1:vals.append(struct.unpack('<f',arg[q:q+4])[0]);q+=4
                elif t in(2,3):vals.append(['null','undef'][t-2])
                elif t==4:vals.append('r%d'%arg[q]);q+=1
                elif t==5:vals.append(bool(arg[q]));q+=1
                elif t==6:b8=arg[q:q+8];vals.append(struct.unpack('<d',b8[4:]+b8[:4])[0]);q+=8
                elif t==7:vals.append(struct.unpack('<i',arg[q:q+4])[0]);q+=4
                elif t==8:vals.append('c:'+pool[arg[q]].decode('latin1'));q+=1
                elif t==9:vals.append('c:'+pool[struct.unpack('<H',arg[q:q+2])[0]].decode('latin1'));q+=2
            s=str(vals)
        elif op in(0x9D,0x99):s=str(struct.unpack('<h',arg)[0])
        elif op==0x81:s=str(struct.unpack('<H',arg)[0])
        elif op==0x83:s=str(arg.split(b'\0'))
        elif op in(0x8C,0x8B):s=arg.decode('latin1')
        elif op==0x9F:s=arg.hex()
        elif op==0x8A:s=arg.hex()
        out.append(f'{p:5} {n} {s}')
    return out
frame=1
for t,v in tags(body,o,len(body)):
    if t==1:frame+=1
    if t==12 and frame<=int(sys.argv[1] if len(sys.argv)>1 else 3):
        print('--- frame',frame);print('\n'.join(dis(v)))
    if t==43:print('label',frame,v)

print('=== placeobject2 with clip actions (main timeline) / buttons')
frame=1
for t,v in tags(body,o,len(body)):
    if t==1:frame+=1
    if t==26:
        f=v[0];q=3;depth=struct.unpack('<H',v[1:3])[0]
        cid=None
        if f&2:cid=struct.unpack('<H',v[q:q+2])[0];q+=2
        print('frame',frame,'depth',depth,'char',cid,'flags',bin(f))
        if f&0x80:
            # skip matrix/cxform/ratio/name/clipdepth: just search for name
            pass
    if t==34:
        cid=struct.unpack('<H',v[:2])[0];print('button',cid,'len',len(v))

print('=== button actions')
for t,v in tags(body,o,len(body)):
    if t==34:
        cid=struct.unpack('<H',v[:2])[0];off=struct.unpack('<H',v[3:5])[0]
        q=3+off
        while True:
            size=struct.unpack('<H',v[q:q+2])[0];cond=struct.unpack('<H',v[q+2:q+4])[0]
            end=q+size if size else len(v)
            print('button',cid,'cond',bin(cond));print('\n'.join(dis(v[q+4:end])))
            if not size:break
            q=end

print('=== sprite 18')
for t,v in tags(body,o,len(body)):
    if t==39 and struct.unpack('<H',v[:2])[0]==18:
        fr=1
        for t2,v2 in tags(v,4,len(v)):
            if t2==1:fr+=1
            if t2==12:print('-- sprite frame',fr);print('\n'.join(dis(v2)))
            else: print('tag',t2,len(v2))
