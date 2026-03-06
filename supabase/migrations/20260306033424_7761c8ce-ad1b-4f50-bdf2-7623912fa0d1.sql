
-- Create vin_followers table
CREATE TABLE public.vin_followers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vin TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, vin)
);

-- Enable RLS
ALTER TABLE public.vin_followers ENABLE ROW LEVEL SECURITY;

-- Users can view their own followed VINs
CREATE POLICY "Users can view own followed VINs"
  ON public.vin_followers FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can follow VINs
CREATE POLICY "Users can follow VINs"
  ON public.vin_followers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can unfollow VINs
CREATE POLICY "Users can unfollow VINs"
  ON public.vin_followers FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role can read followers for notifications
CREATE POLICY "Service role can read all followers"
  ON public.vin_followers FOR SELECT
  TO service_role
  USING (true);
