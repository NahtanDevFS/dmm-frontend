import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Boton, { GrupoBotones } from "../../componentes/ui/Boton";
import {
  CampoTexto,
  CampoSelect,
  CampoAreaTexto,
} from "../../componentes/ui/Campo";
import Insignia from "../../componentes/ui/Insignia";
import Modal from "../../componentes/ui/Modal";
import { useCierreSeguro } from "../../componentes/ui/useCierreSeguro";
import { useAvisos } from "../../componentes/ui/avisos/useAvisos";
import { fechaDeHoy } from "../../lib/fechas";
import { mensajeDeError } from "../../lib/errores";
import {
  CLAVE_INSUMOS,
  listarStockInsumos,
  listarUnidadesDisponibles,
  type StockInsumoListado,
} from "../../api/inventario";
import {
  CLAVE_CONTRATOS,
  crearPrestamoDirecto,
  obtenerContrato,
} from "../../api/prestamos";
import { CLAVE_ENTREGAS } from "../../api/entregas";
import type { Persona } from "../../types/api";
import BuscadorPersona from "../solicitudes/BuscadorPersona";
import SeccionEvidenciasContrato from "./SeccionEvidenciasContrato";
import estilos from "./Prestamos.module.css";

/**
 * Registrar un préstamo completo: la entrega del equipo y su contrato.
 *
 * El préstamo no pasa por solicitud. Una solicitud existe para decidir si
 * corresponde donar, con su estudio socioeconómico y su aprobación; un
 * préstamo es un acuerdo hablado que se formaliza firmando un papel. Hacerle
 * recorrer solicitud, aprobación, despacho y recién después contrato era
 * cuatro vueltas para un trámite de un paso.
 *
 * Dos pasos en la misma ventana, como la entrega directa de medicina: primero
 * quién se lleva qué y hasta cuándo, después las fotos del contrato firmado y
 * del DPI. El modal no se cierra en el medio porque los papeles están sobre
 * la mesa en ese momento, no una pantalla después.
 *
 * Solo se ofrecen categorías que admiten préstamo: prestar tiene sentido con
 * lo que se devuelve.
 */
