import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  type: "password_reset" | "email_confirmation" | "welcome";
  to: string;
  data: {
    resetLink?: string;
    confirmLink?: string;
    userName?: string;
  };
}

const getEmailContent = (type: string, data: EmailRequest["data"]) => {
  switch (type) {
    case "password_reset":
      return {
        subject: "Réinitialisation de votre mot de passe VLINKS",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 40px 20px;">
            <div style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <div style="background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%); padding: 32px; text-align: center;">
                <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0; letter-spacing: -0.5px;">VLINKS</h1>
                <p style="color: #94a3b8; font-size: 12px; margin: 8px 0 0 0; letter-spacing: 1px;">TRUTH IS A CHAIN. YOU ARE THE LINK.</p>
              </div>
              <div style="padding: 40px 32px;">
                <h2 style="color: #0f172a; font-size: 20px; font-weight: 600; margin: 0 0 16px 0;">Réinitialisation de mot de passe</h2>
                <p style="color: #64748b; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
                  Vous avez demandé la réinitialisation de votre mot de passe VLINKS. Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe.
                </p>
                <a href="${data.resetLink}" style="display: inline-block; background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%); color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px; margin: 0 0 24px 0;">
                  Réinitialiser mon mot de passe
                </a>
                <p style="color: #94a3b8; font-size: 13px; line-height: 1.5; margin: 0;">
                  Ce lien expirera dans 1 heure. Si vous n'avez pas demandé cette réinitialisation, ignorez simplement ce courriel.
                </p>
              </div>
              <div style="background-color: #f8fafc; padding: 24px 32px; border-top: 1px solid #e2e8f0;">
                <p style="color: #94a3b8; font-size: 12px; line-height: 1.5; margin: 0; text-align: center;">
                  © ${new Date().getFullYear()} VLINKS. Tous droits réservés.<br>
                  La transparence au service des acheteurs.
                </p>
              </div>
            </div>
          </body>
          </html>
        `,
      };
    
    case "welcome":
      return {
        subject: "Bienvenue sur VLINKS!",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 40px 20px;">
            <div style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <div style="background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%); padding: 32px; text-align: center;">
                <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0; letter-spacing: -0.5px;">VLINKS</h1>
                <p style="color: #94a3b8; font-size: 12px; margin: 8px 0 0 0; letter-spacing: 1px;">TRUTH IS A CHAIN. YOU ARE THE LINK.</p>
              </div>
              <div style="padding: 40px 32px;">
                <h2 style="color: #0f172a; font-size: 20px; font-weight: 600; margin: 0 0 16px 0;">Bienvenue ${data.userName || ''}!</h2>
                <p style="color: #64748b; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
                  Merci de rejoindre la communauté VLINKS. Ensemble, nous construisons une base de données transparente pour les acheteurs de véhicules d'occasion.
                </p>
                <p style="color: #64748b; font-size: 15px; line-height: 1.6; margin: 0;">
                  Commencez par rechercher un VIN ou contribuer vos propres expériences d'achat.
                </p>
              </div>
              <div style="background-color: #f8fafc; padding: 24px 32px; border-top: 1px solid #e2e8f0;">
                <p style="color: #94a3b8; font-size: 12px; line-height: 1.5; margin: 0; text-align: center;">
                  © ${new Date().getFullYear()} VLINKS. Tous droits réservés.<br>
                  La transparence au service des acheteurs.
                </p>
              </div>
            </div>
          </body>
          </html>
        `,
      };

    default:
      throw new Error(`Unknown email type: ${type}`);
  }
};

const handler = async (req: Request): Promise<Response> => {
  console.log("send-email function called");
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, to, data }: EmailRequest = await req.json();
    console.log(`Sending ${type} email to ${to}`);

    const { subject, html } = getEmailContent(type, data);

    const emailResponse = await resend.emails.send({
      from: "VLINKS <contact@vlinks.ca>",
      to: [to],
      subject,
      html,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
