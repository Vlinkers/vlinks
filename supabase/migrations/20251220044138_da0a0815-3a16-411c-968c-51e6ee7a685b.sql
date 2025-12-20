-- Update handle_new_user to NOT derive username from email
-- Username will be passed via user metadata and MUST be provided at signup

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Create profile - username MUST come from metadata (required at signup)
  INSERT INTO public.profiles (user_id, display_name, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.raw_user_meta_data ->> 'username'),
    NEW.raw_user_meta_data ->> 'username'
  );
  
  -- Assign default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  -- Give early adopter badge
  INSERT INTO public.user_badges (user_id, badge_type)
  VALUES (NEW.id, 'early_adopter');
  
  RETURN NEW;
END;
$function$;