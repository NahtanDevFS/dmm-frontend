import axios from "axios";
import { anunciarSesionExpirada } from "./sesion";

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  // La sesión viaja en la cookie HttpOnly dmm_session. Sin esto el navegador
  // no la manda y toda petición autenticada responde 401.
  withCredentials: true,
});

/**
 * Rutas donde un 401 es una respuesta normal del flujo, no una sesión caída:
 *
 * - `auth/login`: 401 significa usuario o contraseña incorrectos. Tratarlo como
 *   expiración provocaría una redirección en bucle sobre la propia pantalla de
 *   acceso, y el usuario nunca llegaría a leer el mensaje de error.
 * - `auth/me`: se llama al arrancar justo para averiguar si hay sesión. Un 401
 *   aquí es la respuesta esperada de «no ha entrado nadie».
 * - `auth/logout`: cerrar una sesión ya vencida es exactamente lo que se pedía.
 */
const AUTENTICACION_ESPERADA = ["auth/login", "auth/me", "auth/logout"];

function esFlujoDeAutenticacion(url: string | undefined): boolean {
  if (!url) return false;
  return AUTENTICACION_ESPERADA.some((ruta) => url.includes(ruta));
}

axiosClient.interceptors.response.use(
  (respuesta) => respuesta,
  (error: unknown) => {
    if (!axios.isAxiosError(error)) return Promise.reject(error);

    const estado = error.response?.status;

    if (estado === 401 && !esFlujoDeAutenticacion(error.config?.url)) {
      // La sesión expira a los 30 min de inactividad o a las 12 h del login,
      // lo que ocurra primero, y el servidor puede revocarla antes. El
      // frontend no puede anticiparlo: la cookie es HttpOnly y no se lee.
      anunciarSesionExpirada();
    }

    return Promise.reject(error);
  },
);

export default axiosClient;
