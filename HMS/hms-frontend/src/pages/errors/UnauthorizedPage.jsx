import { Link } from "react-router-dom";

export default function UnauthorizedPage() {
  return (
    <div className="mx-auto max-w-md p-8 text-center">
      <h1 className="text-2xl font-semibold text-slate-900">Access denied</h1>
      <p className="mt-2 text-slate-600">
        You do not have permission to open this page. Contact an administrator
        if you need access.
      </p>
      <Link
        to="/login"
        className="mt-6 inline-block text-sm text-sky-700 hover:underline"
      >
        Back to sign in
      </Link>
    </div>
  );
}
