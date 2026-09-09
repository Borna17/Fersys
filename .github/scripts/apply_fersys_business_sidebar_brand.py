from pathlib import Path
import re

path = Path('src/components/Sidebar.tsx')
text = path.read_text(encoding='utf-8')

new = '''function Brand({
  expanded,
}: {
  expanded: boolean
}) {
  return (
    <div className="flex min-w-0 items-center">
      {expanded ? (
        <img
          src="/logo.svg"
          alt="FERSYS Business"
          className="h-10 w-auto max-w-[165px] object-contain object-left"
        />
      ) : (
        <img
          src={fersysIcon}
          alt="FERSYS Business"
          className="h-11 w-11 shrink-0 object-contain"
        />
      )}
    </div>
  )
}

'''

pattern = r'function Brand\(\{[\s\S]*?\n\}\n\n(?=function UserCard\()'
updated, count = re.subn(pattern, new, text, count=1)
if count != 1:
    raise SystemExit(f'Expected exactly one Brand block, found {count}; refusing to modify Sidebar.tsx')

path.write_text(updated, encoding='utf-8')
print('Updated Sidebar Brand to FERSYS Business horizontal logo.')
