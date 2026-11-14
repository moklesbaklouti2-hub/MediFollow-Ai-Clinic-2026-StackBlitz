// QW-183/184: an administrative form may save only explicit, plausible
// whole-number ages. Never convert scientific notation, decimals or blanks.
export function parsePatientAgeInput(input: unknown): number | null {
  if (typeof input !== 'string') return null;
  const text = input.trim();
  if (!/^\d{1,3}$/.test(text)) return null;
  const age = Number(text);
  return Number.isInteger(age) && age >= 0 && age <= 130 ? age : null;
}
