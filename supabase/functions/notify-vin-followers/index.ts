import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { vin, contribution_type } = await req.json();

    if (!vin) {
      return new Response(
        JSON.stringify({ error: 'VIN is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all followers for this VIN
    const { data: followers, error: followError } = await supabase
      .from('vin_followers')
      .select('user_id')
      .eq('vin', vin);

    if (followError) {
      console.error('Error fetching followers:', followError);
      throw followError;
    }

    if (!followers || followers.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No followers to notify', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get emails for followers
    const userIds = followers.map(f => f.user_id);
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) throw usersError;

    const followerEmails = (users || [])
      .filter(u => userIds.includes(u.id) && u.email)
      .map(u => u.email!);

    if (followerEmails.length === 0 || !resendApiKey) {
      console.log(`No emails to send (${followerEmails.length} emails, resend: ${!!resendApiKey})`);
      return new Response(
        JSON.stringify({ message: 'No emails to send', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send emails via Resend
    const siteUrl = Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '') || 'https://vlinks.lovable.app';
    const vinPageUrl = `https://vlinks.lovable.app/vin/${vin}`;

    const typeLabels: Record<string, string> = {
      inspection_report: "Rapport d'inspection",
      vehicle_history: "Historique véhicule",
      owner_exchange: "Échange avec vendeur",
      mechanic_conversation: "Avis mécanicien",
      photo_evidence: "Preuves photo",
      observation: "Observation",
      purchase_decision: "Décision d'achat",
    };
    const typeLabel = typeLabels[contribution_type] || "Contribution";

    let sentCount = 0;
    for (const email of followerEmails) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: 'VLINKS <contact@vlinks.ca>',
            to: [email],
            subject: `Nouvelle information sur un VIN que vous suivez`,
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 20px;">
                <h2 style="color: #1a1a2e; margin-bottom: 16px;">Nouvelle activité sur un VIN suivi</h2>
                <p style="color: #4a4a5a; line-height: 1.6;">
                  Une nouvelle contribution (<strong>${typeLabel}</strong>) a été ajoutée au dossier du véhicule :
                </p>
                <div style="background: #f4f4f8; border-radius: 8px; padding: 16px; margin: 20px 0; font-family: monospace; font-size: 16px; text-align: center; color: #1a1a2e;">
                  ${vin}
                </div>
                <a href="${vinPageUrl}" style="display: inline-block; background: #1a1a2e; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                  Consulter le dossier
                </a>
                <p style="color: #8a8a9a; font-size: 12px; margin-top: 32px;">
                  Vous recevez cet email car vous suivez ce VIN sur VLINKS. 
                  Pour ne plus recevoir ces notifications, rendez-vous dans votre profil.
                </p>
              </div>
            `,
          }),
        });
        if (res.ok) sentCount++;
        else console.error('Resend error:', await res.text());
      } catch (e) {
        console.error('Email send error:', e);
      }
    }

    return new Response(
      JSON.stringify({ message: `Notified ${sentCount} followers`, count: sentCount }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in notify-vin-followers:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
