
const logoEddahab = "/logo-eddahab.png";

const esc = (v: unknown) => String(v ?? "—").replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

export type RapportDocument = { url: string; nom: string };

export type RapportLigne = {
  cellules: string[];
  documents: RapportDocument[];
  /** Colorisation inspirée du registre bancaire : vert = recette, rose = dépense. */
  variante?: "recette" | "depense" | "total";
};

export type RapportWeb = {
  titre: string;
  sousTitre?: string;
  association: string;
  resume: [string, string][];
  entetes: string[];
  lignes: RapportLigne[];
  /** Documents joints au rapport de la période (uploadés depuis la page Rapports). */
  documentsRapport?: RapportDocument[];
};

const isImage = (nom: string) => /\.(png|jpe?g|webp|gif|bmp|avif)$/i.test(nom);
const isPdf = (nom: string) => /\.pdf$/i.test(nom);
const isWord = (nom: string) => /\.(docx?|odt|rtf)$/i.test(nom);

function docHtml(d: RapportDocument) {
  const nom = esc(d.nom);
  const url = esc(d.url);
  if (isImage(d.nom)) {
    return `<a class="doc img" href="${url}" target="_blank" title="${nom}"><img src="${url}" alt="${nom}" /></a>`;
  }
  const type = isPdf(d.nom) ? "PDF" : isWord(d.nom) ? "Word" : "ملف";
  return `<a class="doc file" href="${url}" target="_blank" title="${nom}"><span class="badge">${type}</span><span class="nom">${nom}</span></a>`;
}


/** Index cliquable de tous les liens du rapport (fonctionne aussi dans le PDF). */
function indexLiensHtml(rapport: RapportWeb) {
  const tous: RapportDocument[] = [
    ...(rapport.documentsRapport ?? []),
    ...rapport.lignes.flatMap((l) => l.documents),
  ];
  if (!tous.length) return "";
  const items = tous
    .map(
      (d, i) =>
        `<li><span class="num">${i + 1}</span><a href="${esc(d.url)}" target="_blank">${esc(
          d.nom,
        )}</a></li>`,
    )
    .join("");
  return `<h2 class="annexe-titre">روابط الوثائق (${tous.length})</h2>
  <ol class="liens-index">${items}</ol>`;
}


