from pathlib import Path

# Release verification trigger: 2026-09-06

def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text(encoding='utf-8')
    if old not in text:
        raise SystemExit(f'Expected block not found in {path}: {old[:120]!r}')
    file.write_text(text.replace(old, new, 1), encoding='utf-8')

# Mobile header: keep the title optically centered and put notifications on the right,
# next to the company profile/logo. This also removes the old left-side bell layout.
replace_once(
    'src/layouts/AppLayout.tsx',
    '''        <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between border-b border-slate-800/80 bg-slate-950/95 px-4 py-2 backdrop-blur-xl md:hidden">\n          <MobileNotificationBell />\n\n          <div className="min-w-0 flex-1 px-3 text-center">''',
    '''        <header className="sticky top-0 z-30 grid min-h-16 grid-cols-[5.5rem_minmax(0,1fr)_5.5rem] items-center border-b border-slate-800/80 bg-slate-950/95 px-3 py-2 backdrop-blur-xl md:hidden">\n          <div className="h-11" aria-hidden="true" />\n\n          <div className="min-w-0 px-2 text-center">''',
)

replace_once(
    'src/layouts/AppLayout.tsx',
    '''          <div\n            ref={\n              profileMenuRef\n            }\n            className="relative"\n          >''',
    '''          <div className="flex items-center justify-end gap-2">\n            <MobileNotificationBell />\n\n            <div\n              ref={\n                profileMenuRef\n              }\n              className="relative"\n            >''',
)

# Close the extra wrapper introduced around the profile menu immediately before the header ends.
replace_once(
    'src/layouts/AppLayout.tsx',
    '''            )}\n          </div>\n        </header>''',
    '''            )}\n            </div>\n          </div>\n        </header>''',
)

# Notification dropdown is now anchored on the right side so it always opens into the screen.
replace_once(
    'src/components/MobileNotificationBell.tsx',
    '''className="absolute left-0 top-[calc(100%+0.65rem)] w-[min(22rem,calc(100vw-1.5rem-var(--fersys-safe-left)-var(--fersys-safe-right)))]''',
    '''className="absolute right-0 top-[calc(100%+0.65rem)] w-[min(22rem,calc(100vw-1.5rem-var(--fersys-safe-left)-var(--fersys-safe-right)))]''',
)

# Next Play release. Codes 5/6 have already been consumed; 7 is the next safe code.
replace_once('android/app/build.gradle', '        versionCode 5\n        versionName "1.0.4"', '        versionCode 7\n        versionName "1.0.5"')

print('Android 1.0.5 release polish applied.')
