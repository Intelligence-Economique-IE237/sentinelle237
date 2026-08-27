import type { Prisma, User } from "@prisma/client";
import bcrypt from "bcrypt";
import UserRepository from "../repositories/UserRepository";
import { HttpException } from "../utils/HttpExceptions";
import type {
    UpdateProfileInput,
    UpdateUserByAdminInput,
    ListUsersQuery,
} from "../validations/UserValidations";

const userRepository = new UserRepository();

export default class UserService {
    private readonly userRepository: UserRepository;
    constructor() {
        this.userRepository = userRepository;
    }

    sanitize(user: User) {
        const { password, totp_secret, token_verification, ...safeUser } = user;
        return safeUser;
    }

    async getAll(query: ListUsersQuery) {
        const { page, limit, role, offre, activated, verified, search } = query;
        const skip = (page - 1) * limit;

        const where: Prisma.UserWhereInput = {};
        if (role) where.role = role;
        if (offre) where.offre = offre;
        if (typeof activated === "boolean") where.activated = activated;
        if (typeof verified === "boolean") where.verified = verified;
        if (search) {
            where.OR = [
                { pseudo: { contains: search, mode: "insensitive" } },
                { mail: { contains: search, mode: "insensitive" } },
            ];
        }

        const { users, total } = await this.userRepository.getAll({ skip, take: limit, where });

        return {
            users: users.map((u) => this.sanitize(u)),
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.max(Math.ceil(total / limit), 1),
            },
        };
    }

    async getById(id_user: string) {
        const user = await this.userRepository.getById(id_user);
        if (!user) throw new HttpException(404, "Utilisateur introuvable");
        return user;
    }

    async getByKey(key: keyof Prisma.UserWhereInput, value: Prisma.UserWhereInput[typeof key]) {
        return await this.userRepository.getByKey(key, value);
    }

    async create(data: Prisma.UserCreateInput) {
        const hashedPassword = await bcrypt.hash(data.password as string, 10);
        return await this.userRepository.create({ ...data, password: hashedPassword });
    }

    async updateProfile(id_user: string, data: UpdateProfileInput) {
        const user = await this.getById(id_user);
        const updateData: Prisma.UserUpdateInput = {};

        if (data.pseudo) updateData.pseudo = data.pseudo;
        if (data.pays) updateData.pays = data.pays;
        if (data.ville) updateData.ville = data.ville;

        if (data.newPassword) {
            const isMatch = await bcrypt.compare(data.currentPassword as string, user.password);
            if (!isMatch) throw new HttpException(400, "Mot de passe actuel incorrect");
            updateData.password = await bcrypt.hash(data.newPassword, 10);
        }

        return await this.userRepository.update(id_user, updateData);
    }

    async updateByAdmin(id_user: string, data: UpdateUserByAdminInput) {
        await this.getById(id_user);
        return await this.userRepository.update(id_user, data as Prisma.UserUpdateInput);
    }

    async updateRaw(id_user: string, data: Prisma.UserUpdateInput) {
        await this.getById(id_user);
        return await this.userRepository.update(id_user, data);
    }

    async delete(id_user: string) {
        await this.getById(id_user);
        await this.userRepository.delete(id_user);
    }
}