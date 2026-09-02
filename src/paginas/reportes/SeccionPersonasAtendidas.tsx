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
  obtenerPersonasAtendidas,
  descargarPersonasAtendidas,
  type FiltrosPersonasAtendidas,
  type Genero,
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

const FILTROS_VACIOS: FiltrosPersonasAtendidas = {};

/**
 * Quién recibió qué, cuándo y dónde: una fila por entrega, con la persona,
 * su edad al momento de la entrega (no la de hoy — el backend ya resuelve
 * esa diferencia) y sus discapacidades si las tiene.
 */
function SeccionPersonasAtendidas() {
  const { avisar } = useAvisos();

  const [filtros, setFiltros] =
    useState<FiltrosPersonasAtendidas>(FILTROS_VACIOS);
  const [aplicados, setAplicados] =
    useState<FiltrosPersonasAtendidas>(FILTROS_VACIOS);
  const [exportando, setExportando] = useState<"xlsx" | "pdf" | null>(null);

  const comunidades = useCatalogo<ElementoCatalogo>("comunidades");
  const discapacidades = useCatalogo<ElementoCatalogo>("discapacidades");
  const programas = useCatalogo<ElementoCatalogo>("programas");

  const reporte = useQuery({
    queryKey: [CLAVE_REPORTES, "personas-atendidas", aplicados],
    queryFn: () => obtenerPersonasAtendidas(aplicados),
  });

  const rangoInvalido =
    filtros.edadMin !== undefined &&
    filtros.edadMax !== undefined &&
    filtros.edadMin > filtros.edadMax;

  const fechasInvalidas =
    filtros.desde !== undefined &&
    filtros.hasta !== undefined &&
    filtros.desde > filtros.hasta;

  const exportar = async (formato: "xlsx" | "pdf") => {
    setExportando(formato);
    try {
      await descargarPersonasAtendidas(aplicados, formato);
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
    <section className={estilos.tarjeta} aria-labelledby="rep-personas">
      <div className={estilos.tituloTarjeta}>
        <h2 id="rep-personas">Personas atendidas</h2>
      </div>
      <p className={estilos.nota}>
        Una fila por entrega, con la edad de la persona al momento de recibirla,
        no la de hoy.
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
          etiqueta="Discapacidad"
          marcador="Cualquiera"
          value={filtros.discapacidadId ?? ""}
          onChange={(e) =>
            setFiltros((p) => ({
              ...p,
              discapacidadId: e.target.value
                ? Number(e.target.value)
                : undefined,
            }))
          }
        >
          {discapacidades.opciones.map((d) => (
            <option key={d.id} value={d.id}>
              {d.nombre}
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

        <CampoTexto
          className={estilos.filtroTexto}
          etiqueta="Edad mínima"
          type="number"
          min="0"
          max="120"
          value={filtros.edadMin ?? ""}
          onChange={(e) =>
            setFiltros((p) => ({
              ...p,
              edadMin: e.target.value ? Number(e.target.value) : undefined,
            }))
          }
        />
        <CampoTexto
          className={estilos.filtroTexto}
          etiqueta="Edad máxima"
          type="number"
          min="0"
          max="120"
          value={filtros.edadMax ?? ""}
          onChange={(e) =>
            setFiltros((p) => ({
              ...p,
              edadMax: e.target.value ? Number(e.target.value) : undefined,
            }))
          }
          error={
            rangoInvalido ? "No puede ser menor que la edad mínima." : undefined
          }
        />

        <label className={estilos.opcionesExtra}>
          <input
            type="checkbox"
            className={estilos.casilla}
            checked={filtros.soloAdultoMayor ?? false}
            onChange={(e) =>
              setFiltros((p) => ({ ...p, soloAdultoMayor: e.target.checked }))
            }
          />
          Solo adultos mayores
        </label>

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
            disabled={rangoInvalido || fechasInvalidas}
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
          texto="Ninguna entrega coincide con los filtros aplicados."
        />
      ) : (
        <>
          <div className={estilos.resumen}>
            <span className={estilos.totalRegistros}>
              {reporte.data.total_registros.toLocaleString("es-GT")} registro(s)
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
            titulo="Personas atendidas"
            columnas={reporte.data.columnas}
            datos={reporte.data.datos}
          />
        </>
      )}
    </section>
  );
}

export default SeccionPersonasAtendidas;
