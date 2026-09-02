import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Boton from "../../componentes/ui/Boton";
import { CampoSelect, CampoTexto } from "../../componentes/ui/Campo";
import Insignia from "../../componentes/ui/Insignia";
import Paginacion from "../../componentes/ui/Paginacion";
import Tabla, {
  CeldaAcciones,
  CeldaCantidad,
} from "../../componentes/ui/Tabla";
import { EstadoVacio, EsqueletoTabla } from "../../componentes/ui/Estado";
import { useListadoPaginado } from "../../hooks/useListadoPaginado";
import { mensajeDeError } from "../../lib/errores";
import { fechaDeHoy } from "../../lib/fechas";
import {
  CLAVE_AUDITORIA,
  listarTablasAuditadas,
  type AccionAuditoria,
  type RegistroAuditoria,
} from "../../api/auditoria";
import ModalDetalleAuditoria from "./ModalDetalleAuditoria";
import ModalHistorialRegistro from "./ModalHistorialRegistro";
import estilos from "./Auditoria.module.css";

const OPCIONES_ACCION: { valor: AccionAuditoria; etiqueta: string }[] = [
  { valor: "INSERT", etiqueta: "Creación" },
  { valor: "UPDATE", etiqueta: "Modificación" },
  { valor: "DELETE", etiqueta: "Eliminación" },
];

const TONO_ACCION: Record<string, "aprobada" | "pendiente" | "rechazada"> = {
  INSERT: "aprobada",
  UPDATE: "pendiente",
  DELETE: "rechazada",
};

function formatearFechaHora(valor: string): string {
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return "—";
  return fecha.toLocaleString("es-GT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Bitácora de solo lectura: cada INSERT/UPDATE/DELETE del sistema, con quién
 * y cuándo. Exclusivo de ADMINISTRADOR — no hay nada que crear, editar ni
 * borrar aquí, así que no hay ningún modal de alta.
 */
function PaginaAuditoria() {
  const [tabla, setTabla] = useState("");
  const [registroId, setRegistroId] = useState("");
  const [accion, setAccion] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [verDetalle, setVerDetalle] = useState<RegistroAuditoria | null>(null);
  const [verHistorial, setVerHistorial] = useState<{
    tabla: string;
    registroId: number;
  } | null>(null);

  const tablas = useQuery({
    queryKey: [CLAVE_AUDITORIA, "tablas"],
    queryFn: listarTablasAuditadas,
  });

  const filtros = useMemo(
    () => ({
      tabla: tabla || undefined,
      registroId: registroId || undefined,
      accion: accion || undefined,
      desde: desde || undefined,
      hasta: hasta || undefined,
    }),
    [tabla, registroId, accion, desde, hasta],
  );

  const listado = useListadoPaginado<RegistroAuditoria>({
    clave: CLAVE_AUDITORIA,
    ruta: "auditoria",
    filtros,
  });

  const hayFiltros =
    tabla !== "" ||
    registroId !== "" ||
    accion !== "" ||
    desde !== "" ||
    hasta !== "";

  const limpiarFiltros = () => {
    setTabla("");
    setRegistroId("");
    setAccion("");
    setDesde("");
    setHasta("");
  };

  return (
    <>
      <header className={estilos.encabezado}>
        <div>
          <h1>Auditoría</h1>
          <p className={estilos.nota}>
            Bitácora de todos los cambios del sistema. Nada aquí se puede editar
            ni borrar: es un registro histórico.
          </p>
        </div>
      </header>

      <section className={estilos.tarjeta} aria-labelledby="aud-listado">
        <h2 id="aud-listado" className="solo-lectores">
          Registro de auditoría
        </h2>

        <div className={estilos.filtros}>
          <CampoSelect
            className={estilos.filtroSelect}
            etiqueta="Tabla"
            marcador="Todas"
            value={tabla}
            onChange={(e) => {
              setTabla(e.target.value);
              setRegistroId("");
            }}
          >
            {tablas.data?.map((t) => (
              <option key={t.tabla} value={t.tabla}>
                {t.tabla} ({t.registros.toLocaleString("es-GT")})
              </option>
            ))}
          </CampoSelect>

          <CampoTexto
            className={estilos.filtroTexto}
            etiqueta="Id de registro"
            type="number"
            min="1"
            value={registroId}
            onChange={(e) => setRegistroId(e.target.value)}
            ayuda={tabla === "" ? "Elija primero una tabla." : undefined}
            disabled={tabla === ""}
          />

          <CampoSelect
            className={estilos.filtroSelect}
            etiqueta="Acción"
            marcador="Cualquiera"
            value={accion}
            onChange={(e) => setAccion(e.target.value)}
          >
            {OPCIONES_ACCION.map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.etiqueta}
              </option>
            ))}
          </CampoSelect>

          <CampoTexto
            etiqueta="Desde"
            type="date"
            max={hasta || fechaDeHoy()}
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
          />
          <CampoTexto
            etiqueta="Hasta"
            type="date"
            min={desde || undefined}
            max={fechaDeHoy()}
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
          />

          {hayFiltros && (
            <Boton
              variante="terciaria"
              className={estilos.limpiarFiltros}
              onClick={limpiarFiltros}
            >
              Limpiar filtros
            </Boton>
          )}

          {tabla !== "" && registroId !== "" && (
            <Boton
              variante="secundaria"
              className={estilos.limpiarFiltros}
              onClick={() =>
                setVerHistorial({ tabla, registroId: Number(registroId) })
              }
            >
              Ver historial de este registro
            </Boton>
          )}
        </div>

        {listado.isPending ? (
          <EsqueletoTabla filas={8} columnas={5} />
        ) : listado.isError ? (
          <EstadoVacio
            titulo="No se pudo cargar la bitácora"
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
        ) : listado.datos.length === 0 ? (
          <EstadoVacio
            titulo="Sin resultados"
            texto={
              hayFiltros
                ? "Ningún cambio coincide con los filtros aplicados."
                : "Todavía no hay cambios registrados."
            }
          />
        ) : (
          <>
            <Tabla titulo="Registro de auditoría">
              <thead>
                <tr>
                  <th>Fecha y hora</th>
                  <th>Tabla</th>
                  <th>Id</th>
                  <th>Acción</th>
                  <th>Realizado por</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {listado.datos.map((registro) => (
                  <tr key={registro.id}>
                    <CeldaCantidad>
                      {formatearFechaHora(registro.fecha_hora)}
                    </CeldaCantidad>
                    <td className={estilos.tabla}>{registro.tabla_afectada}</td>
                    <CeldaCantidad>{registro.registro_id}</CeldaCantidad>
                    <td>
                      <Insignia tono={TONO_ACCION[registro.accion]}>
                        {registro.accion}
                      </Insignia>
                    </td>
                    <td className={estilos.usuario}>
                      {registro.usuario_username ?? "Sistema"}
                    </td>
                    <CeldaAcciones>
                      <Boton
                        pequeno
                        variante="secundaria"
                        onClick={() => setVerDetalle(registro)}
                      >
                        Ver cambios
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

      {verDetalle && (
        <ModalDetalleAuditoria
          registro={verDetalle}
          abierto
          onCerrar={() => setVerDetalle(null)}
        />
      )}

      {verHistorial && (
        <ModalHistorialRegistro
          tabla={verHistorial.tabla}
          registroId={verHistorial.registroId}
          abierto
          onCerrar={() => setVerHistorial(null)}
        />
      )}
    </>
  );
}

export default PaginaAuditoria;
