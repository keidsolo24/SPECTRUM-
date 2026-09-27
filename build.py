"""Build Aurora 11: inline v11/ sources into a single index.html. Standard library only."""
from pathlib import Path
import re, base64
b = Path(__file__).resolve().parent; src = b / 'source'
RELEASE = 'aurora-11.0'
def font_inline(css):
    def rep(m):
        f = src / m.group(1)
        return 'url(data:font/woff2;base64,' + base64.b64encode(f.read_bytes()).decode() + ')'
    return re.sub(r'url\((fonts/[^)]+\.woff2)\)', rep, css)
s = (src / 'app.html').read_text(encoding='utf-8')
s = re.sub(r'<link rel="stylesheet" href="([^"]+)">', lambda m: '<style data-source="' + m.group(1) + '">\n' + font_inline((src / m.group(1)).read_text(encoding='utf-8')) + '\n</style>', s)
s = re.sub(r'<script src="([^"]+)"></script>', lambda m: '<script data-source="' + m.group(1) + '">\n' + (src / m.group(1)).read_text(encoding='utf-8').replace('</script', '<\\/script') + '\n</script>', s)
s = s.replace('<html lang="en"', f'<html data-release="{RELEASE}" lang="en"', 1)
(b / 'index.html').write_text(s, encoding='utf-8')
print('Built index.html:', (b / 'index.html').stat().st_size, 'bytes')
