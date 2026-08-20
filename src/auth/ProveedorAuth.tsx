import { useCallback, useEffect, useMemo, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cerrarSesion as cerrarSesionApi,
  iniciarSesion as iniciarSesionApi,
  obtenerSesion,
} from "../api/auth";
import { alExpirarSesion } from "../api/sesion";
import { estadoDe } from "../lib/errores";
import { CLAVE_SESION, ContextoAuth, type ValorAuth } from "./contexto";
import type { UsuarioSesion } from "../types/api";

export function ProveedorAuth({ children }: { children: ReactNode }) {
  const clienteQuery = useQueryClient();

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

  const mutacionSalir = useMutation({
    mutationFn: cerrarSesionApi,
    // Logout es idempotente y la cookie pudo vencer antes de pulsar el botón.
    // Si el servidor responde con error igual se limpia: dejar al usuario
    // «dentro» de una sesión que ya no existe es peor que cerrarla de más.
    onSettled: limpiarEstado,
  });

  const { mutateAsync: entrarAsync } = mutacionEntrar;
  const { mutateAsync: salirAsync } = mutacionSalir;

  const entrar = useCallback(
    (credenciales: { username: string; password: string }) =>
      entrarAsync(credenciales),
    [entrarAsync],
  );

  const salir = useCallback(async () => {
    await salirAsync();
  }, [salirAsync]);

  const valor = useMemo<ValorAuth>(
    () => ({
      usuario: consultaSesion.data ?? null,
      comprobandoSesion: consultaSesion.isPending,
      entrar,
      salir,
      saliendo: mutacionSalir.isPending,
    }),
    [
      consultaSesion.data,
      consultaSesion.isPending,
      entrar,
      salir,
      mutacionSalir.isPending,
    ],
  );

  return <ContextoAuth value={valor}>{children}</ContextoAuth>;
}
