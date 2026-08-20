export type TonoInsignia =
  | "pendiente"
  | "aprobada"
  | "rechazada"
  | "informativa"
  | "marca"
  | "neutra";

/** Tono que corresponde a cada estado de solicitud que devuelve el API. */
const TONO_ESTADO_SOLICITUD: Record<string, TonoInsignia> = {
  PENDIENTE_ENTREGA: "pendiente",
  PENDIENTE_ADQUISICION: "pendiente",
  ENTREGADA: "aprobada",
  RECHAZADA: "rechazada",
  CANCELADA: "neutra",
};

/**
 * Traduce un estado del API a su tono. Vive aparte del componente para que dos
 * pantallas no pinten el mismo estado con colores distintos.
 *
 * El texto se pasa desde fuera: el nombre legible del estado lo decide el
 * catálogo del backend, no esta tabla de colores.
 */
export function tonoDeEstadoSolicitud(estado: string): TonoInsignia {
  return TONO_ESTADO_SOLICITUD[estado] ?? "neutra";
}
