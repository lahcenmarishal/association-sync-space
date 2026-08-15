/**
 * Rapport « caisse quotidienne ».
 *
 * Logique réelle de l'association : la caisse n'a pas de « recettes » propres,
 * elle est **rechargée** (montant initial d'une caisse ouverte) puis dépensée
 * en espèces. Le côté crédit du rapport correspond donc aux rechargements de
 * caisse, et le côté débit aux dépenses payées en espèces.
 */
export const EST_ESPECES = (moyen: string | null | undefined) => (moyen ?? "") === "especes";

export type OpCaisse = {
  date: string;
  montant: number | string;
  moyen_paiement?: string | null;
  pieces_jointes?: unknown;
  piece_jointe?: unknown;
  justificatif?: unknown;
};

/** Rechargement de caisse (une ouverture de caisse avec son montant initial). */
export type RechargeCaisse = { date: string; montant: number | string };

export type JourCaisse = {
  date: string;
  nb: number;
  recettes: number;
  depenses: number;
  solde: number;
  cumul: number;
  docs: string[];
};

/** Convertit les caisses en rechargements exploitables par le rapport. */
export function rechargesDeCaisses(
  caisses: { date: string; montant_initial: number | string }[],
  dansPeriode: (date: string) => boolean = () => true,
): RechargeCaisse[] {
  return caisses
    .filter((c) => dansPeriode(c.date) && Number(c.montant_initial) > 0)
    .map((c) => ({ date: c.date, montant: Number(c.montant_initial) }));
}

export function caisseParJour(
  recharges: RechargeCaisse[],
  depenses: OpCaisse[],
  docsDe: (ops: OpCaisse[]) => string[],
): JourCaisse[] {
  const dep = depenses.filter((x) => EST_ESPECES(x.moyen_paiement));
  const jours = new Map<string, { rec: RechargeCaisse[]; dep: OpCaisse[] }>();
  for (const x of recharges) {
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
        docs: docsDe(j.dep),
      };
    });
}
