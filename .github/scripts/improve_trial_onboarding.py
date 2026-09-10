from pathlib import Path


def replace_once(path: str, old: str, new: str):
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f'Anchor not found in {path}: {old[:80]!r}')
    p.write_text(text.replace(old, new, 1))

# Login: make the no-card trial promise visible before registration.
replace_once(
    'src/pages/LoginPage.tsx',
    """                <Link\n                  to=\"/register\"\n                  className=\"mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-2xl border border-violet-400/25 bg-violet-500/10 px-5 py-3 text-sm font-bold text-violet-200 transition hover:bg-violet-500/15\"\n                >\n                  Registriraj svoju tvrtku\n                </Link>""",
    """                <Link\n                  to=\"/register\"\n                  className=\"mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-2xl border border-violet-400/25 bg-violet-500/10 px-5 py-3 text-sm font-bold text-violet-200 transition hover:bg-violet-500/15\"\n                >\n                  Započni 7 dana besplatno\n                </Link>\n\n                <p className=\"mt-2 text-xs font-semibold text-emerald-300/90\">\n                  Bez kartice · puni Business pristup · bez automatske naplate\n                </p>""",
)

# Registration: explain exactly when the trial starts and that approval is required.
replace_once(
    'src/pages/RegisterPage.tsx',
    """            <p className=\"mt-2 text-sm leading-6 text-slate-400\">\n              Nova tvrtka postaje aktivna nakon provjere FERSYS administratora.\n            </p>""",
    """            <p className=\"mt-2 text-sm leading-6 text-slate-400\">\n              Nakon potvrde e-maila i odobrenja FERSYS administracije počinje 7 dana besplatnog Business pristupa.\n            </p>\n            <p className=\"mt-2 text-xs font-bold text-emerald-300\">\n              Bez kartice · bez automatske naplate · trial se može administrativno produžiti bez kartice\n            </p>""",
)

# Pricing: clarify trial semantics and make inactive billing explicit rather than showing dead CTAs.
replace_once(
    'src/pages/PricingPage.tsx',
    """              <p className=\"mt-1 text-sm leading-6 text-violet-200/70\">\n                Trial traje {TRIAL_DAYS} dana i uključuje Business funkcije.\n                {trialDaysRemaining > 0\n                  ? ` Preostalo ti je još ${trialDaysRemaining} dana.`\n                  : ''}\n              </p>""",
    """              <p className=\"mt-1 text-sm leading-6 text-violet-200/70\">\n                Trial traje {TRIAL_DAYS} dana i uključuje puni Business pristup bez kartice i bez automatske naplate.\n                {trialDaysRemaining > 0\n                  ? ` Preostalo ti je još ${trialDaysRemaining} dana.`\n                  : ''}\n              </p>\n              <p className=\"mt-2 text-xs font-semibold text-violet-200/60\">\n                Ako FERSYS administracija produži trial, kartica i dalje nije potrebna. Paket se odabire tek za nastavak korištenja nakon isteka triala.\n              </p>""",
)
replace_once(
    'src/pages/PricingPage.tsx',
    """            <p className=\"mt-5 text-sm text-slate-500\">\n              Novi korisnici dobivaju {TRIAL_DAYS} dana besplatnog {plans[TRIAL_PLAN_ID].name} paketa.\n            </p>""",
    """            <div className=\"mx-auto mt-5 max-w-2xl rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4\">\n              <p className=\"text-sm font-black text-emerald-300\">\n                {TRIAL_DAYS} dana besplatno · bez kartice · bez automatske naplate\n              </p>\n              <p className=\"mt-1 text-xs leading-5 text-emerald-200/70\">\n                Novi korisnici nakon odobrenja dobivaju puni {plans[TRIAL_PLAN_ID].name} pristup. Plaćeni paket odabire se tek nakon isteka triala.\n              </p>\n            </div>""",
)
replace_once(
    'src/pages/PricingPage.tsx',
    """                  disabled={\n                    isCurrent\n                  }""",
    """                  disabled={true}""",
)
replace_once(
    'src/pages/PricingPage.tsx',
    """                    isCurrent\n                      ? 'cursor-default border border-emerald-500/25 bg-emerald-500/10 text-emerald-300'\n                      : plan.id === 'pro'\n                        ? 'bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-lg shadow-violet-950/30 hover:brightness-110'\n                        : plan.id === 'business'\n                          ? 'bg-blue-600 text-white hover:bg-blue-500'\n                          : 'border border-slate-700 bg-slate-800 text-white hover:bg-slate-700'""",
    """                    isCurrent\n                      ? 'cursor-default border border-emerald-500/25 bg-emerald-500/10 text-emerald-300'\n                      : 'cursor-not-allowed border border-slate-700 bg-slate-800 text-slate-400 opacity-80'""",
)
replace_once(
    'src/pages/PricingPage.tsx',
    """                  {isCurrent\n                    ? 'Trenutni paket'\n                    : plan.id === 'pro'\n                      ? 'Odaberi FERSYS Pro'\n                      : yearly\n                        ? 'Odaberi godišnje'\n                        : 'Odaberi mjesečno'}""",
    """                  {isCurrent\n                    ? 'Trenutni paket'\n                    : isTrialing\n                      ? 'Odabir nakon triala'\n                      : 'Plaćanje još nije aktivirano'}""",
)

print('Trial onboarding copy and inactive billing UI updated.')
