"""Generate original prompt-card icons; never alter the supplied Avon photos."""
from pathlib import Path
from PIL import Image, ImageDraw

target = Path(__file__).parent / 'dist' / 'icons'
target.mkdir(exist_ok=True)
icon = Image.new('RGB', (1024, 1024), '#e5004b')
d = ImageDraw.Draw(icon)
d.rounded_rectangle((228, 276, 796, 748), radius=66, fill='white')
d.polygon([(308, 726), (308, 814), (418, 726)], fill='white')
for end, y in [(637, 416), (702, 510), (564, 604)]:
    d.rounded_rectangle((322, y, end, y + 28), radius=14, fill='#e5004b')
d.polygon([(714, 161), (738, 222), (799, 246), (738, 270),
           (714, 331), (690, 270), (629, 246), (690, 222)], fill='white')
for filename, size in [('icon-192.png', 192), ('icon-512.png', 512),
                       ('icon-maskable-512.png', 512), ('apple-touch-icon.png', 180)]:
    icon.resize((size, size), Image.Resampling.LANCZOS).save(target / filename)
print('Created 4 opaque PWA icons (192, 512, maskable 512, Apple 180).')
