export default function EmptyState({ title, description, action }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
      <h3 className="text-sm font-medium text-slate-800">{title}</h3>
      {description && (
        <p className="mt-2 text-sm text-slate-500">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
