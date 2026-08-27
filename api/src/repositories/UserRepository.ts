import { db } from "../config/db";
import type { Prisma } from "@prisma/client";

export default class UserRepository {
    private readonly db;
    constructor() {
        this.db = db;
    }

    async getAll(params: { skip: number; take: number; where: Prisma.UserWhereInput }) {
        const [users, total] = await Promise.all([
            this.db.user.findMany({
                where: params.where,
                skip: params.skip,
                take: params.take,
                orderBy: { createdAt: "desc" },
            }),
            this.db.user.count({ where: params.where }),
        ]);
        return { users, total };
    }

    async getById(id_user: string) {
        return await this.db.user.findUnique({ where: { id_user } });
    }

    async getByKey(key: keyof Prisma.UserWhereInput, value: Prisma.UserWhereInput[keyof Prisma.UserWhereInput]) {
        return await this.db.user.findFirst({ where: { [key]: value } });
    }

    async create(data: Prisma.UserCreateInput) {
        return await this.db.user.create({ data });
    }

    async update(id_user: string, data: Prisma.UserUpdateInput) {
        return await this.db.user.update({ where: { id_user }, data });
    }

    async delete(id_user: string) {
        return await this.db.user.delete({ where: { id_user } });
    }
}