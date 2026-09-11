from pathlib import Path


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'{label}: anchor not found')
    return text.replace(old, new, 1)

# Make only the UserCard profile tile the entry point to personal settings.
path = Path('src/components/Sidebar.tsx')
text = path.read_text(encoding='utf-8')
marker = 'function UserCard({'
start = text.find(marker)
if start < 0:
    raise SystemExit('UserCard not found')
prefix = text[:start]
user_card = text[start:]
old_open = """  return (\n    <div\n      className={`flex items-center rounded-2xl bg-slate-800/70 ${\n        expanded\n          ? 'gap-3 p-3'\n          : 'justify-center p-2'\n      }`}\n      title={\n        !expanded\n          ? `${displayName} · ${displayRole}`\n          : undefined\n      }\n    >"""
new_open = """  return (\n    <NavLink\n      to=\"/account\"\n      className={({ isActive }) =>\n        `flex items-center rounded-2xl transition ${\n          isActive ? 'bg-blue-600/20 ring-1 ring-blue-500/30' : 'bg-slate-800/70 hover:bg-slate-800'\n        } ${expanded ? 'gap-3 p-3' : 'justify-center p-2'}`\n      }\n      title={\n        !expanded\n          ? `${displayName} · ${displayRole}`\n          : 'Otvori moje postavke'\n      }\n    >"""
user_card = replace_once(user_card, old_open, new_open, 'user card opening')
old_close = """      )}\n    </div>\n  )\n}"""
new_close = """      )}\n    </NavLink>\n  )\n}"""
user_card = replace_once(user_card, old_close, new_close, 'user card closing')
path.write_text(prefix + user_card, encoding='utf-8')

# Employees also get personal settings/language; owner-only referral/subscription
# information remains restricted to the owner.
path = Path('src/pages/AccountPage.tsx')
text = path.read_text(encoding='utf-8')
old = """  if (\n    role !== 'owner'\n  ) {\n    return (\n      <section className=\"mx-auto max-w-xl rounded-3xl border border-amber-500/20 bg-slate-900 p-7 text-center\">\n        <Building2\n          size={32}\n          className=\"mx-auto text-amber-300\"\n        />\n\n        <h1 className=\"mt-4 text-2xl font-black text-white\">\n          Moj FERSYS je\n          račun vlasnika\n        </h1>\n\n        <p className=\"mt-3 text-sm leading-6 text-slate-400\">\n          Referral bodovi,\n          pretplata i nagrade\n          vezani su uz vlasnika\n          tvrtke.\n        </p>\n      </section>\n    )\n  }"""
new = """  if (\n    role !== 'owner'\n  ) {\n    return (\n      <section className=\"mx-auto w-full max-w-3xl space-y-4 pb-12\">\n        <header className=\"rounded-3xl border border-slate-800 bg-slate-900 p-6\">\n          <p className=\"text-xs font-black uppercase tracking-[0.16em] text-blue-400\">Moje postavke</p>\n          <h1 className=\"mt-2 text-2xl font-black text-white\">{user?.email}</h1>\n          <p className=\"mt-2 text-sm leading-6 text-slate-400\">Osobne postavke vrijede samo za tvoj korisnički račun. Postavke pretplate i firme dostupne su vlasniku.</p>\n        </header>\n        <AppLanguageSelector />\n      </section>\n    )\n  }"""
text = replace_once(text, old, new, 'employee account settings')
path.write_text(text, encoding='utf-8')

print('stage three applied')
