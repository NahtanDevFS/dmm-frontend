import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cerrarSesion as cerrarSesionApi,
  iniciarSesion as iniciarSesionApi,
  obtenerSesion,
} from "../api/auth";
import { alExpirarSesion } from "../api/sesion";
import { estadoDe } from "../lib/errores";
import { CLAVE_SESION, ContextoAuth, type ValorAuth } from "./contexto";
import {
  hayCierrePendiente,
  limpiarCierrePendiente,
  marcarCierrePendiente,
} from "./cierrePendiente";
import type { UsuarioSesion } from "../types/api";

export function ProveedorAuth({ children }: { children: ReactNode }) {
  const clienteQuery = useQueryClient();

  // Se lee una sola vez al montar: si la página se recargó con un cierre sin
  // confirmar, la sesión NO se rescata con /auth/me, se reintenta el cierre.
  const [cierrePendiente, setCierrePendiente] = useState(hayCierrePendiente);

  /**
   * Rescate de sesión al arrancar. La cookie dmm_session es HttpOnly: el
   * frontend no puede leerla, así que la única forma de saber si hay sesión es
   * preguntárselo al servidor. Sin esto, recargar la página echaría al usuario
   * aunque su sesión siguiera viva.
   *
   * La query es la única fuente de verdad del usuario. Copiarla a un useState
   * obligaría a sincronizar dos estados y a hacerlo desde un efecto, que es
   * justo lo que provoca renders en cascada.
   */
  const consultaSesion = useQuery<UsuarioSesion | null>({
    queryKey: CLAVE_SESION,
    queryFn: async () => {
      try {
        return await obtenerSesion();
      } catch (error) {
        // 401 aquí no es un fallo: es la respuesta esperada de «no ha entrado
        // nadie», que es exactamente lo que este endpoint sirve para averiguar.
        // Devolverlo como null y no como error deja el estado en una sola
        // forma —usuario o ausencia de usuario— en vez de dos.
        if (estadoDe(error) === 401) return null;
        throw error;
      }
    },
    retry: false,
    staleTime: Infinity,
    enabled: !cierrePendiente,
  });

  /**
   * Descarta todo lo cacheado y deja la sesión explícitamente vacía. Los datos
   * en caché son de personas con discapacidad y documentos de identificación:
   * no deben sobrevivir al cierre de sesión ni quedar visibles para quien use
   * la máquina después.
   *
   * Se vuelve a sembrar la clave de sesión en null tras el borrado para que la
   * consulta no quede en estado pendiente y la pantalla de acceso aparezca de
   * inmediato, sin un parpadeo en blanco.
   */
  const limpiarEstado = useCallback(() => {
    clienteQuery.clear();
    clienteQuery.setQueryData(CLAVE_SESION, null);
  }, [clienteQuery]);

  // Payoff del puente que instaló el interceptor: cuando el servidor rechaza
  // la sesión, el estado se limpia y la aplicación vuelve sola al acceso.
  useEffect(() => alExpirarSesion(limpiarEstado), [limpiarEstado]);

  const mutacionEntrar = useMutation({
    mutationFn: iniciarSesionApi,
    onSuccess: (usuarioAutenticado) => {
      clienteQuery.setQueryData(CLAVE_SESION, usuarioAutenticado);
    },
  });

  const confirmarCierre = useCallback(() => {
    limpiarCierrePendiente();
    setCierrePendiente(false);
    limpiarEstado();
  }, [limpiarEstado]);

  const mutacionSalir = useMutation({
    mutationFn: cerrarSesionApi,
    onSuccess: confirmarCierre,
    onError: (error) => {
      // 401: el servidor ya no reconoce la sesión (venció o la revocaron), así
      // que no queda nada abierto. Es un cierre tan confirmado como un 200.
      if (estadoDe(error) === 401) {
        confirmarCierre();
        return;
      }
      // Sin red, servidor caído o error 500: la sesión puede seguir viva. Los
      // datos se ocultan igual, pero no se finge un cierre que no ocurrió.
      marcarCierrePendiente();
      setCierrePendiente(true);
      limpiarEstado();
    },
  });

  const { mutateAsync: entrarAsync } = mutacionEntrar;
  const { mutateAsync: salirAsync } = mutacionSalir;

  const { mutate: reintentarCierre } = mutacionSalir;

  // La página se recargó con un cierre sin confirmar: se reintenta de entrada.
  // El arreglo vacío es a propósito, es solo lo que había al montar.
  const [pendienteAlMontar] = useState(cierrePendiente);
  useEffect(() => {
    if (pendienteAlMontar) reintentarCierre();
  }, [pendienteAlMontar, reintentarCierre]);

  // Y cada vez que el navegador recupera la conexión mientras siga pendiente
  useEffect(() => {
    if (!cierrePendiente) return;
    const alVolverLaRed = () => reintentarCierre();
    window.addEventListener("online", alVolverLaRed);
    return () => window.removeEventListener("online", alVolverLaRed);
  }, [cierrePendiente, reintentarCierre]);

  const entrar = useCallback(
    (credenciales: { username: string; password: string }) =>
      entrarAsync(credenciales),
    [entrarAsync],
  );

  // El fallo ya lo resuelve onError (cierre pendiente); rechazar aquí solo
  // dejaría una promesa sin atender en quien llama con `void salir()`
  const salir = useCallback(async () => {
    await salirAsync().catch(() => undefined);
  }, [salirAsync]);

  const valor = useMemo<ValorAuth>(
    () => ({
      usuario: consultaSesion.data ?? null,
      // Con la consulta deshabilitada TanStack la deja «pending» para siempre:
      // sin esta condición la app se quedaría en «Comprobando sesión…»
      comprobandoSesion: !cierrePendiente && consultaSesion.isPending,
      entrar,
      salir,
      saliendo: mutacionSalir.isPending,
      cierrePendiente,
    }),
    [
      consultaSesion.data,
      consultaSesion.isPending,
      entrar,
      salir,
      mutacionSalir.isPending,
      cierrePendiente,
    ],
  );

  return <ContextoAuth value={valor}>{children}</ContextoAuth>;
}
