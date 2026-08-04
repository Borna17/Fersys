import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-white">
      <h1 className="text-7xl font-extrabold text-blue-500">404</h1>

      <p className="mt-4 text-xl text-slate-400">
        Stranica nije pronađena.
      </p>

      <Link
        to="/dashboard"
        className="mt-8 rounded-xl bg-blue-600 px-6 py-3 font-semibold hover:bg-blue-500"
      >
        Vrati se na Dashboard
      </Link>
    </main>
  )
}
