import type { TonoInsignia } from "../../componentes/ui/tonos";
import { SEMAFORO, type Semaforo } from "../../types/api";

/**
 * Semáforo de caducidad: etiqueta y tono por nivel (calculado en backend)
 * Cada nivel exige etiqueta de texto por accesibilidad (sección 7 del manual)
 */
export interface NivelSemaforo {
  /** Texto de la insignia. */
  etiqueta: string;
  /** Qué significa, para el resumen y las descripciones. */
  detalle: string;
  tono: TonoInsignia;
}

export const NIVELES: Record<Semaforo, NivelSemaforo> = {
  [SEMAFORO.VENCIDO]: {
    etiqueta: "Vencido",
    detalle: "Ya pasó su fecha de caducidad. No debe entregarse.",
    tono: "vencida",
  },
  [SEMAFORO.ROJO]: {
    etiqueta: "Vence en menos de 3 meses",
    detalle: "Conviene priorizar su entrega antes de que caduque.",
    tono: "rechazada",
  },
  [SEMAFORO.AMARILLO]: {
    etiqueta: "Vence en menos de 6 meses",
    detalle: "Todavía hay margen, pero conviene tenerlo a la vista.",
    tono: "pendiente",
  },
  [SEMAFORO.VERDE]: {
    etiqueta: "Vigente",
    detalle: "Faltan más de seis meses para su caducidad.",
    tono: "aprobada",
  },
  [SEMAFORO.GRIS]: {
    etiqueta: "Sin caducidad",
    detalle: "El insumo no lleva fecha de vencimiento.",
    tono: "neutra",
  },
};

/** Orden de lectura: primero lo que exige actuar hoy. */
export const ORDEN_SEMAFORO: readonly Semaforo[] = [
  SEMAFORO.VENCIDO,
  SEMAFORO.ROJO,
  SEMAFORO.AMARILLO,
  SEMAFORO.VERDE,
  SEMAFORO.GRIS,
];

/**
 * Devuelve nivel de semáforo o null si no aplica
 * Distingue insumos inactivos de aquellos sin existencias que llegan como GRIS
 */
export function nivelDe(
  valor: Semaforo | string | null,
  sinExistencias = false,
): NivelSemaforo | null {
  if (valor === null || sinExistencias) return null;
  return NIVELES[valor as Semaforo] ?? null;
}
