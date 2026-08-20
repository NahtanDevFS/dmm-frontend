import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
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
import estilos from "./Beneficiarios.module.css";

function PaginaBeneficiarios() {
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
        <Boton variante="primaria" disabled>
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
                        <Link to={"/beneficiarios/" + persona.id}>
                          <Boton pequeno variante="secundaria">
                            Ver ficha
                          </Boton>
                        </Link>
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
    </>
  );
}

export default PaginaBeneficiarios;
