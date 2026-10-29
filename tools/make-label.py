# 동현콥 상단 띠 SWF 만들기 (원본 SWF는 고치지 않는다)
# 원본 'COPYRIGHT: SEETHRU.CO.UK' 자리를 같은 초록 줄무늬로 덮고, DSEG14 Classic Bold(OFL 1.1) 글자로
# 'TAKE FLIGHT WITH DONGHYUN-COP!'을 쓴다. 바깥 SWF가 이 파일을 원본 _level1의 54번 층(저작권 버튼 53번 바로 위,
# 동굴 벽 100번 아래)에 불러온다. 결과: src/label.js (base64)
# 쓰는 법: python3 tools/make-label.py path/to/DSEG14Classic-Bold.ttf
import sys, base64, struct, os
from fontTools.ttLib import TTFont
from fontTools.pens.recordingPen import RecordingPen

TEXT = 'TAKE FLIGHT WITH DONGHYUN-COP!'
TW = 20                      # 1픽셀 = 20 twip
CAP = 8.6                    # 글자 높이(px). 원본 글자 높이(약 8.5px)에 맞춤
PITCH, SPACE = 6.5, 4.0      # 글자 간격(px). 원본(약 6.3px)에 맞춤
RIGHT, BASE = 347.0, 18.6    # 원본 글자 오른쪽 끝과 바닥(px)
BAR, LINE, INK = (0x66, 0xFF, 0x66), (0x61, 0xF2, 0x61), (0x00, 0x00, 0x33)
COVER = (194.0, 351.0, 8.5, 20.5)   # 원본 글자를 덮는 칸(px): x0, x1, y0, y1
HIT = (150.0, 360.0, 0.0, 26.0)     # 누르기를 받는 투명 칸(px). 원본 링크 단추를 덮는다

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

def shape(cid, polys, color, alpha=None, side=0):
    """polys: [[(x,y) twip ...], ...] 닫힌 다각형을 한 가지 색으로 채운다. side 0이면 fill0, 1이면 fill1 쪽을 채운다."""
    xs = [x for p in polys for x, y in p]; ys = [y for p in polys for x, y in p]
    code = 32 if alpha is not None else 2
    out = struct.pack('<H', cid) + rect(min(xs), max(xs), min(ys), max(ys))
    out += bytes([1, 0]) + bytes(color) + (bytes([alpha]) if alpha is not None else b'') + bytes([0])
    b = Bits(); b.u(1, 4); b.u(0, 4)
    for i, p in enumerate(polys):
        x0, y0 = p[0]; n = nbits(x0, y0)
        first = i == 0
        b.u(0, 1); b.u(0, 1); b.u(0, 1)                     # TypeFlag, NewStyles, LineStyle
        b.u(1 if first and side == 1 else 0, 1)             # FillStyle1
        b.u(1 if first and side == 0 else 0, 1)             # FillStyle0
        b.u(1, 1)                                           # MoveTo
        b.u(n, 5); b.s_(x0, n); b.s_(y0, n)
        if first: b.u(1, 1)
        cx, cy = x0, y0
        for (x, y) in p[1:] + [p[0]]:
            dx, dy = x - cx, y - cy
            if dx == 0 and dy == 0: continue
            n = max(2, nbits(dx, dy))
            b.u(1, 1); b.u(1, 1); b.u(n - 2, 4)
            if dx and dy: b.u(1, 1); b.s_(dx, n); b.s_(dy, n)
            elif dx: b.u(0, 1); b.u(0, 1); b.s_(dx, n)
            else: b.u(0, 1); b.u(1, 1); b.s_(dy, n)
            cx, cy = x, y
    b.u(0, 6)
    return tag(code, out + b.bytes())

def box(x0, x1, y0, y1):
    q = lambda v: round(v * TW)
    return [(q(x0), q(y0)), (q(x1), q(y0)), (q(x1), q(y1)), (q(x0), q(y1))]

def glyph_polys(font, ch, x, s):
    gs = font.getGlyphSet(); cmap = font.getBestCmap()
    def contours(name):
        p = RecordingPen(); gs[name].draw(p); cs = []; cur = []
        for o, a in p.value:
            if o == 'moveTo': cur = [a[0]]
            elif o == 'lineTo': cur.append(a[0])
            elif o == 'closePath': cs.append(cur)
            elif o == 'qCurveTo': raise ValueError('곡선 글자: ' + name)
        return cs
    if ch == '!':   # DSEG14에는 느낌표가 없다: 'I'의 가운데 세로 획 굵기로 긴 획과 떨어진 바닥 점을 그린다
        cs = [[(346, 1000), (470, 1000), (470, 330), (408, 268), (346, 330)],
              [(346, 0), (470, 0), (470, 124), (346, 124)]]
    else:
        cs = contours(cmap[ord(ch)])
    out = []
    for c in cs:
        out.append([(round((x + (px - 99) * s) * TW), round((BASE - py * s) * TW)) for px, py in c])
    return out

def main(ttf):
    font = TTFont(ttf); s = CAP / 1000
    width = sum(SPACE if c == ' ' else PITCH for c in TEXT) - (PITCH - 618 * s)
    x = RIGHT - width; polys = []
    for c in TEXT:
        if c == ' ': x += SPACE; continue
        polys += glyph_polys(font, c, x, s); x += PITCH
    x0, x1, y0, y1 = COVER
    stripes = [box(x0, x1, y, y + 1) for y in (1.5 + 5 * k for k in range(6)) if y0 <= y and y + 1 <= y1]
    # 1번 프레임: this.onPress로 누르기를 받아 원본 링크 단추에 닿지 않게 하고, 손 모양 커서는 끈다.
    def push_str(v): d = b'\x00' + v.encode() + b'\x00'; return b'\x96' + struct.pack('<H', len(d)) + d
    fn = b'\x9b' + struct.pack('<H', 5) + b'\x00' + struct.pack('<HH', 0, 0)   # function(){} (이름 없음, 인자 0, 몸통 0)
    act = (push_str('this') + b'\x1c' + push_str('onPress') + fn + b'\x4f'
           + push_str('this') + b'\x1c' + push_str('useHandCursor') + b'\x96\x02\x00\x05\x00' + b'\x4f' + b'\x00')
    body = (rect(0, 8000, 0, 6000) + bytes([0, 30]) + struct.pack('<H', 1)
            + shape(1, [box(*HIT)], (0, 0, 0), alpha=0)
            + shape(2, [box(*COVER)], BAR) + shape(3, stripes, LINE) + shape(4, polys, INK)
            + b''.join(tag(26, bytes([0x06]) + struct.pack('<HH', d, d) + b'\x00') for d in (1, 2, 3, 4))
            + tag(12, act) + tag(1, b'') + tag(0, b''))
    swf = b'FWS' + bytes([6]) + struct.pack('<I', 8 + len(body)) + body
    b64 = base64.b64encode(swf).decode()
    dst = os.path.join(os.path.dirname(__file__), '..', 'src', 'label.js')
    open(dst, 'w').write('/* 동현콥 상단 띠 SWF. tools/make-label.py가 만든다(글꼴: DSEG14 Classic Bold, SIL OFL 1.1). */\n'
                         'const COP_LABEL_SWF=' + repr(b64) + ';\n')
    print(len(swf), 'bytes', 'text x0=%.1f' % (RIGHT - width))

if __name__ == '__main__': main(sys.argv[1])
