/**
 * Reglas de las subidas de archivo, espejo de lo que impone el backend.
 *
 * Están aquí y no dentro del componente porque son parte del contrato del API:
 * las necesitan también las pantallas que suben varios archivos o que quieren
 * avisar antes de abrir el selector.
 */

/** Límite del backend: 8 MB por archivo. */
export const TAMANO_MAXIMO = 8 * 1024 * 1024;

/**
 * Tipos admitidos. El servidor los valida por firma binaria y no por
 * extensión, así que esta lista sirve para filtrar el selector y dar un
 * mensaje temprano, nunca como garantía.
 */
export const TIPOS_ACEPTADOS = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

/** Extensiones para el atributo accept del input. */
export const EXTENSIONES_ACEPTADAS = ".jpg,.jpeg,.png,.webp,.pdf";

export function formatearPeso(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}
