import type { Travailleur } from "@/lib/data";
import { ordreVirementHtml, FICHE_CSS } from "@/lib/workers-print";
import { telechargerHtmlPdf } from "@/lib/html-pdf";

const PDF_CSS = FICHE_CSS;

function nomFichier(base: string) {
  return `${base.replace(/[^\p{L}\p{N}_-]+/gu, "_").slice(0, 60) || "ordre_virement"}.pdf`;
}

/** Ordre de virement pour un seul travailleur. */
export async function telechargerFichePdf(
  travailleur: Travailleur,
  association: string,
  _devise?: string,
) {
  await telechargerFichesPdf(
    [travailleur],
    association,
    _devise,
    nomFichier(`Ordre_virement_${travailleur.nom_complet}`),
  );
}

/** Ordre de virement des salaires (tous les travailleurs sélectionnés). */
export async function telechargerFichesPdf(
  travailleurs: Travailleur[],
  association: string,
  _devise?: string,
  filename = "Ordre_de_virement_des_salaires.pdf",
) {
  if (!travailleurs.length) return;
  const html = `<div class="ordre-root">${ordreVirementHtml(travailleurs, association)}</div>`;
  await telechargerHtmlPdf({ html, css: PDF_CSS, filename, dir: "ltr" });
}
