import { Component, StrictMode, type ErrorInfo, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
// Styles first so a later module crash still leaves a readable page.
import './styles.css';
import App from './App';

class BootErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App boot failed', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <main className="app">
          <header className="app__header">
            <h1>Anonymous Event Check-in</h1>
            <p className="app__subtitle">UI failed to start</p>
          </header>
          <pre className="status status--error" style={{ whiteSpace: 'pre-wrap' }}>
            {this.state.error.message}
          </pre>
        </main>
      );
    }
    return this.props.children;
  }
}

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');

createRoot(rootEl).render(
  <StrictMode>
    <BootErrorBoundary>
      <App />
    </BootErrorBoundary>
  </StrictMode>,
);
