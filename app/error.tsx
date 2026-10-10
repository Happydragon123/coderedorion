'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <section className="panel"><h1>Something went wrong</h1><p>Please try again. If the problem continues, check the service configuration.</p><button onClick={reset}>Try again</button></section>;
}
