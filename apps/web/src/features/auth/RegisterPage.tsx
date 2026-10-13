import { ArrowRight, AtSign, User } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { isEmail, TextInput } from "@/components/forms";
import { useAction } from "@/components/overlay";
import { Button } from "@/components/ui";
import { authApi } from "@/data/account";
import { AuthLayout, safeFrom } from "./AuthLayout";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const from = safeFrom(params.get("from"));
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [run, loading] = useAction();

  return (
    <AuthLayout
      title="Join PlayHere"
      subtitle="One free account for playing, organising and following the sports you love."
      footer={
        <p className="muted" style={{ textAlign: "center" }}>
          Already have an account? <Link className="link" to="/login">Sign in</Link>
        </p>
      }
    >
      <form
        className="stack"
        style={{ gap: 18 }}
        onSubmit={async (e) => {
          e.preventDefault();
          setTouched(true);
          if (!name.trim() || !isEmail(email)) return;
          if (await run(() => authApi.requestOtp(email, name))) {
            navigate(`/verify?email=${encodeURIComponent(email.trim())}&purpose=register&from=${encodeURIComponent(from)}`);
          }
        }}
      >
        <TextInput label="Full name" icon={User} placeholder="e.g. Rahul Kumar" autoComplete="name" value={name} onValue={setName} error={touched && !name.trim() ? "Name is required" : null} autoFocus />
        <TextInput
          label="Email"
          type="email"
          icon={AtSign}
          placeholder="you@example.com"
          autoComplete="email"
          value={email}
          onValue={setEmail}
          error={touched && !isEmail(email) ? "Enter a valid email address" : null}
          hint="We'll send a 6-digit code to verify it's you."
        />
        <Button type="submit" size="lg" block loading={loading} trailing={ArrowRight}>Continue</Button>
        <p className="faint small" style={{ textAlign: "center" }}>By continuing you agree to play fair and respect the PlayHere community.</p>
      </form>
    </AuthLayout>
  );
}
