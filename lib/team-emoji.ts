// Emojis HARDCODEADOS por equipo (banderas del sorteo real del torneo).
// Sirve para ambas categorías: el femenino usa los mismos nombres de país.
export const TEAM_EMOJI: Record<string, string> = {
  // Grupo A (masculino)
  Argentina: "🇦🇷",
  Brasil: "🇧🇷",
  Italia: "🇮🇹",
  Alemania: "🇩🇪",
  // Grupo B (masculino) — Francia/Colombia también juegan en femenino
  Francia: "🇫🇷",
  Colombia: "🇨🇴",
  España: "🇪🇸",
  Noruega: "🇳🇴",
  // Grupo C (masculino) — Cabo Verde/Portugal también en femenino
  "Cabo Verde": "🇨🇻",
  Congo: "🇨🇬",
  Inglaterra: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  Portugal: "🇵🇹",
};

// Emoji del equipo, o null si el nombre no está en el mapa
export function teamEmoji(name?: string | null): string | null {
  if (!name) return null;
  return TEAM_EMOJI[name.trim()] ?? null;
}

// Avatar corto: el emoji si existe; si no, las iniciales (comportamiento previo)
export function teamAvatar(name?: string | null): string {
  return teamEmoji(name) ?? (name ?? "?").trim().substring(0, 2).toUpperCase();
}
