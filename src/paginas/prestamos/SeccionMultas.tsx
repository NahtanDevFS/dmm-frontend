import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Boton from "../../componentes/ui/Boton";
import {
  CampoSelect,
  CampoTexto,
  CampoAreaTexto,
} from "../../componentes/ui/Campo";
import Insignia from "../../componentes/ui/Insignia";
import { EstadoVacio } from "../../componentes/ui/Estado";
import { useAvisos } from "../../componentes/ui/avisos/useAvisos";
import { useAuth } from "../../auth/useAuth";
import { useCatalogo } from "../../hooks/useCatalogo";
import { formatearFecha } from "../../lib/fechas";
import { mensajeDeError } from "../../lib/errores";
import { DIRECCION, tieneRol, type ElementoCatalogo } from "../../types/api";
import {
  CLAVE_CONTRATOS,
  aplicarMulta,
  pagarMulta,
  anularMulta,
  type Multa,
} from "../../api/prestamos";
import estilos from "./Prestamos.module.css";

/** Igual que el catálogo de solo lectura, pero con el monto sugerido que ese no trae. */
interface TipoMulta extends ElementoCatalogo {
  monto_sugerido: string | null;
}

/**
 * Multas del contrato. Aplicar, editar, pagar y anular son de DIRECCION —
 * decisión económica, no operación diaria — mientras que consultarlas es
 * de cualquiera de OPERACION, igual que el resto de la ficha.
 */
function SeccionMultas({
  contratoId,
  multas,
  contratoActivo,
}: {
  contratoId: number;
  multas: Multa[];
  contratoActivo: boolean;
}) {
  const clienteQuery = useQueryClient();
  const { usuario } = useAuth();
  const { avisar, confirmar } = useAvisos();
  const puedeGestionar = tieneRol(usuario?.rol, DIRECCION);

  const [tipoId, setTipoId] = useState("");
  const [monto, setMonto] = useState("");
  const [motivo, setMotivo] = useState("");

  const tipos = useCatalogo<TipoMulta>("tipos-multa-prestamo");

  const tipoElegido = tipos.opciones.find((t) => t.id === Number(tipoId));

  const refrescar = () =>
    clienteQuery.invalidateQueries({ queryKey: [CLAVE_CONTRATOS, contratoId] });

  const aplicacion = useMutation({
    mutationFn: () =>
      aplicarMulta(contratoId, {
        tipo_multa_id: Number(tipoId),
        monto: monto.trim() ? Number(monto) : undefined,
        motivo: motivo.trim() || null,
      }),
    onSuccess: async () => {
      await refrescar();
      avisar("Multa aplicada.", "exito");
      setTipoId("");
      setMonto("");
      setMotivo("");
    },
    // Incluye "el tipo de multa no tiene monto sugerido: debe indicar el monto".
    onError: (error) => avisar(mensajeDeError(error), "error"),
  });

  const pago = useMutation({
    mutationFn: (multaId: number) => pagarMulta(contratoId, multaId),
    onSuccess: async () => {
      await refrescar();
      avisar("Multa marcada como pagada.", "exito");
    },
    onError: (error) => avisar(mensajeDeError(error), "error"),
  });

  const anulacion = useMutation({
    mutationFn: (multaId: number) => anularMulta(contratoId, multaId),
    onSuccess: async () => {
      await refrescar();
      avisar("Multa anulada.", "exito");
    },
    onError: (error) => avisar(mensajeDeError(error), "error"),
  });

  const listoParaAplicar =
    tipoId !== "" &&
    (monto.trim() === "" ||
      (Number(monto) >= 0 && !Number.isNaN(Number(monto))));

  return (
    <section className={estilos.region} aria-labelledby="pre-multas">
      <div className={estilos.tituloTarjeta}>
        <h2 id="pre-multas">Multas</h2>
      </div>

      {multas.length === 0 ? (
        <EstadoVacio
          titulo="Sin multas"
          texto="Este contrato no tiene multas registradas."
        />
      ) : (
        <div className={estilos.listaMultas}>
          {multas.map((m) => (
            <div key={m.id} className={estilos.multa}>
              <div>
                <p className={estilos.montoMulta}>
                  Q
                  {Number(m.monto).toLocaleString("es-GT", {
                    minimumFractionDigits: 2,
                  })}
                  {" — "}
                  {m.tipo_multa_nombre}
                </p>
                <p className={estilos.auxiliar}>
                  Aplicada el {formatearFecha(m.fecha_aplicacion)}
                  {m.motivo && " · " + m.motivo}
                </p>
              </div>
              <div className={estilos.acciones}>
                {!m.activo ? (
                  <Insignia tono="neutra">Anulada</Insignia>
                ) : m.pagada ? (
                  <Insignia tono="aprobada">
                    Pagada
                    {m.fecha_pago && " el " + formatearFecha(m.fecha_pago)}
                  </Insignia>
                ) : (
                  puedeGestionar && (
                    <>
                      <Boton
                        pequeno
                        variante="secundaria"
                        cargando={pago.isPending && pago.variables === m.id}
                        onClick={() => pago.mutate(m.id)}
                      >
                        Marcar pagada
                      </Boton>
                      <Boton
                        pequeno
                        variante="terciaria"
                        cargando={
                          anulacion.isPending && anulacion.variables === m.id
                        }
                        onClick={async () => {
                          const ok = await confirmar({
                            titulo: "Anular multa",
                            mensaje:
                              "Se anulará esta multa. No se puede deshacer.",
                            textoConfirmar: "Anular",
                            destructiva: true,
                          });
                          if (ok) anulacion.mutate(m.id);
                        }}
                      >
                        Anular
                      </Boton>
                    </>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {puedeGestionar && contratoActivo && (
        <div className={estilos.formularioLote}>
          <div className={estilos.rejillaLote}>
            <CampoSelect
              etiqueta="Tipo de multa"
              value={tipoId}
              onChange={(e) => setTipoId(e.target.value)}
            >
              {tipos.opciones.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre}
                </option>
              ))}
            </CampoSelect>

            <CampoTexto
              etiqueta="Monto (Q)"
              type="number"
              min="0"
              step="0.01"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder={
                tipoElegido?.monto_sugerido
                  ? "Sugerido: Q" +
                    Number(tipoElegido.monto_sugerido).toFixed(2)
                  : undefined
              }
              ayuda="Si se deja en blanco, se usa el monto sugerido del tipo."
            />

            <CampoAreaTexto
              className={estilos.anchoCompleto}
              etiqueta="Motivo"
              rows={2}
              maxLength={2000}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
          </div>

          <div className={estilos.accionLote}>
            <Boton
              variante="secundaria"
              disabled={!listoParaAplicar}
              cargando={aplicacion.isPending}
              textoCargando="Aplicando…"
              onClick={() => aplicacion.mutate()}
            >
              Aplicar multa
            </Boton>
          </div>
        </div>
      )}
    </section>
  );
}

export default SeccionMultas;
