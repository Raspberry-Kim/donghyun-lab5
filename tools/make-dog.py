# 포동이의 꼬리콥터 SWF 만들기 (원본 SWF는 고치지 않는다)
# assets/podongi.png에서 꼬리를 떼어 몸체 그림과 꼬리 날개 그림으로 나누고,
# 원본 헬리콥터(sprite 50)의 경계 안에 몸체를, 원래 큰 회전날개 자리(납작한 회전면)에 꼬리를 둔다.
# 바깥 SWF가 이 파일을 _level1.copDog(501번 층, 헬리콥터 500번 바로 위)에 불러온다.
# 매 프레임 원본 헬리콥터의 위치·기울기·크기를 따라가고, 원본은 _alpha=0으로만 감춘다(경계·충돌은 그대로).
# 결과: src/dog.js (base64)
import os, sys, struct, zlib, base64, math
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
TW = 20

# ---- 그림 나누기 -------------------------------------------------------------
src = Image.open(os.path.join(ROOT, 'assets', 'podongi.png')).convert('RGB')
a = np.array(src).astype(int)
lab, _ = ndimage.label(a.min(2) > 235)
edge = set(np.unique(np.r_[lab[0], lab[-1], lab[:, 0], lab[:, -1]])) - {0}
alpha = (~np.isin(lab, list(edge))).astype(np.uint8) * 255
rgba = np.dstack([a.astype(np.uint8), alpha])
TAIL = [(0, 0), (330, 0), (330, 150), (300, 150), (150, 280), (110, 320), (100, 460), (0, 480)]   # 꼬리 자리(원본 그림 px)
m = Image.new('L', src.size, 0); ImageDraw.Draw(m).polygon(TAIL, fill=255); m = np.array(m) > 0
body = rgba.copy(); body[m, 3] = 0
tail = rgba.copy(); tail[~m, 3] = 0
body = Image.fromarray(body, 'RGBA'); body = body.crop(body.getbbox())
tl, n = ndimage.label(tail[:, :, 3] > 0)                     # 꼬리 덩어리만 남긴다(작은 부스러기 제거)
if n > 1:
    sizes = ndimage.sum(np.ones_like(tl), tl, range(1, n + 1)); tail[tl != 1 + int(np.argmax(sizes)), 3] = 0
tail = Image.fromarray(tail, 'RGBA'); tail = tail.crop(tail.getbbox())
# 꼬리 날개: 뿌리(아래)→끝(위)이 +x를 향하도록 돌린다
tail = tail.rotate(-math.degrees(math.atan2(460, 150)), expand=True, resample=Image.BICUBIC)   # 뿌리 (100,460) → 끝 (250,0)
tail = tail.crop(tail.getbbox())

# ---- 헬리콥터 기준 좌표(px) ------------------------------------------------------
# 원본 몸체(shape 32): x -47.4..38.7, y -7.0..27.95 / 큰 날개 sprite 37: 중심 (7.8,-4.85), 반지름 139.6에 x 0.296·y 0.1 납작
BODY_Y0, BODY_Y1 = -9.0, 28.0
bh = BODY_Y1 - BODY_Y0; bw = bh * body.width / body.height
BODY_X0 = -4.3 - bw / 2
HUB = (-4.3, -10.0)                        # 꼬리 뿌리(머리 꼭대기)
ROT = 139.6; SX, SY = 0.296, 0.100
PX = 4                                     # 무대 1px당 그림 px(선명도)
def fit(img, w_px):
    w = max(1, round(w_px)); h = max(1, round(w_px * img.height / img.width))
    return img.resize((w, h), Image.LANCZOS)
body_bm = fit(body, bw * 0.495 * PX)
blade_len = ROT * 0.98
tail_bm = fit(tail, blade_len * SX * 0.495 * PX * 2.2)

