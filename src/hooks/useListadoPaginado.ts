import { useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import axiosClient from "../api/axiosClient";
import { LIMITE_MAXIMO, LIMITE_POR_DEFECTO, type Sobre } from "../types/api";

/** Filtros de un listado. Los `undefined` no se envían. */
export type Filtros = Record<
  string,
  string | number | boolean | undefined | null
>;

interface OpcionesListado {
  /** Prefijo de la clave de caché. Por convención, el nombre del recurso. */
  clave: string;
  /** Ruta relativa al baseURL, sin barra inicial. Por ejemplo `personas`. */
  ruta: string;
  filtros?: Filtros;
  limiteInicial?: number;
  /** Falso para no consultar todavía (por ejemplo, mientras falta un filtro). */
  habilitado?: boolean;
}

/** Descarta los filtros vacíos para no mandar `?busqueda=` sin valor. */
function limpiar(filtros: Filtros): Record<string, string> {
  const limpios: Record<string, string> = {};
  for (const [clave, valor] of Object.entries(filtros)) {
    if (valor === undefined || valor === null || valor === "") continue;
    limpios[clave] = String(valor);
  }
  return limpios;
}

/**
 * Listados de negocio paginados: personas, insumos, recepciones, solicitudes,
 * entregas, contratos, usuarios y auditoría.
 *
 * Encapsula el contrato de paginación del backend (`limite` de 1 a 200, 50 por
 * defecto, y `desplazamiento`) y lo traduce a algo que una tabla pueda usar
 * directamente: número de página, total de páginas y navegación.
 *
 * Los catálogos de selección no pasan por aquí: no paginan y devuelven el
 * arreglo completo. Para esos está useCatalogo.
 */
export function useListadoPaginado<T>({
  clave,
  ruta,
  filtros = {},
  limiteInicial = LIMITE_POR_DEFECTO,
  habilitado = true,
}: OpcionesListado) {
  const limite = Math.min(Math.max(limiteInicial, 1), LIMITE_MAXIMO);
  const [desplazamiento, setDesplazamiento] = useState(0);

  const filtrosLimpios = useMemo(() => limpiar(filtros), [filtros]);

  // Cambiar un filtro debe devolver a la primera página: si alguien está en la
  // página 5 y filtra por comunidad, el resultado puede tener dos páginas y se
  // quedaría mirando una tabla vacía sin entender por qué.
  const huellaFiltros = JSON.stringify(filtrosLimpios);
  const [huellaPrevia, setHuellaPrevia] = useState(huellaFiltros);
  if (huellaPrevia !== huellaFiltros) {
    setHuellaPrevia(huellaFiltros);
    setDesplazamiento(0);
  }

  const consulta = useQuery({
    queryKey: [clave, "listado", filtrosLimpios, limite, desplazamiento],
    queryFn: async ({ signal }) => {
      const { data } = await axiosClient.get<Sobre<T>>(ruta, {
        params: {
          ...filtrosLimpios,
          limite,
          desplazamiento,
        },
        signal,
      });
      return data;
    },
    enabled: habilitado,
    // Sin esto la tabla se vacía al pasar de página y el encabezado salta.
    // El manual limita el movimiento a 4 px; una tabla que colapsa y vuelve
    // a crecer lo rompe.
    placeholderData: keepPreviousData,
  });

  const total = consulta.data?.total ?? 0;
  const hayMas = consulta.data?.hay_mas ?? false;
  const paginaActual = Math.floor(desplazamiento / limite) + 1;
  const totalPaginas = Math.max(1, Math.ceil(total / limite));

  return {
    ...consulta,
    /** Filas de la página actual. Nunca `undefined`, para no ramificar en cada tabla. */
    datos: consulta.data?.datos ?? [],
    total,
    hayMas,
    limite,
    desplazamiento,
    paginaActual,
    totalPaginas,
    /** Verdadero al pasar de página, mientras se sigue mostrando la anterior. */
    cambiandoPagina: consulta.isPlaceholderData && consulta.isFetching,
    irAPagina: (pagina: number) => {
      const destino = Math.min(Math.max(pagina, 1), totalPaginas);
      setDesplazamiento((destino - 1) * limite);
    },
    siguiente: () => {
      if (hayMas) setDesplazamiento((d) => d + limite);
    },
    anterior: () => setDesplazamiento((d) => Math.max(0, d - limite)),
    reiniciar: () => setDesplazamiento(0),
  };
}
