import express from "express";
import type { Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { connectToDB } from "./config/db";
import { AppRoutes } from "./routes/AppRoutes";
import ErrorHandler from "./middlewares/ErrorHandler";
import { HttpException } from "./utils/HttpExceptions";
import { startFluxRefreshJob } from "./jobs/FluxRefreshJob";
import { startAlerteJobs } from "./jobs/AlerteJob";
import { startDashboardJobs } from "./jobs/DashboardJob";
import { mlInferenceService } from "./services/MLInferenceService";


const app = express();
app.set("trust proxy", 1);

const { FRONTEND_ORIGINS } = process.env as { [key: string]: string };
const allowedOrigins = (FRONTEND_ORIGINS || "").split(",").map((o) => o.trim());

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/api", AppRoutes);

app.use((_req: Request, _res: Response, next: NextFunction) => {
  next(new HttpException(404, "Route not found"));
});

app.use(ErrorHandler);

export { app };

if (require.main === module) {
  const initializeApp = async () => {
    try {
      app.listen(process.env.PORT || 3000, () => {
        console.log(`[server]: server is running on port ${process.env.PORT || 3000}`);
      });
      await connectToDB();
      await mlInferenceService.init();
      startFluxRefreshJob();
      startAlerteJobs();
      startDashboardJobs();
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  };
  initializeApp();
}