# ---- SWF 조각 ------------------------------------------------------------------
class Bits:
    def __init__(s): s.b = []
    def u(s, v, n):
        for i in range(n - 1, -1, -1): s.b.append((v >> i) & 1)
    def s_(s, v, n): s.u(v & ((1 << n) - 1), n)
    def bytes(s):
        b = s.b + [0] * (-len(s.b) % 8)
        return bytes(int(''.join(map(str, b[i:i + 8])), 2) for i in range(0, len(b), 8))
def nbits(*vs):
    n = 1
    for v in vs:
        while not (-(1 << (n - 1)) <= v < (1 << (n - 1))): n += 1
    return n
def rect(x0, x1, y0, y1):
    n = nbits(x0, x1, y0, y1); b = Bits(); b.u(n, 5)
    for v in (x0, x1, y0, y1): b.s_(v, n)
    return b.bytes()
def tag(code, data):
    return struct.pack('<H', (code << 6) | len(data)) + data if len(data) < 63 else struct.pack('<HI', (code << 6) | 63, len(data)) + data
def matrix(sx=1.0, sy=1.0, r0=0.0, r1=0.0, tx=0, ty=0):
    b = Bits()
    if sx != 1 or sy != 1:
        a, d = round(sx * 65536), round(sy * 65536); n = nbits(a, d); b.u(1, 1); b.u(n, 5); b.s_(a, n); b.s_(d, n)
    else: b.u(0, 1)
    if r0 or r1:
        a, d = round(r0 * 65536), round(r1 * 65536); n = nbits(a, d); b.u(1, 1); b.u(n, 5); b.s_(a, n); b.s_(d, n)
    else: b.u(0, 1)
    tx, ty = round(tx), round(ty); n = nbits(tx, ty) if (tx or ty) else 0; b.u(n, 5)
    if n: b.s_(tx, n); b.s_(ty, n)
    return b.bytes()
