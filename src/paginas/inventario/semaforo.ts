import type { TonoInsignia } from "../../componentes/ui/tonos";
import { SEMAFORO, type Semaforo } from "../../types/api";

/**
 * Semáforo de caducidad: cómo se dice cada nivel y con qué tono se pinta.
 *
 * La escala la calcula la base con fn_semaforo_caducidad sobre la fecha de
 * vencimiento del lote, y el frontend no la recalcula: si lo hiciera, el color
 * de la tabla podría discrepar del criterio que usan los reportes.
 *
 * Cada nivel lleva siempre su etiqueta de texto. Un semáforo es el caso más
 * tentador para prescindir del texto —el color *es* la metáfora— y justo por
 * eso el más peligroso: sin la palabra, quien no distingue el rojo del ámbar
 * no puede saber qué lote hay que retirar hoy. La sección 7 del manual lo
 * prohíbe y aquí la regla se hace cumplir en el propio modelo de datos: no
 * existe forma de pedir el color sin la etiqueta.
 *
 * GRIS no es un estado intermedio entre verde y rojo: significa que el insumo
 * no caduca, así que se nombra por lo que es y no por su color.
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
 * Nivel de un valor del API. El `null` llega cuando un insumo no tiene ningún
 * lote con existencias, y entonces no hay caducidad que clasificar.
 */
export function nivelDe(valor: Semaforo | string | null): NivelSemaforo | null {
  if (valor === null) return null;
  return NIVELES[valor as Semaforo] ?? null;
}
