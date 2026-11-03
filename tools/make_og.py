"""Link-preview card (Open Graph image) for alinategh.com, 1200x630, in the site's navy & brass.

Run from the repo root:   python3 tools/make_og.py      (after tools/make_favicons.py)
Needs:  pip install pillow fonttools brotli
        the site's fonts unpacked under tools/fonts/ :
          cd tools/fonts && npm pack @fontsource/fraunces @fontsource/ibm-plex-mono && for f in *.tgz; do mkdir -p "${f%.tgz}" && tar -xzf "$f" -C "${f%.tgz}"; done
Writes: assets/og-image.jpg
"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from fontTools.ttLib import TTFont
import glob, os, random
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))

W, H = 1200, 630
SS = 2                      # draw at 2x, downscale for smooth edges
os.makedirs('tools/fonts/ttf', exist_ok=True)
for w in glob.glob('tools/fonts/*/package/files/*.woff2'):
    out = 'tools/fonts/ttf/' + os.path.basename(w).replace('.woff2', '.ttf')
    if not os.path.exists(out):
        f = TTFont(w); f.flavor = None; f.save(out)
F = lambda name, size: ImageFont.truetype(f'tools/fonts/ttf/{name}.ttf', size * SS)
DISPLAY_B = lambda s: F('fraunces-latin-700-normal', s)
DISPLAY_I = lambda s: F('fraunces-latin-500-italic', s)
MONO = lambda s: F('ibm-plex-mono-latin-400-normal', s)
MONO_M = lambda s: F('ibm-plex-mono-latin-500-normal', s)

IVORY, MUTED, DIM = (239, 232, 216), (161, 169, 196), (105, 114, 154)
BRASS, CLARET, COOL = (226, 178, 90), (217, 96, 127), (147, 182, 255)

img = Image.new('RGB', (W * SS, H * SS))
px = img.load()
# radial navy background, lighter at the top centre like the site
for y in range(H * SS):
    for x in range(0, W * SS, 4):
        dx, dy = (x / SS - W * .42) / W, (y / SS + H * .15) / H
        t = min(1, (dx * dx * 1.1 + dy * dy) ** .5 / 1.05)
        a, b, c = (19, 29, 61), (10, 17, 36), (4, 7, 15)
        col = tuple(round(a[i] + (b[i] - a[i]) * min(1, t / .5)) if t < .5 else round(b[i] + (c[i] - b[i]) * (t - .5) / .5) for i in range(3))
        for k in range(4):
            if x + k < W * SS: px[x + k, y] = col
d = ImageDraw.Draw(img, 'RGBA')

# five faint staff lines, the site's motif
for i in range(5):
    y = (96 + i * 12) * SS
    d.line((0, y, W * SS, y), fill=(170, 188, 255, 22), width=SS)

# a large musical note built from 0s and 1s, fading into the right side
random.seed(7)
note = Image.new('L', (520 * SS, 560 * SS), 0)
ImageDraw.Draw(note).text((260 * SS, 290 * SS), '♫', font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 380 * SS) if os.path.exists('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf') else MONO(300), fill=255, anchor='mm')
npx = note.load(); cell = 11 * SS; dig = MONO(10)
ox, oy = 690 * SS, 110 * SS
for y in range(0, note.height, cell):
    for x in range(0, note.width, cell):
        if npx[min(note.width - 1, x + cell // 2), min(note.height - 1, y + cell // 2)] > 120:
            fade = max(0, min(1, (x / note.width) * 1.4))
            a = int(random.uniform(30, 70) * (0.35 + fade * 0.65))
            if random.random() < .04: a = 150
            d.text((ox + x, oy + y), random.choice('01'), font=dig, fill=BRASS + (a,))

# left: the hero card content
x0 = 80
d.text((x0 * SS, 92 * SS), 'ali@dev', font=MONO_M(24), fill=BRASS)
w = d.textlength('ali@dev', font=MONO_M(24))
d.text((x0 * SS + w, 92 * SS), ':~$ whoami', font=MONO(24), fill=MUTED)
w2 = d.textlength(':~$ whoami ', font=MONO(24))
d.rectangle((x0 * SS + w + w2, 96 * SS, x0 * SS + w + w2 + 13 * SS, 122 * SS), fill=BRASS)

name_y = 150
d.text((x0 * SS, name_y * SS), 'Ali', font=DISPLAY_B(132), fill=IVORY)
wa = d.textlength('Ali ', font=DISPLAY_B(132))
d.text((x0 * SS + wa, name_y * SS), 'Nategh', font=DISPLAY_I(132), fill=BRASS)

d.text((x0 * SS, 330 * SS), 'Software Engineer · Full-Stack & HTTP APIs', font=MONO_M(29), fill=IVORY)
lines = ['TypeScript, Node.js, C#/.NET and SQL Server.', 'Built Mergify, a Shopify app rated 4.6/5.', 'Composer and pianist off the clock.']
for i, t in enumerate(lines):
    d.text((x0 * SS, (382 + i * 40) * SS), t, font=MONO(25), fill=MUTED)

# bottom: brass-to-claret rule and the domain
by = 540
grad = Image.new('RGBA', (430 * SS, 4 * SS))
for x in range(grad.width):
    t = x / grad.width
    grad.paste(tuple(round(BRASS[i] + (CLARET[i] - BRASS[i]) * t) for i in range(3)) + (255,), (x, 0, x + 1, grad.height))
img.paste(grad, (x0 * SS, by * SS), grad)
d.text((x0 * SS, (by + 22) * SS), 'alinategh.com', font=MONO_M(26), fill=IVORY)
dw = d.textlength('alinategh.com', font=MONO_M(26))
d.text((x0 * SS + dw + 18 * SS, (by + 22) * SS), '·  Toronto, ON', font=MONO(26), fill=DIM)

# the calligraphic A tile, bottom right
tile = Image.open('assets/icons/brass-512.png').convert('RGBA').resize((128 * SS, 128 * SS), Image.LANCZOS)
shadow = Image.new('RGBA', tile.size, (0, 0, 0, 0)); shadow.putalpha(tile.getchannel('A').point(lambda v: v * .55))
shadow = shadow.filter(ImageFilter.GaussianBlur(18 * SS))
img.paste((0, 0, 0), (W * SS - 205 * SS, 72 * SS), shadow)
img.paste(tile, (W * SS - 205 * SS, 62 * SS), tile)

img = img.resize((W, H), Image.LANCZOS)
img.convert('RGB').save('assets/og-image.jpg', quality=90, optimize=True)
print('assets/og-image.jpg', os.path.getsize('assets/og-image.jpg'))
