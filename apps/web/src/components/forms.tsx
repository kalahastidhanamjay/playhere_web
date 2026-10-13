import { Eye, EyeOff, type LucideIcon } from "lucide-react";
import { useId, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

interface FieldProps {
  label?: string;
  hint?: string;
  error?: string | null;
  children: (id: string) => ReactNode;
}

/** Label + control + hint/error, wired with ids for accessibility. */
export function Field({ label, hint, error, children }: FieldProps) {
  const id = useId();
  return (
    <div className="field">
      {label && (
        <span>
          <label htmlFor={id}>{label}</label>
        </span>
      )}
      {children(id)}
      {error ? <span className="err" role="alert">{error}</span> : hint ? <span className="hint">{hint}</span> : null}
    </div>
  );
}

interface TextInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  label?: string;
  hint?: string;
  error?: string | null;
  icon?: LucideIcon;
  onValue?: (value: string) => void;
}

export function TextInput({ label, hint, error, icon: Icon, onValue, type = "text", ...rest }: TextInputProps) {
  const [shown, setShown] = useState(false);
  const isPassword = type === "password";
  return (
    <Field label={label} hint={hint} error={error}>
      {(id) => (
        <div className="input-wrap">
          {Icon && <Icon size={18} aria-hidden />}
          <input
            id={id}
            className="input"
            type={isPassword && shown ? "text" : type}
            aria-invalid={!!error}
            onChange={(e) => onValue?.(e.target.value)}
            style={isPassword ? { paddingRight: 44 } : undefined}
            {...rest}
          />
          {isPassword && (
            <button type="button" className="toggle" aria-label={shown ? "Hide password" : "Show password"} onClick={() => setShown((s) => !s)}>
              {shown ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          )}
        </div>
      )}
    </Field>
  );
}

interface TextAreaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange"> {
  label?: string;
  hint?: string;
  onValue?: (value: string) => void;
}

export function TextArea({ label, hint, onValue, ...rest }: TextAreaProps) {
  return (
    <Field label={label} hint={hint}>
      {(id) => <textarea id={id} className="textarea" onChange={(e) => onValue?.(e.target.value)} {...rest} />}
    </Field>
  );
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "onChange"> {
  label?: string;
  options: { value: string; label: string }[];
  onValue?: (value: string) => void;
}

export function Select({ label, options, onValue, ...rest }: SelectProps) {
  return (
    <Field label={label}>
      {(id) => (
        <select id={id} className="select" onChange={(e) => onValue?.(e.target.value)} {...rest}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}

export function Chips<T extends string | number>({ options, value, onChange, label, scroll }: { options: { value: T; label: string; icon?: LucideIcon }[]; value: T; onChange: (v: T) => void; label?: string; scroll?: boolean }) {
  return (
    <div className="field">
      {label && <span>{label}</span>}
      <div className={scroll ? "chips chips-scroll" : "chips"} role="group" aria-label={label}>
        {options.map((o) => (
          <button key={String(o.value)} type="button" className="chip" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
            {o.icon && <o.icon size={15} aria-hidden />}
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Segmented<T extends string | number>({ options, value, onChange, label }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; label?: string }) {
  return (
    <div className="seg" role="tablist" aria-label={label}>
      {options.map((o) => (
        <button key={String(o.value)} type="button" role="tab" aria-selected={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.value} type="button" role="tab" aria-selected={t.value === value} onClick={() => onChange(t.value)}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

/** 0-4 score for the password strength meter. */
export function passwordStrength(value: string): number {
  let score = 0;
  if (value.length >= 8) score++;
  if (value.length >= 12) score++;
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score++;
  if (/\d/.test(value) && /[^A-Za-z0-9]/.test(value)) score++;
  return score;
}

export function StrengthMeter({ password }: { password: string }) {
  const score = password ? passwordStrength(password) : 0;
  const [label, color] = [
    ["Too short", "var(--text-3)"],
    ["Weak", "var(--danger)"],
    ["Fair", "var(--warning)"],
    ["Good", "var(--info)"],
    ["Strong", "var(--success)"],
  ][score];
  return (
    <div className="row" aria-live="polite">
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className="grow" style={{ height: 5, borderRadius: 3, background: i < score ? color : "var(--surface-sunken)", transition: "background .2s" }} />
      ))}
      <span className="small" style={{ color, width: 64, fontWeight: 700 }}>{label}</span>
    </div>
  );
}

export const isEmail = (v: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.trim());
