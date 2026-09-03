import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Boton from "../../componentes/ui/Boton";
import { CampoTexto, CampoSelect } from "../../componentes/ui/Campo";
import Insignia from "../../componentes/ui/Insignia";
import Tabla, { CeldaAcciones } from "../../componentes/ui/Tabla";
import { EstadoVacio, EsqueletoTabla } from "../../componentes/ui/Estado";
import { useAvisos } from "../../componentes/ui/avisos/useAvisos";
import { claveCatalogo, useCatalogo } from "../../hooks/useCatalogo";
import { esConflicto, mensajeDeError } from "../../lib/errores";
import {
  crearElemento,
  desactivarElemento,
  reactivarElemento,
} from "../../api/catalogos";
import type { Comunidad, Departamento, Municipio } from "../../types/api";
import estilos from "./Catalogos.module.css";

/**
 * Comunidades.
 *
 * Va aparte del CRUD genérico porque su contrato no es el mismo: exige
 * municipio_id y su unicidad es por (nombre, municipio_id), así que dos
 * municipios pueden tener una comunidad con el mismo nombre sin chocar.
 */
function SeccionComunidades() {
  const clienteQuery = useQueryClient();
  const { avisar, confirmar } = useAvisos();

  const [departamentoId, setDepartamentoId] = useState("");
  const [municipioId, setMunicipioId] = useState("");
  const [nombre, setNombre] = useState("");
  const [filtroMunicipio, setFiltroMunicipio] = useState("");
  const [conflicto, setConflicto] = useState<string | null>(null);

  const departamentos = useCatalogo<Departamento>("departamentos");

  /**
   * Selects encadenados: los municipios se piden por departamento. Traerlos
   * todos daría una lista de cientos donde el usuario tendría que reconocer a
   * cuál pertenece cada nombre repetido.
   */
  const municipios = useCatalogo<Municipio>("municipios", {
    parametros: { departamentoId: departamentoId || undefined },
    habilitado: Boolean(departamentoId),
  });

  // Ocultas por defecto, como en el resto del sistema: lo desactivado es la
  // excepción y mezclarlo con lo vigente obliga a leer el estado en cada fila
  // para saber qué se puede usar.
  const [incluirInactivas, setIncluirInactivas] = useState(false);

  const comunidades = useCatalogo<Comunidad>("comunidades", {
    parametros: { municipioId: filtroMunicipio || undefined },
    incluirInactivos: incluirInactivas,
  });

  const refrescar = () =>
    clienteQuery.invalidateQueries({ queryKey: claveCatalogo("comunidades") });

  const alta = useMutation({
    mutationFn: () =>
      crearElemento("comunidades", {
        nombre: nombre.trim(),
        // El <select> entrega texto y el backend valida con z.number(): sin la
        // conversión responde 400 «expected number, received string».
        municipio_id: Number(municipioId),
      }),
    onSuccess: async () => {
      await refrescar();
      avisar("Comunidad agregada.", "exito");
      setNombre("");
      setConflicto(null);
    },
    onError: (error) => avisar(mensajeDeError(error), "error"),
  });

  const cambioEstado = useMutation({
    mutationFn: ({ id, activar }: { id: number; activar: boolean }) =>
      activar
        ? reactivarElemento("comunidades", id)
        : desactivarElemento("comunidades", id),
    onSuccess: async (_d, { activar }) => {
      await refrescar();
      setConflicto(null);
      avisar(
        activar ? "Comunidad reactivada." : "Comunidad desactivada.",
        "exito",
      );
    },
    onError: (error) => {
      if (esConflicto(error)) setConflicto(mensajeDeError(error));
      else avisar(mensajeDeError(error), "error");
    },
  });

  const nombreMunicipio = (id: number) =>
    municipios.opciones.find((m) => m.id === id)?.nombre ?? "—";

  return (
    <section className={estilos.tarjeta} aria-labelledby="cat-comunidades">
      <div className={estilos.tituloTarjeta}>
        <h2 id="cat-comunidades">Comunidades</h2>
        <label className={estilos.opciones}>
          <input
            type="checkbox"
            className={estilos.casilla}
            checked={incluirInactivas}
            onChange={(e) => setIncluirInactivas(e.target.checked)}
          />
          Mostrar inactivas
        </label>
      </div>
      <p className={estilos.nota}>
        Cada comunidad pertenece a un municipio. Dos municipios pueden tener
        comunidades con el mismo nombre: la unicidad es por nombre y municipio.
      </p>

      {comunidades.isPending ? (
        <EsqueletoTabla filas={4} columnas={3} />
      ) : comunidades.isError ? (
        <EstadoVacio
          titulo="No se pudieron cargar las comunidades"
          texto={mensajeDeError(comunidades.error)}
        />
      ) : comunidades.opciones.length === 0 ? (
        <EstadoVacio
          titulo="Sin comunidades"
          texto="Agregue la primera con el formulario de abajo."
        />
      ) : (
        <Tabla titulo="Comunidades">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Municipio</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {comunidades.opciones.map((comunidad) => (
              <tr key={comunidad.id}>
                <td>{comunidad.nombre}</td>
                <td>{nombreMunicipio(comunidad.municipio_id)}</td>
                <td>
                  {comunidad.activo ? (
                    <Insignia tono="aprobada">Activa</Insignia>
                  ) : (
                    <Insignia tono="neutra">Inactiva</Insignia>
                  )}
                </td>
                <CeldaAcciones>
                  {comunidad.activo ? (
                    <Boton
                      pequeno
                      variante="terciaria"
                      onClick={async () => {
                        const ok = await confirmar({
                          titulo: "Desactivar comunidad",
                          mensaje:
                            "«" +
                            comunidad.nombre +
                            "» dejará de ofrecerse al registrar beneficiarios. Los que ya la tienen la conservan.",
                          textoConfirmar: "Desactivar",
                          destructiva: true,
                        });
                        if (ok)
                          cambioEstado.mutate({
                            id: comunidad.id,
                            activar: false,
                          });
                      }}
                    >
                      Desactivar
                    </Boton>
                  ) : (
                    <Boton
                      pequeno
                      variante="secundaria"
                      onClick={() =>
                        cambioEstado.mutate({ id: comunidad.id, activar: true })
                      }
                    >
                      Reactivar
                    </Boton>
                  )}
                </CeldaAcciones>
              </tr>
            ))}
          </tbody>
        </Tabla>
      )}

      {conflicto && (
        <div className={estilos.conflicto} role="alert">
          <p className={estilos.conflictoTitulo}>No se pudo desactivar</p>
          <p className={estilos.conflictoTexto}>{conflicto}</p>
          <p className={estilos.conflictoTexto}>
            Resuelva primero esos registros y vuelva a intentarlo. La comunidad
            sigue activa.
          </p>
        </div>
      )}

      <div className={estilos.formulario}>
        <CampoSelect
          etiqueta="Departamento"
          obligatorio
          value={departamentoId}
          onChange={(e) => {
            setDepartamentoId(e.target.value);
            // Al cambiar de departamento el municipio elegido deja de ser
            // válido: conservarlo crearía la comunidad en el municipio
            // equivocado sin que nadie lo note.
            setMunicipioId("");
          }}
        >
          {departamentos.opciones.map((d) => (
            <option key={d.id} value={d.id}>
              {d.nombre}
            </option>
          ))}
        </CampoSelect>

        <CampoSelect
          etiqueta="Municipio"
          obligatorio
          value={municipioId}
          onChange={(e) => {
            setMunicipioId(e.target.value);
            setFiltroMunicipio(e.target.value);
          }}
          marcador={
            departamentoId ? "Seleccione…" : "Elija primero un departamento"
          }
          disabled={!departamentoId || municipios.isPending}
        >
          {municipios.opciones.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nombre}
            </option>
          ))}
        </CampoSelect>

        <CampoTexto
          etiqueta="Nombre de la comunidad"
          obligatorio
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />

        <Boton
          variante="secundaria"
          disabled={!nombre.trim() || !municipioId}
          cargando={alta.isPending}
          onClick={() => alta.mutate()}
        >
          Agregar
        </Boton>
      </div>
    </section>
  );
}

export default SeccionComunidades;
