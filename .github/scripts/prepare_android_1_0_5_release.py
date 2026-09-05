from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text(encoding='utf-8')
    if old not in text:
        if new in text:
            return
        raise SystemExit(f'Expected block not found in {path}: {old[:120]!r}')
    file.write_text(text.replace(old, new, 1), encoding='utf-8')


# Mobile header parity with the web layout:
# notification bell on the LEFT, centered page title, company profile/logo on the RIGHT.
replace_once(
    'src/layouts/AppLayout.tsx',
    '''          <div className="h-11" aria-hidden="true" />\n\n          <div className="min-w-0 px-2 text-center">''',
    '''          <div className="flex items-center justify-start">\n            <MobileNotificationBell />\n          </div>\n\n          <div className="min-w-0 px-2 text-center">''',
)

replace_once(
    'src/layouts/AppLayout.tsx',
    '''          <div className="flex items-center justify-end gap-2">\n            <MobileNotificationBell />\n\n            <div\n              ref={\n                profileMenuRef\n              }\n              className="relative"\n            >''',
    '''          <div className="flex items-center justify-end">\n            <div\n              ref={\n                profileMenuRef\n              }\n              className="relative"\n            >''',
)

# Bell dropdown opens inward from the left edge, matching the left-side bell placement.
replace_once(
    'src/components/MobileNotificationBell.tsx',
    '''className="absolute right-0 top-[calc(100%+0.65rem)] w-[min(22rem,calc(100vw-1.5rem-var(--fersys-safe-left)-var(--fersys-safe-right)))]''',
    '''className="absolute left-0 top-[calc(100%+0.65rem)] w-[min(22rem,calc(100vw-1.5rem-var(--fersys-safe-left)-var(--fersys-safe-right)))]''',
)

# Release identity must stay fixed for this Play release.
gradle_path = Path('android/app/build.gradle')
gradle = gradle_path.read_text(encoding='utf-8')
if 'versionCode 7' not in gradle or 'versionName "1.0.5"' not in gradle:
    raise SystemExit('Expected Android release versionCode 7 / versionName 1.0.5')

print('Android 1.0.5 web-parity notification layout applied.')
