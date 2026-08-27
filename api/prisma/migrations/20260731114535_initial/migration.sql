-- CreateEnum
CREATE TYPE "Role" AS ENUM ('veilleur', 'admin');

-- CreateEnum
CREATE TYPE "Offre" AS ENUM ('community', 'entreprise');

-- CreateEnum
CREATE TYPE "FluxType" AS ENUM ('rss', 'x', 'youtube', 'telegram');

-- CreateEnum
CREATE TYPE "Zone" AS ENUM ('afrique', 'europe', 'amerique', 'asie', 'oceanie', 'international');

-- CreateEnum
CREATE TYPE "AlerteSource" AS ENUM ('flux', 'web');

-- CreateEnum
CREATE TYPE "AlerteFrequence" AS ENUM ('immediat', 'quotidien', 'hebdomadaire');

-- CreateEnum
CREATE TYPE "AlerteLangue" AS ENUM ('toutes', 'fr', 'en', 'es', 'zh', 'hi', 'ar', 'pt', 'ru', 'ja', 'de');

-- CreateEnum
CREATE TYPE "AlerteNombreResultats" AS ENUM ('meilleurs', 'tous');

-- CreateTable
CREATE TABLE "users" (
    "id_user" TEXT NOT NULL,
    "pseudo" TEXT NOT NULL,
    "mail" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'veilleur',
    "pays" TEXT NOT NULL,
    "ville" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "activated" BOOLEAN NOT NULL DEFAULT true,
    "token_verification" TEXT,
    "token_expiration" TIMESTAMP(3),
    "totp_secret" TEXT,
    "totp_enabled" BOOLEAN NOT NULL DEFAULT false,
    "offre" "Offre" NOT NULL DEFAULT 'community',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id_user")
);

-- CreateTable
CREATE TABLE "flux" (
    "id_flux" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "url_site" TEXT,
    "lien_rss" TEXT NOT NULL,
    "logo" TEXT,
    "type" "FluxType" NOT NULL DEFAULT 'rss',
    "zone" "Zone",
    "is_suggestion" BOOLEAN NOT NULL DEFAULT false,
    "last_crawled_at" TIMESTAMP(3),
    "created_by" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flux_pkey" PRIMARY KEY ("id_flux")
);

-- CreateTable
CREATE TABLE "user_flux" (
    "id_user_flux" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "flux_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_flux_pkey" PRIMARY KEY ("id_user_flux")
);

-- CreateTable
CREATE TABLE "articles" (
    "id_article" TEXT NOT NULL,
    "flux_id" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "lien" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "auteur" TEXT,
    "date_publication" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "articles_pkey" PRIMARY KEY ("id_article")
);

-- CreateTable
CREATE TABLE "alertes" (
    "id_alerte" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "mot_cle" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "frequence" "AlerteFrequence" NOT NULL DEFAULT 'immediat',
    "langue" "AlerteLangue" NOT NULL DEFAULT 'toutes',
    "pays" TEXT,
    "nombre_resultats" "AlerteNombreResultats" NOT NULL DEFAULT 'meilleurs',
    "envoye_a" TEXT NOT NULL,
    "derniere_recherche_web" TIMESTAMP(3),
    "dernier_envoi" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alertes_pkey" PRIMARY KEY ("id_alerte")
);

-- CreateTable
CREATE TABLE "alerte_resultats" (
    "id_resultat" TEXT NOT NULL,
    "alerte_id" TEXT NOT NULL,
    "source" "AlerteSource" NOT NULL,
    "titre" TEXT NOT NULL,
    "lien" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "date_publication" TIMESTAMP(3),
    "lu" BOOLEAN NOT NULL DEFAULT false,
    "envoye" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alerte_resultats_pkey" PRIMARY KEY ("id_resultat")
);

-- CreateTable
CREATE TABLE "api_quota" (
    "id" TEXT NOT NULL,
    "cle" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "compteur" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "api_quota_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_pseudo_key" ON "users"("pseudo");

-- CreateIndex
CREATE UNIQUE INDEX "users_mail_key" ON "users"("mail");

-- CreateIndex
CREATE UNIQUE INDEX "flux_lien_rss_key" ON "flux"("lien_rss");

-- CreateIndex
CREATE UNIQUE INDEX "user_flux_user_id_flux_id_key" ON "user_flux"("user_id", "flux_id");

-- CreateIndex
CREATE UNIQUE INDEX "articles_flux_id_lien_key" ON "articles"("flux_id", "lien");

-- CreateIndex
CREATE UNIQUE INDEX "alertes_user_id_mot_cle_key" ON "alertes"("user_id", "mot_cle");

-- CreateIndex
CREATE UNIQUE INDEX "alerte_resultats_alerte_id_lien_key" ON "alerte_resultats"("alerte_id", "lien");

-- CreateIndex
CREATE UNIQUE INDEX "api_quota_cle_key" ON "api_quota"("cle");

-- AddForeignKey
ALTER TABLE "flux" ADD CONSTRAINT "flux_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id_user") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_flux" ADD CONSTRAINT "user_flux_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id_user") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_flux" ADD CONSTRAINT "user_flux_flux_id_fkey" FOREIGN KEY ("flux_id") REFERENCES "flux"("id_flux") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "articles_flux_id_fkey" FOREIGN KEY ("flux_id") REFERENCES "flux"("id_flux") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertes" ADD CONSTRAINT "alertes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id_user") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerte_resultats" ADD CONSTRAINT "alerte_resultats_alerte_id_fkey" FOREIGN KEY ("alerte_id") REFERENCES "alertes"("id_alerte") ON DELETE CASCADE ON UPDATE CASCADE;
