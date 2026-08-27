-- CreateTable
CREATE TABLE "feedback_classification" (
    "id_feedback" TEXT NOT NULL,
    "texte" TEXT NOT NULL,
    "categorie" "CategorieArticle" NOT NULL,
    "utilise_pour_entrainement" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_classification_pkey" PRIMARY KEY ("id_feedback")
);
