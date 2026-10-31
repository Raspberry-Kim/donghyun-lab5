# 동현콥 띠 글꼴: 7세그먼트 + 대각선. 단위: 글자 높이 H=9
from shapely.geometry import Polygon, LineString, box
from shapely.ops import unary_union
H, W, T, G = 9.0, 5.0, 1.15, 0.24
XL, XR, XC, YT, YM, YB = T/2, W-T/2, W/2, T/2, H/2, H-T/2
def hseg(x0, x1, y, cut0=True, cut1=True):
    h = T/2
    a = x0+G; b = x1-G
    pts = [(a, y)] if cut0 else [(a-h, y-h), (a-h, y+h)]
    pts = ([(a, y), (a+h, y-h)] if cut0 else [(a-h, y-h)]) + ([(b-h, y-h), (b, y), (b-h, y+h)] if cut1 else [(b+h, y-h), (b+h, y+h)]) + ([(a+h, y+h)] if cut0 else [(a-h, y+h)])
    return Polygon(pts)
def vseg(x, y0, y1):
    h = T/2; a = y0+G; b = y1-G
    return Polygon([(x, a), (x+h, a+h), (x+h, b-h), (x, b), (x-h, b-h), (x-h, a+h)])
def diag(p, q, clip):
    return LineString([p, q]).buffer(T*0.56, cap_style='flat', join_style='mitre').intersection(box(*clip))
S = {
 'a': lambda: hseg(XL, XR, YT), 'd': lambda: hseg(XL, XR, YB), 'g': lambda: hseg(XL, XR, YM),
 'gl': lambda: hseg(XL, XC, YM), 'gr': lambda: hseg(XC, XR, YM),
 'f': lambda: vseg(XL, YT, YM), 'e': lambda: vseg(XL, YM, YB), 'b': lambda: vseg(XR, YT, YM), 'c': lambda: vseg(XR, YM, YB),
 'h': lambda: vseg(XC, YT, YM), 'i': lambda: vseg(XC, YM, YB),
}
def k_up():  return diag((XL+T*0.35, YM+0.35), (W+0.25, -0.35), (T+G*0.6, 0, W, YM-G*0.5))
def k_dn():  return diag((XL+T*0.35, YM-0.35), (W+0.25, H+0.35), (T+G*0.6, YM+G*0.5, W, H))
def n_dg():  return LineString([(XL+T*0.45, YT+0.15), (XR-T*0.45, YB-0.15)]).buffer(T*0.5, cap_style='flat').intersection(box(T+G*0.8, YT+G, W-T-G*0.8, YB-G))
def r_dg():  return diag((XC-0.1, YM+0.1), (W+0.25, H+0.35), (XC-0.2, YM+G*0.5, W, H))
def d_corner(top):
    y = YT if top else YB
    return [hseg(XL, XR-1.05, y, cut1=True)] 
GLYPHS = {
 'A': 'a f b g e c', 'C': 'a f e d', 'E': 'a f g e d', 'F': 'a f g e', 'G': 'a f e d c gr', 'H': 'f e b c g',
 'L': 'f e d', 'N': 'f e b c', 'O': 'a b c d e f', 'P': 'a f b g e', 'T': 'a h i', 'U': 'f e b c d',
 'R': 'a f b g e', 'W': 'f e b c d i', 'Y': 'f b g c d', '-': 'g', 'K': 'f e', 'D': 'f e', 'I': '', '!': '',
}
def glyph(ch):
    """(너비, [shapely 다각형]) 단위는 H=9 기준."""
    if ch == 'I': return T, [vseg(T/2, YT, YM).buffer(0), vseg(T/2, YM, YB)]
    if ch == '!':
        return T, [vseg(T/2, YT, H*0.74), Polygon([(0, H-T), (T, H-T), (T, H), (0, H)])]
    ps = [S[k]() for k in GLYPHS[ch].split()]
    if ch == 'K': ps += [k_up(), k_dn()]
    if ch == 'N': ps += [n_dg()]
    if ch == 'R': ps += [r_dg()]
    if ch == 'D':
        r = 1.25  # 위·아래 획이 오른쪽 모서리에서 비스듬히 꺾여 내려오는 D
        up = LineString([(XL+G+T*0.5, YT), (XR-r, YT), (XR, YT+r), (XR, YM-G)]).buffer(T/2, cap_style='flat', join_style='mitre')
        dn = LineString([(XL+G+T*0.5, YB), (XR-r, YB), (XR, YB-r), (XR, YM+G)]).buffer(T/2, cap_style='flat', join_style='mitre')
        ps += [up.intersection(box(0, 0, W, YM-G)), dn.intersection(box(0, YM+G, W, H))]
    return W, ps
def polys_of(geom):
    gs = getattr(geom, 'geoms', [geom])
    out = []
    for g in gs:
        if g.is_empty: continue
        out.append(list(g.exterior.coords)[:-1])
    return out
