import { useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Boton from "../../componentes/ui/Boton";
import { CampoTexto, CampoSelect } from "../../componentes/ui/Campo";
import Insignia from "../../componentes/ui/Insignia";
import Paginacion from "../../componentes/ui/Paginacion";
import Tabla, {
  CeldaAcciones,
  CeldaIdentificador,
} from "../../componentes/ui/Tabla";
import { EstadoVacio, EsqueletoTabla } from "../../componentes/ui/Estado";
import { useCatalogo } from "../../hooks/useCatalogo";
import { useListadoPaginado } from "../../hooks/useListadoPaginado";
import { calcularEdad, esMenorDeEdad, formatearCui } from "../../lib/fechas";
import { mensajeDeError } from "../../lib/errores";
import { CLAVE_PERSONAS } from "../../api/personas";
import type { Comunidad, Persona } from "../../types/api";
import ModalNuevoBeneficiario from "./ModalNuevoBeneficiario";
import ModalFicha from "./ModalFicha";
import estilos from "./Beneficiarios.module.css";

/**
 * Listado de beneficiarios y anfitrión de sus dos modales.
 *
 * El alta y la ficha se abren encima de esta tabla en lugar de sustituirla.
 * Las rutas /beneficiarios/nuevo y /beneficiarios/:id siguen existiendo y
 * abren el modal correspondiente al entrar, así que los enlaces guardados de
 * antes siguen llevando a donde llevaban; lo que cambia es que ya no se
 * navega para abrirlos desde la propia tabla, y por eso el filtro y la página
 * sobreviven a la consulta.
 */
function PaginaBeneficiarios() {
  const navegar = useNavigate();
  const { id } = useParams();
  const { pathname } = useLocation();

  /*
    /beneficiarios/nuevo es una ruta literal y no cae en :id, así que no llega
    como parámetro: se reconoce por el camino. Comprobar `id === "nuevo"` no
    funcionaba porque en esa ruta `id` viene indefinido.
  */
  const rutaEsAlta = pathname === "/beneficiarios/nuevo";
  const rutaId = id && /^\d+$/.test(id) ? Number(id) : null;
  /** Se llegó por una ruta profunda y hay que devolver la barra al listado. */
  const rutaProfunda = rutaEsAlta || rutaId !== null;

  const [creando, setCreando] = useState(rutaEsAlta);
  const [fichaId, setFichaId] = useState<number | null>(rutaId);

  /**
   * Al cerrar, la barra de direcciones vuelve a /beneficiarios. Si se quedara
   * apuntando a la ficha, recargar la reabriría sola y el usuario no podría
   * salir de ella sin editar la URL a mano.
   */
  const limpiarRuta = () => {
    if (rutaProfunda) navegar("/beneficiarios", { replace: true });
  };

  const [busqueda, setBusqueda] = useState("");
  const [comunidadId, setComunidadId] = useState("");
  const [incluirInactivos, setIncluirInactivos] = useState(false);

  const comunidades = useCatalogo<Comunidad>("comunidades");

  const filtros = useMemo(
    () => ({
      busqueda: busqueda.trim() || undefined,
      comunidadId: comunidadId || undefined,
      incluirInactivos: incluirInactivos ? "true" : undefined,
    }),
    [busqueda, comunidadId, incluirInactivos],
  );

  const listado = useListadoPaginado<Persona>({
    clave: CLAVE_PERSONAS,
    ruta: "personas",
    filtros,
  });

  const nombreComunidad = (id: number | null) =>
    comunidades.opciones.find((c) => c.id === id)?.nombre ?? "—";

  return (
    <>
      <header className={estilos.encabezado}>
        <h1>Beneficiarios</h1>
        <Boton variante="primaria" onClick={() => setCreando(true)}>
          Nuevo beneficiario
        </Boton>
      </header>

      <div className={estilos.tarjeta}>
        <div className={estilos.filtros}>
          <CampoTexto
            className={estilos.filtroBusqueda}
            etiqueta="Buscar"
            type="search"
            placeholder="CUI, nombres o apellidos"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            /*
              El backend combina ILIKE con similarity y no normaliza los
              acentos, así que «maria» no encuentra «María». Se dice aquí, en
              el propio campo, porque el usuario lo descubriría a base de
              búsquedas fallidas y concluiría que la persona no está
              registrada.
            */
            ayuda="Escriba los acentos: «maria» no encuentra «María»."
          />

          <CampoSelect
            className={estilos.filtroComunidad}
            etiqueta="Comunidad"
            marcador="Todas las comunidades"
            value={comunidadId}
            onChange={(e) => setComunidadId(e.target.value)}
          >
            {comunidades.opciones.map((comunidad) => (
              <option key={comunidad.id} value={comunidad.id}>
                {comunidad.nombre}
              </option>
            ))}
          </CampoSelect>

          <label className={estilos.opcionesExtra}>
            <input
              type="checkbox"
              className={estilos.casilla}
              checked={incluirInactivos}
              onChange={(e) => setIncluirInactivos(e.target.checked)}
            />
            Incluir inactivos
          </label>
        </div>

        {listado.isPending ? (
          <EsqueletoTabla filas={5} columnas={5} />
        ) : listado.isError ? (
          <EstadoVacio
            titulo="No se pudo cargar el listado"
            texto={mensajeDeError(listado.error)}
            accion={
              <Boton variante="secundaria" onClick={() => void listado.refetch()}>
                Reintentar
              </Boton>
            }
          />
        ) : listado.datos.length === 0 ? (
          <EstadoVacio
            titulo="Sin beneficiarios"
            texto={
              busqueda || comunidadId
                ? "Ningún registro coincide con los filtros aplicados. Revise los acentos de la búsqueda."
                : "Todavía no hay personas registradas."
            }
          />
        ) : (
          <>
            <Tabla titulo="Listado de beneficiarios">
              <thead>
                <tr>
                  <th>CUI/DPI</th>
                  <th>Nombre completo</th>
                  <th>Edad</th>
                  <th>Comunidad</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {listado.datos.map((persona) => {
                  const edad = calcularEdad(persona.fecha_nacimiento);
                  const menor = esMenorDeEdad(persona.fecha_nacimiento);
                  return (
                    <tr key={persona.id}>
                      <CeldaIdentificador>
                        {formatearCui(persona.cui_dpi)}
                      </CeldaIdentificador>
                      <td className={estilos.nombre}>
                        {persona.nombres} {persona.apellidos}
                      </td>
                      <td className={estilos.celdaEdad}>
                        <span className={menor ? estilos.menor : undefined}>
                          {Number.isFinite(edad) ? edad : "—"}
                        </span>{" "}
                        {menor && <Insignia tono="marca">Menor de edad</Insignia>}
                      </td>
                      <td>{nombreComunidad(persona.comunidad_id)}</td>
                      <td>
                        {persona.activo ? (
                          <Insignia tono="aprobada">Activo</Insignia>
                        ) : (
                          <Insignia tono="neutra">Inactivo</Insignia>
                        )}
                      </td>
                      <CeldaAcciones>
                        <Boton
                          pequeno
                          variante="secundaria"
                          onClick={() => setFichaId(persona.id)}
                        >
                          Ver ficha
                        </Boton>
                      </CeldaAcciones>
                    </tr>
                  );
                })}
              </tbody>
            </Tabla>

            <Paginacion
              total={listado.total}
              limite={listado.limite}
              desplazamiento={listado.desplazamiento}
              paginaActual={listado.paginaActual}
              totalPaginas={listado.totalPaginas}
              irAPagina={listado.irAPagina}
              anterior={listado.anterior}
              siguiente={listado.siguiente}
              cargando={listado.cambiandoPagina}
            />
          </>
        )}
      </div>

      {creando && (
        <ModalNuevoBeneficiario
          abierto={creando}
          onCerrar={() => {
            setCreando(false);
            limpiarRuta();
          }}
          onCreado={(personaId) => {
            setCreando(false);
            limpiarRuta();
            // Registrar a alguien y no poder verlo obligaría a buscarlo en la
            // tabla que se acaba de refrescar.
            setFichaId(personaId);
          }}
        />
      )}

      {fichaId !== null && (
        <ModalFicha
          // La clave remonta la ficha al cambiar de persona: sin ella se
          // reutilizaría el estado del modal de edición de la anterior.
          key={fichaId}
          personaId={fichaId}
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

export default PaginaBeneficiarios;
