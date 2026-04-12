
-- Create notifications table
CREATE TABLE public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  vin_id UUID REFERENCES public.vins(id),
  related_id UUID,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notifications_user ON public.notifications(user_id, is_read);
CREATE INDEX idx_notifications_created ON public.notifications(user_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can mark own as read"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Trigger: notify contributor when fact moderation status changes
CREATE OR REPLACE FUNCTION public.notify_on_fact_moderation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_vin_id UUID;
  v_event_title TEXT;
BEGIN
  IF OLD.moderation_status = NEW.moderation_status THEN RETURN NEW; END IF;

  SELECT c.user_id INTO v_user_id FROM public.contributors c WHERE c.id = NEW.contributor_id;
  SELECT e.vin_id, e.title INTO v_vin_id, v_event_title FROM public.events e WHERE e.id = NEW.event_id;

  IF v_user_id IS NULL THEN RETURN NEW; END IF;

  IF NEW.moderation_status = 'approved' THEN
    INSERT INTO public.notifications (user_id, type, title, message, vin_id, related_id)
    VALUES (v_user_id, 'fact_approved', 'Fait approuvé', 'Votre contribution sur "' || COALESCE(v_event_title, 'événement') || '" a été approuvée.', v_vin_id, NEW.id);
  ELSIF NEW.moderation_status = 'rejected' THEN
    INSERT INTO public.notifications (user_id, type, title, message, vin_id, related_id)
    VALUES (v_user_id, 'fact_rejected', 'Fait rejeté', 'Votre contribution sur "' || COALESCE(v_event_title, 'événement') || '" n''a pas été retenue.', v_vin_id, NEW.id);
  ELSIF NEW.moderation_status = 'flagged' THEN
    INSERT INTO public.notifications (user_id, type, title, message, vin_id, related_id)
    VALUES (v_user_id, 'fact_flagged', 'Fait signalé', 'Votre contribution sur "' || COALESCE(v_event_title, 'événement') || '" a été signalée pour révision.', v_vin_id, NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_fact_moderation
  AFTER UPDATE OF moderation_status ON public.facts
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_fact_moderation();

-- Trigger: notify contributors when owner responds to their event
CREATE OR REPLACE FUNCTION public.notify_on_owner_response()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vin_id UUID;
  v_event_title TEXT;
  v_contributor_role TEXT;
  rec RECORD;
BEGIN
  IF NEW.face != 'face_b' THEN RETURN NEW; END IF;

  SELECT c.role INTO v_contributor_role FROM public.contributors c WHERE c.id = NEW.contributor_id;
  IF v_contributor_role NOT IN ('owner_verified', 'owner_unverified', 'former_owner') THEN RETURN NEW; END IF;

  SELECT e.vin_id, e.title INTO v_vin_id, v_event_title FROM public.events e WHERE e.id = NEW.event_id;

  FOR rec IN
    SELECT DISTINCT c.user_id
    FROM public.facts f
    JOIN public.contributors c ON c.id = f.contributor_id
    WHERE f.event_id = NEW.event_id
    AND f.face = 'face_a'
    AND c.user_id IS NOT NULL
    AND c.user_id != (SELECT c2.user_id FROM public.contributors c2 WHERE c2.id = NEW.contributor_id)
  LOOP
    INSERT INTO public.notifications (user_id, type, title, message, vin_id, related_id)
    VALUES (rec.user_id, 'owner_response', 'Réponse du propriétaire', 'Le propriétaire a répondu sur "' || COALESCE(v_event_title, 'événement') || '".', v_vin_id, NEW.id);
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_owner_response
  AFTER INSERT ON public.facts
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_owner_response();