def bitmap(cid, img):
    p = np.array(img.convert('RGBA')).astype(np.uint16)
    al = p[:, :, 3:4]; rgb = (p[:, :, :3] * al // 255)
    argb = np.concatenate([al, rgb], 2).astype(np.uint8).tobytes()
    return tag(36, struct.pack('<HBHH', cid, 5, img.width, img.height) + zlib.compress(argb, 9))
def edges(b, pts, first_style):
    """pts: twip 꼭짓점. 닫힌 다각형 하나를 적는다."""
    x0, y0 = pts[0]
    b.u(0, 1); b.u(0, 1); b.u(0, 1); b.u(0, 1); b.u(1 if first_style else 0, 1); b.u(1, 1)
    n = nbits(x0, y0); b.u(n, 5); b.s_(x0, n); b.s_(y0, n)
    if first_style: b.u(1, 1)
    cx, cy = x0, y0
    for (x, y) in pts[1:] + [pts[0]]:
        dx, dy = x - cx, y - cy
        if dx == 0 and dy == 0: continue
        n = max(2, nbits(dx, dy)); b.u(1, 1); b.u(1, 1); b.u(n - 2, 4)
        if dx and dy: b.u(1, 1); b.s_(dx, n); b.s_(dy, n)
        elif dx: b.u(0, 1); b.u(0, 1); b.s_(dx, n)
        else: b.u(0, 1); b.u(1, 1); b.s_(dy, n)
        cx, cy = x, y
def bitmap_shape(cid, bid, img, x0, y0, w, h):
    """(x0,y0)부터 w×h(px) 칸에 그림을 채운다."""
    X0, Y0, X1, Y1 = round(x0 * TW), round(y0 * TW), round((x0 + w) * TW), round((y0 + h) * TW)
    fill = bytes([1, 0x41]) + struct.pack('<H', bid) + matrix((X1 - X0) / img.width, (Y1 - Y0) / img.height, tx=X0, ty=Y0)
    b = Bits(); b.u(1, 4); b.u(0, 4)
    edges(b, [(X0, Y0), (X1, Y0), (X1, Y1), (X0, Y1)], True); b.u(0, 6)
    return tag(22, struct.pack('<H', cid) + rect(X0, X1, Y0, Y1) + fill + bytes([0]) + b.bytes())
def poly_shape(cid, rings, rgba):
    xs = [x for r in rings for x, y in r]; ys = [y for r in rings for x, y in r]
    b = Bits(); b.u(1, 4); b.u(0, 4)
    for i, r in enumerate(rings): edges(b, r, i == 0)
    b.u(0, 6)
    return tag(32, struct.pack('<H', cid) + rect(min(xs), max(xs), min(ys), max(ys)) + bytes([1, 0]) + bytes(rgba) + bytes([0]) + b.bytes())
def circle(cx, cy, r, n=48):
    return [(round((cx + r * math.cos(2 * math.pi * k / n)) * TW), round((cy + r * math.sin(2 * math.pi * k / n)) * TW)) for k in range(n)]
def place(depth, cid=None, mat=None, name=None, move=False):
    f = (1 if move else 0) | (2 if cid is not None else 0) | (4 if mat is not None else 0) | (0x20 if name else 0)
    d = bytes([f]) + struct.pack('<H', depth)
    if cid is not None: d += struct.pack('<H', cid)
    if mat is not None: d += mat
    if name: d += name.encode() + b'\0'
    return tag(26, d)

# ---- AVM1 조립 -----------------------------------------------------------------
def asm(items):
    """items: bytes | ('if',L) | ('jmp',L) | ('L',L). 분기 거리를 풀어 바이트로 만든다."""
    pos, labels, size = 0, {}, []
    for it in items:
        if isinstance(it, tuple) and it[0] == 'L': labels[it[1]] = pos; continue
        n = 5 if isinstance(it, tuple) else len(it); pos += n
    out, pos = b'', 0
    for it in items:
        if isinstance(it, tuple):
            if it[0] == 'L': continue
            pos += 5; op = 0x9D if it[0] == 'if' else 0x99
            out += bytes([op]) + struct.pack('<Hh', 2, labels[it[1]] - pos)
        else: out += it; pos += len(it)
    return out
def ps(*vals):
    d = b''
    for v in vals:
        if isinstance(v, bool): d += bytes([5, 1 if v else 0])
        elif isinstance(v, int): d += bytes([7]) + struct.pack('<i', v)
        else: d += b'\0' + v.encode() + b'\0'
    return b'\x96' + struct.pack('<H', len(d)) + d
GETV, SETV, GETM, SETM = b'\x1c', b'\x1d', b'\x4e', b'\x4f'
ADD, SUB, MUL, DIV, EQ, NOT, TYPEOF, CALLM, POP = b'\x47', b'\x0b', b'\x0c', b'\x0d', b'\x49', b'\x12', b'\x44', b'\x52', b'\x17'
def h(prop): return ps('h') + GETV + ps(prop) + GETM
def setthis(prop, *expr): return ps('this') + GETV + ps(prop) + b''.join(expr) + SETM
def call(path, method): return ps(0, 'this') + GETV + ps(path) + GETM + ps(method) + CALLM + POP
crv = ps('cr') + GETV
script = asm([
    ps('h', '_level1') + GETV + ps('helicopter') + GETM + SETV,
    ps('h') + GETV + TYPEOF + ps('movieclip') + EQ + NOT, ('if', 'hide'),
    ps('h') + GETV + ps('_alpha', 0) + SETM,
    setthis('_visible', ps(True)),
    h('_currentframe') + ps(1) + EQ + NOT, ('if', 'crash'),
    # 비행: 원본 헬리콥터를 그대로 따라간다
    ps('cr', 0) + SETV,
    setthis('_x', h('_x')), setthis('_y', h('_y')), setthis('_rotation', h('_rotation')),
    setthis('_xscale', h('_xscale')), setthis('_yscale', h('_yscale')), setthis('_alpha', ps(100)),
    call('spin', 'play'), ('jmp', 'end'),
    # 추락(원본 헬리콥터 2번 프레임 'crash'부터): 꼬리가 멈추고 포동이가 데굴데굴 떨어지며 흐려진다
    ('L', 'crash'),
    ps('cr') + crv + ps(1) + ADD + SETV,
    call('spin', 'stop'),
    setthis('_rotation', h('_rotation') + crv + ps(17) + MUL + ADD),
    setthis('_x', h('_x') + crv + ps(3) + MUL + ps(5) + DIV + ADD),
    setthis('_y', h('_y') + crv + crv + MUL + ps(3) + MUL + ps(25) + DIV + ADD),
    setthis('_alpha', ps(100) + crv + ps(3) + MUL + SUB),
    ('jmp', 'end'),
    ('L', 'hide'), setthis('_visible', ps(False)),
    ('L', 'end'),
]) + b'\0'

# ---- 조립 ----------------------------------------------------------------------
CREAM, NAVY = (0xF6, 0xEC, 0xCF), (0x27, 0x33, 0x52)
T = []
T.append(bitmap(1, body_bm))
T.append(bitmap_shape(2, 1, body_bm, BODY_X0, BODY_Y0, bw, bh))
T.append(bitmap(3, tail_bm))
# 꼬리 날개: 회전면(반지름 ROT) 좌표에서 뿌리를 중심 가까이, 끝을 바깥에 둔다. 납작하게 눌리므로 폭은 두껍게 잡는다.
blade_w = blade_len * tail_bm.height / tail_bm.width
T.append(bitmap_shape(4, 3, tail_bm, ROT * 0.02, -blade_w / 2, blade_len, blade_w))
T.append(poly_shape(5, [circle(0, 0, ROT)], CREAM + (0x1C,)))          # 도는 꼬리가 그리는 아주 옅은 회전면
def faded(img, k):
    p = np.array(img.convert('RGBA')).astype(float); p[:, :, 3] *= k
    return Image.fromarray(p.clip(0, 255).astype(np.uint8), 'RGBA')
GHOST = [(9, 10, 0.45, 13), (11, 12, 0.2, 26)]      # (그림, 모양, 진하기, 뒤따르는 각도°): 크림색 꼬리 잔상
for bid, sid, k, _ in GHOST:
    T.append(bitmap(bid, faded(tail_bm, k)))
    T.append(bitmap_shape(sid, bid, tail_bm, ROT * 0.02, -blade_w / 2, blade_len, blade_w))
spin = b''
for k in range(30):
    for depth, cid, lag in [(1, GHOST[1][1], GHOST[1][3]), (2, GHOST[0][1], GHOST[0][3]), (3, 4, 0)]:
        ang = -2 * math.pi * k / 30 + math.radians(lag); c, s_ = math.cos(ang), math.sin(ang)
        spin += place(depth, None if k else cid, matrix(c, c, s_, -s_), move=bool(k))
    spin += tag(1, b'')
spin += tag(0, b'')
T.append(tag(39, struct.pack('<HH', 6, 30) + spin))
body_tags = (rect(0, 8000, 0, 6000) + bytes([0, 30]) + struct.pack('<H', 2) + tag(69, struct.pack('<I', 0)) + b''.join(T)
             + place(1, 5, matrix(SX, SY, tx=HUB[0] * TW, ty=HUB[1] * TW)) + place(2, 2, matrix())
             + place(3, 6, matrix(SX, SY, tx=HUB[0] * TW, ty=HUB[1] * TW), name='spin')
             + tag(12, script) + tag(1, b'') + tag(12, script) + tag(1, b'') + tag(0, b''))
swf = b'FWS' + bytes([8]) + struct.pack('<I', 8 + len(body_tags)) + body_tags
open(os.path.join(ROOT, 'src', 'dog.js'), 'w').write(
    '/* 포동이의 꼬리콥터 SWF. tools/make-dog.py가 assets/podongi.png로 만든다. 손으로 고치지 않는다. */\n'
    'const COP_DOG_SWF=' + repr(base64.b64encode(swf).decode()) + ';\n')
print(len(swf), 'bytes', 'body', body_bm.size, 'tail', tail_bm.size, 'body box x %.1f..%.1f y %.1f..%.1f' % (BODY_X0, BODY_X0 + bw, BODY_Y0, BODY_Y1))
