import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Boton from "../../componentes/ui/Boton";
import { CampoSelect, CampoTexto } from "../../componentes/ui/Campo";
import Insignia from "../../componentes/ui/Insignia";
import Paginacion from "../../componentes/ui/Paginacion";
import Tabla, { CeldaAcciones } from "../../componentes/ui/Tabla";
import { EstadoVacio, EsqueletoTabla } from "../../componentes/ui/Estado";
import { useAuth } from "../../auth/useAuth";
import { useListadoPaginado } from "../../hooks/useListadoPaginado";
import { formatearFecha } from "../../lib/fechas";
import { mensajeDeError } from "../../lib/errores";
import {
  CLAVE_USUARIOS,
  CLAVE_ROLES,
  listarRoles,
  type Usuario,
} from "../../api/usuarios";
import ModalUsuario from "./ModalUsuario";
import ModalResetearPassword from "./ModalResetearPassword";
import estilos from "./Usuarios.module.css";
import { etiquetaDe } from "../../lib/etiquetas";

/* Gestión de usuarios. Exclusiva de ADMINISTRACION (DIRECTORA +
   ADMINISTRADOR) — la ruta ya lo exige en Rutas.tsx.
   
   Las guardas contra dejar el sistema sin acceso (no desactivarse a sí
   mismo, no tocar al único ADMINISTRADOR activo, no cambiarse el rol
   propio) las decide el backend; aquí solo se muestra el mensaje que
   devuelve, no se duplica la regla. */
function PaginaUsuarios() {
  const { usuario: sesionActual } = useAuth();

  const [creando, setCreando] = useState(false);
  const [editando, setEditando] = useState<Usuario | null>(null);
  const [reseteando, setReseteando] = useState<Usuario | null>(null);
  const [rolId, setRolId] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [incluirInactivos, setIncluirInactivos] = useState(false);

  const roles = useQuery({
    queryKey: [CLAVE_ROLES],
    queryFn: listarRoles,
  });

  const filtros = useMemo(
    () => ({
      rolId: rolId || undefined,
      busqueda: busqueda.trim() || undefined,
      incluirInactivos: incluirInactivos ? "true" : undefined,
    }),
    [rolId, busqueda, incluirInactivos],
  );

  const listado = useListadoPaginado<Usuario>({
    clave: CLAVE_USUARIOS,
    ruta: "usuarios",
    filtros,
  });

  const hayFiltros = rolId !== "" || busqueda !== "" || incluirInactivos;

  const limpiarFiltros = () => {
    setRolId("");
    setBusqueda("");
    setIncluirInactivos(false);
  };

  return (
    <>
      <header className={estilos.encabezado}>
        <div>
          <h1>Usuarios</h1>
          <p className={estilos.nota}>
            Quién puede entrar al sistema y con qué rol. Desactivar un usuario
            cierra todas sus sesiones abiertas.
          </p>
        </div>
        <Boton variante="primaria" onClick={() => setCreando(true)}>
          Nuevo usuario
        </Boton>
      </header>

      <section className={estilos.tarjeta} aria-labelledby="usu-listado">
        <h2 id="usu-listado" className="solo-lectores">
          Usuarios
        </h2>

        <div className={estilos.filtros}>
          <CampoTexto
            className={estilos.filtroTexto}
            etiqueta="Usuario"
            placeholder="Filtrar por nombre de usuario…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />

          <CampoSelect
            className={estilos.filtroSelect}
            etiqueta="Rol"
            marcador="Todos los roles"
            value={rolId}
            onChange={(e) => setRolId(e.target.value)}
          >
            {roles.data?.map((rol) => (
              <option key={rol.id} value={rol.id}>
                {etiquetaDe(rol.nombre)}
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

          {hayFiltros && (
            <Boton
              variante="terciaria"
              onClick={limpiarFiltros}
            >
              Limpiar filtros
            </Boton>
          )}
        </div>

        {listado.isPending ? (
          <EsqueletoTabla filas={5} columnas={5} />
        ) : listado.isError ? (
          <EstadoVacio
            titulo="No se pudo cargar el listado"
            texto={mensajeDeError(listado.error)}
            accion={
              <Boton
                variante="secundaria"
                onClick={() => void listado.refetch()}
              >
                Reintentar
              </Boton>
            }
          />
        ) : listado.datos.length === 0 ? (
          <EstadoVacio
            titulo="Sin usuarios"
            texto={
              hayFiltros
                ? "Ningún usuario coincide con los filtros aplicados."
                : "Todavía no se ha registrado ningún usuario."
            }
          />
        ) : (
          <>
            <Tabla titulo="Usuarios del sistema">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Usuario</th>
                  <th>Rol</th>
                  <th>Programa a su cargo</th>
                  <th>Último ingreso</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {listado.datos.map((fila) => {
                  const esUnoMismo = fila.id === sesionActual?.id;
                  return (
                    <tr key={fila.id}>
                      {/* Las cuentas anteriores al campo no tienen nombre;
                          se muestra el usuario para no dejar la celda vacía. */}
                      <td>{fila.nombre_completo ?? "—"}</td>
                      <td className={estilos.usuario}>{fila.username}</td>
                      <td>{etiquetaDe(fila.rol_nombre)}</td>
                      <td>{fila.programa_nombre ?? "—"}</td>
                      <td>{formatearFecha(fila.ultimo_login)}</td>
                      {/* El flex va en un div: puesto en el td lo sacaba del
                          modelo de tabla y descuadraba la fila. */}
                      <td>
                        <div className={estilos.celdaEstado}>
                          {fila.activo ? (
                            <Insignia tono="aprobada">Activo</Insignia>
                          ) : (
                            <Insignia tono="neutra">Inactivo</Insignia>
                          )}
                          {esUnoMismo && (
                            <Insignia tono="informativa">Su cuenta</Insignia>
                          )}
                        </div>
                      </td>
                      <CeldaAcciones>
                        {/* Restablecer contraseña y desactivar viven en el
                            modal: una sola acción mantiene la tabla angosta. */}
                        <Boton
                          pequeno
                          variante="secundaria"
                          onClick={() => setEditando(fila)}
                        >
                          Editar
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
      </section>

      {creando && (
        <ModalUsuario abierto={creando} onCerrar={() => setCreando(false)} />
      )}

      {editando && (
        <ModalUsuario
          key={editando.id}
          usuario={editando}
          abierto
          onCerrar={() => setEditando(null)}
          onRestablecerPassword={() => {
            setReseteando(editando);
            setEditando(null);
          }}
        />
      )}

      {reseteando && (
        <ModalResetearPassword
          usuario={reseteando}
          abierto
          onCerrar={() => setReseteando(null)}
        />
      )}
    </>
  );
}

export default PaginaUsuarios;
