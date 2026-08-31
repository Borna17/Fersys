from pathlib import Path

p = Path('src/pages/RegisterPage.tsx')
text = p.read_text(encoding='utf-8')


def once(old: str, new: str) -> None:
    global text
    if old not in text:
        raise SystemExit(f'Pattern not found: {old[:120]!r}')
    text = text.replace(old, new, 1)


once(
    "import {\n  Building2,\n  CheckCircle2,\n  Eye,",
    "import {\n  Building2,\n  CheckCircle2,\n  Eye,\n  KeyRound,",
)

marker = "\nexport function RegisterPage() {"
helpers = r'''

type PasswordStrength = {
  score: number
  label: string
  hint: string
}

function getPasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return {
      score: 0,
      label: 'Nije unesena',
      hint: 'Upiši lozinku ili generiraj sigurnu lozinku.',
    }
  }

  let score = 0
  if (password.length >= 14) score += 1
  if (password.length >= 18) score += 1
  if (/[A-ZČĆŽŠĐ]/.test(password) && /[a-zčćžšđ]/.test(password)) score += 1
  if (/\d/.test(password)) score += 1
  if (/[^A-Za-z0-9ČĆŽŠĐčćžšđ\s]/.test(password)) score += 1

  if (/(1234|4321|qwerty|asdf|password|lozinka|admin|firma)/i.test(password)) {
    score = Math.min(score, 2)
  }

  if (score <= 1) {
    return {
      score,
      label: 'Vrlo slaba',
      hint: 'Dodaj više znakova, velika i mala slova, broj i poseban znak.',
    }
  }

  if (score === 2) {
    return {
      score,
      label: 'Slaba',
      hint: 'Lozinka još nije dovoljno sigurna za FERSYS.',
    }
  }

  if (score === 3) {
    return {
      score,
      label: 'Dobra',
      hint: 'Još malo pojačaj lozinku za bolju zaštitu.',
    }
  }

  if (score === 4) {
    return {
      score,
      label: 'Jaka',
      hint: 'Lozinka je jaka.',
    }
  }

  return {
    score: 5,
    label: 'Vrlo jaka',
    hint: 'Odlična lozinka za FERSYS račun.',
  }
}

function generateStrongPassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lower = 'abcdefghijkmnopqrstuvwxyz'
  const digits = '23456789'
  const symbols = '!@#$%&*+-_=?.'
  const all = upper + lower + digits + symbols

  const pick = (chars: string) => {
    const values = new Uint32Array(1)
    crypto.getRandomValues(values)
    return chars[values[0] % chars.length]
  }

  const chars = [
    pick(upper),
    pick(lower),
    pick(digits),
    pick(symbols),
  ]

  while (chars.length < 20) {
    chars.push(pick(all))
  }

  for (let i = chars.length - 1; i > 0; i -= 1) {
    const values = new Uint32Array(1)
    crypto.getRandomValues(values)
    const j = values[0] % (i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }

  return chars.join('')
}
'''

if marker not in text:
    raise SystemExit('RegisterPage marker not found')
text = text.replace(marker, helpers + marker, 1)

once(
    "  const passwordError =\n    useMemo(\n      () =>\n        password\n          ? getPasswordError(\n              password,\n            )\n          : '',\n      [password],\n    )\n",
    "  const passwordError =\n    useMemo(\n      () =>\n        password\n          ? getPasswordError(\n              password,\n            )\n          : '',\n      [password],\n    )\n\n  const passwordStrength =\n    useMemo(\n      () => getPasswordStrength(password),\n      [password],\n    )\n\n  function handleGeneratePassword() {\n    const generated = generateStrongPassword()\n    setPassword(generated)\n    setPasswordConfirm(generated)\n    setShowPassword(true)\n    setError('')\n  }\n",
)

once(
    '''                    <input
                      type={
                        showPassword
                          ? 'text'
                          : 'password'
                      }
                      autoComplete="new-password"
                      value={
                        password
                      }''',
    '''                    <input
                      id="fersys-new-password"
                      name="password"
                      type={
                        showPassword
                          ? 'text'
                          : 'password'
                      }
                      autoComplete="new-password"
                      minLength={MIN_PASSWORD_LENGTH}
                      required
                      value={
                        password
                      }''',
)

once(
    '''                    <input
                      type={
                        showPassword
                          ? 'text'
                          : 'password'
                      }
                      autoComplete="new-password"
                      value={
                        passwordConfirm
                      }''',
    '''                    <input
                      id="fersys-confirm-password"
                      name="password-confirmation"
                      type={
                        showPassword
                          ? 'text'
                          : 'password'
                      }
                      autoComplete="new-password"
                      minLength={MIN_PASSWORD_LENGTH}
                      required
                      value={
                        passwordConfirm
                      }''',
)

old_block = '''                {password && (
                  <div
                    className={`rounded-2xl border px-4 py-3 text-xs leading-5 ${
                      passwordError
                        ? 'border-amber-500/20 bg-amber-500/10 text-amber-200'
                        : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200'
                    }`}
                  >
                    {passwordError ||
                      'Lozinka zadovoljava FERSYS sigurnosna pravila.'}
                  </div>
                )}
'''

new_block = '''                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-black text-slate-200">
                        Sigurnost lozinke
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {passwordStrength.hint}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleGeneratePassword}
                      className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-violet-500/25 bg-violet-500/10 px-3 text-xs font-black text-violet-300 transition hover:bg-violet-500/15"
                    >
                      <KeyRound size={16} />
                      Generiraj snažnu lozinku
                    </button>
                  </div>

                  <div
                    className="mt-4 grid grid-cols-5 gap-1.5"
                    aria-label={`Jačina lozinke: ${passwordStrength.label}`}
                  >
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div
                        key={level}
                        className={`h-2 rounded-full transition-all ${
                          level <= passwordStrength.score
                            ? passwordStrength.score <= 2
                              ? 'bg-red-500'
                              : passwordStrength.score === 3
                                ? 'bg-amber-400'
                                : 'bg-emerald-500'
                            : 'bg-slate-800'
                        }`}
                      />
                    ))}
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3 text-xs">
                    <span className="text-slate-500">
                      Najmanje 14 znakova, velika/mala slova, broj i poseban znak.
                    </span>
                    <strong
                      className={
                        passwordStrength.score <= 2
                          ? 'text-red-300'
                          : passwordStrength.score === 3
                            ? 'text-amber-300'
                            : 'text-emerald-300'
                      }
                    >
                      {passwordStrength.label}
                    </strong>
                  </div>

                  {password && passwordError && (
                    <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs leading-5 text-amber-200">
                      {passwordError}
                    </div>
                  )}

                  {password && !passwordError && (
                    <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs leading-5 text-emerald-200">
                      Lozinka zadovoljava FERSYS sigurnosna pravila.
                    </div>
                  )}
                </div>
'''

once(old_block, new_block)

p.write_text(text, encoding='utf-8')
