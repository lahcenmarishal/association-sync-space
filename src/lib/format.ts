import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

export function formatMontant(value: number | string | null | undefined, devise = "DH") {
  const n = Number(value ?? 0);
  const abs = Math.abs(n).toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  // Isolation LTR : le signe "-" reste à gauche du nombre et la devise à droite, même en RTL.
  return `\u2066${n < 0 ? "-" : ""}${abs} ${devise}\u2069`;
}

export function formatDate(value: string | Date | null | undefined, pattern = "dd/MM/yyyy") {
  if (!value) return "—";
  const d = typeof value === "string" ? parseISO(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return format(d, pattern, { locale: fr });
}

export function formatDateTime(value: string | Date | null | undefined) {
  return formatDate(value, "dd/MM/yyyy HH:mm");
}

export function formatHeure(value: string | Date | null | undefined) {
  if (!value) return "—";
  if (typeof value === "string" && /^\d{2}:\d{2}/.test(value)) return value.slice(0, 5);
  return formatDate(value, "HH:mm");
}

export function todayISO() {
  return format(new Date(), "yyyy-MM-dd");
}

export function monthLabel(index: number) {
  return [
    "Jan",
    "Fév",
    "Mar",
    "Avr",
    "Mai",
    "Juin",
    "Juil",
    "Août",
    "Sep",
    "Oct",
    "Nov",
    "Déc",
  ][index];
}
