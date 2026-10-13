import { Lock } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { StrengthMeter, TextInput } from "@/components/forms";
import { useAction } from "@/components/overlay";
import { Button } from "@/components/ui";
import { authApi } from "@/data/account";
import { AuthLayout } from "./AuthLayout";

export default function SetPasswordPage() {
  const [params] = useSearchParams();
  const email = params.get("email") ?? "";
  const isNew = params.get("purpose") !== "reset";
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [touched, setTouched] = useState(false);
  const [run, loading] = useAction();
  const next = isNew ? "/onboarding" : "/";

  const tooShort = password.length < 8;
  const mismatch = confirm !== password;

  return (
    <AuthLayout
      title={isNew ? "Secure your account" : "Choose a new password"}
      subtitle={isNew ? "Set a password so you can sign in quickly next time." : "At least 8 characters with a mix of letters, numbers and symbols."}
    >
      <form
        className="stack"
        style={{ gap: 18 }}
        onSubmit={async (e) => {
          e.preventDefault();
          setTouched(true);
          if (tooShort || mismatch) return;
          if (await run(() => authApi.setPassword(email, password), isNew ? "You're all set!" : "Password updated")) navigate(next, { replace: true });
        }}
      >
        <div className="stack" style={{ gap: 10 }}>
          <TextInput label="New password" type="password" icon={Lock} autoComplete="new-password" value={password} onValue={setPassword} error={touched && tooShort ? "Use at least 8 characters" : null} autoFocus />
          <StrengthMeter password={password} />
        </div>
        <TextInput label="Confirm password" type="password" icon={Lock} autoComplete="new-password" value={confirm} onValue={setConfirm} error={touched && mismatch ? "Passwords don't match" : null} />
        <Button type="submit" size="lg" block loading={loading}>Save password</Button>
        {isNew && <Link to={next} className="link" style={{ textAlign: "center" }}>Skip for now</Link>}
      </form>
    </AuthLayout>
  );
}
