import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Boton, { GrupoBotones } from "../../componentes/ui/Boton";
import { CampoTexto, CampoSelect } from "../../componentes/ui/Campo";
import Modal from "../../componentes/ui/Modal";
import { useCierreSeguro } from "../../componentes/ui/useCierreSeguro";
import { useAuth } from "../../auth/useAuth";
import { useCatalogo } from "../../hooks/useCatalogo";
import type { Programa } from "../../types/api";
import { useAvisos } from "../../componentes/ui/avisos/useAvisos";
import {
  mensajeDeError,
  erroresPorCampo,
  type ErroresPorCampo,
} from "../../lib/errores";
import {
  CLAVE_USUARIOS,
  CLAVE_ROLES,
  listarRoles,
  crearUsuario,
  editarUsuario,
  desactivarUsuario,
  reactivarUsuario,
  type Usuario,
} from "../../api/usuarios";
import estilos from "./Usuarios.module.css";
import { etiquetaDe } from "../../lib/etiquetas";

// Mismo criterio que el backend: 8+ caracteres, con letra y número.
function passwordValida(v: string): boolean {
  return v.length >= 8 && /[a-zA-Z]/.test(v) && /\d/.test(v);
}

/* Alta o edición de un usuario. Sin `usuario`, es alta (pide contraseña
   inicial); con `usuario`, es edición (username y rol, sin contraseña —
   eso lo cubre «Restablecer contraseña» aparte).
   
   En edición trae además la sección «Cuenta» (restablecer contraseña y
   desactivar/reactivar). Vive aquí y no en la fila de la tabla: tres botones
   por fila ensanchaban la tabla hasta hacerla incómoda en el teléfono, y
   desactivar queda un paso más lejos de un toque accidental.
   
   Si se está editando la propia cuenta, el rol no se muestra editable: el
   backend lo rechazaría igual («no puede cambiar su propio rol»), y
   mostrarlo deshabilitado sin más solo invitaría a intentarlo. */
