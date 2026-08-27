import { generateSecret, generate, verify, generateURI } from "otplib";
import QRCode from "qrcode";

const { APP_NAME } = process.env as { [key: string]: string };

export class TotpService {
    generateSecret(): string {
        return generateSecret();
    }

    generateUri(mail: string, secret: string): string {
        return generateURI({
            issuer: APP_NAME || "MonApp",
            label: mail,
            secret,
        });
    }

    async generateQrCode(otpauthUrl: string): Promise<string> {
        return await QRCode.toDataURL(otpauthUrl);
    }

    async verify(code: string, secret: string): Promise<boolean> {
        try {
            const result = await verify({ secret, token: code });
            return result.valid;
        } catch {
            return false;
        }
    }
}