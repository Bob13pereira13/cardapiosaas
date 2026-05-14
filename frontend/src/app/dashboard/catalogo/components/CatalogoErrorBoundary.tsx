'use client'

import { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  message: string
}

export class CatalogoErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[CatalogoErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-800">
          <p className="font-semibold">Algo deu errado ao carregar esta seção.</p>
          {this.state.message && (
            <p className="mt-1 text-red-600">{this.state.message}</p>
          )}
          <button
            className="mt-3 text-xs underline hover:no-underline"
            onClick={() => this.setState({ hasError: false, message: '' })}
          >
            Tentar novamente
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
