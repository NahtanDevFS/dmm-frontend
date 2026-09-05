import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import Boton from "../../componentes/ui/Boton";
import { CampoSelect, CampoTexto } from "../../componentes/ui/Campo";
import Insignia from "../../componentes/ui/Insignia";
import Paginacion from "../../componentes/ui/Paginacion";
import Tabla, {
  CeldaAcciones,
  CeldaCantidad,
} from "../../componentes/ui/Tabla";
import { EstadoVacio, EsqueletoTabla } from "../../componentes/ui/Estado";
import { useAuth } from "../../auth/useAuth";
import { useAvisos } from "../../componentes/ui/avisos/useAvisos";
import { useListadoPaginado } from "../../hooks/useListadoPaginado";
import { formatearFecha } from "../../lib/fechas";
import { mensajeDeError } from "../../lib/errores";
import { DIRECCION, tieneRol } from "../../types/api";
import {
  CLAVE_CONTRATOS,
  ESTADO_CONTRATO,
  listarContratosVencidos,
  marcarVencidos,
  type ContratoListado,
  type EstadoContrato,
} from "../../api/prestamos";
import ModalFichaContrato from "./ModalFichaContrato";
import ModalRegistrarPrestamo from "./ModalRegistrarPrestamo";
import estilos from "./Prestamos.module.css";

const VISTAS = [
  { id: "listado", etiqueta: "Contratos" },
  { id: "vencidos", etiqueta: "Vencidos" },
] as const;

type Vista = (typeof VISTAS)[number]["id"];

const OPCIONES_ESTADO: { valor: EstadoContrato; etiqueta: string }[] = [
  { valor: ESTADO_CONTRATO.VIGENTE, etiqueta: "Vigente" },
  { valor: ESTADO_CONTRATO.EXTENDIDO, etiqueta: "Extendido (renovado)" },
  { valor: ESTADO_CONTRATO.VENCIDO, etiqueta: "Vencido" },
  { valor: ESTADO_CONTRATO.DEVUELTO, etiqueta: "Devuelto" },
];

const TONO_ESTADO: Record<
  EstadoContrato,
  "aprobada" | "pendiente" | "vencida" | "neutra"
> = {
  VIGENTE: "aprobada",
  EXTENDIDO: "neutra",
  VENCIDO: "vencida",
  DEVUELTO: "pendiente",
};

/**
 * Préstamos de equipo. El alta de un contrato nace de la ficha de la
 * entrega («Registrar préstamo»); este módulo es de consulta, renovación,
 * devolución y multas sobre contratos ya existentes.
 */
