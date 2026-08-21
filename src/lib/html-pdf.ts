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
    const pxPerMm = PAGE_W_PX / A4_W_MM; // en px CSS
    const pageHeightCssPx = Math.floor(A4_H_MM * pxPerMm);

    // Points de coupure « sûrs » : bas des lignes de tableau et des blocs, afin
    // de ne jamais trancher une ligne en deux (ce qui produisait une bande noire).
    const stops = Array.from(
      content.querySelectorAll(
        "tr, .carte, .annexe-bloc, .liens-index li, figure, footer, header, h1, h2, h3, p, table, section, li",
      ),
    )
      .map((el) => el.getBoundingClientRect().bottom - base.top)
      .filter((y) => y > 0 && y < height)
      .sort((a, b) => a - b);

    // Repli : chercher une ligne de pixels entièrement claire (donc sans texte)
    // pour couper sans traverser une ligne d'écriture.
    const ctxRead = ctx;
    const ligneVide = (yCss: number) => {
      const y = Math.min(canvas.height - 1, Math.max(0, Math.round(yCss * scale)));
      const data = ctxRead.getImageData(0, y, canvas.width, 1).data;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i]! < 245 || data[i + 1]! < 245 || data[i + 2]! < 245) return false;
      }
      return true;
    };
    const chercherBlanc = (limit: number, min: number) => {
      for (let y = Math.floor(limit); y > min; y--) if (ligneVide(y)) return y;
      return null;
    };

    // Découpage en pages
    const cuts: { top: number; bottom: number }[] = [];
    let cur = 0;
    while (cur < height - 1) {
      const limit = cur + pageHeightCssPx;
      if (limit >= height) {
        cuts.push({ top: cur, bottom: height });
        break;
      }
      const min = cur + pageHeightCssPx * 0.3;
      const safe = stops.filter((y) => y > min && y <= limit).pop();
      // On valide la coupure : si elle traverse encore de l'encre, on remonte
      // jusqu'à une bande blanche.
      let bottom = safe ?? limit;
      if (!ligneVide(bottom)) bottom = chercherBlanc(bottom, min) ?? bottom;
      cuts.push({ top: cur, bottom });
      cur = bottom;
    }

    cuts.forEach((c, i) => {
      // Découpe en pixels entiers de la source : évite le rééchantillonnage
      // sous-pixel qui laissait une bande sombre en haut/bas de page.
      const sy = Math.round(c.top * scale);
      const syEnd = Math.min(canvas.height, Math.round(c.bottom * scale));
      const sh = Math.max(1, syEnd - sy);
      const slice = document.createElement("canvas");
      slice.width = canvas.width;
      slice.height = sh;
      const sctx = slice.getContext("2d")!;
      sctx.imageSmoothingEnabled = false;
      sctx.fillStyle = "#fff";
      sctx.fillRect(0, 0, slice.width, slice.height);
      sctx.drawImage(canvas, 0, sy, canvas.width, sh, 0, 0, canvas.width, sh);
      if (i > 0) pdf.addPage();
      pdf.addImage(
        slice.toDataURL("image/jpeg", 0.95),
        "JPEG",
        0,
        0,
        A4_W_MM,
        sh / scale / pxPerMm,
        undefined,
        "FAST",
      );
    });

    // Zones cliquables : positionnées sur la page qui contient le lien.
    for (const l of liens) {
      cuts.forEach((c, p) => {
        const top = Math.max(l.y, c.top);
        const bottom = Math.min(l.y + l.h, c.bottom);
        if (bottom - top < 1) return;
        pdf.setPage(p + 1);
        pdf.link(
          l.x / pxPerMm,
          (top - c.top) / pxPerMm,
          l.w / pxPerMm,
          (bottom - top) / pxPerMm,
          { url: l.href },
        );
      });
    }



    if (options.asBlob) return pdf.output("blob") as Blob;
    pdf.save(filename);
  } finally {
    host.remove();
  }
}
