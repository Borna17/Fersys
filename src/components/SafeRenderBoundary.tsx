import {
  Component,
  type ErrorInfo,
  type ReactNode,
} from 'react'

type Props = {
  children: ReactNode
  name?: string
  critical?: boolean
}

type State = {
  hasError: boolean
  message: string
}

export default class SafeRenderBoundary extends Component<
  Props,
  State
> {
  state: State = {
    hasError: false,
    message: '',
  }

  static getDerivedStateFromError(
    error: unknown,
  ): State {
    return {
      hasError: true,
      message:
        error instanceof Error
          ? error.message
          : 'Neočekivana greška.',
    }
  }

  componentDidCatch(
    error: unknown,
    info: ErrorInfo,
  ) {
    console.error(
      `[FERSYS] ${this.props.name ?? 'UI'} runtime error`,
      error,
      info,
    )
  }

  private reset = () => {
    this.setState({
      hasError: false,
      message: '',
    })
  }

  private goDashboard = () => {
    window.location.assign(
      '/dashboard',
    )
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    if (!this.props.critical) {
      return null
    }

    return (
      <section className="mx-auto flex min-h-[55vh] w-full max-w-xl items-center justify-center p-4">
        <div className="w-full rounded-3xl border border-red-500/20 bg-slate-900 p-6 text-center shadow-2xl shadow-black/30">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-red-500/10 text-2xl">
            !
          </div>

          <h1 className="mt-5 text-xl font-black text-white">
            Ovaj dio FERSYS-a se nije pravilno učitao
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-400">
            Podaci nisu obrisani. Možeš ponovno pokušati učitati ovaj prikaz
            ili se vratiti na Dashboard.
          </p>

          {this.state.message && (
            <p className="mt-3 break-words rounded-xl bg-slate-950/60 px-3 py-2 text-[11px] text-slate-500">
              {this.state.message}
            </p>
          )}

          <div className="mt-6 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={this.reset}
              className="min-h-12 rounded-2xl bg-blue-600 px-4 text-sm font-black text-white active:scale-[0.99]"
            >
              Pokušaj ponovno
            </button>

            <button
              type="button"
              onClick={this.goDashboard}
              className="min-h-12 rounded-2xl bg-slate-800 px-4 text-sm font-black text-slate-300 active:scale-[0.99]"
            >
              Dashboard
            </button>
          </div>
        </div>
      </section>
    )
  }
}
