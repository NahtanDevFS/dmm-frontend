import { useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Boton, { GrupoBotones } from "../../componentes/ui/Boton";
import { CampoTexto, CampoAreaTexto } from "../../componentes/ui/Campo";
import Insignia from "../../componentes/ui/Insignia";
import Modal from "../../componentes/ui/Modal";
import { useCierreSeguro } from "../../componentes/ui/useCierreSeguro";
import { EstadoVacio, Esqueleto } from "../../componentes/ui/Estado";
import { useAvisos } from "../../componentes/ui/avisos/useAvisos";
import { formatearFecha, fechaDeHoy } from "../../lib/fechas";
import { mensajeDeError } from "../../lib/errores";
import { useAuth } from "../../auth/useAuth";
import { DIRECCION, tieneRol } from "../../types/api";
import { CLAVE_ENTREGAS } from "../../api/entregas";
import {
  CLAVE_CONTRATOS,
  obtenerContrato,
  renovarContrato,
  registrarDevolucion,
  anularContrato,
  marcarNoDevuelto,
  type Contrato,
} from "../../api/prestamos";
import SeccionMultas from "./SeccionMultas";
import SeccionEvidenciasContrato from "./SeccionEvidenciasContrato";
import estilos from "./Prestamos.module.css";

const TONO_ESTADO: Record<
  string,
  "aprobada" | "pendiente" | "vencida" | "neutra"
> = {
  VIGENTE: "aprobada",
  EXTENDIDO: "neutra",
  VENCIDO: "vencida",
  DEVUELTO: "pendiente",
};

function Dato({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className={estilos.dato}>
      <dt>{titulo}</dt>
      <dd>{children}</dd>
    </div>
  );
}

/**
 * Ficha de un contrato de préstamo: datos generales, la cadena completa de
 * renovaciones (una sola línea, nunca un árbol), evidencias (documento
 * firmado, DPI, foto de recepción — todo vive en el mismo lugar, ver
 * SeccionEvidenciasContrato) y multas. Renovar y registrar devolución solo
 * tienen sentido en el ÚLTIMO contrato de la cadena (sin devolución real y
 * sin renovación posterior); el backend ya lo valida, esto solo evita
 * ofrecer el botón cuando ya se sabe que va a fallar.
 */
function ModalFichaContrato({
  contratoId,
  abierto,
  onCerrar,
}: {
  contratoId: number;
  abierto: boolean;
  onCerrar: () => void;
}) {
  const clienteQuery = useQueryClient();
  const { usuario } = useAuth();
  const { avisar, confirmar } = useAvisos();

  const [renovando, setRenovando] = useState(false);
  const [fechaRenovacion, setFechaRenovacion] = useState("");
  const [borradorEvidencia, setBorradorEvidencia] = useState(false);

  const cerrar = useCierreSeguro({
    hayCambios: renovando || borradorEvidencia,
    onCerrar,
    mensaje:
      "Hay un formulario a medio llenar en esta ficha. Si cierra ahora se pierde lo escrito.",
  });

  const consulta = useQuery({
    queryKey: [CLAVE_CONTRATOS, contratoId],
    queryFn: () => obtenerContrato(contratoId),
    enabled: Number.isInteger(contratoId),
  });

  const contrato = consulta.data;

  const renovacion = useMutation({
    mutationFn: () => renovarContrato(contratoId, fechaRenovacion),
    onSuccess: async () => {
      await clienteQuery.invalidateQueries({ queryKey: [CLAVE_CONTRATOS] });
      avisar("Contrato renovado.", "exito");
      setRenovando(false);
      setFechaRenovacion("");
    },
    onError: (error) => avisar(mensajeDeError(error), "error"),
  });

  const devolucion = useMutation({
    mutationFn: () => registrarDevolucion(contratoId),
    onSuccess: async () => {
      await clienteQuery.invalidateQueries({ queryKey: [CLAVE_CONTRATOS] });
      avisar("Devolución registrada. El equipo volvió al inventario.", "exito");
    },
    onError: (error) => avisar(mensajeDeError(error), "error"),
  });

  /**
   * Cuál de los dos cierres se está redactando, y su motivo.
   *
   * El motivo es obligatorio en ambos: dentro de un año, un contrato anulado
   * sin explicación no se distingue de un error del sistema.
   */
  const [cerrandoMal, setCerrandoMal] = useState<
    "anular" | "no-devuelto" | null
  >(null);
  const [motivoCierre, setMotivoCierre] = useState("");

  const motivoValido = motivoCierre.trim().length >= 5;

  const anulacion = useMutation({
    mutationFn: (motivo: string) => anularContrato(contratoId, motivo),
    onSuccess: async () => {
      await clienteQuery.invalidateQueries({ queryKey: [CLAVE_CONTRATOS] });
      await clienteQuery.invalidateQueries({ queryKey: [CLAVE_ENTREGAS] });
      avisar(
        "Préstamo anulado. El equipo volvió al inventario disponible.",
        "exito",
      );
      onCerrar();
    },
    onError: (error) => avisar(mensajeDeError(error), "error"),
  });

  const noDevuelto = useMutation({
    mutationFn: (motivo: string) => marcarNoDevuelto(contratoId, motivo),
    onSuccess: async () => {
      await clienteQuery.invalidateQueries({ queryKey: [CLAVE_CONTRATOS] });
      avisar(
        "Contrato cerrado como no devuelto. El equipo no vuelve al inventario.",
        "exito",
      );
      setCerrandoMal(null);
    },
    onError: (error) => avisar(mensajeDeError(error), "error"),
  });

  const esUltimoDeLaCadena = (c: Contrato) =>
    contrato?.cadena.every((otro) => otro.contrato_anterior_id !== c.id) ??
    false;

  const puedeRenovar =
    contrato !== undefined &&
    contrato.activo &&
    contrato.fecha_devolucion_real === null &&
    esUltimoDeLaCadena(contrato);

  const puedeDevolver = puedeRenovar; // mismas condiciones

  /**
   * Dos finales que no hay que confundir.
   *
   * Anular es para "me equivoqué al capturar": deshace el contrato y la
   * entrega, y el equipo vuelve al inventario. Solo lo ofrece Dirección y
   * solo mientras el préstamo no tuvo movimientos; el backend además lo
   * rechaza si hubo devolución o multas pagadas.
   *
   * No devuelto es para "la persona no lo trajo": cierra el contrato SIN
   * restituir el stock, porque el equipo no está. Decir que hay una silla
   * disponible que nadie tiene sería mentir sobre el inventario.
   */
  const puedeCerrarMal = puedeDevolver && tieneRol(usuario?.rol, DIRECCION);

  return (
    <Modal
      abierto={abierto}
      onCerrar={cerrar}
      titulo={
        contrato
          ? contrato.persona_nombre_completo
            ? "Préstamo de " + contrato.persona_nombre_completo
            : "Contrato de préstamo #" + contrato.id
          : "Contrato de préstamo"
      }
      descripcion={
        contrato
          ? "Iniciado el " + formatearFecha(contrato.fecha_inicio)
          : undefined
      }
      tamano="amplio"
      bloqueado={renovacion.isPending || devolucion.isPending}
      pie={
        <GrupoBotones>
          <Boton variante="terciaria" onClick={cerrar}>
            Cerrar
          </Boton>
          {puedeDevolver && (
            <Boton
              variante="secundaria"
              cargando={devolucion.isPending}
              textoCargando="Registrando…"
              onClick={async () => {
                const ok = await confirmar({
                  titulo: "Registrar devolución",
                  mensaje: "El equipo volverá al inventario disponible.",
                  textoConfirmar: "Registrar devolución",
                });
                if (ok) devolucion.mutate();
              }}
            >
              Registrar devolución
            </Boton>
          )}
          {puedeCerrarMal && cerrandoMal === null && (
            <>
              <Boton
                variante="terciaria"
                onClick={() => {
                  setCerrandoMal("no-devuelto");
                  setMotivoCierre("");
                }}
              >
                No devuelto
              </Boton>
              <Boton
                variante="rechazar"
                onClick={() => {
                  setCerrandoMal("anular");
                  setMotivoCierre("");
                }}
              >
                Anular
              </Boton>
            </>
          )}
          {puedeRenovar && !renovando && (
            <Boton variante="primaria" onClick={() => setRenovando(true)}>
              Renovar
            </Boton>
          )}
        </GrupoBotones>
      }
    >
      {consulta.isPending ? (
        <>
          <Esqueleto ancho={280} alto={28} />
          <div style={{ marginTop: 24 }}>
            <Esqueleto alto={16} />
          </div>
        </>
      ) : consulta.isError || !contrato ? (
        <EstadoVacio
          titulo="No se pudo cargar el contrato"
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
      ) : (
        <div className={estilos.enModal}>
          {!contrato.activo && (
            <p className={estilos.inactiva}>
              Este contrato está desactivado. Lo ya registrado se conserva.
            </p>
          )}

          <section className={estilos.tarjeta} aria-labelledby="pre-generales">
            <div className={estilos.tituloTarjeta}>
              <h2 id="pre-generales">Datos generales</h2>
            </div>
            <dl className={estilos.datos}>
              <Dato titulo="Persona">
                {contrato.persona_nombre_completo ?? "—"}
              </Dato>
              <Dato titulo="Insumo prestado">
                {contrato.insumo_nombre ?? "—"}
                {contrato.cantidad_entregada != null &&
                  " (" + contrato.cantidad_entregada + ")"}
              </Dato>
              <Dato titulo="Fecha de inicio">
                {formatearFecha(contrato.fecha_inicio)}
              </Dato>
              <Dato titulo="Devolución pactada">
                {formatearFecha(contrato.fecha_devolucion_pactada)}
              </Dato>
              <Dato titulo="Devolución real">
                {contrato.fecha_devolucion_real
                  ? formatearFecha(contrato.fecha_devolucion_real)
                  : "Todavía no se devuelve"}
              </Dato>
            </dl>
          </section>

          {renovando && (
            <section className={estilos.tarjeta} aria-labelledby="pre-renovar">
              <div className={estilos.tituloTarjeta}>
                <h2 id="pre-renovar">Renovar contrato</h2>
              </div>
              <p className={estilos.nota}>
                Crea un contrato nuevo encadenado a este, con una fecha de
                devolución posterior. Este contrato queda como EXTENDIDO.
              </p>
              <CampoTexto
                etiqueta="Nueva fecha de devolución pactada"
                obligatorio
                type="date"
                min={fechaDeHoy()}
                value={fechaRenovacion}
                onChange={(e) => setFechaRenovacion(e.target.value)}
              />
              <GrupoBotones>
                <Boton
                  variante="terciaria"
                  disabled={renovacion.isPending}
                  onClick={() => {
                    setRenovando(false);
                    setFechaRenovacion("");
                  }}
                >
                  Cancelar
                </Boton>
                <Boton
                  variante="primaria"
                  disabled={fechaRenovacion === ""}
                  cargando={renovacion.isPending}
                  textoCargando="Renovando…"
                  onClick={() => renovacion.mutate()}
                >
                  Confirmar renovación
                </Boton>
              </GrupoBotones>
            </section>
          )}

          {contrato.cadena.length > 1 && (
            <section className={estilos.tarjeta} aria-labelledby="pre-cadena">
              <div className={estilos.tituloTarjeta}>
                <h2 id="pre-cadena">Cadena de renovaciones</h2>
              </div>
              <div className={estilos.cadena}>
                {contrato.cadena.map((c) => (
                  <div
                    key={c.id}
                    className={
                      estilos.eslabon +
                      (c.id === contrato.id ? " " + estilos.eslabonActual : "")
                    }
                  >
                    <span>
                      Contrato #{c.id}
                      {c.id === contrato.id && " (este)"}
                    </span>
                    <Insignia
                      tono={
                        TONO_ESTADO[
                          c.fecha_devolucion_real !== null
                            ? "DEVUELTO"
                            : "VIGENTE"
                        ]
                      }
                    >
                      {formatearFecha(c.fecha_devolucion_pactada)}
                    </Insignia>
                  </div>
                ))}
              </div>
            </section>
          )}

          <SeccionEvidenciasContrato
            contratoId={contrato.id}
            evidencias={contrato.evidencias}
            onBorrador={setBorradorEvidencia}
          />

          {cerrandoMal !== null && (
            <section className={estilos.tarjeta}>
              <div className={estilos.tituloTarjeta}>
                <h2>
                  {cerrandoMal === "anular"
                    ? "Anular por error de registro"
                    : "Cerrar como no devuelto"}
                </h2>
              </div>
              <p className={estilos.nota}>
                {cerrandoMal === "anular"
                  ? "Se deshacen el contrato y la entrega, y el equipo vuelve al inventario disponible. Use esto solo si el préstamo se registró mal: si el equipo salió y no volvió, ciérrelo como no devuelto."
                  : "El contrato se cierra y el equipo NO vuelve al inventario, porque no está. Decir que hay una silla disponible que nadie tiene sería mentir sobre las existencias."}
              </p>

              <CampoAreaTexto
                etiqueta="Motivo"
                obligatorio
                rows={2}
                maxLength={2000}
                value={motivoCierre}
                onChange={(e) => setMotivoCierre(e.target.value)}
                ayuda="Queda guardado en el contrato. Dentro de un año, esto es lo único que va a explicar qué pasó."
              />

              <GrupoBotones>
                <Boton
                  variante="terciaria"
                  onClick={() => setCerrandoMal(null)}
                  disabled={anulacion.isPending || noDevuelto.isPending}
                >
                  Cancelar
                </Boton>
                <Boton
                  variante="rechazar"
                  disabled={!motivoValido}
                  cargando={anulacion.isPending || noDevuelto.isPending}
                  textoCargando="Guardando…"
                  onClick={() =>
                    cerrandoMal === "anular"
                      ? anulacion.mutate(motivoCierre.trim())
                      : noDevuelto.mutate(motivoCierre.trim())
                  }
                >
                  {cerrandoMal === "anular"
                    ? "Anular préstamo"
                    : "Cerrar como no devuelto"}
                </Boton>
              </GrupoBotones>
            </section>
          )}

          <SeccionMultas
            contratoId={contrato.id}
            multas={contrato.multas}
            contratoActivo={
              contrato.activo && contrato.fecha_devolucion_real === null
            }
          />
        </div>
      )}
    </Modal>
  );
}

export default ModalFichaContrato;
