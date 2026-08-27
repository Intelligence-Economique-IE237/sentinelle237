import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcrypt";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL as string });
const db = new PrismaClient({ adapter });

const { SEED_ADMIN_PSEUDO, SEED_ADMIN_MAIL, SEED_ADMIN_PASSWORD } = process.env as {
    [key: string]: string;
};

async function main() {
    const existingAdmin = await db.user.findUnique({ where: { mail: SEED_ADMIN_MAIL } });

    if (existingAdmin) {
        console.log(`L'admin "${SEED_ADMIN_MAIL}" existe déjà, aucune action.`);
        return;
    }

    const hashedPassword = await bcrypt.hash(SEED_ADMIN_PASSWORD, 10);

    const admin = await db.user.create({
        data: {
            pseudo: SEED_ADMIN_PSEUDO,
            mail: SEED_ADMIN_MAIL,
            password: hashedPassword,
            role: "admin",
            pays: "Cameroun",
            ville: "Yaoundé",
            verified: true,
            activated: true,
            offre: "entreprise",
        },
    });

    console.log(`Compte admin créé : ${admin.mail} (id: ${admin.id_user})`);
}

main()
    .catch((err) => {
        console.error("Erreur pendant le seed :", err);
        process.exit(1);
    })
    .finally(async () => {
        await db.$disconnect();
    });