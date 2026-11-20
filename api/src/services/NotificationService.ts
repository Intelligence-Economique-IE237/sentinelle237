import PushService from "./PushService";
import DossierRepository from "../repositories/DossierRepository";

const pushService = new PushService();
const dossierRepository = new DossierRepository();

function pluriel(n: number, singulier: string, plurielForme: string) {
  return `${n} ${n > 1 ? plurielForme : singulier}`;
}

/**
 * Notifications push métier. Toutes les méthodes avalent leurs erreurs :
 * une notification ratée ne doit jamais faire échouer une alerte ou une collecte.
 */
export default class NotificationService {
  /** Nouveaux résultats pour une alerte (et rappel du dossier d'enquête s'il y en a un). */
  async alerteNouveauxResultats(
    alerte: { id_alerte: string; user_id: string; mot_cle: string },
    count: number,
    source: "flux" | "web"
  ) {
    if (count <= 0 || !pushService.isEnabled()) return;
    try {
      const dossiers = await dossierRepository.getByAlerteId(alerte.id_alerte);
      const resultats = pluriel(count, "nouveau résultat", "nouveaux résultats");
      const origine = source === "web" ? "sur le web" : "dans tes flux";
      const enquete = dossiers.length > 0 ? ` · Enquête « ${dossiers[0].nom} »` : "";
      await pushService.sendToUser(alerte.user_id, "alertes", {
        title: `Alerte « ${alerte.mot_cle} »`,
        body: `${resultats} ${origine}${enquete}`,
        url: "/?vue=alertes",
        tag: `alerte-${alerte.id_alerte}`,
      });
    } catch (err) {
      console.error("[notifications]: alerte:", err instanceof Error ? err.message : err);
    }
  }

  /**
   * Nouveaux articles dans les flux suivis par des dossiers d'enquête.
   * `nouveauxParFlux` : flux_id → nombre d'articles réellement ajoutés.
   * Une seule notification par dossier, quel que soit le nombre de flux concernés.
   */
  async dossiersNouveauxArticles(nouveauxParFlux: Map<string, number>) {
    if (nouveauxParFlux.size === 0 || !pushService.isEnabled()) return;
    try {
      const links = await dossierRepository.getLinksByFluxIds([...nouveauxParFlux.keys()]);
      const parDossier = new Map<string, { nom: string; user_id: string; count: number }>();
      for (const link of links) {
        const n = nouveauxParFlux.get(link.flux_id) ?? 0;
        if (n <= 0) continue;
        const d = parDossier.get(link.dossier.id_dossier) ?? { nom: link.dossier.nom, user_id: link.dossier.user_id, count: 0 };
        d.count += n;
        parDossier.set(link.dossier.id_dossier, d);
      }
      for (const [id_dossier, d] of parDossier) {
        await pushService.sendToUser(d.user_id, "dossiers", {
          title: `Enquête « ${d.nom} »`,
          body: `${pluriel(d.count, "nouvel article", "nouveaux articles")} dans les sources du dossier`,
          url: `/?vue=dossiers&dossier=${encodeURIComponent(id_dossier)}`,
          tag: `dossier-${id_dossier}`,
        });
      }
    } catch (err) {
      console.error("[notifications]: dossiers:", err instanceof Error ? err.message : err);
    }
  }
}
