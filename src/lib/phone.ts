/** Normalize common UK/local phone inputs to E.164 for SMS gateways. */
export function toE164Phone(
  raw: string | null | undefined,
  defaultCountry: "GB" = "GB",
): string | null {
  if (!raw) return null;
  let value = raw.trim().replace(/[\s().-]/g, "");
  if (!value) return null;

  if (value.startsWith("00")) {
    value = `+${value.slice(2)}`;
  }

  if (value.startsWith("+")) {
    const digits = value.slice(1).replace(/\D/g, "");
    return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
  }

  const digits = value.replace(/\D/g, "");
  if (!digits) return null;

  if (defaultCountry === "GB") {
    if (digits.startsWith("44") && digits.length >= 11 && digits.length <= 13) {
      return `+${digits}`;
    }
    if (digits.startsWith("0") && digits.length >= 10 && digits.length <= 11) {
      return `+44${digits.slice(1)}`;
    }
    if (digits.length === 10 && digits.startsWith("7")) {
      return `+44${digits}`;
    }
  }

  if (digits.length >= 8 && digits.length <= 15) {
    return `+${digits}`;
  }

  return null;
}
