import { ArrowRight, AtSign, Lock, MailCheck } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { isEmail, TextInput } from "@/components/forms";
import { useAction } from "@/components/overlay";
import { Button } from "@/components/ui";
import { useSession } from "@/lib/session";
import { AuthLayout, safeFrom } from "./AuthLayout";

export default function LoginPage() {
  const { signIn } = useSession();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const from = safeFrom(params.get("from"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState(false);
  const [run, loading] = useAction();

  const emailError = touched && !isEmail(email) ? "Enter a valid email address" : null;

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to score matches, manage your teams and track your stats."
      footer={
        <p className="muted" style={{ textAlign: "center" }}>
          New to PlayHere? <Link className="link" to={`/register?from=${encodeURIComponent(from)}`}>Create account</Link>
        </p>
      }
    >
      <form
        className="stack"
        style={{ gap: 18 }}
        onSubmit={async (e) => {
          e.preventDefault();
          setTouched(true);
          if (!isEmail(email) || !password) return;
          if (await run(() => signIn(email, password))) navigate(from, { replace: true });
        }}
      >
        <TextInput label="Email" type="email" icon={AtSign} placeholder="you@example.com" autoComplete="email" value={email} onValue={setEmail} error={emailError} autoFocus />
        <TextInput label="Password" type="password" icon={Lock} placeholder="Your password" autoComplete="current-password" value={password} onValue={setPassword} error={touched && !password ? "Password is required" : null} />
        <Link to="/forgot-password" className="link" style={{ alignSelf: "flex-end", marginTop: -6 }}>Forgot password?</Link>
        <Button type="submit" size="lg" block loading={loading} trailing={ArrowRight}>Sign in</Button>
        <Link to={`/forgot-password?mode=code&from=${encodeURIComponent(from)}`} className="btn btn-secondary btn-lg btn-block">
          <MailCheck size={18} aria-hidden /> Sign in with email code
        </Link>
      </form>
    </AuthLayout>
  );
}
