import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import { navegacionDe } from "../../rutas/navegacion";
import { CampoTexto } from "../../componentes/ui/Campo";
import {
  Esqueleto,
  RejillaIndicadores,
  TarjetaIndicador,
} from "../../componentes/ui/Estado";
import {
  GraficaBarras,
  GraficaLinea,
  GraficaPastel,
} from "../../componentes/ui/Grafica";
import { mensajeDeError } from "../../lib/errores";
import {
  useCaducidades,
  useEntregasDelPeriodo,
  useEntregasPorMes,
  useListaEspera,
  usePoblacionPorGenero,
  usePoblacionPorPrograma,
  usePrestamosVencidos,
  useSolicitudesPendientes,
  useStockPorCategoriaGrafica,
  useTotalBeneficiarios,
} from "./useIndicadores";
import estilos from "./PaginaInicio.module.css";

const NOMBRE_ROL: Record<string, string> = {
  EMPLEADO_DMM: "Trabajo social",
  DIRECTORA: "Dirección",
  ALCALDE: "Alcaldía",
  ADMINISTRADOR: "Administración",
};

/**
 * Qué hace cada módulo, para describirlo en su atajo.
 *
 * Los atajos se derivan de NAVEGACION en vez de mantener una lista aparte:
 * antes eran cinco escritos a mano y los módulos que se agregaban después
 * nunca llegaban aquí. Ahora aparece todo lo que el rol puede abrir, y si
 * mañana nace un módulo, su atajo nace con él.
 *
 * Inicio se excluye por razones obvias: es donde ya está el usuario.
 */
const TEXTO_MODULO: Record<string, string> = {
  "/beneficiarios": "Registrar personas, encargados y documentos.",
  "/solicitudes": "Crear una solicitud, llenar formularios y aprobar.",
  "/donaciones": "Registrar un envío recibido y los insumos que trajo.",
  "/entregas": "Entregar medicina o comida, o despachar una solicitud.",
  "/inventario": "Existencias, lotes y fechas de caducidad.",
  "/prestamos": "Contratos de equipo, renovaciones y devoluciones.",
  "/catalogos": "Categorías, comunidades y formularios por categoría.",
  "/reportes": "Personas atendidas, stock y población beneficiada.",
  "/usuarios": "Altas, roles y restablecimiento de contraseñas.",
  "/auditoria": "Quién cambió qué y cuándo.",
};

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

/** "2026-04-01" → "abr". Corto porque son cinco o seis a la vez en el eje. */
function mesCorto(valorIso: string): string {
  const [, mes] = valorIso.split("-");
  const fecha = new Date(2000, Number(mes) - 1, 1);
  return fecha.toLocaleDateString("es-GT", { month: "short" }).replace(".", "");
}

/** Mismas etiquetas que ya usa Reportes para género (SeccionPoblacionBeneficiada.tsx). */
const ETIQUETA_GENERO: Record<string, string> = {
  MASCULINO: "Masculino",
  FEMENINO: "Femenino",
  OTRO: "Otro",
  PREFIERE_NO_DECIR: "Prefiere no decir",
};

