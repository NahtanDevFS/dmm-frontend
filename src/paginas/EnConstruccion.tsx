import estilos from "./EnConstruccion.module.css";

/**
 * Destino provisional de los módulos que aún no tienen pantalla.
 *
 * Existe para que el árbol de rutas quede completo desde el principio: así el
 * menú, las guardas por rol y la navegación se pueden probar de verdad, en vez
 * de quedar a medias hasta que llegue el último módulo. Cada pantalla real lo
 * sustituye en su propio cambio.
 */
function EnConstruccion({ titulo }: { titulo: string }) {
  return (
    <>
      <h1>{titulo}</h1>
      <div className={estilos.aviso}>
        <p className={estilos.texto}>
          Este módulo todavía no tiene pantalla. La navegación y los permisos ya
          funcionan; el contenido se incorpora en un cambio posterior.
        </p>
      </div>
    </>
  );
}

export default EnConstruccion;
