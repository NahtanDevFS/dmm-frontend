import { useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Boton from "../../componentes/ui/Boton";
import Insignia from "../../componentes/ui/Insignia";
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
 * Las existencias se piden aparte del insumo porque son dos preguntas
 * distintas contra dos endpoints distintos —el insumo es dato maestro y el
 * stock una agregación de lotes—, y porque así una tarda en llegar sin que la
 * otra se quede esperando.
 */
function PaginaInsumo() {
  const { id } = useParams();
  const insumoId = Number(id);
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

  if (!Number.isInteger(insumoId)) {
    return (
      <EstadoVacio
        titulo="Identificador inválido"
        texto="La dirección no corresponde a un insumo."
      />
    );
  }

  if (consulta.isPending) {
    return (
      <div className={estilos.tarjeta}>
        <Esqueleto ancho={280} alto={28} />
        <div style={{ marginTop: 24 }}>
          <Esqueleto alto={16} />
        </div>
      </div>
    );
  }

  if (consulta.isError) {
    return (
      <EstadoVacio
        titulo="No se pudo cargar el insumo"
        texto={mensajeDeError(consulta.error)}
        accion={
          <Link to="/inventario">
            <Boton variante="secundaria">Volver al inventario</Boton>
          </Link>
        }
      />
    );
  }

  const insumo = consulta.data;
  const requisitos = BANDERAS.filter((bandera) => insumo[bandera.clave]);
  const nivel = nivelDe(
    stock.data?.semaforo ?? null,
    stock.data?.stock_total === 0,
  );
  const categoria = categorias.opciones.find((c) => c.id === insumo.categoria_id);
  const unidadBase = unidades.opciones.find(
    (u) => u.id === insumo.unidad_medida_base_id,
  );

  return (
    <>
      <header className={estilos.encabezadoFicha}>
        <div>
          <Link className={estilos.volver} to="/inventario">
            ← Volver al inventario
          </Link>
          <div className={estilos.identidad}>
            <h1>{insumo.nombre}</h1>
            {!insumo.activo && <Insignia tono="neutra">Inactivo</Insignia>}
          </div>
        </div>

        {puedeGestionar && (
          <Boton variante="secundaria" onClick={() => setEditando(true)}>
            Editar insumo
          </Boton>
        )}
      </header>

      {!insumo.activo && (
        <p className={estilos.inactivo}>
          Este insumo está dado de baja: no se ofrece al registrar donaciones ni
          solicitudes. Los lotes ya recibidos se conservan y siguen contando en
          las existencias.
        </p>
      )}

      <section className={estilos.tarjeta} aria-labelledby="inv-generales">
        <div className={estilos.tituloTarjeta}>
          <h2 id="inv-generales">Datos del insumo</h2>
        </div>
        <dl className={estilos.datos}>
          <Dato titulo="Categoría">{categoria?.nombre ?? "—"}</Dato>
          <Dato titulo="Unidad de medida base">{unidadBase?.nombre ?? "—"}</Dato>
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
            <Dato titulo={"Disponible en " + (unidadBase?.nombre ?? "unidad base")}>
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
                  <span className={estilos.banderaAyuda}>{nivel.detalle}</span>
                </>
              ) : (
                /*
                  Sin semáforo no significa «en verde», y tampoco «no caduca».
                  Un insumo desactivado queda fuera de la vista de stock, y uno
                  sin lotes disponibles no tiene ninguna fecha que clasificar,
                  por mucho que exija caducidad al recibirlo.
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
    </>
  );
}

export default PaginaInsumo;
