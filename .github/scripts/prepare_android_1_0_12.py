from pathlib import Path

p = Path('android/app/build.gradle')
text = p.read_text(encoding='utf-8')
text = text.replace('versionCode 13', 'versionCode 14')
text = text.replace('versionName "1.0.11"', 'versionName "1.0.12"')
p.write_text(text, encoding='utf-8')

p = Path('scripts/prepare-android-release.mjs')
text = p.read_text(encoding='utf-8')
import re
text = re.sub(r"const EXPECTED_VERSION_CODE = \d+", "const EXPECTED_VERSION_CODE = 14", text)
text = re.sub(r"const EXPECTED_VERSION_NAME = '[^']+'", "const EXPECTED_VERSION_NAME = '1.0.12'", text)
p.write_text(text, encoding='utf-8')

print('Android release metadata prepared for 1.0.12 (14).')
