import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Boton from "../../componentes/ui/Boton";
import { CampoSelect } from "../../componentes/ui/Campo";
import { EstadoVacio, EsqueletoTabla } from "../../componentes/ui/Estado";
import { useAvisos } from "../../componentes/ui/avisos/useAvisos";
import { useCatalogo } from "../../hooks/useCatalogo";
import { mensajeDeError } from "../../lib/errores";
import {
  CLAVE_REPORTES,
  obtenerStockPorCategoria,
  descargarStockPorCategoria,
  type FiltrosStockPorCategoria,
} from "../../api/reportes";
import type { ElementoCatalogo } from "../../types/api";
import TablaReporte from "./TablaReporte";
import estilos from "./Reportes.module.css";

const FILTROS_VACIOS: FiltrosStockPorCategoria = {};

/** Cuánto queda por categoría, y cuántos lotes ya están vencidos o por vencer. */
function SeccionStockPorCategoria() {
  const { avisar } = useAvisos();

  const [filtros, setFiltros] =
    useState<FiltrosStockPorCategoria>(FILTROS_VACIOS);
  const [exportando, setExportando] = useState<"xlsx" | "pdf" | null>(null);

  const categorias = useCatalogo<ElementoCatalogo>("categorias-insumo");

  // Este reporte no distingue "aplicados" de "en edición": ambos filtros son
  // baratos de recalcular en el servidor (sin rangos de fecha que validar
  // antes), así que cada cambio dispara el reporte directo.
  const reporte = useQuery({
    queryKey: [CLAVE_REPORTES, "stock-por-categoria", filtros],
    queryFn: () => obtenerStockPorCategoria(filtros),
  });

  const exportar = async (formato: "xlsx" | "pdf") => {
    setExportando(formato);
    try {
      await descargarStockPorCategoria(filtros, formato);
    } catch (error) {
      avisar(mensajeDeError(error), "error");
    } finally {
      setExportando(null);
    }
  };

  const hayFiltros = Object.keys(filtros).length > 0;

  return (
    <section className={estilos.tarjeta} aria-labelledby="rep-stock">
      <div className={estilos.tituloTarjeta}>
        <h2 id="rep-stock">Stock por categoría</h2>
      </div>
      <p className={estilos.nota}>
        Unidades disponibles por categoría de insumo, y cuántos lotes están
        vencidos o por vencer.
      </p>

      <div className={estilos.filtros}>
        <CampoSelect
          className={estilos.filtroSelect}
          etiqueta="Categoría"
          marcador="Todas"
          value={filtros.categoriaId ?? ""}
          onChange={(e) =>
            setFiltros((p) => ({
              ...p,
              categoriaId: e.target.value ? Number(e.target.value) : undefined,
            }))
          }
        >
          {categorias.opciones.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </CampoSelect>

        <label className={estilos.opcionesExtra}>
          <input
            type="checkbox"
            className={estilos.casilla}
            checked={filtros.soloConUrgentes ?? false}
            onChange={(e) =>
              setFiltros((p) => ({ ...p, soloConUrgentes: e.target.checked }))
            }
          />
          Solo con lotes urgentes o vencidos
        </label>

        {hayFiltros && (
          <div className={estilos.accionesFiltro}>
            <Boton
              variante="terciaria"
              onClick={() => setFiltros(FILTROS_VACIOS)}
            >
              Limpiar
            </Boton>
          </div>
        )}
      </div>

      {reporte.isPending ? (
        <EsqueletoTabla filas={5} columnas={4} />
      ) : reporte.isError ? (
        <EstadoVacio
          titulo="No se pudo generar el reporte"
          texto={mensajeDeError(reporte.error)}
          accion={
            <Boton variante="secundaria" onClick={() => void reporte.refetch()}>
              Reintentar
            </Boton>
          }
        />
      ) : reporte.data.datos.length === 0 ? (
        <EstadoVacio
          titulo="Sin resultados"
          texto="Ninguna categoría coincide con los filtros aplicados."
        />
      ) : (
        <>
          <div className={estilos.resumen}>
            <span className={estilos.totalRegistros}>
              {reporte.data.total_registros.toLocaleString("es-GT")}{" "}
              categoría(s)
            </span>
            <div className={estilos.exportar}>
              <Boton
                pequeno
                variante="secundaria"
                cargando={exportando === "xlsx"}
                textoCargando="Generando…"
                onClick={() => void exportar("xlsx")}
              >
                Exportar Excel
              </Boton>
              <Boton
                pequeno
                variante="secundaria"
                cargando={exportando === "pdf"}
                textoCargando="Generando…"
                onClick={() => void exportar("pdf")}
              >
                Exportar PDF
              </Boton>
            </div>
          </div>
          <TablaReporte
            titulo="Stock por categoría"
            columnas={reporte.data.columnas}
            datos={reporte.data.datos}
          />
        </>
      )}
    </section>
  );
}

export default SeccionStockPorCategoria;
