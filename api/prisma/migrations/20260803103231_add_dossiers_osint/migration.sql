-- CreateTable
CREATE TABLE "dossiers" (
    "id_dossier" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "user_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dossiers_pkey" PRIMARY KEY ("id_dossier")
);

-- CreateTable
CREATE TABLE "dossier_alertes" (
    "id_dossier_alerte" TEXT NOT NULL,
    "dossier_id" TEXT NOT NULL,
    "alerte_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dossier_alertes_pkey" PRIMARY KEY ("id_dossier_alerte")
);

-- CreateTable
CREATE TABLE "dossier_flux" (
    "id_dossier_flux" TEXT NOT NULL,
    "dossier_id" TEXT NOT NULL,
    "flux_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dossier_flux_pkey" PRIMARY KEY ("id_dossier_flux")
);

-- CreateIndex
CREATE UNIQUE INDEX "dossiers_user_id_nom_key" ON "dossiers"("user_id", "nom");

-- CreateIndex
CREATE UNIQUE INDEX "dossier_alertes_dossier_id_alerte_id_key" ON "dossier_alertes"("dossier_id", "alerte_id");

-- CreateIndex
CREATE UNIQUE INDEX "dossier_flux_dossier_id_flux_id_key" ON "dossier_flux"("dossier_id", "flux_id");

-- AddForeignKey
ALTER TABLE "dossiers" ADD CONSTRAINT "dossiers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id_user") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dossier_alertes" ADD CONSTRAINT "dossier_alertes_dossier_id_fkey" FOREIGN KEY ("dossier_id") REFERENCES "dossiers"("id_dossier") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dossier_alertes" ADD CONSTRAINT "dossier_alertes_alerte_id_fkey" FOREIGN KEY ("alerte_id") REFERENCES "alertes"("id_alerte") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dossier_flux" ADD CONSTRAINT "dossier_flux_dossier_id_fkey" FOREIGN KEY ("dossier_id") REFERENCES "dossiers"("id_dossier") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dossier_flux" ADD CONSTRAINT "dossier_flux_flux_id_fkey" FOREIGN KEY ("flux_id") REFERENCES "flux"("id_flux") ON DELETE CASCADE ON UPDATE CASCADE;
