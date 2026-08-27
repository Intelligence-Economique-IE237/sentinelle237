/*
  Warnings:

  - You are about to drop the column `categorie` on the `flux` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "flux" DROP COLUMN "categorie",
ADD COLUMN     "categorie_id" TEXT;

-- DropEnum
DROP TYPE "CategorieFlux";

-- CreateTable
CREATE TABLE "categories_flux" (
    "id_categorie" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "couleur" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_flux_pkey" PRIMARY KEY ("id_categorie")
);

-- CreateIndex
CREATE UNIQUE INDEX "categories_flux_code_key" ON "categories_flux"("code");

-- AddForeignKey
ALTER TABLE "flux" ADD CONSTRAINT "flux_categorie_id_fkey" FOREIGN KEY ("categorie_id") REFERENCES "categories_flux"("id_categorie") ON DELETE SET NULL ON UPDATE CASCADE;
