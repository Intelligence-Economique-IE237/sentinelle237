-- CreateTable
CREATE TABLE "modeles_pdf" (
    "id_modele" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "chemin_fichier" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "modeles_pdf_pkey" PRIMARY KEY ("id_modele")
);

-- CreateTable
CREATE TABLE "revues_de_presse" (
    "id_revue" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "modele_id" TEXT NOT NULL,
    "dossier_id" TEXT,
    "titre" TEXT NOT NULL,
    "chemin_fichier" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revues_de_presse_pkey" PRIMARY KEY ("id_revue")
);

-- AddForeignKey
ALTER TABLE "modeles_pdf" ADD CONSTRAINT "modeles_pdf_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id_user") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revues_de_presse" ADD CONSTRAINT "revues_de_presse_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id_user") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revues_de_presse" ADD CONSTRAINT "revues_de_presse_modele_id_fkey" FOREIGN KEY ("modele_id") REFERENCES "modeles_pdf"("id_modele") ON DELETE RESTRICT ON UPDATE CASCADE;
