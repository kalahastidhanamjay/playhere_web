import QRCode from "qrcode";
import { useEffect, useState } from "react";

/** A scannable QR code for `value`, drawn dark-on-white so phone cameras read it in either theme. */
export function QrCode({ value, size = 200, label }: { value: string; size?: number; label: string }) {
  const [svg, setSvg] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    QRCode.toString(value, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#0b1020", light: "#ffffff" } })
      .then((s) => live && setSvg(s))
      .catch(() => live && setSvg(null));
    return () => {
      live = false;
    };
  }, [value]);
  return (
    <div
      role="img"
      aria-label={label}
      style={{ width: size, height: size, padding: 10, background: "#fff", borderRadius: 16, boxSizing: "content-box" }}
      // The SVG comes from the qrcode library for our own invite link, not from user input.
      dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
    />
  );
}
