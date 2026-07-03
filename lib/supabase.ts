import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error(
    "Faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en las variables de entorno"
  );
}

// Cliente de servidor: usa la service_role key, así que SOLO debe importarse
// desde código que corre en el servidor (route handlers, server components).
// Nunca lo expongas al cliente ni uses NEXT_PUBLIC_ para esta key.
export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false },
});