const CSS = `
  * { box-sizing: border-box; }
  body { margin: 0; font-family: "Segoe UI", Tahoma, Arial, sans-serif; color: #123a3a; background: #f6faf9; }
  .page { max-width: 1200px; margin: 0 auto; padding: 24px; background: #fff; }
  header { display: flex; align-items: center; gap: 18px; background: #123a3a; color: #fff; border-radius: 16px; padding: 20px 24px; }
  header img { width: 86px; height: 86px; object-fit: contain; background: #fff; border-radius: 50%; padding: 6px; }
  header h1 { margin: 0 0 6px; font-size: 26px; }
  header p { margin: 0; color: #9fd8d6; font-size: 15px; }
  .barre { display: flex; gap: 10px; margin: 18px 0; }
  button { font: inherit; background: #0e7c7b; color: #fff; border: 0; border-radius: 10px; padding: 10px 18px; cursor: pointer; }
  button.sec { background: #fff; color: #0e7c7b; border: 1px solid #0e7c7b; }
  .resume { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 18px; }
  .carte { flex: 1 1 180px; background: #fff; border: 1px solid #d3e3e2; border-radius: 14px; padding: 14px; text-align: center; }
  .carte .valeur { font-size: 24px; font-weight: 700; }
  .carte .label { font-size: 13px; color: #0e7c7b; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 14px; overflow: hidden; }
  th, td { border: 1px solid #d3e3e2; padding: 9px 10px; text-align: right; font-size: 13px; vertical-align: middle; }
  th { background: #0e7c7b; color: #fff; }
  tr:nth-child(even) td { background: #f2f7f6; }
  tr.recette td { background: #eaf6e6; }
  tr.recette:nth-child(even) td { background: #e0f0da; }
  tr.depense td { background: #fff3f4; }
  tr.depense:nth-child(even) td { background: #ffebed; }
  tr.total td { background: #123a3a; color: #fff; font-weight: 700; }
  td.docs { min-width: 190px; }
  .doc { display: inline-flex; align-items: center; gap: 6px; margin: 3px; text-decoration: none; color: #0e7c7b; }
  .doc.img img { width: 74px; height: 56px; object-fit: cover; border-radius: 8px; border: 1px solid #d3e3e2; }
  .doc.file { border: 1px solid #d3e3e2; border-radius: 8px; padding: 4px 8px; background: #f2f7f6; max-width: 200px; }
  .doc.file .nom { max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .badge { background: #0e7c7b; color: #fff; border-radius: 5px; padding: 1px 6px; font-size: 11px; }
  .vide { color: #9bb3b2; }
  .annexe-titre { margin: 28px 0 12px; font-size: 22px; color: #0e7c7b; border-top: 2px solid #d3e3e2; padding-top: 18px; }
  .annexe-bloc { background: #fff; border: 1px solid #d3e3e2; border-radius: 14px; padding: 14px; margin-bottom: 14px; }
  .annexe-bloc h3 { margin: 0 0 10px; font-size: 15px; color: #123a3a; }
  .annexe-grille { display: flex; flex-wrap: wrap; gap: 12px; }
  .annexe-grille figure { margin: 0; width: 340px; max-width: 100%; text-align: center; }
  .annexe-grille img { width: 100%; max-height: 420px; object-fit: contain; border: 1px solid #d3e3e2; border-radius: 10px; background: #f2f7f6; }
  .annexe-grille figcaption { font-size: 11px; color: #557; margin-top: 4px; word-break: break-all; }
  .annexe-grille figure.lien a { color: #0e7c7b; font-size: 13px; }
  .annexe-grille figure.lien a.ouvrir, .annexe-grille a.ouvrir, a.ouvrir { display: inline-block; background: #0e7c7b; color: #ffffff; text-decoration: none; border-radius: 6px; padding: 3px 10px; font-size: 12px; font-weight: 600; }
  .nomdoc { font-size: 11px; color: #557; word-break: break-all; margin-top: 3px; }
  .liens-index { margin: 0 0 16px; padding: 0 18px 0 0; list-style: none; }
  .liens-index li { display: flex; align-items: center; gap: 8px; background: #fff; border: 1px solid #d3e3e2; border-radius: 10px; padding: 7px 10px; margin-bottom: 6px; }
  .liens-index .num { background: #0e7c7b; color: #fff; border-radius: 6px; padding: 1px 7px; font-size: 11px; }
  .liens-index a { color: #0e7c7b; font-size: 12px; text-decoration: underline; word-break: break-all; }
  footer { margin-top: 18px; font-size: 13px; color: #557; }
  .tableau { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; border-radius: 14px; }
  .tableau table { min-width: 760px; }
  @media (max-width: 700px) {
    body { font-size: 14px; }
    .page { padding: 12px; }
    header { flex-direction: column; text-align: center; gap: 10px; padding: 16px; }
    header img { width: 64px; height: 64px; }
    header h1 { font-size: 20px; }
    header p { font-size: 13px; }
    .barre { flex-wrap: wrap; }
    .barre button { flex: 1 1 140px; }
    .resume { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .carte { padding: 10px; }
    .carte .valeur { font-size: 17px; }
    .carte .label { font-size: 11px; }
    th, td { font-size: 11px; padding: 6px 6px; white-space: nowrap; }
    .tableau table { min-width: 640px; }
    td.docs { min-width: 120px; }
    .doc.img img { width: 52px; height: 40px; }
    .doc.file { max-width: 130px; }
    .doc.file .nom { max-width: 70px; }
    .annexe-titre { font-size: 18px; }
    .annexe-grille figure { width: 100%; }
  }
`;



const PDF_CSS = `${CSS}
  .tableau { overflow: visible; }
  .tableau table { min-width: 0; }
  .page { max-width: none; padding: 14px; }
  .barre { display: none; }
  th, td { font-size: 11px; padding: 6px 7px; }
  header h1 { font-size: 20px; }
  .annexe-grille figure { width: 240px; }

  /* ---- Page de couverture : statistiques générales plein page ---- */
  .couverture { height: 1123px; padding: 40px 34px; display: flex; flex-direction: column; }
  .couverture header { padding: 28px 30px; border-radius: 20px; }
  .couverture header img { width: 110px; height: 110px; }
  .couverture header h1 { font-size: 36px; margin-bottom: 10px; }
  .couverture header p { font-size: 20px; }
  .couverture .cv-titre { font-size: 30px; font-weight: 800; color: #0e7c7b; text-align: center; margin: 30px 0 20px; }
  .couverture .resume { display: grid; grid-template-columns: 1fr; gap: 20px; flex: 1; align-content: center; margin: 0; max-width: 600px; margin-inline: auto; width: 100%; }
  .couverture .carte { border: 2px solid #0e7c7b; border-radius: 20px; padding: 22px 16px; display: flex; flex-direction: column; justify-content: center; }
  .couverture .carte .valeur { font-size: 40px; }
  .couverture .carte .label { font-size: 20px; margin-top: 10px; }
  .couverture footer { text-align: center; font-size: 15px; margin-top: 24px; }

  /* ---- Pages de tableau ---- */
  .page-tab { height: 1123px; padding: 26px 22px; display: flex; flex-direction: column; }
  .page-tab .tab-titre { font-size: 18px; font-weight: 700; color: #0e7c7b; margin: 0 0 10px; }
  .page-tab table { border-radius: 10px; }
  .page-tab th { font-size: 12px; padding: 8px 7px; }
  .page-tab td { font-size: 11px; padding: 6px 7px; }
  .page-tab .pied { margin-top: auto; font-size: 12px; color: #557; display: flex; justify-content: space-between; }
`;

