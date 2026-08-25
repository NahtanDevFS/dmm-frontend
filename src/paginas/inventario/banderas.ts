import type { Insumo } from "../../api/inventario";

/**
 * Las tres banderas del insumo, con el nombre que ve el usuario y lo que
 * realmente provocan.
 *
 * Vive aparte del formulario porque las lee también el listado y la ficha: si
 * cada pantalla escribiera su propio texto, el mismo campo acabaría explicado
 * de tres maneras distintas. La etiqueta corta es para la insignia de la
 * tabla; la explicación, para la casilla del formulario, donde hay sitio para
 * decir qué se rompe si se marca.
 *
 * Están en el insumo y no en su categoría. Dentro de «Medicamentos» conviven
 * productos que caducan y productos que no, así que heredarlas de la categoría
 * obligaba a inventar una categoría por cada combinación de requisitos.
 */
export interface DefinicionBandera {
  clave: keyof Pick<
    Insumo,
    | "requiere_fecha_caducidad"
    | "requiere_codigo_fabricante"
    | "bloquea_solicitud_sin_stock"
  >;
  /** Texto de la insignia en el listado. Cabe en una celda. */
  etiqueta: string;
  /** Texto de la casilla del formulario. */
  nombre: string;
  /** Qué hace cumplir la base cuando está marcada. */
  ayuda: string;
}

export const BANDERAS: readonly DefinicionBandera[] = [
  {
    clave: "requiere_fecha_caducidad",
    etiqueta: "Caduca",
    nombre: "Exige fecha de caducidad",
    ayuda:
      "Al registrar un lote de este insumo habrá que indicar la fecha de vencimiento. La base rechaza el lote que llegue sin ella.",
  },
  {
    clave: "requiere_codigo_fabricante",
    etiqueta: "Código de fabricante",
    nombre: "Exige código de lote del fabricante",
    ayuda:
      "Al registrar un lote habrá que copiar el código impreso por el fabricante. Es lo que permite rastrear el producto ante un retiro.",
  },
  {
    clave: "bloquea_solicitud_sin_stock",
    etiqueta: "Bloquea sin existencias",
    nombre: "Bloquear la solicitud si no hay existencias",
    ayuda:
      "Con existencias en cero no se podrá agregar este insumo a ninguna solicitud. Sin la bandera, la línea se crea igual y queda pendiente de adquisición.",
  },
];
