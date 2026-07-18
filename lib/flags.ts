// Banderas de los equipos del torneo.
//
// ⚠️ Por qué IMÁGENES y no emojis: Windows (Chrome/Edge) NO renderiza los
// emojis de bandera — muestra letras tipo "AR". Para que las banderas se
// vean SÍ O SÍ en todos los navegadores (Chrome, Safari, Windows, iOS),
// usamos SVGs oficiales locales en /public/flags (fuente: country-flag-icons,
// MIT). Cero dependencias externas en runtime.

// Código ISO por equipo (los nombres son fijos en el torneo; sirven para
// masculino y femenino porque usan los mismos países).
const TEAM_ISO: Record<string, string> = {
  Argentina: "ar",
  Brasil: "br",
  Italia: "it",
  Alemania: "de",
  Francia: "fr",
  Colombia: "co",
  "España": "es",
  Noruega: "no",
  "Cabo Verde": "cv",
  Congo: "cg",
  Inglaterra: "gb-eng",
  Portugal: "pt",
};

// Ruta del SVG local de la bandera del equipo, o null si no hay mapeo.
export function teamFlagSrc(name?: string | null): string | null {
  if (!name) return null;
  const iso = TEAM_ISO[name.trim()];
  return iso ? `/flags/${iso}.svg` : null;
}

// Utilidad recomendada por el equipo: código ISO-2 → emoji de bandera.
// (La conservamos para datos que lleguen como código de país, pero para
// pintar en pantalla usa teamFlagSrc: el emoji no se ve en Windows.)
export function getFlagEmoji(countryCode?: string | null): string {
  if (!countryCode) return "";
  if (!/^[A-Z]{2}$/i.test(countryCode)) return countryCode;
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}
