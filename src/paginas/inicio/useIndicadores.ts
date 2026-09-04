import { useQuery } from "@tanstack/react-query";
import axiosClient from "../../api/axiosClient";
import { SEMAFORO, type Semaforo, type Sobre } from "../../types/api";

/**
 * Indicadores del panel de inicio.
 *
 * Los conteos de beneficiarios y solicitudes se sacan del sobre paginado
 * pidiendo una sola fila: el servidor calcula `total` con un count aparte, así
 * que `limite=1` trae el número sin arrastrar las cincuenta filas por defecto
 * que nadie va a mirar.
 */

const VIGENCIA = 1000 * 60 * 2;

interface LoteSemaforo {
  detalle_inventario_lote_id: number;
  insumo_nombre: string;
  fecha_caducidad: string | null;
  cantidad_disponible: number;
  semaforo: Semaforo;
}

async function contarListado(
  ruta: string,
  filtros: Record<string, string> = {},
  signal?: AbortSignal,
): Promise<number> {
  const { data } = await axiosClient.get<Sobre<unknown>>(ruta, {
    params: { ...filtros, limite: 1, desplazamiento: 0 },
    signal,
  });
  return data.total;
}

export function useTotalBeneficiarios() {
  return useQuery({
    queryKey: ["inicio", "beneficiarios"],
    queryFn: ({ signal }) => contarListado("personas", {}, signal),
    staleTime: VIGENCIA,
  });
}

export function useSolicitudesPendientes() {
  return useQuery({
    queryKey: ["inicio", "solicitudes-pendientes"],
    queryFn: ({ signal }) =>
      contarListado(
        "solicitudes",
        { soloPendientesAprobacion: "true" },
        signal,
      ),
    staleTime: VIGENCIA,
  });
}

/**
 * Lotes por caducidad.
 *
 * `/inventario/semaforo` no pagina y devuelve el arreglo completo, así que se
 * pide una sola vez sin filtro y se cuenta aquí, en lugar de hacer una
 * petición por color. Está acotado por naturaleza: solo son los lotes con
 * existencias.
 *
 * ROJO es «vence en menos de tres meses» y VENCIDO es «ya caducó». Se cuentan
 * por separado porque exigen cosas distintas: uno pide priorizar la entrega y
 * el otro dar de baja el lote.
 */
/**
 * Préstamos que ya pasaron su fecha de devolución pactada.
 *
 * Es de las pocas cosas del sistema que exigen actuar sin que nadie las pida:
 * un equipo vencido nadie lo reclama solo. Por eso vive en el panel y no
 * dentro del módulo de Préstamos.
 */
export function usePrestamosVencidos() {
  return useQuery({
    queryKey: ["inicio", "prestamos-vencidos"],
    queryFn: ({ signal }) =>
      contarListado("prestamos", { estado: "VENCIDO" }, signal),
    staleTime: VIGENCIA,
  });
}

/**
 * Líneas de solicitud esperando existencias.
 *
 * El endpoint no pagina —devuelve el arreglo entero— así que se cuenta aquí.
 * Está acotado por naturaleza: solo son líneas pendientes por falta de stock.
 */
export function useListaEspera() {
  return useQuery({
    queryKey: ["inicio", "lista-espera"],
    queryFn: async ({ signal }) => {
      const { data } = await axiosClient.get<unknown[]>(
        "solicitudes/lista-espera",
        { signal },
      );
      return data.length;
    },
    staleTime: VIGENCIA,
  });
}

/**
 * Entregas registradas dentro de un rango de fechas.
 *
 * A diferencia del resto de indicadores, este no describe un estado sino un
 * período: sirve para contestar "¿cuánto se atendió este mes?" sin entrar al
 * módulo de Reportes. El rango lo elige quien mira, así que la consulta se
 * rehace al cambiarlo.
 */
export function useEntregasDelPeriodo(desde: string, hasta: string) {
  return useQuery({
    queryKey: ["inicio", "entregas", desde, hasta],
    queryFn: ({ signal }) =>
      contarListado("entregas", { desde, hasta }, signal),
    enabled: desde !== "" && hasta !== "",
    staleTime: VIGENCIA,
  });
}

export function useCaducidades() {
  const consulta = useQuery({
    queryKey: ["inicio", "semaforo"],
    queryFn: async ({ signal }) => {
      const { data } = await axiosClient.get<LoteSemaforo[]>(
        "inventario/semaforo",
        { signal },
      );
      return data;
    },
    staleTime: VIGENCIA,
  });

  const lotes = consulta.data ?? [];

  return {
    ...consulta,
    porVencer: lotes.filter((l) => l.semaforo === SEMAFORO.ROJO).length,
    vencidos: lotes.filter((l) => l.semaforo === SEMAFORO.VENCIDO).length,
  };
}