function ModalRegistrarPrestamo({
  abierto,
  onCerrar,
}: {
  abierto: boolean;
  onCerrar: () => void;
}) {
  const clienteQuery = useQueryClient();
  const { avisar } = useAvisos();

  const [contratoCreado, setContratoCreado] = useState<number | null>(null);

  const [persona, setPersona] = useState<Persona | null>(null);
  const [insumoId, setInsumoId] = useState("");
  const [unidadId, setUnidadId] = useState("");
  const [fechaDevolucion, setFechaDevolucion] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [borradorEvidencia, setBorradorEvidencia] = useState(false);

  const stock = useQuery({
    queryKey: [CLAVE_INSUMOS, "stock"],
    queryFn: () => listarStockInsumos(),
  });

  /**
   * Solo el equipo prestable, agrupado por categoría y con las existencias a
   * la vista: quien atiende necesita saber si hay antes de comprometerse.
   */
  const porCategoria = useMemo(() => {
    const grupos = new Map<string, StockInsumoListado[]>();
    for (const fila of stock.data ?? []) {
      if (!fila.permite_prestamo) continue;
      const lista = grupos.get(fila.categoria_nombre);
      if (lista) lista.push(fila);
      else grupos.set(fila.categoria_nombre, [fila]);
    }
    return [...grupos.entries()].sort((a, b) => a[0].localeCompare(b[0], "es"));
  }, [stock.data]);

  const insumoElegido = stock.data?.find(
    (i) => i.insumo_id === Number(insumoId),
  );

  /**
   * Las unidades concretas del equipo elegido, cada una con su número de
   * serie. Solo tiene sentido en equipo serializado: en lo demás la unidad da
   * igual y el reparto FEFO es lo correcto.
   */
  const unidades = useQuery({
    queryKey: [CLAVE_INSUMOS, insumoId, "unidades"],
    queryFn: () => listarUnidadesDisponibles(Number(insumoId)),
    enabled: insumoId !== "" && insumoElegido?.serie_por_unidad === true,
  });

  const contrato = useQuery({
    queryKey: [CLAVE_CONTRATOS, contratoCreado],
    queryFn: () => obtenerContrato(contratoCreado!),
    enabled: contratoCreado !== null,
  });

  const hayCambios =
    persona !== null ||
    insumoId !== "" ||
    fechaDevolucion !== "" ||
    observaciones.trim() !== "";

  const cerrar = useCierreSeguro({
    hayCambios: contratoCreado !== null ? borradorEvidencia : hayCambios,
    onCerrar,
    mensaje:
      contratoCreado !== null
        ? "Hay un archivo a medio adjuntar. Si cierra ahora se pierde; el préstamo ya quedó registrado."
        : "Hay un préstamo a medio registrar. Si cierra ahora, se pierde lo escrito y no queda nada guardado.",
  });

  const mutacion = useMutation({
    mutationFn: () =>
      crearPrestamoDirecto({
        persona_id: persona!.id,
        insumo_id: Number(insumoId),
        fecha_devolucion_pactada: fechaDevolucion,
        observaciones: observaciones.trim() || null,
        detalle_inventario_lote_id: unidadId ? Number(unidadId) : null,
      }),
    onSuccess: async (creado) => {
      await clienteQuery.invalidateQueries({ queryKey: [CLAVE_CONTRATOS] });
      // La entrega también cambió: el equipo salió y el stock bajó.
      await clienteQuery.invalidateQueries({ queryKey: [CLAVE_ENTREGAS] });
      await clienteQuery.invalidateQueries({ queryKey: [CLAVE_INSUMOS] });
      setContratoCreado(creado.id);
    },
    // Incluye el rechazo por falta de existencias, que la base redacta con
    // las cantidades exactas.
    onError: (error) => avisar(mensajeDeError(error), "error"),
  });

  const fechaValida = fechaDevolucion !== "" && fechaDevolucion > fechaDeHoy();

  // Si el equipo lleva serie, hay que decir cuál: sin eso el contrato no
  // identifica la pieza y la devolución no se puede verificar.
  const unidadResuelta = !insumoElegido?.serie_por_unidad || unidadId !== "";

  const listoParaEnviar =
    persona !== null && insumoId !== "" && fechaValida && unidadResuelta;

  // ── Paso 2: el préstamo existe, faltan los papeles ─────────────────────
  if (contratoCreado !== null) {
    return (
      <Modal
        abierto={abierto}
        onCerrar={cerrar}
        titulo="Adjunte el contrato y el DPI"
        descripcion="El préstamo ya quedó registrado. Esto es el respaldo."
        tamano="amplio"
        pie={
          <GrupoBotones>
            <Boton variante="primaria" onClick={cerrar}>
              Terminar
            </Boton>
          </GrupoBotones>
        }
      >
        <Insignia tono="aprobada">
          Préstamo registrado y equipo descontado del inventario. No vuelva a
          registrarlo aunque cierre esta ventana.
        </Insignia>

        <p className={estilos.nota}>
          {persona!.nombres} {persona!.apellidos} ·{" "}
          {insumoElegido?.insumo_nombre}
          {unidadId &&
            " · serie " +
              (unidades.data?.find(
                (u) => u.detalle_inventario_lote_id === Number(unidadId),
              )?.numero_serie ?? "")}{" "}
          · devuelve el {fechaDevolucion.split("-").reverse().join("/")}
        </p>

        {contrato.data && (
          <SeccionEvidenciasContrato
            contratoId={contratoCreado}
            evidencias={contrato.data.evidencias}
            onBorrador={setBorradorEvidencia}
          />
        )}
      </Modal>
    );
  }

  // ── Paso 1: registrar ──────────────────────────────────────────────────
  return (
    <Modal
      abierto={abierto}
      onCerrar={cerrar}
      titulo="Registrar préstamo de equipo"
      descripcion="Entrega el equipo y crea su contrato en un solo paso."
      bloqueado={mutacion.isPending}
      pie={
        <GrupoBotones>
          <Boton
            variante="terciaria"
            onClick={cerrar}
            disabled={mutacion.isPending}
          >
            Cancelar
          </Boton>
          <Boton
            variante="primaria"
            disabled={!listoParaEnviar}
            cargando={mutacion.isPending}
            textoCargando="Registrando…"
            onClick={() => mutacion.mutate()}
          >
            Registrar préstamo
          </Boton>
        </GrupoBotones>
      }
    >
      <BuscadorPersona
        etiqueta="Persona que firma el contrato"
        personaElegida={persona}
        onElegir={setPersona}
        obligatorio
        flotante={false}
      />

      <p className={estilos.nota}>
        Quien firma es la responsable del equipo, aunque después lo use otra
        persona de la casa.
      </p>

      <CampoSelect
        etiqueta="Equipo"
        obligatorio
        value={insumoId}
        onChange={(e) => {
          setInsumoId(e.target.value);
          // Las unidades son del equipo anterior: si no se limpia, quedaría
          // elegida una silla que no corresponde a lo que se ve en pantalla.
          setUnidadId("");
        }}
        disabled={stock.isPending}
        ayuda={
          stock.isError
            ? "No se pudo cargar el inventario. Cierre y vuelva a intentarlo."
            : "Solo aparece el equipo que se puede prestar, con sus existencias."
        }
      >
        {porCategoria.map(([categoria, lista]) => (
          <optgroup key={categoria} label={categoria}>
            {lista.map((insumo) => (
              <option
                key={insumo.insumo_id}
                value={insumo.insumo_id}
                disabled={insumo.stock_total === 0}
              >
                {insumo.insumo_nombre}
                {" — "}
                {insumo.stock_total === 0
                  ? "sin existencias"
                  : insumo.stock_total.toLocaleString("es-GT") + " disponibles"}
              </option>
            ))}
          </optgroup>
        ))}
      </CampoSelect>

      {/*
        Qué silla concreta se lleva. El sistema podría elegir una por FEFO,
        pero entonces el contrato diría una serie y la persona saldría con
        otra: al devolver no habría forma de saber si es la misma.
      */}
      {insumoElegido?.serie_por_unidad && (
        <CampoSelect
          etiqueta="Unidad que se entrega"
          obligatorio
          value={unidadId}
          onChange={(e) => setUnidadId(e.target.value)}
          disabled={unidades.isLoading}
          ayuda="Elija la que tiene en la mano: su número de serie queda en el contrato."
        >
          {unidades.data?.map((unidad) => (
            <option
              key={unidad.detalle_inventario_lote_id}
              value={unidad.detalle_inventario_lote_id}
            >
              {unidad.numero_serie ?? "Sin serie"}
              {unidad.marca_nombre ? " · " + unidad.marca_nombre : ""}
              {" · recibida de " + unidad.institucion_nombre}
            </option>
          ))}
        </CampoSelect>
      )}

      {/* Una unidad por contrato: el contrato ampara un equipo concreto, con
          su fecha y sus multas. Dos sillas son dos préstamos. */}
      <CampoTexto
        etiqueta="Fecha de devolución pactada"
        obligatorio
        type="date"
        min={fechaDeHoy()}
        value={fechaDevolucion}
        onChange={(e) => setFechaDevolucion(e.target.value)}
        error={
          fechaDevolucion !== "" && !fechaValida
            ? "Debe ser posterior a hoy."
            : undefined
        }
        ayuda="Pasada esta fecha, el sistema aplica la multa por atraso al marcar los vencidos."
      />

      <CampoAreaTexto
        etiqueta="Observaciones"
        rows={2}
        maxLength={2000}
        value={observaciones}
        onChange={(e) => setObservaciones(e.target.value)}
        ayuda="Estado del equipo al entregarlo, condiciones acordadas, lo que convenga dejar por escrito."
      />
    </Modal>
  );
}

export default ModalRegistrarPrestamo;
