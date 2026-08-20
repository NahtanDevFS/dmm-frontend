import axiosClient from "./axiosClient";

export const CLAVE_CATALOGOS = "catalogo";

/**
 * CRUD genérico de los seis catálogos administrables.
 *
 * Comparten contrato exacto en el backend, así que se escriben una vez. Los
 * campos propios de alguno —descripcion en programas, telefono y correo en
 * instituciones donantes— viajan en el mismo cuerpo y el servidor ignora los
 * que no le corresponden.
 */
export type CuerpoCatalogo = Record<string, string | null>;

export async function crearElemento(ruta: string, cuerpo: CuerpoCatalogo) {
  const { data } = await axiosClient.post(ruta, cuerpo);
  return data;
}

export async function editarElemento(
  ruta: string,
  id: number,
  cuerpo: CuerpoCatalogo,
) {
  const { data } = await axiosClient.patch(ruta + "/" + id, cuerpo);
  return data;
}

export async function desactivarElemento(ruta: string, id: number) {
  await axiosClient.patch(ruta + "/" + id + "/desactivar");
}

export async function reactivarElemento(ruta: string, id: number) {
  await axiosClient.patch(ruta + "/" + id + "/reactivar");
}
