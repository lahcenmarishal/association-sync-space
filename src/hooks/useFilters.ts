import { useMemo, useState } from "react";

export type FiltersState = {
  q: string;
  annee: string;
  mois: string;
  categorie: string;
  du: string;
  au: string;
  min: string;
  max: string;
  extra: string;
};

export const emptyFilters: FiltersState = {
  q: "",
  annee: "all",
  mois: "all",
  categorie: "all",
  du: "",
  au: "",
  min: "",
  max: "",
  extra: "all",
};

export function useFilters() {
  const [filters, setFilters] = useState<FiltersState>(emptyFilters);
  const set = (patch: Partial<FiltersState>) => setFilters((f) => ({ ...f, ...patch }));
  const reset = () => setFilters(emptyFilters);
  const active = useMemo(
    () => Object.entries(filters).filter(([k, v]) => v !== emptyFilters[k as keyof FiltersState]).length,
    [filters],
  );
  return { filters, set, reset, active };
}

export function matchFilters(
  item: {
    date: string;
    montant?: number;
    categorie_id?: string | null;
    texte: string;
    extra?: string;
  },
  f: FiltersState,
) {
  if (f.q && !item.texte.toLowerCase().includes(f.q.toLowerCase())) return false;
  if (f.annee !== "all" && !item.date.startsWith(f.annee)) return false;
  if (f.mois !== "all" && item.date.slice(5, 7) !== f.mois) return false;
  if (f.categorie !== "all" && item.categorie_id !== f.categorie) return false;
  if (f.extra !== "all" && item.extra !== f.extra) return false;
  if (f.du && item.date < f.du) return false;
  if (f.au && item.date > f.au) return false;
  if (f.min && Number(item.montant ?? 0) < Number(f.min)) return false;
  if (f.max && Number(item.montant ?? 0) > Number(f.max)) return false;
  return true;
}

export function usePagination<T>(rows: T[], pageSize = 10) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, totalPages);
  const slice = rows.slice((current - 1) * pageSize, current * pageSize);
  return { page: current, totalPages, slice, setPage };
}
