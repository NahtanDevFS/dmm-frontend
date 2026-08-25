import { useState } from "react";
import Boton from "../../componentes/ui/Boton";
import { useAuth } from "../../auth/useAuth";
import { DIRECCION, tieneRol } from "../../types/api";
import SeccionInsumos from "./SeccionInsumos";
import ModalInsumo from "./ModalInsumo";
import estilos from "./Inventario.module.css";

function PaginaInventario() {
  const { usuario } = useAuth();
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
        {puedeGestionar && (
          <Boton variante="primaria" onClick={() => setCreando(true)}>
            Nuevo insumo
          </Boton>
        )}
      </header>

      <SeccionInsumos puedeGestionar={puedeGestionar} />

      {creando && (
        <ModalInsumo abierto={creando} onCerrar={() => setCreando(false)} />
      )}
    </>
  );
}

export default PaginaInventario;
