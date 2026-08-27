-- CreateEnum
CREATE TYPE "CategorieArticle" AS ENUM ('politique', 'economie', 'societe', 'securite', 'sport', 'sante', 'technologie', 'environnement', 'culture', 'international');

-- AlterTable
ALTER TABLE "articles" ADD COLUMN     "categorie" "CategorieArticle",
ADD COLUMN     "resume" TEXT;
