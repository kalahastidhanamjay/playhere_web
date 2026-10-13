import { AtSign, Mail, Pin } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { isEmail, TextInput } from "@/components/forms";
import { useAction } from "@/components/overlay";
import { Button, PageHeader } from "@/components/ui";
import { authApi } from "@/data/account";
import { useSession } from "@/lib/session";

/** Two steps: the new address, then the code sent to it. */
export default function ChangeEmailPage() {
  const { account, confirmEmailChange } = useSession();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [touched, setTouched] = useState(false);
  const [run, loading] = useAction();
  const current = account?.email ?? "";

  const emailError = !isEmail(email) ? "Enter a valid email address" : email.trim().toLowerCase() === current.toLowerCase() ? "That's already your email" : null;

  const sendCode = async () => {
    setTouched(true);
    if (emailError) return;
    if (await run(() => authApi.requestEmailChange(email), `Code sent to ${email.trim()}`)) setSent(true);
  };

  return (
    <div className="page page-narrow">
      <PageHeader back title="Change email" subtitle="Your email is how you sign in. We'll verify the new address before switching." />
      <form
        className="stack"
        style={{ gap: 20 }}
        onSubmit={async (e) => {
          e.preventDefault();
          if (!sent) return void sendCode();
          if (!/^\d{6}$/.test(code.trim())) return;
          if (await run(() => confirmEmailChange(email, code), "Email updated. Use it the next time you sign in.")) navigate(-1);
        }}
      >
        <div className="card row" style={{ background: "var(--surface-sunken)" }}>
          <Mail size={20} className="faint" />
          <span className="stack" style={{ gap: 0 }}>
            <span className="label">Current email</span>
            <strong>{current}</strong>
          </span>
        </div>
        <TextInput label="New email" type="email" icon={AtSign} placeholder="you@example.com" value={email} onValue={setEmail} disabled={sent} error={touched && !sent ? emailError : null} />
        {sent && (
          <>
            <TextInput
              label="6-digit code"
              icon={Pin}
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              value={code}
              onValue={(v) => setCode(v.replace(/\D/g, "").slice(0, 6))}
            />
            <div className="row spread">
              <Button variant="ghost" size="sm" onClick={() => setSent(false)}>Change address</Button>
              <Button variant="ghost" size="sm" disabled={loading} onClick={sendCode}>Resend code</Button>
            </div>
          </>
        )}
        <Button type="submit" size="lg" block loading={loading} disabled={sent && code.length !== 6}>
          {sent ? "Confirm new email" : "Send verification code"}
        </Button>
      </form>
    </div>
  );
}
