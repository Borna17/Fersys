import type { FormEvent } from 'react'
import {
  Eye,
  EyeOff,
  KeyRound,
} from 'lucide-react'
import { useState } from 'react'
import {
  Link,
  useNavigate,
} from 'react-router'

import { supabase } from '../lib/supabase'

export function ResetPasswordPage() {
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] =
    useState('')
  const [showPassword, setShowPassword] =
    useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] =
    useState(false)

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()
    setError('')

    if (password.length < 8) {
      setError(
        'Lozinka mora imati najmanje 8 znakova.',
      )
      return
    }

    if (password !== passwordConfirm) {
      setError('Lozinke se ne podudaraju.')
      return
    }

    setIsSubmitting(true)

    const { error: updateError } =
      await supabase.auth.updateUser({
        password,
      })

    if (updateError) {
      setError(updateError.message)
      setIsSubmitting(false)
      return
    }

    navigate('/dashboard', {
      replace: true,
    })
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-slate-950 px-4 py-8 text-white">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl sm:p-8">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-violet-500/15 text-violet-300">
          <KeyRound size={27} />
        </div>

        <h1 className="mt-5 text-center text-2xl font-black">
          Postavi novu lozinku
        </h1>

        <form
          onSubmit={handleSubmit}
          className="mt-7 space-y-5"
        >
          <PasswordField
            label="Nova lozinka"
            value={password}
            show={showPassword}
            onChange={setPassword}
          />

          <PasswordField
            label="Ponovi lozinku"
            value={passwordConfirm}
            show={showPassword}
            onChange={setPasswordConfirm}
          />

          <label className="flex items-center gap-3 text-sm text-slate-400">
            <input
              type="checkbox"
              checked={showPassword}
              onChange={(event) =>
                setShowPassword(event.target.checked)
              }
              className="accent-violet-600"
            />
            Prikaži lozinke
          </label>

          {error && (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="min-h-12 w-full rounded-2xl bg-violet-600 px-5 py-3 font-bold text-white disabled:opacity-50"
          >
            {isSubmitting
              ? 'Spremanje...'
              : 'Spremi novu lozinku'}
          </button>

          <Link
            to="/login"
            className="block text-center text-sm font-bold text-violet-400"
          >
            Povratak na prijavu
          </Link>
        </form>
      </div>
    </main>
  )
}

function PasswordField({
  label,
  value,
  show,
  onChange,
}: {
  label: string
  value: string
  show: boolean
  onChange: (value: string) => void
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-200">
        {label}
      </span>

      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
          className="h-13 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 pr-12 text-white outline-none focus:border-violet-500"
        />

        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">
          {show ? (
            <EyeOff size={19} />
          ) : (
            <Eye size={19} />
          )}
        </span>
      </div>
    </label>
  )
}


