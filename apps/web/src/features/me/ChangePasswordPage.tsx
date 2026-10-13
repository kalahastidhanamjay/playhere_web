import { Lock, LockKeyhole } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { StrengthMeter, TextInput } from "@/components/forms";
import { useAction } from "@/components/overlay";
import { Button, PageHeader } from "@/components/ui";
import { authApi } from "@/data/account";

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [touched, setTouched] = useState(false);
  const [run, loading] = useAction();

  const errors = {
    current: !current ? "Enter your current password" : null,
    next: next.length < 8 ? "Use at least 8 characters" : next === current ? "Choose a password you haven't used here" : null,
    confirm: confirm !== next ? "Passwords don't match" : null,
  };

  return (
    <div className="page page-narrow">
      <PageHeader back title="Change password" subtitle="At least 8 characters. A mix of letters, numbers and symbols is strongest." />
      <form
        className="stack"
        style={{ gap: 20 }}
        onSubmit={async (e) => {
          e.preventDefault();
          setTouched(true);
          if (Object.values(errors).some(Boolean)) return;
          if (await run(() => authApi.changePassword(current, next), "Password changed")) navigate(-1);
        }}
      >
        <div className="stack" style={{ gap: 6 }}>
          <TextInput label="Current password" type="password" icon={Lock} autoComplete="current-password" value={current} onValue={setCurrent} error={touched ? errors.current : null} />
          <Link to="/forgot-password" className="link small" style={{ alignSelf: "flex-end" }}>Forgot it?</Link>
        </div>
        <div className="stack" style={{ gap: 10 }}>
          <TextInput label="New password" type="password" icon={LockKeyhole} autoComplete="new-password" value={next} onValue={setNext} error={touched ? errors.next : null} />
          <StrengthMeter password={next} />
        </div>
        <TextInput label="Confirm new password" type="password" icon={LockKeyhole} autoComplete="new-password" value={confirm} onValue={setConfirm} error={touched ? errors.confirm : null} />
        <Button type="submit" size="lg" block loading={loading}>Update password</Button>
      </form>
    </div>
  );
}
