import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple hash function for rate limiting (not cryptographic, just for grouping)
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

function getPasswordResetEmail(resetLink: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Réinitialisation de mot de passe - VLINKS</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td align="center" style="padding: 40px 20px;">
            <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <!-- Header -->
              <tr>
                <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 1px solid #e2e8f0;">
                  <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #0f172a;">VLINKS</h1>
                  <p style="margin: 8px 0 0; font-size: 14px; color: #64748b;">Truth is a chain. You are the link.</p>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 40px;">
                  <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #1e293b;">Réinitialisation de mot de passe</h2>
                  <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #475569;">
                    Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe.
                  </p>
                  
                  <table role="presentation" style="width: 100%;">
                    <tr>
                      <td align="center" style="padding: 16px 0;">
                        <a href="${resetLink}" style="display: inline-block; padding: 14px 32px; background-color: #0ea5e9; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 8px;">
                          Réinitialiser mon mot de passe
                        </a>
                      </td>
                    </tr>
                  </table>
                  
                  <p style="margin: 24px 0 0; font-size: 14px; line-height: 1.6; color: #64748b;">
                    Ou copiez ce lien dans votre navigateur :<br>
                    <a href="${resetLink}" style="color: #0ea5e9; word-break: break-all;">${resetLink}</a>
                  </p>
                  
                  <!-- Security Note -->
                  <div style="margin-top: 32px; padding: 16px; background-color: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
                    <p style="margin: 0; font-size: 14px; color: #92400e;">
                      <strong>🔒 Note de sécurité :</strong> Ce lien expire dans <strong>1 heure</strong>. 
                      Si vous n'avez pas demandé cette réinitialisation, ignorez cet email — votre compte reste sécurisé.
                    </p>
                  </div>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="padding: 24px 40px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; border-radius: 0 0 12px 12px;">
                  <p style="margin: 0; font-size: 12px; color: #94a3b8; text-align: center;">
                    © ${new Date().getFullYear()} VLINKS. Tous droits réservés.<br>
                    <a href="https://vlinks.ca" style="color: #64748b;">vlinks.ca</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return new Response(
        JSON.stringify({ error: "Email requis" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const emailHash = simpleHash(normalizedEmail);

    // Create Supabase admin client (uses service role key)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Rate limiting: check requests in the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentRequests, error: rateLimitError } = await supabaseAdmin
      .from("password_reset_requests")
      .select("id")
      .eq("email_hash", emailHash)
      .gte("requested_at", oneHourAgo);

    if (rateLimitError) {
      console.error("Rate limit check error:", rateLimitError);
    }

    // Max 3 requests per hour per email
    if (recentRequests && recentRequests.length >= 3) {
      console.log(`Rate limit exceeded for email hash: ${emailHash}`);
      // Return neutral message (don't reveal rate limiting to potential attackers)
      return new Response(
        JSON.stringify({ 
          message: "Si un compte existe avec cette adresse, un email de réinitialisation sera envoyé." 
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Generate password reset link using admin API (does NOT send email)
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: normalizedEmail,
      options: {
        redirectTo: "https://vlinks.ca/update-password"
      }
    });

    if (linkError) {
      console.error("Generate link error:", linkError);
      // Return neutral message even on error (don't reveal if email exists)
      return new Response(
        JSON.stringify({ 
          message: "Si un compte existe avec cette adresse, un email de réinitialisation sera envoyé." 
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Log rate limit entry
    await supabaseAdmin
      .from("password_reset_requests")
      .insert({ email_hash: emailHash });

    // Send email via Resend
    const resetLink = linkData.properties?.action_link;
    
    if (!resetLink) {
      console.error("No action_link in response");
      return new Response(
        JSON.stringify({ 
          message: "Si un compte existe avec cette adresse, un email de réinitialisation sera envoyé." 
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Sending password reset email to:", normalizedEmail);

    const emailResponse = await resend.emails.send({
      from: "VLINKS <contact@vlinks.ca>",
      to: [normalizedEmail],
      subject: "Réinitialisation de votre mot de passe - VLINKS",
      html: getPasswordResetEmail(resetLink),
    });

    if (emailResponse.error) {
      console.error("Resend error:", emailResponse.error);
      return new Response(
        JSON.stringify({ 
          message: "Si un compte existe avec cette adresse, un email de réinitialisation sera envoyé." 
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Password reset email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ 
        message: "Si un compte existe avec cette adresse, un email de réinitialisation sera envoyé." 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in request-password-reset:", error);
    return new Response(
      JSON.stringify({ 
        message: "Si un compte existe avec cette adresse, un email de réinitialisation sera envoyé." 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
