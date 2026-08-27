import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CampoTexto } from "../../componentes/ui/Campo";
import Insignia from "../../componentes/ui/Insignia";
import Tabla, {
  CeldaAcciones,
  CeldaCantidad,
} from "../../componentes/ui/Tabla";
import Boton from "../../componentes/ui/Boton";
import { EstadoVacio, EsqueletoTabla } from "../../componentes/ui/Estado";
import { mensajeDeError } from "../../lib/errores";
import { tonoDeEstadoSolicitud } from "../../componentes/ui/tonos";
import { listarListaEspera } from "../../api/donaciones";
import estilos from "./Solicitudes.module.css";

/** Nombre legible del estado, igual que en el listado principal. */
const ETIQUETA_ESTADO: Record<string, string> = {
  PENDIENTE_ADQUISICION: "Pendiente de adquisición",
  PENDIENTE_ENTREGA_PARCIAL: "Pendiente de entrega (parcial)",
};

/**
 * Líneas de solicitud esperando existencias: PENDIENTE_ADQUISICION o
 * PENDIENTE_ENTREGA_PARCIAL, ordenadas por lo que la propia vista devuelve.
 *
 * Es lo que le dice a Trabajo Social qué insumo conviene priorizar en la
 * próxima gestión de donación, y a quien recibe una donación cuánta gente
 * destraba al registrar un lote de un insumo concreto.
 */
function SeccionListaEspera({
  onVerSolicitud,
}: {
  /** Abre la ficha de la solicitud dueña de la línea, en el mismo modal del listado. */
  onVerSolicitud: (solicitudId: number) => void;
}) {
  const [insumo, setInsumo] = useState("");

  const consulta = useQuery({
    queryKey: ["lista-espera", insumo.trim()],
    queryFn: () => listarListaEspera(insumo.trim() || undefined),
  });

  const lineas = consulta.data ?? [];
  // Más tiempo esperando primero: es la urgencia que la pantalla quiere
  // resaltar, y la vista del servidor no garantiza un orden particular.
  const ordenadas = [...lineas].sort(
    (a, b) => b.dias_esperando - a.dias_esperando,
  );

  return (
    <section className={estilos.tarjeta} aria-labelledby="sol-espera">
      <div className={estilos.tituloTarjeta}>
        <h2 id="sol-espera">Lista de espera por insumo</h2>
      </div>

      <p className={estilos.nota}>
        Líneas que ya se registraron pero siguen sin insumo suficiente para
        despachar. El filtro de nombre coincide de forma parcial: «jabón»
        también trae «jabón líquido».
      </p>

      <div className={estilos.filtros}>
        <CampoTexto
          className={estilos.filtroPersona}
          etiqueta="Insumo"
          placeholder="Filtrar por nombre del insumo…"
          value={insumo}
          onChange={(e) => setInsumo(e.target.value)}
        />
      </div>

      {consulta.isPending ? (
        <EsqueletoTabla filas={5} columnas={5} />
      ) : consulta.isError ? (
        <EstadoVacio
          titulo="No se pudo cargar la lista de espera"
          texto={mensajeDeError(consulta.error)}
          accion={
            <Boton
              variante="secundaria"
              onClick={() => void consulta.refetch()}
            >
              Reintentar
            </Boton>
          }
        />
      ) : ordenadas.length === 0 ? (
        <EstadoVacio
          titulo="Nadie está esperando"
          texto={
            insumo.trim()
              ? "Ninguna línea en espera coincide con ese insumo."
              : "No hay líneas de solicitud esperando existencias en este momento."
          }
        />
      ) : (
        <Tabla titulo="Líneas en espera de existencias">
          <thead>
            <tr>
              <th>Persona</th>
              <th>Insumo</th>
              <th>Cantidad</th>
              <th>Estado</th>
              <th>Esperando desde</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {ordenadas.map((linea) => (
              <tr key={linea.detalle_solicitud_id}>
                <td className={estilos.persona}>
                  {linea.persona_nombre_completo}
                </td>
                <td>{linea.insumo_nombre}</td>
                <CeldaCantidad>
                  {linea.cantidad_entregada.toLocaleString("es-GT")}
                  {" / "}
                  {linea.cantidad_requerida.toLocaleString("es-GT")}
                </CeldaCantidad>
                <td>
                  <Insignia tono={tonoDeEstadoSolicitud(linea.estado)}>
                    {ETIQUETA_ESTADO[linea.estado] ?? linea.estado}
                  </Insignia>
                </td>
                <td className={estilos.diasEsperando}>
                  {linea.dias_esperando === 0
                    ? "Hoy"
                    : linea.dias_esperando === 1
                      ? "1 día"
                      : linea.dias_esperando + " días"}
                </td>
                <CeldaAcciones>
                  <Boton
                    pequeno
                    variante="secundaria"
                    onClick={() => onVerSolicitud(linea.solicitud_id)}
                  >
                    Ver solicitud
                  </Boton>
                </CeldaAcciones>
              </tr>
            ))}
          </tbody>
        </Tabla>
      )}
    </section>
  );
}

export default SeccionListaEspera;
