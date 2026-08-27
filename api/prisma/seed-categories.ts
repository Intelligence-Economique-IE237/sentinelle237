import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL as string });
const db = new PrismaClient({ adapter });

const CATEGORIES = [
    { code: "politique", libelle: "Politique", couleur: "#EF4444", description: "Gouvernance, élections, diplomatie, vie institutionnelle" },
    { code: "economie", libelle: "Économie", couleur: "#22C55E", description: "Finance, marchés, entreprises, investissement" },
    { code: "generale", libelle: "Générale", couleur: "#6B7280", description: "Actualité généraliste, non spécialisée" },
    { code: "technologie", libelle: "Technologie", couleur: "#3B82F6", description: "Numérique, innovation, télécoms, startups" },
    { code: "securite", libelle: "Sécurité", couleur: "#F97316", description: "Défense, criminalité, conflits, ordre public" },
    { code: "sport", libelle: "Sport", couleur: "#EAB308", description: "Compétitions sportives et actualité du sport" },
    { code: "sante", libelle: "Santé", couleur: "#EC4899", description: "Médecine, santé publique, épidémiologie" },
    { code: "environnement", libelle: "Environnement", couleur: "#10B981", description: "Climat, écologie, ressources naturelles" },
    { code: "culture", libelle: "Culture", couleur: "#A855F7", description: "Arts, médias, société, mode de vie" },
    { code: "international", libelle: "International", couleur: "#0EA5E9", description: "Actualité mondiale, relations internationales" },
];

async function main() {
    for (const cat of CATEGORIES) {
        await db.categorieFlux.upsert({
            where: { code: cat.code },
            create: cat,
            update: { libelle: cat.libelle, couleur: cat.couleur, description: cat.description },
        });
        console.log(`✅ Catégorie prête : ${cat.libelle} (${cat.code})`);
    }
}

main()
    .catch((err) => {
        console.error("Erreur pendant le seed des catégories :", err);
        process.exit(1);
    })
    .finally(async () => {
        await db.$disconnect();
    });