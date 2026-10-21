import { useCatalogo } from "../../hooks/useCatalogo";
import { subirEvidencia } from "../../api/entregas";
import type { ElementoCatalogo } from "../../types/api";

/* Receta médica de las entregas de medicamentos.

   Qué insumos la exigen lo decide el backend (config/receta.ts, por id de
   categoría) y llega como `requiere_receta`. Aquí solo se sube: la receta se
   pide ANTES de registrar la entrega, pero se guarda como evidencia de tipo
   «Receta médica» una vez que la entrega existe, porque la evidencia cuelga de
   ella. Si esa subida falla, la entrega queda registrada y el listado la marca
   «Falta receta» para completarla desde la ficha. */

// Catálogo de sistema: se compara por nombre y no se edita desde Catálogos.
const TIPO_RECETA = "RECETA_MEDICA";

export function useSubidaReceta() {
  const tipos = useCatalogo<ElementoCatalogo>("tipos-evidencia-entrega");
  const tipoRecetaId = tipos.opciones.find((t) => t.nombre === TIPO_RECETA)?.id;

  /* Devuelve true si la receta quedó guardada. No lanza: un fallo aquí no
     deshace la entrega, que ya está registrada y con el inventario descontado. */
  async function subirReceta(entregaId: number, archivo: File): Promise<boolean> {
    if (tipoRecetaId === undefined) return false;
    try {
      await subirEvidencia(entregaId, {
        archivo,
        tipoEvidenciaId: tipoRecetaId,
      });
      return true;
    } catch {
      return false;
    }
  }

  return { subirReceta, listo: tipoRecetaId !== undefined };
}

export const AYUDA_RECETA =
  "Los medicamentos se entregan con receta médica. Tome la foto o adjunte el archivo; se guarda como evidencia de esta entrega.";

export const AVISO_RECETA_NO_SUBIDA =
  "La entrega quedó registrada, pero la receta no se pudo guardar. Adjúntela desde la ficha de la entrega: queda marcada «Falta receta» hasta entonces.";
