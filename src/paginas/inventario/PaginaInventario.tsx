import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Boton from "../../componentes/ui/Boton";
import { useAuth } from "../../auth/useAuth";
import { DIRECCION, tieneRol } from "../../types/api";
import SeccionInsumos from "./SeccionInsumos";
import SeccionSemaforo from "./SeccionSemaforo";
import ModalInsumo from "./ModalInsumo";
import ModalInsumoFicha from "./ModalInsumoFicha";
import estilos from "./Inventario.module.css";

const VISTAS = [
  { clave: "insumos", etiqueta: "Insumos" },
  { clave: "semaforo", etiqueta: "Semáforo de caducidad" },
] as const;

type Vista = (typeof VISTAS)[number]["clave"];

/**
 * Inventario y anfitrión de sus modales.
 *
 * La ficha de un insumo se abre encima de la vista en la que estaba el
 * usuario, sea el catálogo o el semáforo. La ruta /inventario/insumos/:id
 * sigue existiendo para los enlaces guardados y abre la ficha al entrar, pero
 * desde las tablas no se navega: hacerlo obligaba a recuperar el filtro y la
 * vista cada vez que se consultaba un insumo.
 */
function PaginaInventario() {
  const { usuario } = useAuth();
  const navegar = useNavigate();
  const { id } = useParams();
  const rutaId = id && /^\d+$/.test(id) ? Number(id) : null;

  const [vista, setVista] = useState<Vista>("insumos");
  const [creando, setCreando] = useState(false);
  const [fichaId, setFichaId] = useState<number | null>(rutaId);

  /** Devuelve la barra de direcciones al módulo si se entró por la ruta profunda. */
  const limpiarRuta = () => {
    if (id) navegar("/inventario", { replace: true });
  };

  /**
   * Consultar el inventario es de OPERACION, pero el insumo es dato maestro y
   * darlo de alta queda con dirección, igual que el resto de catálogos. Espejo
   * del requireRole(DIRECCION) de POST /insumos: ofrecer el botón a quien va a
   * recibir un 403 solo enseña una puerta cerrada.
   */
  const puedeGestionar = tieneRol(usuario?.rol, DIRECCION);

  return (
    <>
      <header className={estilos.encabezado}>
        <div>
          <h1>Inventario</h1>
          <p className={estilos.nota}>
            El catálogo de insumos define qué puede entrar en bodega. Las
            existencias se cuentan por lote, no por insumo, y entran al sistema
            con cada recepción de donación.
          </p>
        </div>
        {/*
          Una sola acción primaria por pantalla: solo aparece sobre la vista a
          la que pertenece. En el semáforo no hay ninguna, porque los lotes no
          se crean aquí sino al recibir una donación.
        */}
        {puedeGestionar && vista === "insumos" && (
          <Boton variante="primaria" onClick={() => setCreando(true)}>
            Nuevo insumo
          </Boton>
        )}
      </header>

      <div className={estilos.selector} role="group" aria-label="Elegir vista">
        {VISTAS.map((opcion) => (
          <button
            key={opcion.clave}
            type="button"
            className={
              estilos.pildora +
              (vista === opcion.clave ? " " + estilos.pildoraActiva : "")
            }
            aria-pressed={vista === opcion.clave}
            onClick={() => setVista(opcion.clave)}
          >
            {opcion.etiqueta}
          </button>
        ))}
      </div>

      {vista === "insumos" ? (
        <SeccionInsumos
          puedeGestionar={puedeGestionar}
          onVerFicha={setFichaId}
        />
      ) : (
        <SeccionSemaforo onVerFicha={setFichaId} />
      )}

      {creando && (
        <ModalInsumo abierto={creando} onCerrar={() => setCreando(false)} />
      )}

      {fichaId !== null && (
        <ModalInsumoFicha
          // La clave remonta la ficha al cambiar de insumo: sin ella se
          // reutilizaría el estado del modal de edición del anterior.
          key={fichaId}
          insumoId={fichaId}
          abierto
          onCerrar={() => {
            setFichaId(null);
            limpiarRuta();
          }}
        />
      )}
    </>
  );
}

export default PaginaInventario;
