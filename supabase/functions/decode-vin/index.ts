import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NHTSAResult {
  Variable: string;
  Value: string | null;
}

interface NHTSAResponse {
  Results: NHTSAResult[];
}

interface VINDecodeResult {
  vin: string;
  make: string | null;
  model: string | null;
  model_year: number | null;
  trim: string | null;
  engine: string | null;
  body_class: string | null;
  drive_type: string | null;
  fuel_type: string | null;
  is_valid: boolean;
  error_message: string | null;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { vin } = await req.json();
    
    if (!vin || typeof vin !== 'string') {
      return new Response(
        JSON.stringify({ error: 'VIN is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cleanVin = vin.trim().toUpperCase();
    
    // Basic VIN validation (17 characters for standard VINs, but allow shorter for partial)
    if (cleanVin.length < 3) {
      return new Response(
        JSON.stringify({ 
          error: 'VIN trop court',
          is_valid: false,
          vin: cleanVin
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check cache first
    const { data: cached } = await supabase
      .from('vin_decodes')
      .select('*')
      .eq('vin', cleanVin)
      .maybeSingle();

    if (cached) {
      console.log(`Cache hit for VIN: ${cleanVin}`);
      return new Response(
        JSON.stringify(cached),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Cache miss for VIN: ${cleanVin}, calling NHTSA API`);

    // Call NHTSA vPIC API
    const nhtsaUrl = `https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvaluesextended/${cleanVin}?format=json`;
    const nhtsaResponse = await fetch(nhtsaUrl);
    
    if (!nhtsaResponse.ok) {
      console.error('NHTSA API error:', nhtsaResponse.status);
      return new Response(
        JSON.stringify({ 
          error: 'Erreur lors de la vérification du VIN',
          is_valid: false,
          vin: cleanVin
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const nhtsaData: NHTSAResponse = await nhtsaResponse.json();
    const results = (nhtsaData.Results?.[0] as unknown as Record<string, string | null>) || {};

    // Extract relevant fields
    const errorCode = results.ErrorCode || '';
    const errorText = results.ErrorText || '';
    
    // Check for errors (error codes other than 0 indicate issues)
    const hasError = errorCode && !errorCode.includes('0');
    const isValid = !hasError && (results.Make || results.Model || results.ModelYear);

    const decodeResult: VINDecodeResult = {
      vin: cleanVin,
      make: results.Make || null,
      model: results.Model || null,
      model_year: results.ModelYear ? parseInt(results.ModelYear, 10) : null,
      trim: results.Trim || null,
      engine: [
        results.EngineConfiguration,
        results.EngineCylinders ? `${results.EngineCylinders} cylindres` : null,
        results.DisplacementL ? `${results.DisplacementL}L` : null,
        results.EngineHP ? `${results.EngineHP} HP` : null,
      ].filter(Boolean).join(' ') || null,
      body_class: results.BodyClass || null,
      drive_type: results.DriveType || null,
      fuel_type: results.FuelTypePrimary || null,
      is_valid: !!isValid,
      error_message: hasError ? (errorText || 'VIN invalide ou non reconnu') : null,
    };

    // Store in cache
    const { error: insertError } = await supabase
      .from('vin_decodes')
      .upsert({
        ...decodeResult,
        raw_response: results,
      }, {
        onConflict: 'vin'
      });

    if (insertError) {
      console.error('Error caching VIN decode:', insertError);
      // Don't fail the request if caching fails
    }

    console.log(`Decoded VIN ${cleanVin}:`, decodeResult.is_valid ? 'valid' : 'invalid');

    return new Response(
      JSON.stringify(decodeResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in decode-vin function:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
