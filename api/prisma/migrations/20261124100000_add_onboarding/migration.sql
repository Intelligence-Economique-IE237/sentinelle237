-- AlterTable
ALTER TABLE "users" ADD COLUMN "onboarding_termine_at" TIMESTAMP(3),
ADD COLUMN "tutoriel_termine_at" TIMESTAMP(3);

-- Les comptes existants ont déjà pris l'application en main : pas de parcours
-- d'accueil pour eux (la visite guidée leur sera proposée une fois).
UPDATE "users" SET "onboarding_termine_at" = CURRENT_TIMESTAMP;
