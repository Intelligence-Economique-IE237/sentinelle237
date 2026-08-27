import bcrypt from "bcrypt";
import { Role } from "@prisma/client";
import UserService from "./UserService";
import { JwtService, type AuthTokens } from "./JwtService";
import { MailService } from "./MailService";
import { TotpService } from "./TotpService";
import TotpAuthService from "./TotpAuthService";
import { generateRawToken, hashToken } from "../utils/crypto";
import { HttpException } from "../utils/HttpExceptions";
import type {
    LoginUserInput,
    RegisterUserInput,
    VerifyTotpLoginInput,
} from "../validations/UserValidations";
import dotenv from "dotenv";

dotenv.config();

const { REFRESH_TOKEN_SECRET, TOTP_PENDING_TOKEN_SECRET, EMAIL_TOKEN_EXPIRY_HOURS } =
    process.env as { [key: string]: string };

const userService = new UserService();
const jwtService = new JwtService();
const mailService = new MailService();
const totpService = new TotpService();
const totpAuthService = new TotpAuthService();

export default class AuthService {
    private readonly userService: UserService;
    private readonly jwtService: JwtService;
    private readonly mailService: MailService;
    private readonly totpService: TotpService;

    constructor() {
        this.userService = userService;
        this.jwtService = jwtService;
        this.mailService = mailService;
        this.totpService = totpService;
    }

    private buildPayload(user: { id_user: string; mail: string; role: Role }) {
        return { id_user: user.id_user, mail: user.mail, role: user.role };
    }

    async register(data: RegisterUserInput) {
        const rawToken = generateRawToken();
        const expiresAt = new Date(Date.now() + Number(EMAIL_TOKEN_EXPIRY_HOURS) * 60 * 60 * 1000);

        const user = await this.userService.create({
            ...data,
            token_verification: hashToken(rawToken),
            token_expiration: expiresAt,
        });

        await this.mailService.sendVerificationEmail(user.mail, user.pseudo, rawToken);
        return this.userService.sanitize(user);
    }

    async verifyEmail(rawToken: string) {
        const hashed = hashToken(rawToken);
        const user = await this.userService.getByKey("token_verification", hashed);
        if (!user) throw new HttpException(400, "Token invalide");
        if (!user.token_expiration || user.token_expiration < new Date()) {
            throw new HttpException(400, "Token expiré, veuillez redemander un email de vérification");
        }

        return await this.userService.updateRaw(user.id_user, {
            verified: true,
            token_verification: null,
            token_expiration: null,
        });
    }

    async resendVerification(mail: string) {
        const user = await this.userService.getByKey("mail", mail);
        if (!user) throw new HttpException(404, "Utilisateur introuvable");
        if (user.verified) throw new HttpException(400, "Email déjà vérifié");

        const rawToken = generateRawToken();
        const expiresAt = new Date(Date.now() + Number(EMAIL_TOKEN_EXPIRY_HOURS) * 60 * 60 * 1000);

        await this.userService.updateRaw(user.id_user, {
            token_verification: hashToken(rawToken),
            token_expiration: expiresAt,
        });

        await this.mailService.sendVerificationEmail(user.mail, user.pseudo, rawToken);
    }

    async login(
        data: LoginUserInput
        ): Promise<(AuthTokens & { user: ReturnType<UserService["sanitize"]> }) | { requiresTotp: true; tempToken: string }> {
        const user = await this.userService.getByKey("mail", data.mail);
        if (!user || !(await bcrypt.compare(data.password, user.password))) {
            throw new HttpException(400, "Identifiants invalides");
        }
        if (!user.activated) throw new HttpException(403, "Compte désactivé");
        if (!user.verified) throw new HttpException(403, "Veuillez vérifier votre email avant de vous connecter");

        if (user.totp_enabled) {
            const tempToken = this.jwtService.sign(
            { id_user: user.id_user, purpose: "totp-pending" },
            TOTP_PENDING_TOKEN_SECRET,
            { expiresIn: "5m" }
            );
            return { requiresTotp: true, tempToken };
        }

        const tokens = this.jwtService.genAuthTokens(this.buildPayload(user));
        return { ...tokens, user: this.userService.sanitize(user) };
    }

    async verifyTotpLogin(
        data: VerifyTotpLoginInput
        ): Promise<AuthTokens & { user: ReturnType<UserService["sanitize"]> }> {
        const decoded = await this.jwtService.verify(data.tempToken, TOTP_PENDING_TOKEN_SECRET);
        if (decoded.purpose !== "totp-pending") throw new HttpException(403, "Forbidden");

        const user = await this.userService.getById(decoded.id_user as string);
        if (!user.totp_enabled || !user.totp_secret) throw new HttpException(400, "TOTP non activé");

        const isValid = await totpAuthService.verifyCodeOrRecovery(user, data.code);
        if (!isValid) throw new HttpException(400, "Code TOTP invalide");

        const tokens = this.jwtService.genAuthTokens(this.buildPayload(user));
        return { ...tokens, user: this.userService.sanitize(user) };
    }

    async refresh(refreshToken: string): Promise<{ accessToken: string }> {
        if (!refreshToken) throw new HttpException(403, "Forbidden");
        const decoded = await this.jwtService.verify(refreshToken, REFRESH_TOKEN_SECRET);
        const user = await this.userService.getById(decoded.id_user as string);
        if (!user.activated) throw new HttpException(403, "Forbidden");

        const { accessToken } = this.jwtService.genAuthTokens(this.buildPayload(user));
        return { accessToken };
    }

    async forgotPassword(mail: string) {
    const user = await this.userService.getByKey("mail", mail);

    if (!user) return;

    const rawToken = generateRawToken();
    const hours = Number(process.env.RESET_PASSWORD_TOKEN_EXPIRY_HOURS || 1);
    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);

    await this.userService.updateRaw(user.id_user, {
        token_reset_password: hashToken(rawToken),
        token_reset_password_expiration: expiresAt,
    });

    await this.mailService.sendResetPasswordEmail(user.mail, user.pseudo, rawToken);
    }

    async resetPassword(rawToken: string, newPassword: string) {
    const hashed = hashToken(rawToken);
    const user = await this.userService.getByKey("token_reset_password", hashed);

    if (!user) throw new HttpException(400, "Token invalide");
    if (!user.token_reset_password_expiration || user.token_reset_password_expiration < new Date()) {
        throw new HttpException(400, "Token expiré, refais une demande de réinitialisation");
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.userService.updateRaw(user.id_user, {
        password: hashedPassword,
        token_reset_password: null,
        token_reset_password_expiration: null,
    });
    }
}