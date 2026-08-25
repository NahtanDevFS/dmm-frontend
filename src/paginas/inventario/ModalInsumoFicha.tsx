import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import Boton, { GrupoBotones } from "../../componentes/ui/Boton";
import Insignia from "../../componentes/ui/Insignia";
import Modal from "../../componentes/ui/Modal";
import { EstadoVacio, Esqueleto } from "../../componentes/ui/Estado";
import { useAuth } from "../../auth/useAuth";
import { useCatalogo } from "../../hooks/useCatalogo";
import { formatearFecha } from "../../lib/fechas";
import { mensajeDeError } from "../../lib/errores";
import {
  CLAVE_INSUMOS,
  obtenerInsumo,
  obtenerStockInsumo,
} from "../../api/inventario";
import { DIRECCION, tieneRol, type ElementoCatalogo } from "../../types/api";
import { BANDERAS } from "./banderas";
import { nivelDe } from "./semaforo";
import ModalInsumo from "./ModalInsumo";
import SeccionPresentaciones from "./SeccionPresentaciones";
import estilos from "./Inventario.module.css";

function Dato({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className={estilos.dato}>
      <dt>{titulo}</dt>
      <dd>{children}</dd>
    </div>
  );
}

/**
 * Ficha de un insumo: qué es, cuánto hay y en qué presentaciones se recibe.
 *
 * Va en modal sobre el inventario por lo mismo que la del beneficiario:
 * mirar cuánto queda de un insumo es una consulta dentro de otra tarea
 * —revisar el semáforo, preparar una entrega—, y llevarse al usuario a otra
 * pantalla le costaba el filtro y la posición en la tabla. Desde el semáforo
 * se abre encima de la lista de lotes, que es donde surgió la pregunta.
 *
 * Las existencias se piden aparte del insumo porque son dos preguntas
 * distintas contra dos endpoints distintos —el insumo es dato maestro y el
 * stock una agregación de lotes—, y porque así una tarda en llegar sin que la
 * otra se quede esperando.
 */
function ModalInsumoFicha({
  insumoId,
  abierto,
  onCerrar,
}: {
  insumoId: number;
  abierto: boolean;
  onCerrar: () => void;
}) {
  const { usuario } = useAuth();
  const [editando, setEditando] = useState(false);

  const puedeGestionar = tieneRol(usuario?.rol, DIRECCION);

  const consulta = useQuery({
    queryKey: [CLAVE_INSUMOS, insumoId],
    queryFn: () => obtenerInsumo(insumoId),
    enabled: Number.isInteger(insumoId),
  });

  const stock = useQuery({
    queryKey: [CLAVE_INSUMOS, insumoId, "stock"],
    queryFn: () => obtenerStockInsumo(insumoId),
    enabled: Number.isInteger(insumoId),
  });

  const categorias = useCatalogo<ElementoCatalogo>("categorias-insumo", {
    incluirInactivos: true,
  });
  const unidades = useCatalogo<ElementoCatalogo>("unidades-medida", {
    incluirInactivos: true,
  });

  const insumo = consulta.data;
  const requisitos = insumo
    ? BANDERAS.filter((bandera) => insumo[bandera.clave])
    : [];
  const nivel = nivelDe(
    stock.data?.semaforo ?? null,
    stock.data?.stock_total === 0,
  );
  const categoria = categorias.opciones.find(
    (c) => c.id === insumo?.categoria_id,
  );
  const unidadBase = unidades.opciones.find(
    (u) => u.id === insumo?.unidad_medida_base_id,
  );

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={insumo ? insumo.nombre : "Ficha del insumo"}
      descripcion={
        insumo && categoria
          ? categoria.nombre +
            " · se cuenta en " +
            (unidadBase?.nombre ?? "unidad base")
          : undefined
      }
      tamano="amplio"
      pie={
        <GrupoBotones>
          <Boton variante="terciaria" onClick={onCerrar}>
            Cerrar
          </Boton>
          {insumo && puedeGestionar && (
            <Boton variante="secundaria" onClick={() => setEditando(true)}>
              Editar insumo
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
      ) : consulta.isError || !insumo ? (
        <EstadoVacio
          titulo="No se pudo cargar el insumo"
          texto={mensajeDeError(consulta.error)}
          accion={
            <Boton variante="secundaria" onClick={() => void consulta.refetch()}>
              Reintentar
            </Boton>
          }
        />
      ) : (
        <div className={estilos.enModal}>
          {!insumo.activo && (
            <p className={estilos.inactivo}>
              Este insumo está dado de baja: no se ofrece al registrar
              donaciones ni solicitudes. Los lotes ya recibidos se conservan y
              siguen contando en las existencias.
            </p>
          )}

          <section className={estilos.tarjeta} aria-labelledby="inv-generales">
            <div className={estilos.tituloTarjeta}>
              <h2 id="inv-generales">Datos del insumo</h2>
            </div>
            <dl className={estilos.datos}>
              <Dato titulo="Categoría">{categoria?.nombre ?? "—"}</Dato>
              <Dato titulo="Unidad de medida base">
                {unidadBase?.nombre ?? "—"}
              </Dato>
              <Dato titulo="Requisitos">
                {requisitos.length === 0 ? (
                  "Ninguno"
                ) : (
                  <span className={estilos.requisitos}>
                    {requisitos.map((bandera) => (
                      <Insignia key={bandera.clave} tono="informativa">
                        {bandera.etiqueta}
                      </Insignia>
                    ))}
                  </span>
                )}
              </Dato>
              <Dato titulo="Descripción">{insumo.descripcion ?? "—"}</Dato>
            </dl>
          </section>

          <section className={estilos.tarjeta} aria-labelledby="inv-existencias">
            <div className={estilos.tituloTarjeta}>
              <h2 id="inv-existencias">Existencias</h2>
            </div>

            {stock.isPending ? (
              <Esqueleto alto={16} />
            ) : stock.isError ? (
              <EstadoVacio
                titulo="No se pudieron cargar las existencias"
                texto={mensajeDeError(stock.error)}
              />
            ) : (
              <dl className={estilos.datos}>
                <Dato
                  titulo={"Disponible en " + (unidadBase?.nombre ?? "unidad base")}
                >
                  <span className={estilos.cantidad}>
                    {stock.data.stock_total.toLocaleString("es-GT")}
                  </span>
                </Dato>
                <Dato titulo="Próxima caducidad">
                  {formatearFecha(stock.data.proxima_caducidad)}
                </Dato>
                <Dato titulo="Semáforo">
                  {nivel ? (
                    <>
                      <Insignia tono={nivel.tono}>{nivel.etiqueta}</Insignia>{" "}
                      <span className={estilos.banderaAyuda}>
                        {nivel.detalle}
                      </span>
                    </>
                  ) : (
                    /*
                      Sin semáforo no significa «en verde», y tampoco «no
                      caduca». Un insumo desactivado queda fuera de la vista de
                      stock, y uno sin lotes disponibles no tiene ninguna fecha
                      que clasificar, por mucho que exija caducidad al
                      recibirlo.
                    */
                    <span className={estilos.banderaAyuda}>
                      Sin lotes con existencias que clasificar.
                    </span>
                  )}
                </Dato>
              </dl>
            )}
          </section>

          <SeccionPresentaciones
            insumoId={insumo.id}
            puedeGestionar={puedeGestionar}
            stock={stock.data?.presentaciones ?? []}
          />

          {editando && (
            <ModalInsumo
              insumo={insumo}
              abierto={editando}
              onCerrar={() => setEditando(false)}
            />
          )}
        </div>
      )}
    </Modal>
  );
}

export default ModalInsumoFicha;
