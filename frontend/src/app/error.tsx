'use client';

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
      <p className="font-semibold">Something went wrong</p>
      <p className="text-sm">{error.message}</p>
      <button onClick={reset} className="mt-3 rounded bg-red-600 px-3 py-1 text-white">
        Retry
      </button>
    </div>
  );
}
