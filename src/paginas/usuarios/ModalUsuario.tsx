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
import { mensajeDeError } from "../../lib/errores";
import {
  CLAVE_USUARIOS,
  CLAVE_ROLES,
  listarRoles,
  crearUsuario,
  editarUsuario,
  type Usuario,
} from "../../api/usuarios";
import estilos from "./Usuarios.module.css";

/** Mismo criterio que el backend: 8+ caracteres, con letra y número. */
function passwordValida(v: string): boolean {
  return v.length >= 8 && /[a-zA-Z]/.test(v) && /\d/.test(v);
}

/**
 * Alta o edición de un usuario. Sin `usuario`, es alta (pide contraseña
 * inicial); con `usuario`, es edición (username y rol, sin contraseña —
 * eso lo cubre «Restablecer contraseña» aparte).
 *
 * Si se está editando la propia cuenta, el rol no se muestra editable: el
 * backend lo rechazaría igual («no puede cambiar su propio rol»), y
 * mostrarlo deshabilitado sin más solo invitaría a intentarlo.
 */
function ModalUsuario({
  usuario,
  abierto,
  onCerrar,
}: {
  usuario?: Usuario;
  abierto: boolean;
  onCerrar: () => void;
}) {
  const clienteQuery = useQueryClient();
  const { usuario: sesionActual } = useAuth();
  const { avisar } = useAvisos();

  const esEdicion = usuario !== undefined;
  const esUnoMismo = usuario?.id === sesionActual?.id;

  const [username, setUsername] = useState(usuario?.username ?? "");
  const [password, setPassword] = useState("");
  const [rolId, setRolId] = useState(usuario ? String(usuario.rol_id) : "");
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
      rolId !== String(usuario.rol_id) ||
      programaId !== programaOriginal
    : username !== "" || password !== "" || rolId !== "" || programaId !== "";

  const cerrar = useCierreSeguro({ hayCambios, onCerrar });

  const mutacion = useMutation({
    mutationFn: () =>
      esEdicion
        ? editarUsuario(usuario.id, {
            username: username !== usuario.username ? username : undefined,
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
    onError: (error) => avisar(mensajeDeError(error), "error"),
  });

  const usernameValido = username.trim().length >= 3;
  const listoParaEnviar = esEdicion
    ? usernameValido && rolId !== "" && hayCambios
    : usernameValido && passwordValida(password) && rolId !== "";

  return (
    <Modal
      abierto={abierto}
      onCerrar={cerrar}
      titulo={esEdicion ? "Editar usuario" : "Nuevo usuario"}
      bloqueado={mutacion.isPending}
      pie={
        <GrupoBotones>
          <Boton
            variante="terciaria"
            onClick={cerrar}
            disabled={mutacion.isPending}
          >
            Cancelar
          </Boton>
          <Boton
            variante="primaria"
            disabled={!listoParaEnviar}
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
        ayuda="Letras, números, punto, guion y guion bajo. Mínimo 3 caracteres."
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
                : undefined
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
        >
          {roles.data?.map((rol) => (
            <option key={rol.id} value={rol.id}>
              {rol.nombre}
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
        ayuda="Se preselecciona al crear solicitudes. Puede cambiarse en cada una; déjelo vacío si no lleva un programa propio."
      >
        {programas.opciones.map((programa) => (
          <option key={programa.id} value={programa.id}>
            {programa.nombre}
          </option>
        ))}
      </CampoSelect>
    </Modal>
  );
}

export default ModalUsuario;
