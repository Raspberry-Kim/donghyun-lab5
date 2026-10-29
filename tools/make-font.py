# 동현콥 세그먼트 숫자 글꼴(TTF)을 만든다. SWF의 DISTANCE·BEST 숫자 칸은 기기 글꼴을 쓰므로
# Ruffle 기본 글꼴로 이 글꼴을 넘긴다. 결과: src/segfont.js (base64)
import sys, os, base64
sys.path.insert(0, os.path.dirname(__file__))
from seg import *
from shapely.geometry import Polygon
from shapely.ops import unary_union
from shapely.geometry.polygon import orient
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
UPM = 1000
CAP = int(sys.argv[1]) if len(sys.argv) > 1 else 652   # 글자 높이(em 단위)
ASC = int(sys.argv[2]) if len(sys.argv) > 2 else 832   # 위 여백: 원본 DISTANCE·BEST 글자와 위·아래 끝이 같게 맞춘 값
DSC = 240
k = CAP / H
DIG = {'0': 'a b c d e f', '1': 'b c', '2': 'a b g e d', '3': 'a b g c d', '4': 'f g b c', '5': 'a f g c d',
       '6': 'a f g e c d', '7': 'a b c', '8': 'a b c d e f g', '9': 'a f b g c d', '-': 'g'}
ADV = int(round((W + 1.6) * k))
def draw(polys, dx=0):
    pen = TTGlyphPen(None)
    g = unary_union(polys)
    for p in getattr(g, 'geoms', [g]):
        if p.is_empty: continue
        p = orient(p, sign=-1.0)  # y를 뒤집으면 시계방향(TrueType 바깥 윤곽)
        pts = [(int(round((x + dx) * k)), int(round((H - y) * k))) for x, y in list(p.exterior.coords)[:-1]]
        pen.moveTo(pts[0])
        for q in pts[1:]: pen.lineTo(q)
        pen.closePath()
    return pen.glyph()
order = ['.notdef', 'space'] + ['g_' + c if not c.isdigit() else 'd' + c for c in DIG] + ['period', 'colon']
glyphs, metrics, cmap = {}, {}, {}
glyphs['.notdef'] = TTGlyphPen(None).glyph(); metrics['.notdef'] = (ADV, 0)
glyphs['space'] = TTGlyphPen(None).glyph(); metrics['space'] = (ADV, 0); cmap[32] = 'space'
for c, segs in DIG.items():
    n = 'd' + c if c.isdigit() else 'g_' + c
    glyphs[n] = draw([S[s]() for s in segs.split()]); metrics[n] = (ADV, 0); cmap[ord(c)] = n
dot = [box(0, H - T, T, H)]
glyphs['period'] = draw(dot); metrics['period'] = (int((T + 1.6) * k), 0); cmap[ord('.')] = 'period'
glyphs['colon'] = draw(dot + [box(0, H * 0.3, T, H * 0.3 + T)]); metrics['colon'] = (int((T + 1.6) * k), 0); cmap[ord(':')] = 'colon'
fb = FontBuilder(UPM, isTTF=True)
fb.setupGlyphOrder(order)
fb.setupCharacterMap(cmap)
fb.setupGlyf(glyphs)
hm = {}
for n in order:
    g = glyphs[n]
    hm[n] = (metrics[n][0], getattr(g, 'xMin', 0) or 0)
fb.setupHorizontalMetrics(hm)
fb.setupHorizontalHeader(ascent=ASC, descent=-DSC)
NAME = 'Donghyun Cop Segment'
fb.setupNameTable({'familyName': NAME, 'styleName': 'Regular', 'copyright': '© 2026 Kim Dong-Hyun. MIT License.',
                   'uniqueFontIdentifier': 'DonghyunCopSegment-0.2', 'fullName': NAME, 'psName': 'DonghyunCopSegment-Regular'})
fb.setupOS2(sTypoAscender=ASC, sTypoDescender=-DSC, sTypoLineGap=0, usWinAscent=ASC, usWinDescent=DSC, sCapHeight=CAP, sxHeight=CAP)
fb.setupPost()
root = os.path.join(os.path.dirname(__file__), '..')
import io
buf = io.BytesIO(); fb.save(buf); data = buf.getvalue(); out = 'src/segfont.js'
open(os.path.join(root, 'src', 'segfont.js'), 'w').write(
    '// 동현콥 세그먼트 숫자 글꼴(TTF, MIT). tools/make-font.py가 만든다. 손으로 고치지 않는다.\n'
    'window.DONGHYUN_SEGFONT_NAME=%r;\nwindow.DONGHYUN_SEGFONT_B64=%r;\n' % (NAME, base64.b64encode(data).decode()))
print(out, len(data), 'bytes')