const LIGNES_PAGE_2 = 26;
const LIGNES_PAGE_SUITE = 28;

function ligneHtml(l: RapportLigne) {
  return `<tr class="${l.variante ?? ""}">${l.cellules.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`;
}

/** Construit les pages du PDF : 1 page de stats + pages de 26 puis 28 lignes. */
function pagesPdf(rapport: RapportWeb): string[] {
  const resume = rapport.resume
    .map(
      ([label, valeur]) =>
        `<div class="carte"><div class="valeur">${esc(valeur)}</div><div class="label">${esc(label)}</div></div>`,
    )
    .join("");

  const couverture = `<div class="page couverture">
  <header>
    <img src="${esc(logoEddahab)}" alt="" crossorigin="anonymous" />
    <div>
      <h1>${esc(rapport.titre)}</h1>
      <p>${esc(rapport.association)}${rapport.sousTitre ? ` — ${esc(rapport.sousTitre)}` : ""}</p>
    </div>
  </header>
  <div class="cv-titre">إحصائيات عامة</div>
  <div class="resume">${resume}</div>
  <footer>التاريخ : ${new Date().toLocaleDateString("ar-MA")}</footer>
</div>`;

  // Découpage des lignes : 26 sur la première page de tableau, 28 ensuite.
  const groupes: RapportLigne[][] = [];
  let i = 0;
  while (i < rapport.lignes.length) {
    const taille = groupes.length === 0 ? LIGNES_PAGE_2 : LIGNES_PAGE_SUITE;
    groupes.push(rapport.lignes.slice(i, i + taille));
    i += taille;
  }
  if (!groupes.length) groupes.push([]);

  const thead = `<thead><tr>${rapport.entetes.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead>`;

  const pagesTab = groupes.map(
    (g, idx) => `<div class="page page-tab">
  ${idx === 0 ? `<div class="tab-titre">${esc(rapport.titre)} — تفاصيل العمليات</div>` : ""}
  <div class="tableau"><table>${thead}<tbody>${
      g.map(ligneHtml).join("") ||
      `<tr><td colspan="${rapport.entetes.length}">لا توجد بيانات</td></tr>`
    }</tbody></table></div>
  <div class="pied"><span>${esc(rapport.association)}</span><span>صفحة ${idx + 2} / ${
      groupes.length + 1
    }</span></div>
</div>`,
  );

  return [couverture, ...pagesTab];
}


function corpsHtml(rapport: RapportWeb, avecBarre: boolean, avecDocuments = true) {
  const entetes = avecDocuments ? [...rapport.entetes, "الوثائق المرفقة"] : rapport.entetes;

  const lignes = rapport.lignes
    .map(
      (l) => `<tr class="${l.variante ?? ""}">
        ${l.cellules.map((c) => `<td>${esc(c)}</td>`).join("")}
        ${
          avecDocuments
            ? `<td class="docs">${l.documents.length ? l.documents.map(docHtml).join("") : '<span class="vide">—</span>'}</td>`
            : ""
        }
      </tr>`,
    )
    .join("");

  const resume = rapport.resume
    .map(
      ([label, valeur]) =>
        `<div class="carte"><div class="valeur">${esc(valeur)}</div><div class="label">${esc(label)}</div></div>`,
    )
    .join("");

  return `<div class="page">
  <header>
    <img src="${esc(logoEddahab)}" alt="" crossorigin="anonymous" />
    <div>
      <h1>${esc(rapport.titre)}</h1>
      <p>${esc(rapport.association)}${rapport.sousTitre ? ` — ${esc(rapport.sousTitre)}` : ""}</p>
    </div>
  </header>
  ${
    avecBarre
      ? `<div class="barre">
    <button onclick="telechargerPdf(this)">تحميل التقرير</button>
    <button class="sec" onclick="window.close()">إغلاق</button>
  </div>`
      : ""
  }
  <div class="resume">${resume}</div>
  <div class="tableau">
  <table>
    <thead><tr>${entetes.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead>
    <tbody>${lignes || `<tr><td colspan="${entetes.length}">لا توجد بيانات</td></tr>`}</tbody>
  </table>
  </div>
  ${avecDocuments ? indexLiensHtml(rapport) : ""}
  <footer>
    <div>التاريخ : ${new Date().toLocaleDateString("ar-MA")}</div>
  </footer>
</div>`;
}

