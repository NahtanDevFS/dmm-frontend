import SeccionInsumos from "./SeccionInsumos";
import estilos from "./Inventario.module.css";

function PaginaInventario() {
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
      </header>

      <SeccionInsumos />
    </>
  );
}

export default PaginaInventario;
