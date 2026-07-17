"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Cliente de NAVEGADOR para Supabase (websockets/Realtime de la vista pública).
// Usa la llave ANON, que es pública y segura: RLS decide qué se puede leer.
// ⚠️ Aquí NUNCA va la service_role key (esa vive solo en el servidor).
let client: SupabaseClient | null | undefined;

export function getSupabaseBrowser(): SupabaseClient | null {
  if (client !== undefined) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    // Sin las variables públicas no hay websockets: quien llame debe caer
    // a sondeo (polling) para que la vista siga actualizándose.
    client = null;
    return client;
  }

  client = createClient(url, anon, {
    auth: { persistSession: false },
  });
  return client;
}
