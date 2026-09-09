from pathlib import Path

path = Path('src/components/Sidebar.tsx')
text = path.read_text(encoding='utf-8')

old = '''function Brand({
  expanded,
}: {
  expanded: boolean
}) {
  return (
    <div className="flex items-center gap-3">
      <img
        src={fersysIcon}
        alt="FERSYS"
        className="h-11 w-11 shrink-0 object-contain"
      />

      {expanded && (
        <span className="text-2xl font-black tracking-[0.08em] text-slate-50">
          FERSYS
        </span>
      )}
    </div>
  )
}
'''

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

if old not in text:
    raise SystemExit('Expected Brand block not found; refusing to modify Sidebar.tsx')

path.write_text(text.replace(old, new, 1), encoding='utf-8')
print('Updated Sidebar Brand to FERSYS Business horizontal logo.')
