import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import Boton, { GrupoBotones } from "../../componentes/ui/Boton";
import { CampoContrasena } from "../../componentes/ui/Campo";
import Modal from "../../componentes/ui/Modal";
import { useCierreSeguro } from "../../componentes/ui/useCierreSeguro";
import { useAvisos } from "../../componentes/ui/avisos/useAvisos";
import {
  codigoDeError,
  intentosRestantesDelCuerpo,
  mensajeDeError,
} from "../../lib/errores";
import { cambiarPasswordPropia } from "../../api/usuarios";
import estilos from "./Usuarios.module.css";

function passwordValida(v: string): boolean {
  return v.length >= 8 && /[a-zA-Z]/.test(v) && /\d/.test(v);
}

/* Cambio de la propia contraseña. A diferencia del restablecimiento por un
   administrador, exige la contraseña actual y conserva la sesión desde la
   que se pide: solo se cierran las demás. */
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
  // Si la nueva se escribe mal, la persona queda fuera de su propia cuenta y
  // depende de que un administrador se la restablezca: se pide dos veces.
  const [confirmacion, setConfirmacion] = useState("");
  const [verActual, setVerActual] = useState(false);
  // La nueva y su confirmación se muestran juntas, para poder compararlas
  const [verNueva, setVerNueva] = useState(false);
  /* Error de la contraseña actual, fijo bajo su campo. El servidor limita los
     intentos (5 cada 15 minutos) y su mensaje ya dice cuántos quedan; un aviso
     que desaparece solo no deja volver a leerlo antes del siguiente intento. */
  const [errorActual, setErrorActual] = useState<string>();
  const [bloqueado, setBloqueado] = useState(false);

  const hayCambios =
    passwordActual !== "" || passwordNueva !== "" || confirmacion !== "";
  const coinciden = confirmacion === passwordNueva;
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
    onError: (error) => {
      const codigo = codigoDeError(error);
      if (
        codigo === "CURRENT_PASSWORD_INVALID" ||
        codigo === "CAMBIO_PASSWORD_BLOQUEADO"
      ) {
        setErrorActual(mensajeDeError(error));
        // Agotados los intentos, reenviar solo gastaría peticiones: el
        // servidor respondería lo mismo hasta que pase la ventana
        if (intentosRestantesDelCuerpo(error) === 0) setBloqueado(true);
        return;
      }
      // El resto (formato de la nueva, igual a la actual, sin conexión)
      avisar(mensajeDeError(error), "error");
    },
  });

  const listoParaEnviar =
    !bloqueado &&
    passwordActual !== "" &&
    passwordValida(passwordNueva) &&
    passwordNueva !== passwordActual &&
    coinciden;

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
      <CampoContrasena
        etiqueta="Contraseña actual"
        obligatorio
        autoComplete="current-password"
        visible={verActual}
        onCambiarVisible={setVerActual}
        value={passwordActual}
        onChange={(e) => {
          setPasswordActual(e.target.value);
          // Al corregirla, el error anterior ya no describe lo escrito; el
          // bloqueo sí se mantiene, porque lo decide el servidor
          if (!bloqueado) setErrorActual(undefined);
        }}
        error={errorActual}
      />
      <CampoContrasena
        etiqueta="Contraseña nueva"
        obligatorio
        visible={verNueva}
        onCambiarVisible={setVerNueva}
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
      <CampoContrasena
        etiqueta="Confirme la contraseña nueva"
        obligatorio
        visible={verNueva}
        onCambiarVisible={setVerNueva}
        value={confirmacion}
        onChange={(e) => setConfirmacion(e.target.value)}
        error={confirmacion !== "" && !coinciden ? "Las contraseñas no coinciden." : undefined}
      />
      <p className={estilos.ayudaPassword}>
        Mínimo 8 caracteres, con al menos una letra y un número.
      </p>
    </Modal>
  );
}

export default ModalCambiarPassword;
