import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Aceita number, string ou Prisma Decimal. */
type Numeric = number | string | { toString(): string } | null | undefined;

export function brl(value: Numeric) {
  const n = Number(value ?? 0);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: n >= 1000 ? 0 : 2 });
}

/** BRL sempre com centavos — para listas financeiras, onde linhas lado a
    lado precisam do MESMO formato (o brl() compacta valores >= 1000). */
export function brlExato(value: Numeric) {
  return Number(value ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function num(value: Numeric) {
  return Number(value ?? 0).toLocaleString("pt-BR");
}

export function pct(value: number | null | undefined, digits = 1) {
  return `${(value ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: digits })}%`;
}

export function shortDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export function fullDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function monthsBetween(start: Date, end: Date) {
  return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
}
