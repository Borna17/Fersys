import {
  Gift,
  LoaderCircle,
} from 'lucide-react'
import {
  useEffect,
  useState,
} from 'react'
import {
  useNavigate,
  useParams,
} from 'react-router'

import {
  saveReferralCode,
} from '../services/referral.service'

export function ReferralLandingPage() {
  const { code = '' } =
    useParams()

  const navigate =
    useNavigate()

  const [invalid, setInvalid] =
    useState(false)

  useEffect(() => {
    const normalized =
      code.trim().toUpperCase()

    if (
      !/^[A-Z0-9]{6,16}$/.test(
        normalized,
      )
    ) {
      setInvalid(true)
      return
    }

    saveReferralCode(
      normalized,
    )

    const timer =
      window.setTimeout(() => {
        navigate(
          `/register?ref=${encodeURIComponent(
            normalized,
          )}`,
          {
            replace: true,
          },
        )
      }, 900)

    return () =>
      window.clearTimeout(
        timer,
      )
  }, [code, navigate])

  return (
    <main className="grid min-h-dvh place-items-center bg-slate-950 p-5 text-white">
      <section className="w-full max-w-md rounded-[2rem] border border-violet-500/20 bg-slate-900 p-7 text-center shadow-2xl shadow-black/40">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-violet-500/10 text-violet-300">
          <Gift size={30} />
        </div>

        <h1 className="mt-5 text-2xl font-black">
          FERSYS preporuka
        </h1>

        {invalid ? (
          <>
            <p className="mt-3 text-sm leading-6 text-red-300">
              Referral link nije ispravan.
            </p>

            <button
              type="button"
              onClick={() =>
                navigate(
                  '/register',
                  {
                    replace:
                      true,
                  },
                )
              }
              className="mt-6 min-h-12 rounded-2xl bg-violet-600 px-5 font-black text-white"
            >
              Nastavi na registraciju
            </button>
          </>
        ) : (
          <>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Preporuka je spremljena.
              Preusmjeravamo te na
              FERSYS registraciju.
            </p>

            <LoaderCircle
              size={24}
              className="mx-auto mt-6 animate-spin text-violet-300"
            />
          </>
        )}
      </section>
    </main>
  )
}
