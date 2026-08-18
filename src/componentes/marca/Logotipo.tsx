import logo1x from "../../assets/marca/logo-dmm-horizontal.png";
import logo2x from "../../assets/marca/logo-dmm-horizontal@2x.png";
import estilos from "./Logotipo.module.css";

type PropsLogotipo = {
  /** Alto en píxeles. El manual fija 24 px como mínimo en pantalla. */
  alto?: number;
  /**
   * Envuelve la marca en una cápsula blanca. Obligatorio sobre Rosa 500 o
   * Rosa 700: la silueta es negra y sin capa de contraste desaparece.
   */
  sobreFondoOscuro?: boolean;
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
 * El manual asumía un logotipo monocromo recoloreable en Rosa 700; el archivo
 * real es un raster a todo color con silueta negra y bloque magenta, así que
 * las reglas de contraste se resuelven con cápsula, no con recoloreado.
 */
function Logotipo({
  alto = 40,
  sobreFondoOscuro = false,
  alt = "Dirección Municipal de la Mujer",
  className,
}: PropsLogotipo) {
  const clases = [
    estilos.logotipo,
    sobreFondoOscuro ? estilos.capsula : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

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