function PaginaInicio() {
  const { usuario } = useAuth();
  const beneficiarios = useTotalBeneficiarios();
  const pendientes = useSolicitudesPendientes();
  const caducidades = useCaducidades();

  const prestamosVencidos = usePrestamosVencidos();
  const listaEspera = useListaEspera();

  const entregasPorMes = useEntregasPorMes(6);
  const stockGrafica = useStockPorCategoriaGrafica();

  /**
   * Rango del período, por omisión el mes en curso: es la ventana con la que
   * se piensa el trabajo de la Dirección, y arrancar en blanco obligaría a
   * elegir fechas antes de ver nada.
   */
  const hoy = new Date();
  const [desde, setDesde] = useState(
    new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().slice(0, 10),
  );
  const [hasta, setHasta] = useState(hoy.toISOString().slice(0, 10));
  const rangoValido = desde !== "" && hasta !== "" && desde <= hasta;

  const entregas = useEntregasDelPeriodo(
    rangoValido ? desde : "",
    rangoValido ? hasta : "",
  );
  const poblacionPorPrograma = usePoblacionPorPrograma(
    rangoValido ? desde : "",
    rangoValido ? hasta : "",
  );
  const poblacionPorGenero = usePoblacionPorGenero(
    rangoValido ? desde : "",
    rangoValido ? hasta : "",
  );

  const acciones = useMemo(
    () =>
      navegacionDe(usuario?.rol)
        .filter((item) => item.ruta !== "/")
        .map((item) => ({
          titulo: item.etiqueta,
          texto: TEXTO_MODULO[item.ruta] ?? "",
          ruta: item.ruta,
        })),
    [usuario?.rol],
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
        <h1 className={estilos.saludo}>
          Le damos la bienvenida, {usuario?.username}
        </h1>
        <p className={estilos.contexto}>
          {usuario ? (NOMBRE_ROL[usuario.rol] ?? usuario.rol) : null} ·
          Dirección Municipal de la Mujer, Usumatlán
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
          {/*
            Los lotes ya caducados solo aparecen si los hay. Una tarjeta fija
            en cero acostumbra a ignorarla, y cuando deje de estar en cero
            nadie la mirará. Lo mismo con los préstamos vencidos.
          */}
          {caducidades.vencidos > 0 && (
            <TarjetaIndicador
              titulo="Lotes vencidos"
              valor={caducidades.vencidos}
              detalle="Requieren baja de inventario"
              tono="peligro"
            />
          )}

          {(prestamosVencidos.data ?? 0) > 0 && (
            <TarjetaIndicador
              titulo="Préstamos vencidos"
              valor={prestamosVencidos.data}
              detalle="Pasó la fecha de devolución pactada"
              tono="peligro"
            />
          )}

          <TarjetaIndicador
            titulo="En lista de espera"
            valor={
              <Valor
                cargando={listaEspera.isPending}
                error={listaEspera.error}
                valor={listaEspera.data}
              />
            }
            detalle="Insumos pedidos que esperan existencias"
            tono="advertencia"
          />
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

      <section className={estilos.seccion} aria-labelledby="graficas">
        <h2 id="graficas" className={estilos.tituloSeccion}>
          Tendencias
        </h2>

        <div className={estilos.rejillaGraficas}>
          <div className={estilos.tarjetaGrafica}>
            <h3 className={estilos.tituloGrafica}>
              Stock disponible por categoría
            </h3>
            {stockGrafica.isPending ? (
              <Esqueleto alto={140} />
            ) : stockGrafica.isError ? (
              <p className={estilos.fallo}>
                {mensajeDeError(
                  stockGrafica.error,
                  "No se pudo cargar el stock por categoría.",
                )}
              </p>
            ) : (
              <GraficaBarras
                datos={(stockGrafica.data ?? []).map((c) => ({
                  etiqueta: c.categoria_nombre,
                  valor: c.unidades_totales_disponibles,
                  resaltada: c.lotes_urgentes_o_vencidos > 0,
                }))}
                etiquetaVacio="No hay categorías con existencias"
              />
            )}
          </div>

          <div className={estilos.tarjetaGrafica}>
            <h3 className={estilos.tituloGrafica}>
              Personas beneficiadas por programa
            </h3>
            {!rangoValido ? (
              <p className={estilos.contexto}>
                Elige un rango de fechas válido arriba para ver esta gráfica.
              </p>
            ) : poblacionPorPrograma.isPending ? (
              <Esqueleto alto={140} />
            ) : poblacionPorPrograma.isError ? (
              <p className={estilos.fallo}>
                {mensajeDeError(
                  poblacionPorPrograma.error,
                  "No se pudo cargar la población beneficiada.",
                )}
              </p>
            ) : (
              <GraficaBarras
                datos={(poblacionPorPrograma.data ?? []).map((p) => ({
                  etiqueta: p.programa_nombre,
                  valor: p.personas_unicas_beneficiadas,
                }))}
                etiquetaVacio="Sin entregas registradas en el rango elegido"
              />
            )}
          </div>

          <div className={estilos.tarjetaGrafica}>
            <h3 className={estilos.tituloGrafica}>Estado del inventario</h3>
            {caducidades.isPending ? (
              <Esqueleto alto={220} />
            ) : caducidades.isError ? (
              <p className={estilos.fallo}>
                {mensajeDeError(
                  caducidades.error,
                  "No se pudo cargar el semáforo de inventario.",
                )}
              </p>
            ) : (
              <GraficaPastel
                datos={[
                  {
                    etiqueta: "Sin novedad (más de 6 meses)",
                    valor: caducidades.verdes,
                    color: "var(--color-success)",
                  },
                  {
                    etiqueta: "Vence en 3-6 meses",
                    valor: caducidades.amarillos,
                    color: "var(--color-warning)",
                  },
                  {
                    etiqueta: "Vence en menos de 3 meses",
                    valor: caducidades.porVencer,
                    color: "var(--color-primary-dark)",
                  },
                  {
                    etiqueta: "Vencido",
                    valor: caducidades.vencidos,
                    color: "var(--color-danger)",
                  },
                  {
                    etiqueta: "Sin fecha de caducidad",
                    valor: caducidades.sinFecha,
                    color: "var(--color-text-muted)",
                  },
                ]}
                etiquetaVacio="No hay lotes con existencias"
              />
            )}
          </div>

          <div className={estilos.tarjetaGrafica}>
            <h3 className={estilos.tituloGrafica}>
              Población beneficiada por género
            </h3>
            {!rangoValido ? (
              <p className={estilos.contexto}>
                Elige un rango de fechas válido arriba para ver esta gráfica.
              </p>
            ) : poblacionPorGenero.isPending ? (
              <Esqueleto alto={220} />
            ) : poblacionPorGenero.isError ? (
              <p className={estilos.fallo}>
                {mensajeDeError(
                  poblacionPorGenero.error,
                  "No se pudo cargar la población beneficiada.",
                )}
              </p>
            ) : (
              <GraficaPastel
                datos={(poblacionPorGenero.data ?? []).map((p) => ({
                  etiqueta: ETIQUETA_GENERO[p.genero] ?? p.genero,
                  valor: p.personas_unicas_beneficiadas,
                }))}
                etiquetaVacio="Sin entregas registradas en el rango elegido"
              />
            )}
          </div>

          <div
            className={`${estilos.tarjetaGrafica} ${estilos.tarjetaGraficaAncha}`}
          >
            <h3 className={estilos.tituloGrafica}>Entregas por mes</h3>
            {entregasPorMes.isPending ? (
              <Esqueleto alto={180} />
            ) : entregasPorMes.isError ? (
              <p className={estilos.fallo}>
                {mensajeDeError(
                  entregasPorMes.error,
                  "No se pudo cargar la tendencia de entregas.",
                )}
              </p>
            ) : (
              <GraficaLinea
                datos={(entregasPorMes.data ?? []).map((p) => ({
                  etiqueta: mesCorto(p.mes),
                  valor: p.total_entregas,
                }))}
              />
            )}
          </div>
        </div>
      </section>

      <section className={estilos.seccion} aria-labelledby="periodo">
        <h2 id="periodo" className={estilos.tituloSeccion}>
          Actividad del período
        </h2>
        <p className={estilos.contexto}>
          A diferencia de arriba, esto no describe cómo están las cosas hoy sino
          cuánto se hizo en un tramo de tiempo.
        </p>

        <div className={estilos.rangoFechas}>
          <CampoTexto
            etiqueta="Desde"
            type="date"
            value={desde}
            max={hasta || undefined}
            onChange={(e) => setDesde(e.target.value)}
          />
          <CampoTexto
            etiqueta="Hasta"
            type="date"
            value={hasta}
            min={desde || undefined}
            onChange={(e) => setHasta(e.target.value)}
            error={
              !rangoValido && desde !== "" && hasta !== ""
                ? "La fecha final no puede ser anterior a la inicial."
                : undefined
            }
          />
        </div>

        <RejillaIndicadores>
          <TarjetaIndicador
            titulo="Entregas registradas"
            valor={
              rangoValido ? (
                <Valor
                  cargando={entregas.isPending}
                  error={entregas.error}
                  valor={entregas.data}
                />
              ) : (
                "—"
              )
            }
            detalle="Actos de entrega en el rango elegido"
          />
        </RejillaIndicadores>
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
