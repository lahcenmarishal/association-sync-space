/**
 * Rapport « caisse quotidienne » : uniquement les opérations en espèces,
 * regroupées jour par jour (recettes, dépenses, solde du jour et cumul).
 */
export const EST_ESPECES = (moyen: string | null | undefined) => (moyen ?? "") === "especes";

export type OpCaisse = {
  date: string;
  montant: number | string;
  moyen_paiement: string;
  pieces_jointes?: unknown;
  piece_jointe?: unknown;
  justificatif?: unknown;
};

export type JourCaisse = {
  date: string;
  nb: number;
  recettes: number;
  depenses: number;
  solde: number;
  cumul: number;
  docs: string[];
};

export function caisseParJour(
  recettes: OpCaisse[],
  depenses: OpCaisse[],
  docsDe: (ops: OpCaisse[]) => string[],
): JourCaisse[] {
  const rec = recettes.filter((x) => EST_ESPECES(x.moyen_paiement));
  const dep = depenses.filter((x) => EST_ESPECES(x.moyen_paiement));
  const jours = new Map<string, { rec: OpCaisse[]; dep: OpCaisse[] }>();
  for (const x of rec) {
    const j = jours.get(x.date) ?? { rec: [], dep: [] };
    j.rec.push(x);
    jours.set(x.date, j);
  }
  for (const x of dep) {
    const j = jours.get(x.date) ?? { rec: [], dep: [] };
    j.dep.push(x);
    jours.set(x.date, j);
  }
  let cumul = 0;
  return Array.from(jours.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, j]) => {
      const totalR = j.rec.reduce((t, x) => t + Number(x.montant), 0);
      const totalD = j.dep.reduce((t, x) => t + Number(x.montant), 0);
      cumul += totalR - totalD;
      return {
        date,
        nb: j.rec.length + j.dep.length,
        recettes: totalR,
        depenses: totalD,
        solde: totalR - totalD,
        cumul,
        docs: docsDe([...j.rec, ...j.dep]),
      };
    });
}
