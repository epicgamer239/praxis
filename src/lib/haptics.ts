export function haptic(kind: "light" | "success" | "heavy" = "light") {
  try {
    if (kind === "heavy") navigator.vibrate?.([10, 30, 50, 30, 70]);
    else if (kind === "success") navigator.vibrate?.([14, 36, 28]);
    else navigator.vibrate?.(12);
  } catch {
    /* ignore */
  }
}
