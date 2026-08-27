import UserService from "./UserService";
import { TotpService } from "./TotpService";
import TotpRecoveryCodeRepository from "../repositories/TotpRecoveryCodeRepository";
import { generateRecoveryCodes, isRecoveryCodeFormat } from "../utils/recoveryCodes";
import { hashToken } from "../utils/crypto";
import { HttpException } from "../utils/HttpExceptions";

const userService = new UserService();
const totpService = new TotpService();
const totpRecoveryCodeRepository = new TotpRecoveryCodeRepository();

export default class TotpAuthService {
  private readonly userService: UserService;
  private readonly totpService: TotpService;
  private readonly totpRecoveryCodeRepository: TotpRecoveryCodeRepository;

  constructor() {
    this.userService = userService;
    this.totpService = totpService;
    this.totpRecoveryCodeRepository = totpRecoveryCodeRepository;
  }

  async startEnable(id_user: string) {
    const user = await this.userService.getById(id_user);
    if (user.totp_enabled) throw new HttpException(400, "TOTP déjà activé");

    const secret = this.totpService.generateSecret();
    const otpauthUrl = this.totpService.generateUri(user.mail, secret);
    const qrCode = await this.totpService.generateQrCode(otpauthUrl);

    await this.userService.updateRaw(id_user, { totp_secret: secret });

    return { qrCode, otpauthUrl };
  }

  async confirmEnable(id_user: string, code: string) {
    const user = await this.userService.getById(id_user);
    if (!user.totp_secret) throw new HttpException(400, "Aucune procédure d'activation en cours");

    const isValid = await this.totpService.verify(code, user.totp_secret);
    if (!isValid) throw new HttpException(400, "Code invalide");

    await this.userService.updateRaw(id_user, { totp_enabled: true });

    // Génère les codes de récupération à l'activation — affichés une seule fois ici
    await this.totpRecoveryCodeRepository.deleteAllForUser(id_user); // sécurité : purge tout résidu d'une activation précédente
    const codes = generateRecoveryCodes();
    await this.totpRecoveryCodeRepository.createMany(id_user, codes);

    return { recoveryCodes: codes.map((c) => c.raw) };
  }

  // Vérifie un code TOTP classique OU un code de récupération (usage unique, consommé si valide)
  async verifyCodeOrRecovery(user: { id_user: string; totp_secret: string | null }, code: string): Promise<boolean> {
    if (!user.totp_secret) return false;

    if (isRecoveryCodeFormat(code)) {
      const hash = hashToken(code);
      const recoveryCode = await this.totpRecoveryCodeRepository.findUnusedByHash(user.id_user, hash);
      if (!recoveryCode) return false;
      await this.totpRecoveryCodeRepository.markUsed(recoveryCode.id_code);
      return true;
    }

    return await this.totpService.verify(code, user.totp_secret);
  }

  async disable(id_user: string, code: string) {
    const user = await this.userService.getById(id_user);
    if (!user.totp_enabled || !user.totp_secret) throw new HttpException(400, "TOTP non activé");

    const isValid = await this.verifyCodeOrRecovery(user, code);
    if (!isValid) throw new HttpException(400, "Code invalide");

    await this.userService.updateRaw(id_user, { totp_enabled: false, totp_secret: null });
    await this.totpRecoveryCodeRepository.deleteAllForUser(id_user); // les anciens codes ne doivent plus jamais fonctionner
  }

  // Régénère un nouveau lot de codes (invalide tous les précédents) — nécessite un code valide en cours
  async regenerateRecoveryCodes(id_user: string, code: string) {
    const user = await this.userService.getById(id_user);
    if (!user.totp_enabled || !user.totp_secret) throw new HttpException(400, "TOTP non activé");

    const isValid = await this.verifyCodeOrRecovery(user, code);
    if (!isValid) throw new HttpException(400, "Code invalide");

    await this.totpRecoveryCodeRepository.deleteAllForUser(id_user);
    const codes = generateRecoveryCodes();
    await this.totpRecoveryCodeRepository.createMany(id_user, codes);

    return { recoveryCodes: codes.map((c) => c.raw) };
  }

  async countRemainingRecoveryCodes(id_user: string): Promise<number> {
    return await this.totpRecoveryCodeRepository.countUnused(id_user);
  }
}