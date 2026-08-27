import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
// @ts-ignore
import dotenv from "dotenv";

dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL as string });

export const db = new PrismaClient({ adapter });

export async function connectToDB() {
    try {
        await db.$connect();
        console.log("[database]: connected!");
    } catch (err) {
        console.log("[database]: connection error: ", err);
        await db.$disconnect();
    }
}