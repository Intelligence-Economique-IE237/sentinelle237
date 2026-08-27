import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM, APP_URL, APP_NAME } =
    process.env as { [key: string]: string };

export class MailService {
    private transporter;

    constructor() {
        if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
            throw new Error("[MailService]: configuration SMTP incomplète — vérifie SMTP_HOST/PORT/USER/PASS");
        }
        this.transporter = nodemailer.createTransport({
            host: SMTP_HOST,
            port: Number(SMTP_PORT),
            secure: Number(SMTP_PORT) === 465,
            auth: { user: SMTP_USER, pass: SMTP_PASS },
            tls: {
                servername: "mail.iecameroun.cm",
            },
        });
    }

    async sendVerificationEmail(to: string, pseudo: string, rawToken: string) {
        const link = `${APP_URL}/api/auth/verify-email?token=${rawToken}`;
        await this.transporter.sendMail({
            from: MAIL_FROM,
            to,
            subject: `${APP_NAME} - Vérification de votre email`,
            html: `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Vérifiez votre adresse email</title>
        </head>
        <body style="margin:0;padding:40px 0;background-color:#F3F4F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">

          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td align="center">

                <table width="560" cellpadding="0" cellspacing="0" border="0"
                  style="background-color:#6C6FF5;border-radius:20px;overflow:hidden;">
                  <tr>
                    <td style="padding: 28px 32px 20px 32px;">
                      <p style="margin:0;font-size:17px;font-weight:700;color:#FFFFFF;letter-spacing:-0.2px;">
                        ✦ &nbsp;Sentinelle 237
                      </p>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding: 0 12px;">
                      <table width="100%" cellpadding="0" cellspacing="0" border="0"
                        style="background:#FFFFFF;border-radius:14px;overflow:hidden;">
                        <tr>
                          <td style="padding: 44px 40px 40px 40px;">

                            <h1 style="margin:0 0 20px 0;font-size:46px;font-weight:800;line-height:1.08;color:#0F0F0F;letter-spacing:-1.5px;">
                              Vérifiez votre adresse email.
                            </h1>

                            <hr style="border:none;border-top:1px solid #E5E7EB;margin:0 0 24px 0;">

                            <p style="margin:0 0 28px 0;font-size:15px;line-height:1.65;color:#6B7280;">
                              Bienvenue sur Sentinelle&nbsp;237&nbsp;! Cliquez sur le bouton
                              ci-dessous pour vérifier votre adresse email et activer votre
                              compte. Ce lien expire dans <strong style="color:#374151;">15&nbsp;minutes</strong>.
                            </p>

                            <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
                              <tr>
                                <td style="border-radius:100px;background:#6C6FF5;">
                                  <a href="${link}"
                                     style="display:inline-block;padding:15px 36px;font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:100px;">
                                    Vérifier mon adresse email
                                  </a>
                                </td>
                              </tr>
                            </table>

                            <p style="margin:0 0 6px 0;font-size:13.5px;color:#9CA3AF;">
                              Si le bouton ne fonctionne pas, collez ce lien dans votre navigateur&nbsp;:
                            </p>
                            <p style="margin:0 0 28px 0;font-size:12.5px;word-break:break-all;">
                              <a href="${link}" style="color:#6C6FF5;text-decoration:underline;">${link}</a>
                            </p>

                            <p style="margin:0;font-size:13.5px;line-height:1.65;color:#6B7280;">
                              Si vous n'avez pas créé de compte sur Sentinelle&nbsp;237 ou si vous
                              pensez qu'il y a une erreur, contactez-nous à
                              <a href="mailto:contact@iecameroun.cm"
                                 style="color:#0F0F0F;font-weight:700;text-decoration:underline;">
                                contact@iecameroun.cm
                              </a>.
                              Nous sommes là pour vous aider&nbsp;!
                            </p>

                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding: 10px 12px 12px 12px;">
                      <table width="100%" cellpadding="0" cellspacing="0" border="0"
                        style="background:#FFFFFF;border-radius:14px;overflow:hidden;">
                        <tr>
                          <td align="center" style="padding: 20px 40px;">
                            <a href="https://sentinelle237.iecameroun.cm"
                               style="font-size:13.5px;color:#6C6FF5;text-decoration:underline;font-weight:600;margin:0 12px;">
                              Sentinelle 237
                            </a>
                            <a href="https://iecameroun.cm"
                               style="font-size:13.5px;color:#6C6FF5;text-decoration:underline;font-weight:600;margin:0 12px;">
                              IE237
                            </a>
                            <a href="mailto:contact@iecameroun.cm"
                               style="font-size:13.5px;color:#6C6FF5;text-decoration:underline;font-weight:600;margin:0 12px;">
                              Contact
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <tr>
                    <td align="center" style="padding: 18px 32px 24px 32px;">
                      <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.65);">
                        Envoyé avec ❤️ par l'équipe Sentinelle 237
                      </p>
                    </td>
                  </tr>

                </table>

              </td>
            </tr>
          </table>

        </body>
        </html>
      `,
        });
    }

    async sendAlerteDigest(to: string, motCle: string, items: { titre: string; lien: string }[]) {
  const listHtml = items
    .map(
      (item) =>
        `<li style="margin-bottom:12px;"><a href="${item.lien}" style="color:#6C6FF5;text-decoration:none;font-weight:600;">${item.titre}</a></li>`
    )
    .join("");

  const html = `<!DOCTYPE html>
    <html lang="fr">
    <head><meta charset="utf-8"></head>
    <body style="margin:0;padding:32px 0;background-color:#F3F4F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td align="center">
          <table width="560" cellpadding="0" cellspacing="0" border="0" style="background:#FFFFFF;border-radius:14px;overflow:hidden;">
            <tr><td style="padding:28px 32px 8px 32px;">
              <p style="margin:0;font-size:15px;font-weight:700;color:#6C6FF5;">✦ Sentinelle 237 — Alerte</p>
            </td></tr>
            <tr><td style="padding:8px 32px 32px 32px;">
              <h2 style="margin:0 0 16px 0;font-size:22px;color:#0F0F0F;">Nouveaux résultats pour "${motCle}"</h2>
              <ul style="margin:0;padding-left:18px;font-size:14px;color:#374151;">
                ${listHtml}
              </ul>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>`;

  await this.transporter.sendMail({
    from: MAIL_FROM,
    to,
    subject: `Sentinelle 237 - Nouveaux résultats pour "${motCle}"`,
    html,
  });
}
    async sendResetPasswordEmail(to: string, pseudo: string, rawToken: string) {
  const lien = `${APP_URL}/reset-password?token=${rawToken}`; // route FRONTEND, pas backend

  const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:40px 0;background-color:#F3F4F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" border="0" style="background-color:#6C6FF5;border-radius:20px;overflow:hidden;">
        <tr><td style="padding: 28px 32px 20px 32px;">
          <p style="margin:0;font-size:17px;font-weight:700;color:#FFFFFF;">✦ &nbsp;Sentinelle 237</p>
        </td></tr>
        <tr><td style="padding: 0 12px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FFFFFF;border-radius:14px;overflow:hidden;">
            <tr><td style="padding: 44px 40px 40px 40px;">
              <h1 style="margin:0 0 20px 0;font-size:36px;font-weight:800;line-height:1.08;color:#0F0F0F;">
                Réinitialise ton mot de passe.
              </h1>
              <hr style="border:none;border-top:1px solid #E5E7EB;margin:0 0 24px 0;">
              <p style="margin:0 0 28px 0;font-size:15px;line-height:1.65;color:#6B7280;">
                Bonjour ${pseudo}, une demande de réinitialisation de mot de passe a été faite pour ton compte.
                Ce lien expire dans <strong style="color:#374151;">1 heure</strong>.
              </p>
              <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
                <tr><td style="border-radius:100px;background:#6C6FF5;">
                  <a href="${lien}" style="display:inline-block;padding:15px 36px;font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:100px;">
                    Choisir un nouveau mot de passe
                  </a>
                </td></tr>
              </table>
              <p style="margin:0;font-size:13.5px;line-height:1.65;color:#6B7280;">
                Si tu n'es pas à l'origine de cette demande, ignore simplement cet email —
                ton mot de passe actuel reste inchangé.
              </p>
            </td></tr>
          </table>
        </td></tr>
        <tr><td align="center" style="padding: 18px 32px 24px 32px;">
          <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.65);">Envoyé avec ❤️ par l'équipe Sentinelle 237</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await this.transporter.sendMail({
    from: MAIL_FROM,
    to,
    subject: "Sentinelle 237 - Réinitialisation de mot de passe",
    html,
  });
}
}