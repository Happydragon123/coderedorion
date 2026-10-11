'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <section className="panel account-panel" role="alert"><p className="eyebrow">Let’s try that again</p><h1>Something went wrong</h1><p className="muted">Please try again. If the problem continues, check the service configuration.</p><button onClick={reset}>Try again</button></section>;
}
