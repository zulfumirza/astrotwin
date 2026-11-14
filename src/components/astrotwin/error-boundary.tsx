// Catches a crash inside one screen and shows a recovery card instead of a
// blank page. Resets when the user moves to another screen.
import { Component, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'

interface Props {
  resetKey: string
  title: string
  body: string
  retry: string
  children: ReactNode
}
interface State {
  error: Error | null
}

export class ScreenErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidUpdate(prev: Props) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null })
  }

  componentDidCatch(error: Error) {
    console.warn('[AstroTwin] screen error caught:', error.message)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div role="alert" className="flex flex-col items-start gap-3 rounded-2xl border bg-background p-5">
        <h2 className="text-lg font-medium">{this.props.title}</h2>
        <p className="text-sm text-muted-foreground">{this.props.body}</p>
        <Button type="button" onClick={() => this.setState({ error: null })}>
          {this.props.retry}
        </Button>
      </div>
    )
  }
}
