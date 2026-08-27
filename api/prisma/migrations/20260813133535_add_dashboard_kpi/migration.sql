-- CreateTable
CREATE TABLE "cours_matieres_premieres" (
    "id_cours" TEXT NOT NULL,
    "matiere" TEXT NOT NULL,
    "prix" DOUBLE PRECISION NOT NULL,
    "devise" TEXT NOT NULL DEFAULT 'USD',
    "variation_24h" DOUBLE PRECISION,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cours_matieres_premieres_pkey" PRIMARY KEY ("id_cours")
);

-- CreateTable
CREATE TABLE "cours_devises" (
    "id_cours" TEXT NOT NULL,
    "paire" TEXT NOT NULL,
    "taux" DOUBLE PRECISION NOT NULL,
    "variation_24h" DOUBLE PRECISION,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cours_devises_pkey" PRIMARY KEY ("id_cours")
);

-- CreateIndex
CREATE INDEX "cours_matieres_premieres_matiere_recorded_at_idx" ON "cours_matieres_premieres"("matiere", "recorded_at");

-- CreateIndex
CREATE INDEX "cours_devises_paire_recorded_at_idx" ON "cours_devises"("paire", "recorded_at");
