import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import Boton, { GrupoBotones } from "../../componentes/ui/Boton";
import { CampoContrasena } from "../../componentes/ui/Campo";
import Modal from "../../componentes/ui/Modal";
import { useCierreSeguro } from "../../componentes/ui/useCierreSeguro";
import { useAvisos } from "../../componentes/ui/avisos/useAvisos";
import { mensajeDeError } from "../../lib/errores";
import { resetearPassword, type Usuario } from "../../api/usuarios";
import estilos from "./Usuarios.module.css";

function passwordValida(v: string): boolean {
  return v.length >= 8 && /[a-zA-Z]/.test(v) && /\d/.test(v);
}

/* Restablecer la contraseña de otro usuario, sin conocer la actual. Cierra
   todas las sesiones abiertas de ese usuario — quien lo pide debe avisarle
   la contraseña nueva por un canal aparte, el sistema no la envía. */
function ModalResetearPassword({
  usuario,
  abierto,
  onCerrar,
}: {
  usuario: Usuario;
  abierto: boolean;
  onCerrar: () => void;
}) {
  const { avisar } = useAvisos();
  const [passwordNueva, setPasswordNueva] = useState("");
  // Se escribe dos veces: quien restablece tiene que comunicarla después, y
  // un error de dedo deja a la otra persona sin poder entrar.
  const [confirmacion, setConfirmacion] = useState("");
  const [visible, setVisible] = useState(false);

  const coinciden = confirmacion === passwordNueva;
  const lista = passwordValida(passwordNueva) && coinciden;

  const cerrar = useCierreSeguro({
    hayCambios: passwordNueva !== "" || confirmacion !== "",
    onCerrar,
  });

  const mutacion = useMutation({
    mutationFn: () => resetearPassword(usuario.id, passwordNueva),
    onSuccess: (resultado) => {
      avisar(resultado.message, "exito");
      onCerrar();
    },
    onError: (error) => avisar(mensajeDeError(error), "error"),
  });

  return (
    <Modal
      abierto={abierto}
      onCerrar={cerrar}
      titulo={"Restablecer contraseña de " + usuario.username}
      descripcion="Se cerrarán todas las sesiones abiertas de este usuario."
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
            disabled={!lista}
            cargando={mutacion.isPending}
            textoCargando="Restableciendo…"
            onClick={() => mutacion.mutate()}
          >
            Restablecer
          </Boton>
        </GrupoBotones>
      }
    >
      <CampoContrasena
        etiqueta="Contraseña nueva"
        obligatorio
        visible={visible}
        onCambiarVisible={setVisible}
        value={passwordNueva}
        onChange={(e) => setPasswordNueva(e.target.value)}
        error={
          passwordNueva !== "" && !passwordValida(passwordNueva)
            ? "Debe tener al menos 8 caracteres, con una letra y un número."
            : undefined
        }
      />
      <CampoContrasena
        etiqueta="Confirme la contraseña nueva"
        obligatorio
        visible={visible}
        onCambiarVisible={setVisible}
        value={confirmacion}
        onChange={(e) => setConfirmacion(e.target.value)}
        error={confirmacion !== "" && !coinciden ? "Las contraseñas no coinciden." : undefined}
      />
      <p className={estilos.ayudaPassword}>
        Comuníquele esta contraseña por un canal aparte: el sistema no se la
        envía.
      </p>
    </Modal>
  );
}

export default ModalResetearPassword;
