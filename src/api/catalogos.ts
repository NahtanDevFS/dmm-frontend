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
/**
 * Admite números además de texto porque no todos los catálogos son nombre y
 * poco más: comunidad lleva `municipio_id`, y el backend lo valida con
 * z.number(), así que mandarlo como el texto que devuelve un <select> se
 * rechaza con un 400.
 */
export type CuerpoCatalogo = Record<string, string | number | null>;

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