function ModalUsuario({
  usuario,
  abierto,
  onCerrar,
  onRestablecerPassword,
}: {
  usuario?: Usuario;
  abierto: boolean;
  onCerrar: () => void;
  // Cierra este modal y abre el de restablecer contraseña. Solo en edición.
  onRestablecerPassword?: () => void;
}) {
  const clienteQuery = useQueryClient();
  const { usuario: sesionActual } = useAuth();
  const { avisar, confirmar } = useAvisos();

  const esEdicion = usuario !== undefined;
  const esUnoMismo = usuario?.id === sesionActual?.id;

  const [username, setUsername] = useState(usuario?.username ?? "");
  const [nombreCompleto, setNombreCompleto] = useState(
    usuario?.nombre_completo ?? "",
  );
  const [password, setPassword] = useState("");
  const [rolId, setRolId] = useState(usuario ? String(usuario.rol_id) : "");
  const [errores, setErrores] = useState<ErroresPorCampo>({});
  const [programaId, setProgramaId] = useState(
    usuario?.programa_id ? String(usuario.programa_id) : "",
  );

  const programas = useCatalogo<Programa>("programas");

  const roles = useQuery({
    queryKey: [CLAVE_ROLES],
    queryFn: listarRoles,
  });

  const programaOriginal = usuario?.programa_id
    ? String(usuario.programa_id)
    : "";

  const hayCambios = esEdicion
    ? username !== usuario.username ||
      nombreCompleto !== (usuario.nombre_completo ?? "") ||
      rolId !== String(usuario.rol_id) ||
      programaId !== programaOriginal
    : username !== "" ||
      nombreCompleto !== "" ||
      password !== "" ||
      rolId !== "" ||
      programaId !== "";

  const cerrar = useCierreSeguro({ hayCambios, onCerrar });

  const mutacion = useMutation({
    mutationFn: () =>
      esEdicion
        ? editarUsuario(usuario.id, {
            username: username !== usuario.username ? username : undefined,
            nombre_completo:
              nombreCompleto !== (usuario.nombre_completo ?? "")
                ? nombreCompleto
                : undefined,
            rol_id:
              rolId !== String(usuario.rol_id) ? Number(rolId) : undefined,
            // null vacía la asignación; undefined la deja como estaba.
            programa_id:
              programaId !== programaOriginal
                ? programaId
                  ? Number(programaId)
                  : null
                : undefined,
          })
        : crearUsuario({
            username,
            nombre_completo: nombreCompleto,
            password,
            rol_id: Number(rolId),
            programa_id: programaId ? Number(programaId) : null,
          }),
    onSuccess: async () => {
      await clienteQuery.invalidateQueries({ queryKey: [CLAVE_USUARIOS] });
      avisar(esEdicion ? "Usuario actualizado." : "Usuario creado.", "exito");
      onCerrar();
    },
    // Incluye las guardas del backend: username duplicado, rol inactivo,
    // "no puede cambiar su propio rol", "único administrador activo".
    onError: (error) => {
      // El detalle por campo se pinta bajo cada input; el aviso lleva el
      // mensaje completo por si el campo culpable quedó fuera de la vista.
      setErrores(erroresPorCampo(error) ?? {});
      avisar(mensajeDeError(error), "error");
    },
  });

  // Ambas cierran el modal al terminar: el estado nuevo se ve en la tabla.
  // Aquí llegan las guardas del backend ("no puede desactivar su propio
  // usuario", "único administrador activo"); se muestran tal cual.
  const cambioEstado = useMutation({
    mutationFn: (activar: boolean) =>
      activar ? reactivarUsuario(usuario!.id) : desactivarUsuario(usuario!.id),
    onSuccess: async (_, activar) => {
      await clienteQuery.invalidateQueries({ queryKey: [CLAVE_USUARIOS] });
      avisar(
        activar ? "Usuario reactivado." : "Usuario desactivado.",
        "exito",
      );
      onCerrar();
    },
    onError: (error) => avisar(mensajeDeError(error), "error"),
  });

  const desactivar = async () => {
    const ok = await confirmar({
      titulo: "Desactivar usuario",
      mensaje:
        "Se cerrarán todas las sesiones abiertas de «" +
        usuario!.username +
        "». Podrá reactivarlo después.",
      textoConfirmar: "Desactivar",
      destructiva: true,
    });
    if (ok) cambioEstado.mutate(false);
  };

  const ocupado = mutacion.isPending || cambioEstado.isPending;

  const usernameValido = username.trim().length >= 3;
  const listoParaEnviar = esEdicion
    ? usernameValido && rolId !== "" && hayCambios
    : usernameValido && passwordValida(password) && rolId !== "";

  return (
    <Modal
      abierto={abierto}
      onCerrar={cerrar}
      titulo={esEdicion ? "Editar usuario" : "Nuevo usuario"}
      bloqueado={ocupado}
      pie={
        <GrupoBotones>
          <Boton
            variante="terciaria"
            onClick={cerrar}
            disabled={ocupado}
          >
            Cancelar
          </Boton>
          <Boton
            variante="primaria"
            disabled={!listoParaEnviar || cambioEstado.isPending}
            cargando={mutacion.isPending}
            textoCargando="Guardando…"
            onClick={() => mutacion.mutate()}
          >
            {esEdicion ? "Guardar cambios" : "Crear usuario"}
          </Boton>
        </GrupoBotones>
      }
    >
      <CampoTexto
        etiqueta="Usuario"
        obligatorio
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        error={errores.username?.[0]}
        ayuda="Es lo que se teclea para entrar: letras sin tilde, números, punto, guion y guion bajo. Sin espacios ni ñ. El nombre real va en el campo de abajo."
      />

      {/*
        El nombre de la persona, separado del identificador de acceso. Antes
        se usaba el usuario como si fuera el nombre, y por eso molestaba que
        rechazara las tildes: son dos cosas distintas, una se teclea y la otra
        se lee.
      */}
      <CampoTexto
        etiqueta="Nombre completo"
        obligatorio={!esEdicion}
        maxLength={150}
        value={nombreCompleto}
        onChange={(e) => setNombreCompleto(e.target.value)}
        error={errores.nombre_completo?.[0]}
        ayuda="Como se escribe de verdad, con tildes. Es lo que aparece en pantallas y expedientes."
      />

      {!esEdicion && (
        <>
          <CampoTexto
            etiqueta="Contraseña inicial"
            obligatorio
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={
              password !== "" && !passwordValida(password)
                ? "Debe tener al menos 8 caracteres, con una letra y un número."
                : errores.password?.[0]
            }
          />
          <p className={estilos.ayudaPassword}>
            La persona podrá cambiarla después desde su propia sesión.
          </p>
        </>
      )}

      {esUnoMismo ? (
        <p className={estilos.auxiliar}>
          No puede cambiar su propio rol. Pida a otro administrador que lo haga
          si hace falta.
        </p>
      ) : (
        <CampoSelect
          etiqueta="Rol"
          obligatorio
          marcador="Seleccione…"
          value={rolId}
          onChange={(e) => setRolId(e.target.value)}
          error={errores.rol_id?.[0]}
        >
          {roles.data?.map((rol) => (
            <option key={rol.id} value={rol.id}>
              {etiquetaDe(rol.nombre)}
            </option>
          ))}
        </CampoSelect>
      )}

      {/*
        De qué programa es encargada. Solo preselecciona el campo al crear una
        solicitud: no impide registrar en otro, porque cuando una falta otra la
        cubre. Vacío para quienes no llevan uno propio.

        Fuera del bloque del rol a propósito: cambiarse el rol a uno mismo es
        peligroso, cambiarse el programa no.
      */}
      <CampoSelect
        etiqueta="Programa a su cargo"
        value={programaId}
        onChange={(e) => setProgramaId(e.target.value)}
        error={errores.programa_id?.[0]}
        ayuda="Se preselecciona al crear solicitudes. Puede cambiarse en cada una; déjelo vacío si no lleva un programa propio."
      >
        {programas.opciones.map((programa) => (
          <option key={programa.id} value={programa.id}>
            {programa.nombre}
          </option>
        ))}
      </CampoSelect>

      {esEdicion && (
        <section className={estilos.seccionCuenta} aria-labelledby="usu-cuenta">
          <h3 id="usu-cuenta" className={estilos.tituloSeccion}>
            Cuenta
          </h3>
          {/* Estas acciones cierran el modal; con cambios a medias se
              perderían sin aviso, así que primero hay que resolverlos. */}
          {hayCambios && (
            <p className={estilos.auxiliar}>
              Guarde o descarte los cambios de arriba para usar estas
              acciones.
            </p>
          )}
          <div className={estilos.accionesCuenta}>
            <Boton
              variante="secundaria"
              disabled={hayCambios || ocupado}
              onClick={onRestablecerPassword}
            >
              Restablecer contraseña
            </Boton>
            {usuario.activo ? (
              <Boton
                variante="terciaria"
                disabled={hayCambios || mutacion.isPending}
                cargando={cambioEstado.isPending}
                onClick={desactivar}
              >
                Desactivar usuario
              </Boton>
            ) : (
              <Boton
                variante="secundaria"
                disabled={hayCambios || mutacion.isPending}
                cargando={cambioEstado.isPending}
                onClick={() => cambioEstado.mutate(true)}
              >
                Reactivar usuario
              </Boton>
            )}
          </div>
        </section>
      )}
    </Modal>
  );
}

export default ModalUsuario;
