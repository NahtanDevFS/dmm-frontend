import type { FormularioCampo } from "../../api/formularios";

/**
 * Sugerencias que el sistema puede calcular a partir de lo ya respondido.
 *
 * Hoy solo aplica al formulario de aptitud para silla de ruedas, donde la
 * tabla de Orden de Malta traduce medidas a tallas y posiciones. La cuenta es
 * mecánica y hacerla de cabeza con la hoja en la mano invita a equivocarse.
 *
 * Son SUGERENCIAS, no valores impuestos: quien mide decide. Por eso no se
 * escriben en el campo, se muestran debajo como texto de ayuda.
 *
 * Los campos se reconocen por su etiqueta. Es frágil —si alguien renombra el
 * campo desde Catálogos, la sugerencia deja de aparecer— pero el efecto de
 * fallar es solo que no se sugiere nada, nunca un dato equivocado. La
 * alternativa sería marcar los campos en la base, y no compensa para tres
 * reglas de un solo formulario.
 */

const ETIQUETA_CADERA = "Ancho de la cadera (cm)";
const ETIQUETA_PIERNA = "Largo de la pierna (cm)";
const ETIQUETA_ESPALDA = "Altura de la espalda (cm)";
const ETIQUETA_TALLA = "Talla de silla resultante";
const ETIQUETA_POS_PIERNA = "Posición del reposapiés";
const ETIQUETA_POS_ESPALDA = "Posición del respaldo";

/**
 * Rangos con límite superior EXCLUYENTE: 25 a 32.9 es S, 33 empieza M. Así lo
 * confirmó la Dirección, porque en la hoja impresa los bordes se solapan.
 */
const TALLAS_GEN_2: [number, number, string][] = [
  [25, 33, "GEN_2 S"],
  [33, 38, "GEN_2 M"],
  [38, 43, "GEN_2 L"],
  [43, 48.001, "GEN_2 XL"],
];

const TALLAS_GEN_3: [number, number, string][] = [
  [25, 31, "GEN_3 S"],
  [31, 36, "GEN_3 M"],
  [36, 40, "GEN_3 L"],
  [40, 47.001, "GEN_3 XL"],
];

function tallaPara(
  cadera: number,
  tabla: [number, number, string][],
): string | null {
  const fila = tabla.find(([min, max]) => cadera >= min && cadera < max);
  return fila ? fila[2] : null;
}

/**
 * Posición del reposapiés según el largo de la pierna.
 *
 * El texto devuelto coincide EXACTAMENTE con las etiquetas de las opciones
 * del campo en la base (ver campos_posicion_silla.sql): la sugerencia se lee
 * y la persona elige la opción con ese mismo nombre. Si se renombra una, hay
 * que renombrar la otra.
 */
function posicionPierna(cm: number): string {
  if (cm < 41) return "La más corta";
  if (cm <= 47) return "Media";
  return "La más larga";
}

/** Posición del respaldo según la altura de la espalda. Misma advertencia. */
function posicionEspalda(cm: number): string {
  if (cm < 44) return "La más baja";
  if (cm < 48) return "Media-baja";
  if (cm <= 52) return "Media-alta";
  return "La más alta";
}

/** Convierte a número lo escrito, o null si no es un número usable. */
function numero(valor: string | null | undefined): number | null {
  if (valor === null || valor === undefined || valor.trim() === "") return null;
  const n = Number(valor);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Devuelve, por id de campo, el texto a mostrar debajo. Vacío cuando no hay
 * nada que sugerir todavía.
 */
export function calcularSugerencias(
  campos: FormularioCampo[],
  valores: Record<number, string | null>,
): Record<number, string> {
  const porEtiqueta = new Map(campos.map((c) => [c.etiqueta, c]));
  const sugerencias: Record<number, string> = {};

  const idDe = (etiqueta: string) => porEtiqueta.get(etiqueta)?.id;

  const cadera = numero(valores[idDe(ETIQUETA_CADERA) ?? -1]);
  const pierna = numero(valores[idDe(ETIQUETA_PIERNA) ?? -1]);
  const espalda = numero(valores[idDe(ETIQUETA_ESPALDA) ?? -1]);

  const idTalla = idDe(ETIQUETA_TALLA);
  if (idTalla !== undefined && cadera !== null) {
    const gen2 = tallaPara(cadera, TALLAS_GEN_2);
    const gen3 = tallaPara(cadera, TALLAS_GEN_3);

    // Se ofrecen las dos porque elegir entre GEN_2 y GEN_3 no depende de la
    // medida: es criterio de quien evalúa. La tabla solo dice qué talla
    // corresponde dentro de cada línea.
    if (gen2 || gen3) {
      const opciones = [gen2, gen3].filter(Boolean).join(" o ");
      sugerencias[idTalla] =
        "Según " + cadera + " cm de cadera, la tabla indica " + opciones + ".";
    } else {
      sugerencias[idTalla] =
        "Con " +
        cadera +
        " cm de cadera no hay talla en la tabla (va de 25 a 48 cm). Verifique la medida.";
    }
  }

  // La sugerencia va bajo el campo donde SE ELIGE la posición, no bajo la
  // medida: es ahí donde hace falta y donde queda registrada la decisión.
  const idPosPierna = idDe(ETIQUETA_POS_PIERNA);
  if (idPosPierna !== undefined && pierna !== null) {
    sugerencias[idPosPierna] =
      "Con " +
      pierna +
      " cm de pierna, la tabla indica '" +
      posicionPierna(pierna) +
      "'.";
  }

  const idPosEspalda = idDe(ETIQUETA_POS_ESPALDA);
  if (idPosEspalda !== undefined && espalda !== null) {
    sugerencias[idPosEspalda] =
      "Con " +
      espalda +
      " cm de espalda, la tabla indica '" +
      posicionEspalda(espalda) +
      "'.";
  }

  return sugerencias;
}
