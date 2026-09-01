import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Boton from "../../componentes/ui/Boton";
import { CampoSelect, CampoTexto } from "../../componentes/ui/Campo";
import Insignia from "../../componentes/ui/Insignia";
import Paginacion from "../../componentes/ui/Paginacion";
import Tabla, { CeldaAcciones } from "../../componentes/ui/Tabla";
import { EstadoVacio, EsqueletoTabla } from "../../componentes/ui/Estado";
import { useAuth } from "../../auth/useAuth";
import { useAvisos } from "../../componentes/ui/avisos/useAvisos";
import { useListadoPaginado } from "../../hooks/useListadoPaginado";
import { formatearFecha } from "../../lib/fechas";
import { mensajeDeError } from "../../lib/errores";
import {
  CLAVE_USUARIOS,
  CLAVE_ROLES,
  listarRoles,
  desactivarUsuario,
  reactivarUsuario,
  type Usuario,
} from "../../api/usuarios";
import ModalUsuario from "./ModalUsuario";
import ModalResetearPassword from "./ModalResetearPassword";
import estilos from "./Usuarios.module.css";

/**
 * Gestión de usuarios. Exclusiva de ADMINISTRACION (DIRECTORA +
 * ADMINISTRADOR) — la ruta ya lo exige en Rutas.tsx.
 *
 * Las guardas contra dejar el sistema sin acceso (no desactivarse a sí
 * mismo, no tocar al único ADMINISTRADOR activo, no cambiarse el rol
 * propio) las decide el backend; aquí solo se muestra el mensaje que
 * devuelve, no se duplica la regla.
 */
function PaginaUsuarios() {
  const clienteQuery = useQueryClient();
  const { usuario: sesionActual } = useAuth();
  const { avisar, confirmar } = useAvisos();

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

  const refrescar = () =>
    clienteQuery.invalidateQueries({ queryKey: [CLAVE_USUARIOS] });

  const desactivacion = useMutation({
    mutationFn: (id: number) => desactivarUsuario(id),
    onSuccess: async () => {
      await refrescar();
      avisar("Usuario desactivado.", "exito");
    },
    // Aquí llegan las guardas del backend: "no puede desactivar su propio
    // usuario" o "único administrador activo". El mensaje ya es el que se
    // muestra, sin reinterpretarlo.
    onError: (error) => avisar(mensajeDeError(error), "error"),
  });

  const reactivacion = useMutation({
    mutationFn: (id: number) => reactivarUsuario(id),
    onSuccess: async () => {
      await refrescar();
      avisar("Usuario reactivado.", "exito");
    },
    onError: (error) => avisar(mensajeDeError(error), "error"),
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
                {rol.nombre}
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
              className={estilos.limpiarFiltros}
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
                  <th>Usuario</th>
                  <th>Rol</th>
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
                      <td className={estilos.usuario}>{fila.username}</td>
                      <td>{fila.rol_nombre}</td>
                      <td>{formatearFecha(fila.ultimo_login)}</td>
                      <td className={estilos.celdaEstado}>
                        {fila.activo ? (
                          <Insignia tono="aprobada">Activo</Insignia>
                        ) : (
                          <Insignia tono="neutra">Inactivo</Insignia>
                        )}
                        {esUnoMismo && (
                          <Insignia tono="informativa">Su cuenta</Insignia>
                        )}
                      </td>
                      <CeldaAcciones>
                        <div className={estilos.acciones}>
                          <Boton
                            pequeno
                            variante="secundaria"
                            onClick={() => setEditando(fila)}
                          >
                            Editar
                          </Boton>
                          <Boton
                            pequeno
                            variante="secundaria"
                            onClick={() => setReseteando(fila)}
                          >
                            Restablecer contraseña
                          </Boton>
                          {fila.activo ? (
                            <Boton
                              pequeno
                              variante="terciaria"
                              cargando={
                                desactivacion.isPending &&
                                desactivacion.variables === fila.id
                              }
                              onClick={async () => {
                                const ok = await confirmar({
                                  titulo: "Desactivar usuario",
                                  mensaje:
                                    "Se cerrarán todas las sesiones abiertas de «" +
                                    fila.username +
                                    "». Podrá reactivarlo después.",
                                  textoConfirmar: "Desactivar",
                                  destructiva: true,
                                });
                                if (ok) desactivacion.mutate(fila.id);
                              }}
                            >
                              Desactivar
                            </Boton>
                          ) : (
                            <Boton
                              pequeno
                              variante="secundaria"
                              cargando={
                                reactivacion.isPending &&
                                reactivacion.variables === fila.id
                              }
                              onClick={() => reactivacion.mutate(fila.id)}
                            >
                              Reactivar
                            </Boton>
                          )}
                        </div>
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
