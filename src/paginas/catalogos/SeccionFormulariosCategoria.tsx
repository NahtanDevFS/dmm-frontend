import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Boton from "../../componentes/ui/Boton";
import { CampoSelect, CampoTexto } from "../../componentes/ui/Campo";
import Insignia from "../../componentes/ui/Insignia";
import Tabla, { CeldaAcciones } from "../../componentes/ui/Tabla";
import { EstadoVacio, EsqueletoTabla } from "../../componentes/ui/Estado";
import { useAvisos } from "../../componentes/ui/avisos/useAvisos";
import { useCatalogo } from "../../hooks/useCatalogo";
import { mensajeDeError } from "../../lib/errores";
import {
  CLAVE_FORMULARIOS,
  listarAsignacionesFormulario,
  listarFormularios,
  asignarFormularioACategoria,
  quitarFormularioDeCategoria,
} from "../../api/formularios";
import type { ElementoCatalogo } from "../../types/api";
import estilos from "./Catalogos.module.css";

/** Valor del <select> de modalidad cuando el formulario aplica a todas. */
const TODAS = "";

/**
 * Qué formularios exige cada categoría de insumo, y bajo qué modalidad.
 *
 * Hasta ahora esto solo se podía configurar insertando filas por SQL a mano,
 * siguiendo la migración 17 como plantilla. Eso significaba que agregar un
 * formulario nuevo dependía de alguien con acceso a la base, y que nadie
 * podía ver desde el sistema qué exigía cada categoría.
 *
 * La modalidad es lo que permite que una silla de ruedas pida el estudio
 * socioeconómico cuando se dona y no cuando se presta. «Todas» —el valor por
 * omisión— deja el formulario exigido en cualquier caso, que es como se
 * comportaban las asignaciones anteriores.
 *
 * No se administran aquí los CAMPOS de cada formulario: eso vive en el
 * módulo de Formularios. Aquí solo se decide qué formulario aplica a qué.
 */
