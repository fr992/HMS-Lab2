export default function ErrorState({ message, onRetry }) {
  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-rose-900">
      <p className="text-sm font-medium">Something went wrong</p>
      <p className="mt-1 text-sm opacity-90">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-md bg-rose-700 px-3 py-1.5 text-sm text-white hover:bg-rose-800"
        >
          Try again
        </button>
      )}
    </div>
  );
}
