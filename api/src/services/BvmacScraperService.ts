import { PDFParse } from "pdf-parse";
import { HttpException } from "../utils/HttpExceptions";

const MAX_JOURS_EN_ARRIERE = 7;

function formatDateUrl(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return { yyyy, mm, dd, compact: `${yyyy}${mm}${dd}` };
}

export class BvmacScraperService {
  private construireUrl(date: Date): string {
    const { yyyy, mm, compact } = formatDateUrl(date);
    return `https://www.bvm-ac.org/wp-content/uploads/${yyyy}/${mm}/BOC-${compact}.pdf`;
  }

  async getIndex(): Promise<{ valeur: number; dateBulletin: string }> {
    for (let i = 0; i < MAX_JOURS_EN_ARRIERE; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const url = this.construireUrl(date);

      let parser: PDFParse | null = null;
      try {
        const res = await fetch(url);
        if (!res.ok) continue;

        const buffer = Buffer.from(await res.arrayBuffer());
        parser = new PDFParse({ data: buffer });
        const result = await parser.getText();

        const valeur = this.extraireIndice(result.text);
        if (valeur !== null) {
          return { valeur, dateBulletin: formatDateUrl(date).compact };
        }
      } catch {
        continue;
      } finally {
        if (parser) await parser.destroy().catch(() => {});
      }
    }

    throw new HttpException(502, "Aucun bulletin BVMAC exploitable trouvé sur les 7 derniers jours");
  }

  private extraireIndice(texte: string): number | null {
    const match = texte.match(/BVMAC All Share Index[\s\S]{0,300}?points/i);
    if (!match) return null;

    const nombres = [...match[0].matchAll(/(\d{1,3}(?:[ \u00A0]\d{3})*,\d{2})/g)].map((m) => m[1]);
    if (nombres.length === 0) return null;

    const dernierNombre = nombres[nombres.length - 1];
    return parseFloat(dernierNombre.replace(/[\s\u00A0]/g, "").replace(",", "."));
  }
}