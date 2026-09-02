import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Boton from "../../componentes/ui/Boton";
import { CampoSelect, CampoTexto } from "../../componentes/ui/Campo";
import { EstadoVacio, EsqueletoTabla } from "../../componentes/ui/Estado";
import { useAvisos } from "../../componentes/ui/avisos/useAvisos";
import { useCatalogo } from "../../hooks/useCatalogo";
import { mensajeDeError } from "../../lib/errores";
import { fechaDeHoy } from "../../lib/fechas";
import {
  CLAVE_REPORTES,
  obtenerPoblacionBeneficiada,
  descargarPoblacionBeneficiada,
  type FiltrosPoblacionBeneficiada,
  type Genero,
  type GrupoEtario,
} from "../../api/reportes";
import type { ElementoCatalogo } from "../../types/api";
import TablaReporte from "./TablaReporte";
import estilos from "./Reportes.module.css";

const OPCIONES_GENERO: { valor: Genero; etiqueta: string }[] = [
  { valor: "MASCULINO", etiqueta: "Masculino" },
  { valor: "FEMENINO", etiqueta: "Femenino" },
  { valor: "OTRO", etiqueta: "Otro" },
  { valor: "PREFIERE_NO_DECIR", etiqueta: "Prefiere no decir" },
];

const OPCIONES_GRUPO_ETARIO: { valor: GrupoEtario; etiqueta: string }[] = [
  { valor: "MENOR", etiqueta: "Menor de edad" },
  { valor: "ADULTO", etiqueta: "Adulto" },
  { valor: "ADULTO_MAYOR", etiqueta: "Adulto mayor" },
];

const FILTROS_VACIOS: FiltrosPoblacionBeneficiada = {};

/**
 * Alcance geográfico y demográfico del trabajo de la DMM, agrupado por mes:
 * cuántas personas únicas y cuántas entregas totales, por comunidad,
 * programa, género y grupo etario.
 */
function SeccionPoblacionBeneficiada() {
  const { avisar } = useAvisos();

  const [filtros, setFiltros] =
    useState<FiltrosPoblacionBeneficiada>(FILTROS_VACIOS);
  const [aplicados, setAplicados] =
    useState<FiltrosPoblacionBeneficiada>(FILTROS_VACIOS);
  const [exportando, setExportando] = useState<"xlsx" | "pdf" | null>(null);

  const comunidades = useCatalogo<ElementoCatalogo>("comunidades");
  const programas = useCatalogo<ElementoCatalogo>("programas");

  const reporte = useQuery({
    queryKey: [CLAVE_REPORTES, "poblacion-beneficiada", aplicados],
    queryFn: () => obtenerPoblacionBeneficiada(aplicados),
  });

  const fechasInvalidas =
    filtros.desde !== undefined &&
    filtros.hasta !== undefined &&
    filtros.desde > filtros.hasta;

  const exportar = async (formato: "xlsx" | "pdf") => {
    setExportando(formato);
    try {
      await descargarPoblacionBeneficiada(aplicados, formato);
    } catch (error) {
      avisar(mensajeDeError(error), "error");
    } finally {
      setExportando(null);
    }
  };

  const limpiar = () => {
    setFiltros(FILTROS_VACIOS);
    setAplicados(FILTROS_VACIOS);
  };

  const hayFiltros = Object.keys(filtros).length > 0;

  return (
    <section className={estilos.tarjeta} aria-labelledby="rep-poblacion">
      <div className={estilos.tituloTarjeta}>
        <h2 id="rep-poblacion">Población beneficiada</h2>
      </div>
      <p className={estilos.nota}>
        Agrupado por mes: personas únicas y entregas totales, por comunidad,
        programa, género y grupo etario.
      </p>

      <div className={estilos.filtros}>
        <CampoTexto
          etiqueta="Desde"
          type="date"
          max={filtros.hasta ?? fechaDeHoy()}
          value={filtros.desde ?? ""}
          onChange={(e) =>
            setFiltros((p) => ({ ...p, desde: e.target.value || undefined }))
          }
        />
        <CampoTexto
          etiqueta="Hasta"
          type="date"
          min={filtros.desde}
          max={fechaDeHoy()}
          value={filtros.hasta ?? ""}
          onChange={(e) =>
            setFiltros((p) => ({ ...p, hasta: e.target.value || undefined }))
          }
          error={
            fechasInvalidas
              ? "La fecha final no puede ser anterior a la inicial."
              : undefined
          }
        />

        <CampoSelect
          className={estilos.filtroSelect}
          etiqueta="Comunidad"
          marcador="Todas"
          value={filtros.comunidadId ?? ""}
          onChange={(e) =>
            setFiltros((p) => ({
              ...p,
              comunidadId: e.target.value ? Number(e.target.value) : undefined,
            }))
          }
        >
          {comunidades.opciones.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </CampoSelect>

        <CampoSelect
          className={estilos.filtroSelect}
          etiqueta="Programa"
          marcador="Todos"
          value={filtros.programaId ?? ""}
          onChange={(e) =>
            setFiltros((p) => ({
              ...p,
              programaId: e.target.value ? Number(e.target.value) : undefined,
            }))
          }
        >
          {programas.opciones.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </CampoSelect>

        <CampoSelect
          className={estilos.filtroSelect}
          etiqueta="Género"
          marcador="Cualquiera"
          value={filtros.genero ?? ""}
          onChange={(e) =>
            setFiltros((p) => ({
              ...p,
              genero: (e.target.value || undefined) as Genero | undefined,
            }))
          }
        >
          {OPCIONES_GENERO.map((g) => (
            <option key={g.valor} value={g.valor}>
              {g.etiqueta}
            </option>
          ))}
        </CampoSelect>

        <CampoSelect
          className={estilos.filtroSelect}
          etiqueta="Grupo etario"
          marcador="Cualquiera"
          value={filtros.grupoEtario ?? ""}
          onChange={(e) =>
            setFiltros((p) => ({
              ...p,
              grupoEtario: (e.target.value || undefined) as
                | GrupoEtario
                | undefined,
            }))
          }
        >
          {OPCIONES_GRUPO_ETARIO.map((g) => (
            <option key={g.valor} value={g.valor}>
              {g.etiqueta}
            </option>
          ))}
        </CampoSelect>

        <label className={estilos.opcionesExtra}>
          <input
            type="checkbox"
            className={estilos.casilla}
            checked={filtros.soloConDiscapacidad ?? false}
            onChange={(e) =>
              setFiltros((p) => ({
                ...p,
                soloConDiscapacidad: e.target.checked,
              }))
            }
          />
          Solo con discapacidad
        </label>

        <div className={estilos.accionesFiltro}>
          {hayFiltros && (
            <Boton variante="terciaria" onClick={limpiar}>
              Limpiar
            </Boton>
          )}
          <Boton
            variante="primaria"
            disabled={fechasInvalidas}
            onClick={() => setAplicados(filtros)}
          >
            Generar reporte
          </Boton>
        </div>
      </div>

      {reporte.isPending ? (
        <EsqueletoTabla filas={5} columnas={6} />
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
          texto="Ningún grupo coincide con los filtros aplicados."
        />
      ) : (
        <>
          <div className={estilos.resumen}>
            <span className={estilos.totalRegistros}>
              {reporte.data.total_registros.toLocaleString("es-GT")} grupo(s)
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
            titulo="Población beneficiada"
            columnas={reporte.data.columnas}
            datos={reporte.data.datos}
          />
        </>
      )}
    </section>
  );
}

export default SeccionPoblacionBeneficiada;
