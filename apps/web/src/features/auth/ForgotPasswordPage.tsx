import { AtSign, Send } from "lucide-react";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { isEmail, TextInput } from "@/components/forms";
import { useAction } from "@/components/overlay";
import { Button } from "@/components/ui";
import { authApi } from "@/data/account";
import { useSession } from "@/lib/session";
import { AuthLayout, safeFrom } from "./AuthLayout";

/** Password reset, or passwordless sign-in when ?mode=code. Both send an email code. */
export default function ForgotPasswordPage() {
  const [params] = useSearchParams();
  const codeSignIn = params.get("mode") === "code";
  const from = safeFrom(params.get("from"));
  const navigate = useNavigate();
  const { account } = useSession();
  const [email, setEmail] = useState(account?.email ?? "");
  const [touched, setTouched] = useState(false);
  const [run, loading] = useAction();

  return (
    <AuthLayout
      title={codeSignIn ? "Sign in with a code" : "Reset password"}
      subtitle={codeSignIn ? "No password needed. We'll email you a one-time 6-digit code." : "Enter your account email and we'll send a code so you can set a new password."}
    >
      <form
        className="stack"
        style={{ gap: 18 }}
        onSubmit={async (e) => {
          e.preventDefault();
          setTouched(true);
          if (!isEmail(email)) return;
          if (await run(() => authApi.requestOtp(email))) {
            navigate(`/verify?email=${encodeURIComponent(email.trim())}&purpose=${codeSignIn ? "login" : "reset"}&from=${encodeURIComponent(from)}`);
          }
        }}
      >
        <TextInput label="Email" type="email" icon={AtSign} placeholder="you@example.com" autoComplete="email" value={email} onValue={setEmail} error={touched && !isEmail(email) ? "Enter a valid email address" : null} autoFocus />
        <Button type="submit" size="lg" block loading={loading} icon={Send}>Send code</Button>
      </form>
    </AuthLayout>
  );
}
