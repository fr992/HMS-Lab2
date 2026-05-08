export const DEFAULT_PAGE_SIZE = 25;

export function getPagedItems(data) {
  return Array.isArray(data) ? data : data?.items ?? [];
}

export function getPagination(data) {
  if (!data || Array.isArray(data)) {
    return {
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
      totalCount: Array.isArray(data) ? data.length : 0,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    };
  }

  return {
    page: data.page ?? 1,
    pageSize: data.pageSize ?? DEFAULT_PAGE_SIZE,
    totalCount: data.totalCount ?? 0,
    totalPages: data.totalPages ?? 0,
    hasNextPage: Boolean(data.hasNextPage),
    hasPreviousPage: Boolean(data.hasPreviousPage),
  };
}

export function PaginationBar({ pagination, loading, onPageChange }) {
  if (!pagination || pagination.totalPages <= 1) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3 text-sm">
      <p className="text-slate-500">
        Showing page <span className="font-medium text-slate-900">{pagination.page}</span> of{" "}
        <span className="font-medium text-slate-900">{pagination.totalPages}</span>
        <span className="text-slate-400"> · {pagination.totalCount} total</span>
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(pagination.page - 1)}
          disabled={loading || !pagination.hasPreviousPage}
          className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={() => onPageChange(pagination.page + 1)}
          disabled={loading || !pagination.hasNextPage}
          className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
