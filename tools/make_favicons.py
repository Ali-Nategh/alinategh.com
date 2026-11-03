"""Calligraphic "A" tab icons: a navy tile with the letter in gray, brass, or gray-to-brass.

Run from the repo root:   python3 tools/make_favicons.py
Needs:  pip install pillow   and the Pinyon Script font (SIL OFL) at tools/fonts/pinyon-script.ttf
        https://fonts.google.com/specimen/Pinyon+Script
Writes: assets/icons/{gray,brass,blend}-{180,192,512}.png, favicon.ico, tools/favicon-preview.png
"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops
import os
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

S = 1024                       # draw large, then downscale
FONT = 'tools/fonts/pinyon-script.ttf'
OUT = 'assets/icons'
os.makedirs(OUT, exist_ok=True)

def hexrgb(h):
    h = h.lstrip('#'); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))

VARIANTS = {   # (stop position 0..1, colour) from top to bottom of the letter
    'gray':  [(0, '#ecE9e2'), (.55, '#c9c6bf'), (1, '#9e9b94')],
    'brass': [(0, '#f8dea0'), (.5, '#e2b25a'), (1, '#a8732a')],
    'blend': [(0, '#e6e3dc'), (.42, '#cbbf9f'), (.7, '#e2b25a'), (1, '#ad772b')],
}

def vgradient(size, stops, y0=0, y1=None):
    w, h = size; y1 = h if y1 is None else y1
    col = Image.new('RGB', (1, h))
    stops = [(p, hexrgb(c)) for p, c in stops]
    for y in range(h):
        t = min(1, max(0, (y - y0) / max(1, y1 - y0)))
        for (pa, ca), (pb, cb) in zip(stops, stops[1:]):
            if pa <= t <= pb:
                k = (t - pa) / max(1e-6, pb - pa)
                col.putpixel((0, y), tuple(round(a + (b - a) * k) for a, b in zip(ca, cb)))
                break
    return col.resize((w, h))

def letter_mask(stroke):
    font = ImageFont.truetype(FONT, int(S * .9))
    tmp = Image.new('L', (S * 2, S * 2), 0)
    ImageDraw.Draw(tmp).text((S // 2, S // 4), 'A', font=font, fill=255, stroke_width=stroke, stroke_fill=255)
    bb = tmp.getbbox(); glyph = tmp.crop(bb)
    # fit the glyph inside the tile with a margin, then nudge for optical centre
    scale = min(S * .74 / glyph.width, S * .70 / glyph.height)
    glyph = glyph.resize((round(glyph.width * scale), round(glyph.height * scale)), Image.LANCZOS)
    m = Image.new('L', (S, S), 0)
    m.paste(glyph, ((S - glyph.width) // 2 + int(S * .01), (S - glyph.height) // 2 + int(S * .015)))
    return m

def tile(variant, small):
    img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    r = int(S * .22)
    shape = Image.new('L', (S, S), 0); ImageDraw.Draw(shape).rounded_rectangle((0, 0, S - 1, S - 1), r, fill=255)
    bg = vgradient((S, S), [(0, '#18244d'), (.55, '#0c1430'), (1, '#060a17')]).convert('RGBA')
    bg.putalpha(shape)
    img = Image.alpha_composite(img, bg)
    d = ImageDraw.Draw(img)
    if not small:   # five faint staff lines, the site's motif
        gap, top = S * .072, S * .5 - 2 * S * .072
        for i in range(5):
            y = top + i * gap
            d.line((S * .1, y, S * .9, y), fill=(170, 188, 255, 34), width=max(2, S // 340))
    # brass hairline just inside the edge
    inset = int(S * .022)
    d.rounded_rectangle((inset, inset, S - 1 - inset, S - 1 - inset), r - inset, outline=(226, 178, 90, 120 if small else 90), width=int(S * (.018 if small else .008)))
    mask = letter_mask(stroke=int(S * .018) if small else int(S * .004))
    bb = mask.getbbox()
    fill = vgradient((S, S), VARIANTS[variant], bb[1], bb[3]).convert('RGBA')
    if not small:   # soft glow under the letter
        glow = Image.new('RGBA', (S, S), hexrgb(VARIANTS[variant][len(VARIANTS[variant]) // 2][1]) + (0,))
        glow.putalpha(mask.filter(ImageFilter.GaussianBlur(S * .03)).point(lambda v: int(v * .35)))
        img = Image.alpha_composite(img, glow)
    fill.putalpha(mask)
    img = Image.alpha_composite(img, fill)
    # keep everything inside the rounded tile
    a = ImageChops.multiply(img.getchannel('A'), shape); img.putalpha(a)
    return img

for v in VARIANTS:
    big, small = tile(v, False), tile(v, True)
    for px in (512, 192, 180):
        big.resize((px, px), Image.LANCZOS).save(f'{OUT}/{v}-{px}.png', optimize=True)
    if v == 'brass':   # the default tab icon; small sizes use the bolder letter so it survives 16 px
        small.resize((48, 48), Image.LANCZOS).save('favicon.ico', sizes=[(16, 16), (32, 32), (48, 48)])
    print(v, 'ok')

# preview sheet: each variant big, and at 32 / 16 px on dark and light tab backgrounds
prev = Image.new('RGB', (1500, 700), '#1c1f26'); d = ImageDraw.Draw(prev)
for i, v in enumerate(VARIANTS):
    x = 40 + i * 490
    big = Image.open(f'{OUT}/{v}-512.png').resize((420, 420), Image.LANCZOS)
    prev.paste(big, (x, 40), big); d.text((x, 470), v, fill='#ddd')
    sm = tile(v, True)
    for row, bgc in enumerate(['#202124', '#f1f3f4']):
        y = 500 + row * 90
        d.rectangle((x, y, x + 420, y + 80), fill=bgc)
        for j, px in enumerate([32, 16]):
            im = sm.resize((px, px), Image.LANCZOS); prev.paste(im, (x + 20 + j * 60, y + 20), im)
prev.save('tools/favicon-preview.png')
