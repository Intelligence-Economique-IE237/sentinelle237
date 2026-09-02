import { Router } from "express";
import DashboardController from "../controllers/DashboardController";

const router = Router();
const dashboardController = new DashboardController();

router
    .get("/kpis", dashboardController.getKpis.bind(dashboardController))
    .get("/devises/:paire/historique", dashboardController.getDeviseHistorique.bind(dashboardController))
    .get("/matieres/:matiere/historique", dashboardController.getMatiereHistorique.bind(dashboardController))
    .get("/indices/:code/historique", dashboardController.getIndiceHistorique.bind(dashboardController));

export { router as DashboardRoutes };