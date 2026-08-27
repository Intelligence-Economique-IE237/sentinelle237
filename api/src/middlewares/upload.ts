import multer from "multer";
import path from "path";
import fs from "fs";

const { UPLOADS_DIR } = process.env as { [key: string]: string };
const templatesDir = path.join(UPLOADS_DIR || "./uploads", "templates");
fs.mkdirSync(templatesDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, templatesDir),
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

export const uploadPdfTemplate = multer({
    storage,
    fileFilter: (_req, file, cb) => {
        if (file.mimetype !== "application/pdf") return cb(new Error("Seuls les fichiers PDF sont acceptés"));
        cb(null, true);
    },
    limits: { fileSize: 10 * 1024 * 1024 },
});