-- CreateEnum
CREATE TYPE "CategorieFlux" AS ENUM ('Politique', 'Economie', 'Generale', 'Technologie', 'Securite', 'Sport', 'Sante', 'Environnement', 'Culture', 'International');

-- AlterTable
ALTER TABLE "flux" ADD COLUMN     "categorie" "CategorieFlux";
