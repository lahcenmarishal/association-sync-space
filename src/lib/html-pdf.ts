/**
 * Génération d'un vrai PDF téléchargeable (sans passer par la boîte
 * d'impression du navigateur) tout en gardant la ligature correcte de l'arabe.
 *
 * Le HTML est rasterisé via un <foreignObject> SVG : c'est le moteur de rendu
 * du navigateur qui dessine le texte, donc l'arabe reste correctement lié.
 */

const A4_W_MM = 210;
const A4_H_MM = 297;
const PAGE_W_PX = 794; // A4 à 96 dpi

async function toDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result));
      fr.onerror = reject;
      fr.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function inlineImages(root: HTMLElement) {
  const imgs = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    imgs.map(async (img) => {
      const src = img.getAttribute("src") ?? "";
      if (!src || src.startsWith("data:")) return;
      const data = await toDataUrl(src);
      if (data) img.setAttribute("src", data);
      else img.remove();
    }),
  );
}

function svgFromNode(node: HTMLElement, css: string, width: number, height: number) {
  const clone = node.cloneNode(true) as HTMLElement;
  clone.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  clone.style.width = `${width}px`;
  const serialized = new XMLSerializer().serializeToString(clone);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
<foreignObject width="100%" height="100%">
<style xmlns="http://www.w3.org/1999/xhtml">${css}</style>
${serialized}
</foreignObject></svg>`;
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("render"));
    img.src = src;
  });
}

/** Rasterise du HTML et déclenche le téléchargement d'un PDF A4 multi-pages. */
export async function telechargerHtmlPdf(options: {
  html: string;
  css: string;
  filename: string;
  dir?: "rtl" | "ltr";
  /** Retourne le PDF en Blob au lieu de déclencher le téléchargement. */
  asBlob?: boolean;
}): Promise<Blob | void> {
  const { html, css, filename, dir = "rtl" } = options;

  const host = document.createElement("div");
  host.style.cssText = `position:fixed;left:-10000px;top:0;width:${PAGE_W_PX}px;background:#fff;`;
  const style = document.createElement("style");
  // On applique la même feuille de style au DOM vivant : le calcul de hauteur
  // et la position des liens correspondent alors exactement au rendu SVG.
  style.textContent = css;
  const content = document.createElement("div");
  content.setAttribute("dir", dir);
  content.style.cssText = `width:${PAGE_W_PX}px;background:#fff;`;
  content.innerHTML = html;
  host.appendChild(style);
  host.appendChild(content);
  document.body.appendChild(host);

  try {
    await inlineImages(content);
    await new Promise((r) => setTimeout(r, 60));

    const height = Math.max(content.scrollHeight, 200);

    // Position des liens (en px CSS, relatifs au contenu) pour les rendre
    // cliquables dans le PDF final.
    const base = content.getBoundingClientRect();
    const liens = Array.from(content.querySelectorAll("a[href]"))
      .map((a) => {
        const href = (a as HTMLAnchorElement).href;
        const r = a.getBoundingClientRect();
        return { href, x: r.left - base.left, y: r.top - base.top, w: r.width, h: r.height };
      })
      .filter((l) => /^https?:/i.test(l.href) && l.w > 1 && l.h > 1);

    const svg = svgFromNode(content, css, PAGE_W_PX, height);
    const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

    const scale = 2;
    const rendered = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = PAGE_W_PX * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(rendered, 0, 0, canvas.width, canvas.height);

    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    const pxPerMm = canvas.width / A4_W_MM;
    const pageHeightPx = Math.floor(A4_H_MM * pxPerMm);
    const pages = Math.max(1, Math.ceil(canvas.height / pageHeightPx));

    for (let i = 0; i < pages; i++) {
      const sliceHeight = Math.min(pageHeightPx, canvas.height - i * pageHeightPx);
      const slice = document.createElement("canvas");
      slice.width = canvas.width;
      slice.height = sliceHeight;
      const sctx = slice.getContext("2d")!;
      sctx.fillStyle = "#fff";
      sctx.fillRect(0, 0, slice.width, slice.height);
      sctx.drawImage(canvas, 0, -i * pageHeightPx);
      if (i > 0) pdf.addPage();
      pdf.addImage(
        slice.toDataURL("image/jpeg", 0.92),
        "JPEG",
        0,
        0,
        A4_W_MM,
        (sliceHeight / pxPerMm),
      );
    }

    // Zones cliquables : un lien peut chevaucher deux pages, on l'ajoute sur chacune.
    const cssPxPerMm = PAGE_W_PX / A4_W_MM;
    const pageHeightCssPx = pageHeightPx / scale;
    for (const l of liens) {
      const first = Math.floor(l.y / pageHeightCssPx);
      const last = Math.floor((l.y + l.h) / pageHeightCssPx);
      for (let p = first; p <= Math.min(last, pages - 1); p++) {
        if (p < 0) continue;
        const top = Math.max(l.y, p * pageHeightCssPx) - p * pageHeightCssPx;
        const bottom = Math.min(l.y + l.h, (p + 1) * pageHeightCssPx) - p * pageHeightCssPx;
        if (bottom - top < 1) continue;
        pdf.setPage(p + 1);
        pdf.link(l.x / cssPxPerMm, top / cssPxPerMm, l.w / cssPxPerMm, (bottom - top) / cssPxPerMm, {
          url: l.href,
        });
      }
    }


    if (options.asBlob) return pdf.output("blob") as Blob;
    pdf.save(filename);
  } finally {
    host.remove();
  }
}
