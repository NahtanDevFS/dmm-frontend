import { useState } from "react";
import Boton from "../../componentes/ui/Boton";
import { useAuth } from "../../auth/useAuth";
import { DIRECCION, tieneRol } from "../../types/api";
import SeccionInsumos from "./SeccionInsumos";
import SeccionSemaforo from "./SeccionSemaforo";
import ModalInsumo from "./ModalInsumo";
import estilos from "./Inventario.module.css";

const VISTAS = [
  { clave: "insumos", etiqueta: "Insumos" },
  { clave: "semaforo", etiqueta: "Semáforo de caducidad" },
] as const;

type Vista = (typeof VISTAS)[number]["clave"];

function PaginaInventario() {
  const { usuario } = useAuth();
  const [vista, setVista] = useState<Vista>("insumos");
  const [creando, setCreando] = useState(false);

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
        <SeccionInsumos puedeGestionar={puedeGestionar} />
      ) : (
        <SeccionSemaforo />
      )}

      {creando && (
        <ModalInsumo abierto={creando} onCerrar={() => setCreando(false)} />
      )}
    </>
  );
}

export default PaginaInventario;
