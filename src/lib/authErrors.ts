export function friendlyAuthError(err: unknown): string {
  const code =
    typeof err === "object" && err && "code" in err
      ? String((err as { code?: string }).code)
      : "";
  const raw = err instanceof Error ? err.message : "Something went wrong";

  if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found")) {
    return "Wrong email or password.";
  }
  if (code.includes("email-already-in-use")) {
    return "That email already has an account. Sign in instead.";
  }
  if (code.includes("weak-password")) {
    return "Use a password with at least 6 characters.";
  }
  if (code.includes("invalid-email")) {
    return "Enter a valid email address.";
  }
  if (code.includes("unauthorized-domain")) {
    return "This domain is not allowed in Firebase Auth yet.";
  }
  if (code.includes("popup") || code.includes("cancelled") || code.includes("operation-not-supported")) {
    return "Google sign-in is blocked in the Home Screen app. Use email.";
  }
  if (code.includes("argument-error")) {
    return "Sign-in hit a setup error. Use email and password.";
  }
  return raw.replace(/^Firebase:\s*/i, "").replace(/\s*\(auth\/.*\)\.?$/, "");
}
