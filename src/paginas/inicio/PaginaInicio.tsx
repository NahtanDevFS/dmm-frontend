import { Link } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import { ADMINISTRACION, DIRECCION, tieneRol, type Rol } from "../../types/api";
import {
  Esqueleto,
  RejillaIndicadores,
  TarjetaIndicador,
} from "../../componentes/ui/Estado";
import { mensajeDeError } from "../../lib/errores";
import {
  useCaducidades,
  useSolicitudesPendientes,
  useTotalBeneficiarios,
} from "./useIndicadores";
import estilos from "./PaginaInicio.module.css";

const NOMBRE_ROL: Record<string, string> = {
  EMPLEADO_DMM: "Trabajo social",
  DIRECTORA: "Dirección",
  ALCALDE: "Alcaldía",
  ADMINISTRADOR: "Administración",
};

interface AccionRapida {
  titulo: string;
  texto: string;
  ruta: string;
  roles?: readonly Rol[];
}

/**
 * Atajos del panel. Sin emojis ni iconos: la sección 9 los prohíbe en
 * encabezados y botones, y el sketch original los usaba.
 */
const ACCIONES: AccionRapida[] = [
  {
    titulo: "Nuevo beneficiario",
    texto: "Registrar a una persona y sus encargados.",
    ruta: "/beneficiarios",
  },
  {
    titulo: "Nueva recepción",
    texto: "Ingresar una donación y sus lotes.",
    ruta: "/donaciones",
  },
  {
    titulo: "Registrar entrega",
    texto: "Despachar un insumo a un beneficiario.",
    ruta: "/entregas",
  },
  {
    titulo: "Resolver solicitudes",
    texto: "Aprobar o rechazar las que están pendientes.",
    ruta: "/solicitudes",
    roles: DIRECCION,
  },
  {
    titulo: "Gestionar usuarios",
    texto: "Altas, roles y restablecimiento de contraseñas.",
    ruta: "/usuarios",
    roles: ADMINISTRACION,
  },
];

/** Valor del indicador, o su esqueleto mientras llega. */
function Valor({
  cargando,
  error,
  valor,
}: {
  cargando: boolean;
  error: unknown;
  valor: number | undefined;
}) {
  if (cargando) return <Esqueleto ancho={96} alto={34} />;
  // Un indicador que falla dice que falla. Pintar un cero sería peor que no
  // pintar nada: se leería como «no hay beneficiarios».
  if (error) return <>—</>;
  return <>{valor ?? 0}</>;
}

function PaginaInicio() {
  const { usuario } = useAuth();
  const beneficiarios = useTotalBeneficiarios();
  const pendientes = useSolicitudesPendientes();
  const caducidades = useCaducidades();

  const acciones = ACCIONES.filter(
    (accion) => !accion.roles || tieneRol(usuario?.rol, accion.roles),
  );

  const algoFallo =
    beneficiarios.isError || pendientes.isError || caducidades.isError;

  return (
    <>
      <header className={estilos.bienvenida}>
        {/*
          Se saluda por el nombre de usuario porque es lo único que devuelve
          /auth/me: la tabla usuario no guarda nombre completo. En cuanto el
          API lo exponga, se cambia aquí y en la barra superior.

          «Le damos la bienvenida» evita marcar género, que el sistema tampoco
          conoce, y encaja con el tono directo y respetuoso del manual.
        */}
        <h1 className={estilos.saludo}>Le damos la bienvenida, {usuario?.username}</h1>
        <p className={estilos.contexto}>
          {usuario ? (NOMBRE_ROL[usuario.rol] ?? usuario.rol) : null} · Dirección
          Municipal de la Mujer, Usumatlán
        </p>
      </header>

      <section className={estilos.seccion} aria-labelledby="indicadores">
        <h2 id="indicadores" className={estilos.tituloSeccion}>
          Situación actual
        </h2>

        <RejillaIndicadores>
          <TarjetaIndicador
            titulo="Total beneficiarios"
            valor={
              <Valor
                cargando={beneficiarios.isPending}
                error={beneficiarios.error}
                valor={beneficiarios.data}
              />
            }
            detalle="Personas registradas y activas"
          />

          <TarjetaIndicador
            titulo="Solicitudes pendientes"
            valor={
              <Valor
                cargando={pendientes.isPending}
                error={pendientes.error}
                valor={pendientes.data}
              />
            }
            detalle="Esperan aprobación de dirección"
          />

          <TarjetaIndicador
            titulo="Stock por vencer"
            valor={
              <Valor
                cargando={caducidades.isPending}
                error={caducidades.error}
                valor={caducidades.porVencer}
              />
            }
            detalle="Lotes que caducan en menos de 3 meses"
            tono="advertencia"
          />

          {/*
            Los lotes ya caducados solo aparecen si los hay. Una tarjeta fija
            en cero acostumbra a ignorarla, y cuando deje de estar en cero
            nadie la mirará.
          */}
          {caducidades.vencidos > 0 && (
            <TarjetaIndicador
              titulo="Lotes vencidos"
              valor={caducidades.vencidos}
              detalle="Requieren baja de inventario"
              tono="peligro"
            />
          )}
        </RejillaIndicadores>

        {algoFallo && (
          <p className={estilos.fallo} role="status" style={{ marginTop: 16 }}>
            {mensajeDeError(
              beneficiarios.error ?? pendientes.error ?? caducidades.error,
              "No se pudieron cargar algunos indicadores.",
            )}
          </p>
        )}
      </section>

      <section className={estilos.seccion} aria-labelledby="acciones">
        <h2 id="acciones" className={estilos.tituloSeccion}>
          Acciones rápidas
        </h2>

        <div className={estilos.acciones}>
          {acciones.map((accion) => (
            <Link key={accion.ruta} to={accion.ruta} className={estilos.accion}>
              <span className={estilos.accionTitulo}>{accion.titulo}</span>
              <span className={estilos.accionTexto}>{accion.texto}</span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}

export default PaginaInicio;