const nomFichier = (titre: string) =>
  `${titre.replace(/[^\p{L}\p{N}_-]+/gu, "_").slice(0, 60) || "rapport"}.pdf`;

const nomSur = (v: string, max = 70) =>
  (v.replace(/[\\/:*?"<>|]+/g, "_").replace(/\s+/g, " ").trim().slice(0, max) || "sans_titre");

/** Télécharge le rapport arabe en PDF (sans les documents joints). */
export async function telechargerRapportPdf(rapport: RapportWeb) {
  const { telechargerHtmlPdfPages } = await import("@/lib/html-pdf");
  await telechargerHtmlPdfPages({
    pages: pagesPdf(rapport),
    css: PDF_CSS,
    filename: nomFichier(rapport.titre),
    dir: "rtl",
  });
}

/**
 * Télécharge un ZIP : le rapport détaillé en PDF (sans les documents) +
 * les documents rangés dans des dossiers portant le titre de chaque opération.
 */
export async function telechargerRapportZip(rapport: RapportWeb) {
  const [{ telechargerHtmlPdfPages }, JSZipMod] = await Promise.all([
    import("@/lib/html-pdf"),
    import("jszip"),
  ]);
  const JSZip = JSZipMod.default;

  const pdf = (await telechargerHtmlPdfPages({
    pages: pagesPdf(rapport),
    css: PDF_CSS,
    filename: nomFichier(rapport.titre),
    dir: "rtl",
    asBlob: true,
  })) as Blob;


  const base = nomSur(rapport.titre, 60);
  const zip = new JSZip();
  zip.file(`${base}.pdf`, pdf);

  const groupes: { dossier: string; docs: RapportDocument[] }[] = [
    ...(rapport.documentsRapport?.length
      ? [{ dossier: "وثائق التقرير", docs: rapport.documentsRapport }]
      : []),
    ...rapport.lignes
      .filter((l) => l.documents.length)
      .map((l) => ({
        dossier: nomSur(l.cellules.slice(0, 4).filter(Boolean).join(" - ")),
        docs: l.documents,
      })),
  ];

  const dossier = zip.folder("الوثائق")!;
  const utilises = new Set<string>();
  for (const g of groupes) {
    let nomDossier = g.dossier;
    let n = 2;
    while (utilises.has(nomDossier)) nomDossier = `${g.dossier} (${n++})`;
    utilises.add(nomDossier);
    const sous = dossier.folder(nomDossier)!;
    for (const [i, d] of g.docs.entries()) {
      try {
        const res = await fetch(d.url);
        if (!res.ok) continue;
        sous.file(`${String(i + 1).padStart(2, "0")}-${nomSur(d.nom, 80)}`, await res.blob());
      } catch {
        /* document inaccessible */
      }
    }
  }

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${base}.zip`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** Ouvre un rapport arabe (RTL) en ligne, avec téléchargement PDF direct. */
export function ouvrirRapportWeb(rapport: RapportWeb) {
  const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(rapport.titre)}</title>
<style>${CSS}</style></head><body>
${corpsHtml(rapport, true)}
<script>
  function telechargerPdf(btn) {
    var txt = btn.textContent;
    btn.disabled = true; btn.textContent = "جاري إنشاء الملف…";
    var done = function () { btn.disabled = false; btn.textContent = txt; };
    try {
      var p = window.opener && window.opener.__telechargerRapportPdf && window.opener.__telechargerRapportPdf();
      if (p && p.then) p.then(done, done); else done();
    } catch (e) { done(); }
  }
<\/script>
</body></html>`;

  (window as unknown as { __telechargerRapportPdf?: () => Promise<void> }).__telechargerRapportPdf =
    () => telechargerRapportPdf(rapport);

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
}

