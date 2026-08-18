import horizontal1x from "../../assets/marca/logo-dmm-horizontal.png";
import horizontal2x from "../../assets/marca/logo-dmm-horizontal@2x.png";
import compacto1x from "../../assets/marca/logo-dmm-compacto.png";
import compacto2x from "../../assets/marca/logo-dmm-compacto@2x.png";
import estilos from "./Logotipo.module.css";

const FUENTES = {
  horizontal: { x1: horizontal1x, x2: horizontal2x },
  compacto: { x1: compacto1x, x2: compacto2x },
} as const;

type Variante = keyof typeof FUENTES;

type PropsLogotipo = {
  /** `horizontal` para barra superior y documentos; `compacto` para avatar y sellos. */
  variante?: Variante;
  /** Alto en píxeles. El manual fija 24 px como mínimo en pantalla. */
  alto?: number;
  /**
   * Envuelve la marca en una cápsula blanca. Obligatorio sobre Rosa 500 o
   * Rosa 700: la silueta es negra y sin capa de contraste desaparece.
   */
  sobreFondoOscuro?: boolean;
  /**
   * Texto alternativo. Se pasa cadena vacía cuando el nombre de la
   * institución ya aparece escrito junto al logotipo, para no repetirlo
   * en el lector de pantalla.
   */
  alt?: string;
  className?: string;
};

/**
 * Logotipo oficial de la Dirección Municipal de la Mujer.
 *
 * El manual asumía un logotipo monocromo recoloreable en Rosa 700; el archivo
 * real es un raster a todo color con silueta negra y bloque magenta, así que
 * las reglas de contraste se resuelven con cápsula, no con recoloreado.
 */
function Logotipo({
  variante = "horizontal",
  alto = 40,
  sobreFondoOscuro = false,
  alt = "Dirección Municipal de la Mujer",
  className,
}: PropsLogotipo) {
  const fuentes = FUENTES[variante];
  const clases = [
    estilos.logotipo,
    estilos[variante],
    sobreFondoOscuro ? estilos.capsula : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span
      className={clases}
      style={{ "--alto": `${Math.max(alto, 24)}px` } as React.CSSProperties}
    >
      <img
        className={estilos.imagen}
        src={fuentes.x1}
        srcSet={`${fuentes.x1} 1x, ${fuentes.x2} 2x`}
        alt={alt}
      />
    </span>
  );
}

export default Logotipo;
