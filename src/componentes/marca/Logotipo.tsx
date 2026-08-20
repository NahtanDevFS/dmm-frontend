import logo1x from "../../assets/marca/logo-dmm-horizontal.png";
import logo2x from "../../assets/marca/logo-dmm-horizontal@2x.png";
import estilos from "./Logotipo.module.css";

type PropsLogotipo = {
  /** Alto en píxeles. El manual fija 24 px como mínimo en pantalla. */
  alto?: number;
  /**
   * Texto alternativo. Se pasa cadena vacía cuando el nombre de la institución
   * ya aparece escrito junto al logotipo, para no obligar al lector de pantalla
   * a leerlo dos veces.
   */
  alt?: string;
  className?: string;
};

/**
 * Logotipo oficial de la Dirección Municipal de la Mujer.
 *
 * Una sola versión en toda la interfaz: la horizontal. La marca compacta
 * (silueta suelta) sigue en assets porque de ella derivan los favicons, pero no
 * se usa en pantalla; si algún día hace falta para un avatar o un sello, se
 * reintroduce aquí como variante.
 *
 * Va siempre sin fondo propio, directamente sobre la superficie que lo aloja.
 * El manual pide capa de contraste sobre fondos oscuros dando por hecho un
 * logotipo monocromo recoloreable a Rosa 700; el archivo real es un raster con
 * silueta negra, pero lleva contorno blanco propio, y ese contorno sostiene la
 * figura sobre Rosa 700 con 3.92:1 de contraste medio. Sobre superficies más
 * claras que Rosa 500 conviene medirlo antes de darlo por bueno.
 */
function Logotipo({
  alto = 40,
  alt = "Dirección Municipal de la Mujer",
  className,
}: PropsLogotipo) {
  const clases = [estilos.logotipo, className ?? ""].filter(Boolean).join(" ");

  return (
    <span
      className={clases}
      style={{ "--alto": Math.max(alto, 24) + "px" } as React.CSSProperties}
    >
      <img
        className={estilos.imagen}
        src={logo1x}
        srcSet={logo1x + " 1x, " + logo2x + " 2x"}
        alt={alt}
      />
    </span>
  );
}

export default Logotipo;
