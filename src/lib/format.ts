import type { MessageType, PayloadType } from "@/types";

/** Espejo de MessageService#buildPreview en el backend, para patchear conversaciones en memoria. */
export function buildMessagePreview(type: MessageType, textContent: string | null, payloadType: PayloadType | null): string {
  switch (type) {
    case "TEXT":
      return textContent ?? "";
    case "IMAGE":
      return "📷 Imagen";
    case "FILE":
      return "📎 Archivo adjunto";
    case "PAYLOAD":
      switch (payloadType) {
        case "SALES":
          return "🛒 Oferta";
        case "SURVEY":
          return "📋 Encuesta";
        case "CARD":
          return "🃏 Tarjeta";
        default:
          return "⚙️ Notificación";
      }
  }
}

// Paleta sólida (no hay gradientes CSS en RN) — un color estable por usuario.
const AVATAR_PALETTE = ["#3B82F6", "#A855F7", "#EC4899", "#10B981", "#F59E0B", "#06B6D4", "#F43F5E", "#6366F1"];

/** Color determinístico por usuario, para que cada persona tenga un avatar estable. */
export function avatarColor(seed: number | string): string {
  const str = String(seed);
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

/** Etiqueta de separador de fecha para agrupar mensajes: "Hoy", "Ayer" o fecha larga. */
export function dayLabel(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  if (sameDay(date, today)) return "Hoy";
  if (sameDay(date, yesterday)) return "Ayer";
  return date.toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" });
}

/** Hora corta para burbujas de mensaje: "14:05". */
export function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
}

/** Hora relativa para la lista de conversaciones: "ahora", "5 min", "ayer", "12/04". */
export function relativeTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const min = Math.floor((now.getTime() - date.getTime()) / 60_000);
  if (min < 1) return "ahora";
  if (min < 60) return `${min} min`;
  if (min < 1440) return date.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
  if (min < 2880) return "ayer";
  return date.toLocaleDateString("es", { day: "2-digit", month: "2-digit" });
}
