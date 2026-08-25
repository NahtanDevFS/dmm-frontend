import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Boton from "../../componentes/ui/Boton";
import { CampoSelect } from "../../componentes/ui/Campo";
import Insignia from "../../componentes/ui/Insignia";
import Tabla, {
  CeldaCantidad,
  CeldaIdentificador,
} from "../../componentes/ui/Tabla";
import { EstadoVacio, EsqueletoTabla } from "../../componentes/ui/Estado";
import { formatearFecha } from "../../lib/fechas";
import { mensajeDeError } from "../../lib/errores";
import {
  CLAVE_SEMAFORO,
  listarSemaforo,
  type LoteSemaforo,
} from "../../api/inventario";
import { SEMAFORO, type Semaforo } from "../../types/api";
import { NIVELES, ORDEN_SEMAFORO } from "./semaforo";
import estilos from "./Inventario.module.css";

/**
 * Semáforo de caducidad (RF-INV-02).
 *
 * Una fila por lote y no por insumo: lo que vence es el lote, y un mismo
 * insumo puede tener a la vez existencias vencidas y existencias vigentes.
 * Agregarlo por insumo escondería justo el lote que hay que retirar.
 *
 * Se pide entero y se filtra en el cliente. El endpoint acepta insumoId y
 * semaforo, pero no pagina ni devuelve conteos, y el resumen por nivel hay que
 * calcularlo sobre el conjunto completo de todas formas: filtrar en el
 * servidor obligaría a pedir la lista dos veces para poder contar. El
 * inventario de la DMM se mide en cientos de lotes; si algún día creciera de
 * verdad, lo que hace falta es un endpoint de resumen, no paginar este.
 */
function SeccionSemaforo() {
  const [nivel, setNivel] = useState<Semaforo | "">("");
  const [insumoId, setInsumoId] = useState("");

  const consulta = useQuery({
    queryKey: [CLAVE_SEMAFORO],
    queryFn: () => listarSemaforo(),
  });

  const lotes = useMemo(() => consulta.data ?? [], [consulta.data]);

  /** Conteo por nivel sobre el conjunto completo, no sobre lo filtrado. */
  const conteos = useMemo(() => {
    const total: Record<string, number> = {};
    for (const lote of lotes) {
      total[lote.semaforo] = (total[lote.semaforo] ?? 0) + 1;
    }
    return total;
  }, [lotes]);

  /** Insumos presentes en el inventario, para el filtro. Sin repetir. */
  const insumos = useMemo(() => {
    const porId = new Map<number, string>();
    for (const lote of lotes) porId.set(lote.insumo_id, lote.insumo_nombre);
    return [...porId.entries()]
      .map(([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }, [lotes]);

  const filtrados = lotes.filter(
    (lote: LoteSemaforo) =>
      (nivel === "" || lote.semaforo === nivel) &&
      (insumoId === "" || lote.insumo_id === Number(insumoId)),
  );

  const hayFiltro = nivel !== "" || insumoId !== "";

  return (
    <section className={estilos.tarjeta} aria-labelledby="inv-semaforo">
      <div className={estilos.tituloTarjeta}>
        <h2 id="inv-semaforo">Semáforo de caducidad</h2>
      </div>

      <p className={estilos.nota}>
        Cada fila es un lote con existencias, no un insumo: lo que vence es el
        lote. Un mismo insumo puede tener a la vez producto vencido y producto
        vigente.
      </p>

      {consulta.isPending ? (
        <EsqueletoTabla filas={5} columnas={6} />
      ) : consulta.isError ? (
        <EstadoVacio
          titulo="No se pudo cargar el semáforo"
          texto={mensajeDeError(consulta.error)}
          accion={
            <Boton variante="secundaria" onClick={() => void consulta.refetch()}>
              Reintentar
            </Boton>
          }
        />
      ) : (
        <>
          {/*
            El resumen es además el filtro: leer «3 vencidos» y querer ver
            cuáles son es el mismo gesto. Volver a pulsar el nivel activo lo
            quita, para no dejar al usuario buscando dónde se cancela.
          */}
          <div
            className={estilos.resumen}
            role="group"
            aria-label="Filtrar por nivel del semáforo"
          >
            {ORDEN_SEMAFORO.map((valor) => (
              <button
                key={valor}
                type="button"
                className={
                  estilos.resumenNivel +
                  (nivel === valor ? " " + estilos.resumenActivo : "")
                }
                aria-pressed={nivel === valor}
                onClick={() => setNivel((previo) => (previo === valor ? "" : valor))}
              >
                <span className={estilos.resumenCantidad}>
                  {conteos[valor] ?? 0}
                </span>
                <Insignia tono={NIVELES[valor].tono}>
                  {NIVELES[valor].etiqueta}
                </Insignia>
              </button>
            ))}
          </div>

          <div className={estilos.filtros}>
            <CampoSelect
              className={estilos.filtroSelect}
              etiqueta="Insumo"
              marcador="Todos los insumos"
              value={insumoId}
              onChange={(e) => setInsumoId(e.target.value)}
            >
              {insumos.map((insumo) => (
                <option key={insumo.id} value={insumo.id}>
                  {insumo.nombre}
                </option>
              ))}
            </CampoSelect>
          </div>

          {filtrados.length === 0 ? (
            <EstadoVacio
              titulo={hayFiltro ? "Sin lotes que mostrar" : "Inventario vacío"}
              texto={
                hayFiltro
                  ? "Ningún lote coincide con los filtros aplicados."
                  : "No hay lotes activos en bodega. Los lotes entran con cada recepción de donación."
              }
            />
          ) : (
            <Tabla titulo="Lotes por nivel del semáforo">
              <thead>
                <tr>
                  <th>Insumo</th>
                  <th>Lote</th>
                  <th>Caducidad</th>
                  <th>Recibido</th>
                  <th>Disponible</th>
                  <th>Semáforo</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((lote) => {
                  const definicion = NIVELES[lote.semaforo];
                  const vencido = lote.semaforo === SEMAFORO.VENCIDO;
                  return (
                    <tr key={lote.detalle_inventario_lote_id}>
                      <td className={estilos.nombre}>
                        <Link to={"/inventario/insumos/" + lote.insumo_id}>
                          {lote.insumo_nombre}
                        </Link>
                      </td>
                      <CeldaIdentificador>
                        {lote.codigo_lote ?? "—"}
                      </CeldaIdentificador>
                      <td className={vencido ? estilos.caducada : undefined}>
                        {formatearFecha(lote.fecha_caducidad)}
                      </td>
                      <td>{formatearFecha(lote.fecha_recepcion)}</td>
                      <CeldaCantidad>
                        {lote.cantidad_disponible.toLocaleString("es-GT")}
                        <span className={estilos.banderaAyuda}>
                          {" de " + lote.cantidad_inicial.toLocaleString("es-GT")}
                        </span>
                      </CeldaCantidad>
                      <td>
                        <Insignia tono={definicion.tono}>
                          {definicion.etiqueta}
                        </Insignia>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Tabla>
          )}
        </>
      )}
    </section>
  );
}

export default SeccionSemaforo;
