import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface VINDecodeResult {
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

async function fetchVINDecode(vin: string): Promise<VINDecodeResult | null> {
  if (!vin || vin.length < 3) {
    return null;
  }

  const { data, error } = await supabase.functions.invoke('decode-vin', {
    body: { vin }
  });

  if (error) {
    console.error('Error decoding VIN:', error);
    throw error;
  }

  return data as VINDecodeResult;
}

export function useVINDecode(vin: string | undefined) {
  return useQuery({
    queryKey: ['vin-decode', vin],
    queryFn: () => fetchVINDecode(vin!),
    enabled: !!vin && vin.length >= 3,
    staleTime: 1000 * 60 * 60, // 1 hour - data rarely changes
    gcTime: 1000 * 60 * 60 * 24, // 24 hours cache
  });
}
