-- AlterTable
ALTER TABLE "article_interactions" ADD COLUMN     "lu" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "flux_epingles" (
    "id_epingle" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "flux_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flux_epingles_pkey" PRIMARY KEY ("id_epingle")
);

-- CreateIndex
CREATE UNIQUE INDEX "flux_epingles_user_id_flux_id_key" ON "flux_epingles"("user_id", "flux_id");

-- AddForeignKey
ALTER TABLE "flux_epingles" ADD CONSTRAINT "flux_epingles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id_user") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flux_epingles" ADD CONSTRAINT "flux_epingles_flux_id_fkey" FOREIGN KEY ("flux_id") REFERENCES "flux"("id_flux") ON DELETE CASCADE ON UPDATE CASCADE;
