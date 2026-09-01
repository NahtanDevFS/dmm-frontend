import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import Boton, { GrupoBotones } from "../../componentes/ui/Boton";
import { CampoTexto } from "../../componentes/ui/Campo";
import Modal from "../../componentes/ui/Modal";
import { useCierreSeguro } from "../../componentes/ui/useCierreSeguro";
import { useAvisos } from "../../componentes/ui/avisos/useAvisos";
import { mensajeDeError } from "../../lib/errores";
import { cambiarPasswordPropia } from "../../api/usuarios";
import estilos from "./Usuarios.module.css";

function passwordValida(v: string): boolean {
  return v.length >= 8 && /[a-zA-Z]/.test(v) && /\d/.test(v);
}

/**
 * Cambio de la propia contraseña. A diferencia del restablecimiento por un
 * administrador, exige la contraseña actual y conserva la sesión desde la
 * que se pide: solo se cierran las demás.
 */
function ModalCambiarPassword({
  abierto,
  onCerrar,
}: {
  abierto: boolean;
  onCerrar: () => void;
}) {
  const { avisar } = useAvisos();
  const [passwordActual, setPasswordActual] = useState("");
  const [passwordNueva, setPasswordNueva] = useState("");

  const hayCambios = passwordActual !== "" || passwordNueva !== "";
  const cerrar = useCierreSeguro({ hayCambios, onCerrar });

  const mutacion = useMutation({
    mutationFn: () =>
      cambiarPasswordPropia({
        password_actual: passwordActual,
        password_nueva: passwordNueva,
      }),
    onSuccess: (resultado) => {
      avisar(resultado.message, "exito");
      onCerrar();
    },
    // Incluye "la contraseña actual no es correcta" y "debe ser distinta de la actual".
    onError: (error) => avisar(mensajeDeError(error), "error"),
  });

  const listoParaEnviar =
    passwordActual !== "" &&
    passwordValida(passwordNueva) &&
    passwordNueva !== passwordActual;

  return (
    <Modal
      abierto={abierto}
      onCerrar={cerrar}
      titulo="Cambiar mi contraseña"
      descripcion="Se cerrarán las demás sesiones abiertas de su usuario; esta se conserva."
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
            Cambiar contraseña
          </Boton>
        </GrupoBotones>
      }
    >
      <CampoTexto
        etiqueta="Contraseña actual"
        obligatorio
        type="password"
        value={passwordActual}
        onChange={(e) => setPasswordActual(e.target.value)}
      />
      <CampoTexto
        etiqueta="Contraseña nueva"
        obligatorio
        type="password"
        value={passwordNueva}
        onChange={(e) => setPasswordNueva(e.target.value)}
        error={
          passwordNueva !== "" && passwordNueva === passwordActual
            ? "Debe ser distinta de la contraseña actual."
            : passwordNueva !== "" && !passwordValida(passwordNueva)
              ? "Debe tener al menos 8 caracteres, con una letra y un número."
              : undefined
        }
      />
      <p className={estilos.ayudaPassword}>
        Mínimo 8 caracteres, con al menos una letra y un número.
      </p>
    </Modal>
  );
}

export default ModalCambiarPassword;
