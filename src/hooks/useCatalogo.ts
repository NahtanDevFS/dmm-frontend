import { useQuery } from "@tanstack/react-query";
import axiosClient from "../api/axiosClient";

/**
 * Catálogos de selección: los que no paginan y devuelven el arreglo completo.
 *
 * El backend los deja sin paginar a propósito. Están acotados por naturaleza
 * —decenas de filas— y su único consumidor es un <select>, que necesita la
 * lista entera para poder mostrar el valor ya guardado de un registro. Paginar
 * un desplegable solo agregaría fricción.
 *
 * Se cachean con staleTime largo: un municipio o un tipo de parentesco no
 * cambian durante una jornada, y volver a pedirlos en cada pantalla sumaría
 * decenas de peticiones contra el límite de 300 por minuto.
 */

/** Media jornada. Un catálogo editado se invalida a mano desde su pantalla. */
const VIGENCIA_CATALOGO = 1000 * 60 * 60 * 4;

export const CLAVE_CATALOGO = "catalogo";

/** Rutas de catálogo administrable (CRUD genérico de DIRECTORA/ADMINISTRADOR). */
export const CATALOGOS_ADMINISTRABLES = [
  "discapacidades",
  "programas",
  "categorias-insumo",
  "marcas-insumo",
  "unidades-medida",
  "instituciones-donantes",
] as const;

/** Catálogos de solo lectura. No tienen pantalla de gestión. */
export const CATALOGOS_LECTURA = [
  "departamentos",
  "municipios",
  "tipos-genero",
  "tipos-parentesco",
  "tipos-documento-persona",
  "tipos-evidencia-entrega",
  "tipos-evidencia-contrato",
  "tipos-multa-prestamo",
  "estados-solicitud",
  // No es administrable a propósito: el código se ramifica sobre estos
  // nombres (un préstamo se salta los formularios propios de donación), así
  // que agregar una modalidad exige migración, no una pantalla.
  "modalidades-solicitud",
  "estados-contrato-prestamo",
  "roles",
] as const;

export type RutaCatalogo =
  | (typeof CATALOGOS_ADMINISTRABLES)[number]
  | (typeof CATALOGOS_LECTURA)[number]
  | "comunidades";

interface OpcionesCatalogo {
  /** Filtros de acotación: `?municipioId=`, `?departamentoId=`. */
  parametros?: Record<string, string | number | undefined>;
  /**
   * Incluir los desactivados. Se necesita al editar un registro que apunta a
   * un catálogo dado de baja después: sin esto el <select> no encontraría el
   * valor guardado y lo mostraría vacío, como si nunca se hubiera elegido.
   */
  incluirInactivos?: boolean;
  habilitado?: boolean;
}

function limpiar(
  parametros: Record<string, string | number | undefined> = {},
): Record<string, string> {
  const limpios: Record<string, string> = {};
  for (const [clave, valor] of Object.entries(parametros)) {
    if (valor === undefined || valor === "") continue;
    limpios[clave] = String(valor);
  }
  return limpios;
}

/**
 * Lee un catálogo completo. `T` lo fija quien llama, según la ruta:
 * ElementoCatalogo para la mayoría, Programa, InstitucionDonante,
 * Comunidad o Municipio para los que traen campos propios.
 */
export function useCatalogo<T>(
  ruta: RutaCatalogo,
  {
    parametros,
    incluirInactivos = false,
    habilitado = true,
  }: OpcionesCatalogo = {},
) {
  const query = {
    ...limpiar(parametros),
    ...(incluirInactivos ? { incluirInactivos: "true" } : {}),
  };

  const consulta = useQuery({
    queryKey: [CLAVE_CATALOGO, ruta, query],
    queryFn: async ({ signal }) => {
      const { data } = await axiosClient.get<T[]>(ruta, {
        params: query,
        signal,
      });
      return data;
    },
    enabled: habilitado,
    staleTime: VIGENCIA_CATALOGO,
    gcTime: VIGENCIA_CATALOGO,
  });

  return {
    ...consulta,
    /** Nunca `undefined`: un <select> mapea sobre esto sin ramificar. */
    opciones: consulta.data ?? [],
  };
}

/**
 * Clave para invalidar catálogos tras crear, editar o desactivar uno.
 * Sin ruta invalida todos; con ruta, solo ese.
 */
export function claveCatalogo(ruta?: RutaCatalogo) {
  return ruta ? [CLAVE_CATALOGO, ruta] : [CLAVE_CATALOGO];
}
