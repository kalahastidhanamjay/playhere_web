import { RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useAction } from "@/components/overlay";
import { Button } from "@/components/ui";
import { authApi } from "@/data/account";
import { useSession } from "@/lib/session";
import { AuthLayout, safeFrom } from "./AuthLayout";

const RESEND_AFTER = 30;

export default function VerifyPage() {
  const [params] = useSearchParams();
  const email = params.get("email") ?? "";
  const purpose = params.get("purpose") ?? "register"; // register | reset | login
  const from = safeFrom(params.get("from"));
  const navigate = useNavigate();
  const { verifyOtp } = useSession();
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [left, setLeft] = useState(RESEND_AFTER);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const [run, loading] = useAction();
  const [resend, resending] = useAction();

  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);

  const code = digits.join("");

  async function submit(value = code) {
    if (value.length !== 6) return;
    const ok = await run(() => verifyOtp(email, value));
    if (!ok) {
      setDigits(Array(6).fill(""));
      inputs.current[0]?.focus();
      return;
    }
    if (purpose === "login") navigate(from, { replace: true });
    else navigate(`/set-password?email=${encodeURIComponent(email)}&purpose=${purpose}`, { replace: true });
  }

  function setAt(i: number, raw: string) {
    const clean = raw.replace(/\D/g, "");
    if (clean.length > 1) {
      // Pasted the whole code.
      const next = clean.slice(0, 6).split("");
      const filled = [...next, ...Array(6 - next.length).fill("")];
      setDigits(filled);
      inputs.current[Math.min(next.length, 5)]?.focus();
      if (next.length === 6) void submit(next.join(""));
      return;
    }
    const next = [...digits];
    next[i] = clean;
    setDigits(next);
    if (clean && i < 5) inputs.current[i + 1]?.focus();
    if (next.every(Boolean)) void submit(next.join(""));
  }

  return (
    <AuthLayout title="Check your inbox" subtitle={`Enter the 6-digit code we sent to ${email}`}>
      <form
        className="stack"
        style={{ gap: 20 }}
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div className="code-boxes">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => {
                inputs.current[i] = el;
              }}
              className="input"
              inputMode="numeric"
              autoComplete={i === 0 ? "one-time-code" : "off"}
              aria-label={`Digit ${i + 1}`}
              value={d}
              autoFocus={i === 0}
              onChange={(e) => setAt(i, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Backspace" && !d && i > 0) inputs.current[i - 1]?.focus();
              }}
            />
          ))}
        </div>
        <Button type="submit" size="lg" block loading={loading} disabled={code.length !== 6}>Verify</Button>
        <div style={{ textAlign: "center" }}>
          {left > 0 ? (
            <span className="faint">Resend code in {left}s</span>
          ) : (
            <Button
              variant="ghost"
              icon={RefreshCw}
              loading={resending}
              onClick={async () => {
                if (await resend(() => authApi.requestOtp(email), "A new code is on its way")) setLeft(RESEND_AFTER);
              }}
            >
              Resend code
            </Button>
          )}
        </div>
      </form>
    </AuthLayout>
  );
}