function SeccionFormulariosCategoria() {
  const clienteQuery = useQueryClient();
  const { avisar, confirmar } = useAvisos();

  const [categoriaId, setCategoriaId] = useState("");
  const [formularioId, setFormularioId] = useState("");
  const [modalidadId, setModalidadId] = useState(TODAS);
  const [orden, setOrden] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");

  const categorias = useCatalogo<ElementoCatalogo>("categorias-insumo");
  const modalidades = useCatalogo<ElementoCatalogo>("modalidades-solicitud");

  const formularios = useQuery({
    queryKey: [CLAVE_FORMULARIOS, "lista"],
    queryFn: listarFormularios,
  });

  const asignaciones = useQuery({
    queryKey: [CLAVE_FORMULARIOS, "asignaciones", filtroCategoria],
    queryFn: () =>
      listarAsignacionesFormulario(
        filtroCategoria ? Number(filtroCategoria) : undefined,
      ),
  });

  const refrescar = () =>
    clienteQuery.invalidateQueries({ queryKey: [CLAVE_FORMULARIOS] });

  const alta = useMutation({
    mutationFn: () =>
      asignarFormularioACategoria({
        categoria_insumo_id: Number(categoriaId),
        formulario_id: Number(formularioId),
        orden: orden === "" ? undefined : Number(orden),
        modalidad_solicitud_id:
          modalidadId === TODAS ? null : Number(modalidadId),
      }),
    onSuccess: async () => {
      await refrescar();
      avisar("Formulario asignado a la categoría.", "exito");
      setFormularioId("");
      setModalidadId(TODAS);
      setOrden("");
    },
    onError: (error) => avisar(mensajeDeError(error), "error"),
  });

  const baja = useMutation({
    mutationFn: ({
      categoria,
      formulario,
    }: {
      categoria: number;
      formulario: number;
    }) => quitarFormularioDeCategoria(categoria, formulario),
    onSuccess: async () => {
      await refrescar();
      avisar("Formulario retirado de la categoría.", "exito");
    },
    onError: (error) => avisar(mensajeDeError(error), "error"),
  });

  const listoParaAsignar = categoriaId !== "" && formularioId !== "";

  return (
    <>
      <section className={estilos.tarjeta}>
        <div className={estilos.tituloTarjeta}>
          <h2>Formularios exigidos por categoría</h2>
        </div>
        <p className={estilos.nota}>
          Cada insumo hereda los formularios de su categoría. Al crear una
          solicitud, el sistema avisa cuáles habrá que llenar antes de poder
          aprobarla.
        </p>

        <CampoSelect
          etiqueta="Ver solo una categoría"
          value={filtroCategoria}
          onChange={(e) => setFiltroCategoria(e.target.value)}
        >
          {categorias.opciones.map((categoria) => (
            <option key={categoria.id} value={categoria.id}>
              {categoria.nombre}
            </option>
          ))}
        </CampoSelect>

        {asignaciones.isPending ? (
          <EsqueletoTabla />
        ) : asignaciones.data && asignaciones.data.length > 0 ? (
          <Tabla titulo="Formularios asignados a categorías de insumo">
            <thead>
              <tr>
                <th>Categoría</th>
                <th>Formulario</th>
                <th>Aplica a</th>
                <th>Orden</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {asignaciones.data.map((asignacion) => (
                <tr key={asignacion.id}>
                  <td>{asignacion.categoria_nombre}</td>
                  <td>{asignacion.formulario_nombre}</td>
                  <td>
                    {asignacion.modalidad_nombre === null ? (
                      <Insignia tono="neutra">Todas</Insignia>
                    ) : (
                      <Insignia tono="informativa">
                        Solo {asignacion.modalidad_nombre.toLowerCase()}
                      </Insignia>
                    )}
                  </td>
                  <td>{asignacion.orden}</td>
                  <CeldaAcciones>
                    <Boton
                      pequeno
                      variante="terciaria"
                      onClick={async () => {
                        const ok = await confirmar({
                          titulo: "Quitar formulario",
                          mensaje:
                            "«" +
                            asignacion.formulario_nombre +
                            "» dejará de exigirse en las solicitudes nuevas de esta categoría. Las que ya lo tienen conservan lo llenado.",
                          textoConfirmar: "Quitar",
                          destructiva: true,
                        });
                        if (ok) {
                          baja.mutate({
                            categoria: asignacion.categoria_insumo_id,
                            formulario: asignacion.formulario_id,
                          });
                        }
                      }}
                    >
                      Quitar
                    </Boton>
                  </CeldaAcciones>
                </tr>
              ))}
            </tbody>
          </Tabla>
        ) : (
          <EstadoVacio
            titulo="Sin formularios asignados"
            texto="Ninguna categoría exige formularios todavía. Asigne el primero abajo."
          />
        )}
      </section>

      <section className={estilos.tarjeta}>
        <div className={estilos.tituloTarjeta}>
          <h2>Asignar un formulario</h2>
        </div>

        <div className={estilos.formulario}>
          <CampoSelect
            etiqueta="Categoría de insumo"
            obligatorio
            value={categoriaId}
            onChange={(e) => setCategoriaId(e.target.value)}
          >
            {categorias.opciones.map((categoria) => (
              <option key={categoria.id} value={categoria.id}>
                {categoria.nombre}
              </option>
            ))}
          </CampoSelect>

          <CampoSelect
            etiqueta="Formulario"
            obligatorio
            value={formularioId}
            onChange={(e) => setFormularioId(e.target.value)}
            ayuda={
              formularios.data && formularios.data.length === 0
                ? "No hay formularios creados todavía."
                : undefined
            }
          >
            {formularios.data?.map((formulario) => (
              <option key={formulario.id} value={formulario.id}>
                {formulario.nombre}
              </option>
            ))}
          </CampoSelect>

          <CampoSelect
            etiqueta="Aplica a"
            value={modalidadId}
            onChange={(e) => setModalidadId(e.target.value)}
            ayuda="«Todas» lo exige siempre. Elija una modalidad para que solo se pida en ese caso."
          >
            <option value={TODAS}>Todas las modalidades</option>
            {modalidades.opciones.map((modalidad) => (
              <option key={modalidad.id} value={modalidad.id}>
                Solo {modalidad.nombre.toLowerCase()}
              </option>
            ))}
          </CampoSelect>

          <CampoTexto
            etiqueta="Orden"
            type="number"
            min="0"
            value={orden}
            onChange={(e) => setOrden(e.target.value)}
            ayuda="En qué posición aparece al llenarlos. Menor primero."
          />
        </div>

        <Boton
          variante="secundaria"
          disabled={!listoParaAsignar}
          cargando={alta.isPending}
          textoCargando="Asignando…"
          onClick={() => alta.mutate()}
        >
          Asignar formulario
        </Boton>

        <p className={estilos.nota}>
          Si esa categoría ya tiene ese formulario, se actualiza la modalidad y
          el orden en vez de duplicarse.
        </p>
      </section>
    </>
  );
}

export default SeccionFormulariosCategoria;
