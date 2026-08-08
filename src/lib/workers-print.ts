
const logoEddahab = "/logo-eddahab.png";
import type { Travailleur } from "@/lib/data";

const esc = (v: unknown) => String(v ?? "").replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

/** Coordonnées bancaires de l'association (ordre de virement des salaires). */
export const BANQUE_ASSOCIATION = {
  nom: "Attijariwafa bank",
  agence: "Agence Laqliaa – Aït Melloul",
  compte: "0006594000303072",
};

const ENTETE_ASSOCIATION =
  "ASSOCIATION ADDAHAB POUR L'EAU POTABLE, LE DÉVELOPPEMENT ET LA COOPÉRATION";

export const FICHE_CSS = `
  .ordre-root * { box-sizing: border-box; }
  .ordre-root { font-family: "Times New Roman", Georgia, serif; color: #111; background: #fff; direction: ltr; }
  .ordre-root .ordre { padding: 42px 46px; }
  .ordre-root .logo { text-align: center; margin-bottom: 26px; }
  .ordre-root .logo img { width: 110px; height: 110px; object-fit: contain; }
  .ordre-root h1 { font-size: 15px; font-weight: 700; margin: 0 0 14px; line-height: 1.4; letter-spacing: .2px; }
  .ordre-root .dest { font-size: 14px; line-height: 1.6; margin-bottom: 22px; }
  .ordre-root .objet { font-size: 14px; font-weight: 700; margin-bottom: 6px; }
  .ordre-root .compte { font-size: 14px; margin-bottom: 20px; }
  .ordre-root .compte b { font-weight: 700; letter-spacing: 1px; }
  .ordre-root p.corps { font-size: 14px; line-height: 1.7; margin: 0 0 18px; text-align: justify; }
  .ordre-root table { width: 100%; border-collapse: collapse; margin-bottom: 22px; }
  .ordre-root th, .ordre-root td { border: 1px solid #444; padding: 8px 9px; font-size: 12.5px; text-align: left; }
  .ordre-root th { background: #f0f0f0; font-weight: 700; }
  .ordre-root td.montant, .ordre-root th.montant { text-align: right; white-space: nowrap; }
  .ordre-root .total { font-size: 14px; font-weight: 700; margin-bottom: 30px; }
  .ordre-root .bas { display: flex; justify-content: space-between; align-items: flex-end; font-size: 14px; margin-top: 40px; }
  .ordre-root .bas .gauche div { margin-bottom: 6px; }
  .ordre-root .bas .sign { text-align: center; line-height: 1.6; }
`;

const nombre = (v: number) =>
  new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);

/** Ordre de virement des salaires adressé à la banque de l'association. */
export function ordreVirementHtml(travailleurs: Travailleur[], association: string, ville = "Laqliaa") {
  const total = travailleurs.reduce((s, w) => s + Number(w.salaire || 0), 0);
  const lignes = travailleurs
    .map(
      (w) => `<tr>
        <td>${esc(w.nom_complet)}</td>
        <td>${esc(w.cin)}</td>
        <td>${esc(w.rib)}</td>
        <td>${esc(w.banque) || esc(BANQUE_ASSOCIATION.nom)}</td>
        <td class="montant">${nombre(Number(w.salaire || 0))}</td>
      </tr>`,
    )
    .join("");
  const d = new Date();
  const jour = String(d.getDate()).padStart(2, "0");
  const mois = String(d.getMonth() + 1).padStart(2, "0");

  return `
    <section class="ordre">
      <div class="logo"><img src="${logoEddahab}" alt="" crossorigin="anonymous" /></div>
      <h1>${esc(ENTETE_ASSOCIATION)}</h1>
      <div class="dest">
        À<br />
        Monsieur le Directeur<br />
        ${esc(BANQUE_ASSOCIATION.nom)}<br />
        ${esc(BANQUE_ASSOCIATION.agence)}
      </div>
      <div class="objet">Objet : Ordre de virement des salaires</div>
      <div class="compte">Compte N° : <b>${esc(BANQUE_ASSOCIATION.compte)}</b></div>
      <p class="corps">Monsieur le Directeur,</p>
      <p class="corps">
        Nous vous prions de bien vouloir débiter notre compte ci-dessus et effectuer les virements
        des salaires des ouvriers selon les indications ci-après.
      </p>
      <table>
        <thead>
          <tr>
            <th>Nom et Prénom</th>
            <th>CIN</th>
            <th>N° RIB</th>
            <th>Banque</th>
            <th class="montant">Montant (MAD)</th>
          </tr>
        </thead>
        <tbody>${lignes || `<tr><td colspan="5">—</td></tr>`}</tbody>
      </table>
      <div class="total">Montant total : ${nombre(total)} MAD</div>
      <div class="bas">
        <div class="gauche">
          <div>Fait à : ${esc(ville)}</div>
          <div>Le : ${jour}/${mois}/${d.getFullYear()}</div>
        </div>
        <div class="sign">
          Le Président de l'Association<br />
          Signature et cachet
        </div>
      </div>
      <div style="font-size:11px;color:#666;margin-top:6px;">${esc(association)}</div>
    </section>`;
}
