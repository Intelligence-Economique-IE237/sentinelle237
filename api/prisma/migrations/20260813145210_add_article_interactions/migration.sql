-- CreateTable
CREATE TABLE "article_interactions" (
    "id_interaction" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "article_id" TEXT NOT NULL,
    "note" TEXT,
    "favori" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "article_interactions_pkey" PRIMARY KEY ("id_interaction")
);

-- CreateIndex
CREATE UNIQUE INDEX "article_interactions_user_id_article_id_key" ON "article_interactions"("user_id", "article_id");

-- AddForeignKey
ALTER TABLE "article_interactions" ADD CONSTRAINT "article_interactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id_user") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_interactions" ADD CONSTRAINT "article_interactions_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "articles"("id_article") ON DELETE CASCADE ON UPDATE CASCADE;
