from pathlib import Path

p = Path('src/pages/RegisterPage.tsx')
s = p.read_text()

needle = "import { supabase } from '../lib/supabase'\n"
repl = "import { supabase } from '../lib/supabase'\nimport { isNativeApp } from '../lib/platform'\n"
assert needle in s
s = s.replace(needle, repl, 1)

needle = "    if (!captchaToken) {\n      setError(\n        'Potvrdi sigurnosnu provjeru prije registracije.',\n      )\n      return\n    }"
repl = "    if (!captchaToken && !isNativeApp()) {\n      setError(\n        'Potvrdi sigurnosnu provjeru prije registracije.',\n      )\n      return\n    }"
assert needle in s
s = s.replace(needle, repl, 1)

needle = "              captchaToken,\n              data: {"
repl = "              ...(captchaToken ? { captchaToken } : {}),\n              data: {"
assert needle in s
s = s.replace(needle, repl, 1)

needle = "        'Registracija je zaprimljena. Provjeri e-mail i potvrdi račun. Nakon potvrde FERSYS administrator će pregledati prijavu i aktivirati tvrtku.',"
repl = "        'Registracija je zaprimljena. Provjeri e-mail i potvrdi svoju e-mail adresu. Nakon potvrde prijava čeka odobrenje FERSYS administracije i bit će pregledana u što kraćem roku.',"
assert needle in s
s = s.replace(needle, repl, 1)

p.write_text(s)

p = Path('src/router/AppRouter.tsx')
s = p.read_text()
needle = 'return <AccessDeniedPage title="Registracija čeka potvrdu" description="Tvoja prijava je zaprimljena. FERSYS administrator mora potvrditi tvrtku prije prvog korištenja. Dobit ćeš pristup čim prijava bude odobrena." />'
repl = 'return <AccessDeniedPage title="Čeka se potvrda FERSYS administracije" description="E-mail je potvrđen i tvoja registracija je uspješno zaprimljena. FERSYS administracija pregledat će prijavu u što kraćem roku. Dobit ćeš pristup čim tvrtka bude odobrena." />'
assert needle in s
s = s.replace(needle, repl, 1)
p.write_text(s)
