import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, XCircle } from "lucide-react";
import {
  confirmStripeCheckout,
  PAYMENT_RETURN_TO_KEY,
} from "@/api/paymentService";
import { useAuth } from "@/auth/AuthContext";

export default function PaymentResultPage({ status }) {
  const auth = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const success = status === "success";
  const [confirming, setConfirming] = useState(success);

  const returnTo = useMemo(() => {
    const saved = window.sessionStorage.getItem(PAYMENT_RETURN_TO_KEY);
    if (saved) return saved;
    return auth.hasRole?.("Patient") ? "/patient/payments" : "/payments";
  }, [auth]);

  useEffect(() => {
    if (!success) return;

    const sessionId = searchParams.get("session_id");
    if (!sessionId) {
      setConfirming(false);
      return;
    }

    let active = true;
    async function confirm() {
      try {
        await confirmStripeCheckout(sessionId);
      } finally {
        if (active) setConfirming(false);
      }
    }

    void confirm();
    return () => {
      active = false;
    };
  }, [searchParams, success]);

  function goBack() {
    window.sessionStorage.removeItem(PAYMENT_RETURN_TO_KEY);
    navigate(returnTo, { replace: true });
  }

  const Icon = success ? CheckCircle2 : XCircle;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
        <span
          className={`mx-auto inline-flex size-12 items-center justify-center rounded-lg ${
            success ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
          }`}
        >
          <Icon className="size-6" aria-hidden />
        </span>
        <h1 className="mt-4 text-2xl font-semibold text-slate-950">
          {success ? "Payment successful" : "Payment cancelled"}
        </h1>
        <button
          type="button"
          onClick={goBack}
          disabled={confirming}
          className="mt-6 inline-flex h-10 items-center justify-center rounded-lg bg-sky-600 px-4 text-sm font-medium text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Go back
        </button>
      </section>
    </main>
  );
}