function PaginaPrestamos() {
  const navegar = useNavigate();
  const { id } = useParams();
  const rutaId = id && /^\d+$/.test(id) ? Number(id) : null;

  const clienteQuery = useQueryClient();
  const { usuario } = useAuth();
  const { avisar } = useAvisos();

  const [fichaId, setFichaId] = useState<number | null>(rutaId);
  const [vista, setVista] = useState<Vista>("listado");
  const [textoPersona, setTextoPersona] = useState("");
  const [estado, setEstado] = useState("");
  const [incluirInactivos, setIncluirInactivos] = useState(false);

  const puedeMarcarVencidos = tieneRol(usuario?.rol, DIRECCION);

  const filtros = useMemo(
    () => ({
      estado: estado || undefined,
      incluirInactivos: incluirInactivos ? "true" : undefined,
    }),
    [estado, incluirInactivos],
  );

  const listado = useListadoPaginado<ContratoListado>({
    clave: CLAVE_CONTRATOS,
    ruta: "contratos",
    filtros,
    habilitado: vista === "listado",
  });

  const vencidos = useQuery({
    queryKey: [CLAVE_CONTRATOS, "vencidos"],
    queryFn: listarContratosVencidos,
    enabled: vista === "vencidos",
  });

  const marcado = useMutation({
    mutationFn: marcarVencidos,
    onSuccess: async (resultado) => {
      await clienteQuery.invalidateQueries({ queryKey: [CLAVE_CONTRATOS] });
      avisar(resultado.message, "exito");
    },
    onError: (error) => avisar(mensajeDeError(error), "error"),
  });

  // El texto de persona filtra sobre lo ya traído: no hay ninguna forma de
  // buscar por nombre en el servidor, solo por personaId, y nadie lo
  // escribe a mano. Mismo patrón que Solicitudes y Entregas.
  const textoNorm = textoPersona.trim().toLowerCase();
  const filas = textoNorm
    ? listado.datos.filter((c) =>
        (c.persona_nombre_completo ?? "").toLowerCase().includes(textoNorm),
      )
    : listado.datos;

  const [registrando, setRegistrando] = useState(false);

  const limpiarRuta = () => {
    if (rutaId !== null) navegar("/prestamos", { replace: true });
  };

  const hayFiltros = textoPersona !== "" || estado !== "" || incluirInactivos;

  const limpiarFiltros = () => {
    setTextoPersona("");
    setEstado("");
    setIncluirInactivos(false);
  };

  return (
    <>
      <header className={estilos.encabezado}>
        <div>
          <h1>Préstamos de equipo</h1>
          <p className={estilos.nota}>
            Todo el préstamo se maneja aquí: registrar la entrega y su contrato,
            renovar, aplicar multas y registrar la devolución.
          </p>
        </div>
        <Boton variante="primaria" onClick={() => setRegistrando(true)}>
          Registrar préstamo
        </Boton>

        {vista === "vencidos" && puedeMarcarVencidos && (
          <Boton
            variante="primaria"
            cargando={marcado.isPending}
            textoCargando="Marcando…"
            onClick={() => marcado.mutate()}
          >
            Marcar vencidos
          </Boton>
        )}
      </header>

      <div className={estilos.selector} role="group" aria-label="Elegir vista">
        {VISTAS.map((v) => (
          <button
            key={v.id}
            type="button"
            className={
              estilos.pildora +
              (vista === v.id ? " " + estilos.pildoraActiva : "")
            }
            aria-pressed={vista === v.id}
            onClick={() => setVista(v.id)}
          >
            {v.etiqueta}
          </button>
        ))}
      </div>

      {vista === "vencidos" ? (
        <section className={estilos.tarjeta} aria-labelledby="pre-vencidos">
          <h2 id="pre-vencidos" className="solo-lectores">
            Contratos vencidos
          </h2>
          <p className={estilos.nota}>
            La fecha pactada ya pasó y no hay devolución registrada. No incluye
            contratos EXTENDIDO: esos ya fueron renovados, el vigente es el
            último de la cadena.
          </p>

          {vencidos.isPending ? (
            <EsqueletoTabla filas={5} columnas={5} />
          ) : vencidos.isError ? (
            <EstadoVacio
              titulo="No se pudo cargar el listado"
              texto={mensajeDeError(vencidos.error)}
              accion={
                <Boton
                  variante="secundaria"
                  onClick={() => void vencidos.refetch()}
                >
                  Reintentar
                </Boton>
              }
            />
          ) : vencidos.data.length === 0 ? (
            <EstadoVacio
              titulo="Nada vencido"
              texto="No hay contratos con la devolución atrasada en este momento."
            />
          ) : (
            <Tabla titulo="Contratos vencidos">
              <thead>
                <tr>
                  <th>Persona</th>
                  <th>Insumo</th>
                  <th>Devolución pactada</th>
                  <th>Días de retraso</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {vencidos.data.map((c) => (
                  <tr key={c.id}>
                    <td className={estilos.persona}>
                      {c.persona_nombre_completo ?? "—"}
                    </td>
                    <td>{c.insumo_nombre ?? "—"}</td>
                    <CeldaCantidad>
                      {formatearFecha(c.fecha_devolucion_pactada)}
                    </CeldaCantidad>
                    <CeldaCantidad>{c.dias_de_retraso}</CeldaCantidad>
                    <CeldaAcciones>
                      <Boton
                        pequeno
                        variante="secundaria"
                        onClick={() => setFichaId(c.id)}
                      >
                        Ver contrato
                      </Boton>
                    </CeldaAcciones>
                  </tr>
                ))}
              </tbody>
            </Tabla>
          )}
        </section>
      ) : (
        <section className={estilos.tarjeta} aria-labelledby="pre-listado">
          <h2 id="pre-listado" className="solo-lectores">
            Contratos de préstamo
          </h2>

          <div className={estilos.filtros}>
            <CampoTexto
              className={estilos.filtroTexto}
              etiqueta="Persona"
              placeholder="Filtrar por nombre…"
              value={textoPersona}
              onChange={(e) => setTextoPersona(e.target.value)}
            />

            <CampoSelect
              className={estilos.filtroSelect}
              etiqueta="Estado"
              marcador="Todos los estados"
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
            >
              {OPCIONES_ESTADO.map((o) => (
                <option key={o.valor} value={o.valor}>
                  {o.etiqueta}
                </option>
              ))}
            </CampoSelect>

            <label className={estilos.opcionesExtra}>
              <input
                type="checkbox"
                className={estilos.casilla}
                checked={incluirInactivos}
                onChange={(e) => setIncluirInactivos(e.target.checked)}
              />
              Incluir inactivos
            </label>

            {hayFiltros && (
              <Boton
                variante="terciaria"
                className={estilos.limpiarFiltros}
                onClick={limpiarFiltros}
              >
                Limpiar filtros
              </Boton>
            )}
          </div>

          {listado.isPending ? (
            <EsqueletoTabla filas={5} columnas={6} />
          ) : listado.isError ? (
            <EstadoVacio
              titulo="No se pudo cargar el listado"
              texto={mensajeDeError(listado.error)}
              accion={
                <Boton
                  variante="secundaria"
                  onClick={() => void listado.refetch()}
                >
                  Reintentar
                </Boton>
              }
            />
          ) : filas.length === 0 ? (
            <EstadoVacio
              titulo="Sin contratos"
              texto={
                hayFiltros
                  ? "Ningún contrato coincide con los filtros aplicados."
                  : "Todavía no se ha registrado ningún préstamo."
              }
            />
          ) : (
            <>
              <Tabla titulo="Contratos de préstamo">
                <thead>
                  <tr>
                    <th>Persona</th>
                    <th>Insumo</th>
                    <th>Inicio</th>
                    <th>Devolución pactada</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filas.map((c) => (
                    <tr key={c.id}>
                      <td className={estilos.persona}>
                        {c.persona_nombre_completo ?? "—"}
                      </td>
                      <td>{c.insumo_nombre ?? "—"}</td>
                      <CeldaCantidad>
                        {formatearFecha(c.fecha_inicio)}
                      </CeldaCantidad>
                      <CeldaCantidad>
                        {formatearFecha(c.fecha_devolucion_pactada)}
                      </CeldaCantidad>
                      <td className={estilos.celdaEstado}>
                        <Insignia tono={TONO_ESTADO[c.estado]}>
                          {c.estado}
                        </Insignia>
                        {c.multas_pendientes > 0 && (
                          <Insignia tono="informativa">
                            {c.multas_pendientes} multa(s) pendiente(s)
                          </Insignia>
                        )}
                      </td>
                      <CeldaAcciones>
                        <Boton
                          pequeno
                          variante="secundaria"
                          onClick={() => setFichaId(c.id)}
                        >
                          Ver contrato
                        </Boton>
                      </CeldaAcciones>
                    </tr>
                  ))}
                </tbody>
              </Tabla>

              <Paginacion
                total={listado.total}
                limite={listado.limite}
                desplazamiento={listado.desplazamiento}
                paginaActual={listado.paginaActual}
                totalPaginas={listado.totalPaginas}
                irAPagina={listado.irAPagina}
                anterior={listado.anterior}
                siguiente={listado.siguiente}
                cargando={listado.cambiandoPagina}
              />
            </>
          )}
        </section>
      )}

      {registrando && (
        <ModalRegistrarPrestamo
          abierto
          onCerrar={() => setRegistrando(false)}
        />
      )}

      {fichaId !== null && (
        <ModalFichaContrato
          key={fichaId}
          contratoId={fichaId}
          abierto
          onCerrar={() => {
            setFichaId(null);
            limpiarRuta();
          }}
        />
      )}
    </>
  );
}

export default PaginaPrestamos;
