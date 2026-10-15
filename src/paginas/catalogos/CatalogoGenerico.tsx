import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Boton from "../../componentes/ui/Boton";
import { CampoTexto } from "../../componentes/ui/Campo";
import Insignia from "../../componentes/ui/Insignia";
import Modal from "../../componentes/ui/Modal";
import Nota from "../../componentes/ui/Nota";
import { GrupoBotones } from "../../componentes/ui/Boton";
import Tabla, { CeldaAcciones } from "../../componentes/ui/Tabla";
import { EstadoVacio, EsqueletoTabla } from "../../componentes/ui/Estado";
import { useAvisos } from "../../componentes/ui/avisos/useAvisos";
import { claveCatalogo, useCatalogo } from "../../hooks/useCatalogo";
import { esConflicto, mensajeDeError } from "../../lib/errores";
import {
  crearElemento,
  editarElemento,
  desactivarElemento,
  reactivarElemento,
  type CuerpoCatalogo,
} from "../../api/catalogos";
import type { DefinicionCatalogo } from "./definiciones";
import estilos from "./Catalogos.module.css";

/* Todo se enlaza por id: el nombre nuevo aparece en todo lo ya registrado.
   Es lo que se quiere para corregir un error de escritura, no para convertir
   un registro en otro distinto. */
function avisoRetroactivo({ singular, articulo }: DefinicionCatalogo): string {
  const o = articulo === "el" ? "o" : "a";
  return (
    "El nombre nuevo se verá también en todo lo ya registrado (solicitudes, " +
    "entregas, reportes y expedientes). Úselo para corregir; si es otr" + o +
    " " + singular + " distint" + o + ", agréguel" + o + " como nuev" + o +
    " y desactive este registro."
  );
}

interface Elemento {
  id: number;
  nombre: string;
  activo: boolean;
  [clave: string]: unknown;
}

/* Pantalla de un catálogo administrable.
   
   Sirve a los seis porque comparten contrato; lo único que cambia son los
   campos propios que trae la definición. */
function CatalogoGenerico({ definicion }: { definicion: DefinicionCatalogo }) {
  const clienteQuery = useQueryClient();
  const { avisar, confirmar } = useAvisos();
  // Ocultos por defecto, como en el resto del sistema: lo desactivado es la
  // excepción y mezclarlo con lo vigente obliga a leer estado en cada fila.
  const [incluirInactivos, setIncluirInactivos] = useState(false);
  const [nuevo, setNuevo] = useState<Record<string, string>>({});
  // Detalle del último 409, para explicarlo en su propia región.
  const [conflicto, setConflicto] = useState<string | null>(null);
  // Registro que se está editando y los valores del formulario del modal.
  const [enEdicion, setEnEdicion] = useState<Elemento | null>(null);
  const [edicion, setEdicion] = useState<Record<string, string>>({});

  const consulta = useCatalogo<Elemento>(definicion.ruta, { incluirInactivos });

  const refrescar = () =>
    clienteQuery.invalidateQueries({
      queryKey: claveCatalogo(definicion.ruta),
    });

  const valor = (clave: string) => nuevo[clave] ?? "";
  const cambiar = (clave: string, v: string) =>
    setNuevo((previos) => ({ ...previos, [clave]: v }));

  const alta = useMutation({
    mutationFn: () => {
      const cuerpo: CuerpoCatalogo = { nombre: valor("nombre").trim() };
      for (const campo of definicion.extra ?? []) {
        cuerpo[campo.clave] = valor(campo.clave).trim() || null;
      }
      return crearElemento(definicion.ruta, cuerpo);
    },
    onSuccess: async () => {
      await refrescar();
      avisar("Registro agregado.", "exito");
      setNuevo({});
      setConflicto(null);
    },
    onError: (error) => avisar(mensajeDeError(error), "error"),
  });

  const abrirEdicion = (fila: Elemento) => {
    const valores: Record<string, string> = { nombre: fila.nombre };
    for (const campo of definicion.extra ?? []) {
      valores[campo.clave] = (fila[campo.clave] as string | null) ?? "";
    }
    setEdicion(valores);
    setEnEdicion(fila);
  };

  const valorEdicion = (clave: string) => edicion[clave] ?? "";

  const guardarEdicion = useMutation({
    mutationFn: () => {
      const cuerpo: CuerpoCatalogo = { nombre: valorEdicion("nombre").trim() };
      for (const campo of definicion.extra ?? []) {
        cuerpo[campo.clave] = valorEdicion(campo.clave).trim() || null;
      }
      return editarElemento(definicion.ruta, enEdicion!.id, cuerpo);
    },
    onSuccess: async () => {
      await refrescar();
      avisar("Cambios guardados.", "exito");
      setEnEdicion(null);
    },
    // Un nombre repetido (409) o un teléfono inválido (400) se explican con el
    // mensaje del servidor; el modal queda abierto para corregirlo.
    onError: (error) => avisar(mensajeDeError(error), "error"),
  });

  const cambioEstado = useMutation({
    mutationFn: ({ id, activar }: { id: number; activar: boolean }) =>
      activar
        ? reactivarElemento(definicion.ruta, id)
        : desactivarElemento(definicion.ruta, id),
    onSuccess: async (_d, { activar }) => {
      await refrescar();
      setConflicto(null);
      avisar(
        activar ? "Registro reactivado." : "Registro desactivado.",
        "exito",
      );
    },
    onError: (error) => {
      /* Un 409 aquí no es un fallo del sistema: el catálogo está en uso y el
         servidor dice exactamente qué registros dependen de él. Ese detalle se
         muestra entero y aparte, porque es lo único que le indica al usuario
         qué tiene que resolver antes de volver a intentarlo. */
      if (esConflicto(error)) setConflicto(mensajeDeError(error));
      else avisar(mensajeDeError(error), "error");
    },
  });

  return (
    <section className={estilos.tarjeta} aria-labelledby="cat-titulo">
      <div className={estilos.tituloTarjeta}>
        <h2 id="cat-titulo">{definicion.titulo}</h2>
        <label className={estilos.opciones}>
          <input
            type="checkbox"
            className={estilos.casilla}
            checked={incluirInactivos}
            onChange={(e) => setIncluirInactivos(e.target.checked)}
          />
          Mostrar inactivos
        </label>
      </div>

      {definicion.nota && <p className={estilos.nota}>{definicion.nota}</p>}

      {consulta.isPending ? (
        <EsqueletoTabla filas={4} columnas={3} />
      ) : consulta.isError ? (
        <EstadoVacio
          titulo="No se pudo cargar el catálogo"
          texto={mensajeDeError(consulta.error)}
        />
      ) : consulta.opciones.length === 0 ? (
        <EstadoVacio
          titulo="Catálogo vacío"
          texto={
            "Agregue " +
            (definicion.articulo === "el" ? "el primer " : "la primera ") +
            definicion.singular +
            " con el formulario de abajo."
          }
        />
      ) : (
        <Tabla titulo={definicion.titulo}>
          <thead>
            <tr>
              <th>Nombre</th>
              {(definicion.extra ?? []).map((campo) => (
                <th key={campo.clave}>{campo.etiqueta}</th>
              ))}
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {consulta.opciones.map((fila) => (
              <tr key={fila.id}>
                <td>{fila.nombre}</td>
                {(definicion.extra ?? []).map((campo) => (
                  <td key={campo.clave}>
                    {(fila[campo.clave] as string | null) ?? "—"}
                  </td>
                ))}
                <td>
                  {fila.activo ? (
                    <Insignia tono="aprobada">Activo</Insignia>
                  ) : (
                    <Insignia tono="neutra">Inactivo</Insignia>
                  )}
                </td>
                <CeldaAcciones>
                  <Boton
                    pequeno
                    variante="secundaria"
                    onClick={() => abrirEdicion(fila)}
                  >
                    Editar
                  </Boton>
                  {fila.activo ? (
                    <Boton
                      pequeno
                      variante="terciaria"
                      onClick={async () => {
                        const ok = await confirmar({
                          titulo: "Desactivar registro",
                          mensaje:
                            "«" +
                            fila.nombre +
                            "» dejará de ofrecerse en los formularios. Los registros que ya lo usan lo conservan.",
                          textoConfirmar: "Desactivar",
                          destructiva: true,
                        });
                        if (ok)
                          cambioEstado.mutate({ id: fila.id, activar: false });
                      }}
                    >
                      Desactivar
                    </Boton>
                  ) : (
                    <Boton
                      pequeno
                      variante="secundaria"
                      onClick={() =>
                        cambioEstado.mutate({ id: fila.id, activar: true })
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

      <Modal
        abierto={enEdicion !== null}
        onCerrar={() => setEnEdicion(null)}
        titulo={"Editar " + definicion.singular}
        descripcion={enEdicion ? "«" + enEdicion.nombre + "»" : undefined}
        bloqueado={guardarEdicion.isPending}
        pie={
          <GrupoBotones>
            <Boton variante="terciaria" onClick={() => setEnEdicion(null)}>
              Cancelar
            </Boton>
            <Boton
              disabled={!valorEdicion("nombre").trim()}
              cargando={guardarEdicion.isPending}
              textoCargando="Guardando…"
              onClick={() => guardarEdicion.mutate()}
            >
              Guardar cambios
            </Boton>
          </GrupoBotones>
        }
      >
        <div className={estilos.formularioEdicion}>
          <Nota tono="advertencia">{avisoRetroactivo(definicion)}</Nota>
          {definicion.avisoEdicion && (
            <Nota tono="advertencia">{definicion.avisoEdicion}</Nota>
          )}
          <CampoTexto
            etiqueta="Nombre"
            obligatorio
            value={valorEdicion("nombre")}
            onChange={(e) =>
              setEdicion((previos) => ({ ...previos, nombre: e.target.value }))
            }
          />
          {(definicion.extra ?? []).map((campo) => (
            <CampoTexto
              key={campo.clave}
              etiqueta={campo.etiqueta}
              type={campo.tipo ?? "text"}
              ayuda={campo.ayuda}
              value={valorEdicion(campo.clave)}
              onChange={(e) =>
                setEdicion((previos) => ({
                  ...previos,
                  [campo.clave]: e.target.value,
                }))
              }
            />
          ))}
        </div>
      </Modal>

      {conflicto && (
        <div className={estilos.conflicto} role="alert">
          <p className={estilos.conflictoTitulo}>No se pudo desactivar</p>
          <p className={estilos.conflictoTexto}>{conflicto}</p>
          <p className={estilos.conflictoTexto}>
            Resuelva primero esos registros y vuelva a intentarlo. El catálogo
            sigue activo.
          </p>
        </div>
      )}

      <div className={estilos.formulario}>
        <CampoTexto
          etiqueta={
            "Nombre " +
            (definicion.articulo === "el" ? "del " : "de la ") +
            definicion.singular
          }
          obligatorio
          value={valor("nombre")}
          onChange={(e) => cambiar("nombre", e.target.value)}
        />
        {(definicion.extra ?? []).map((campo) => (
          <CampoTexto
            key={campo.clave}
            etiqueta={campo.etiqueta}
            type={campo.tipo ?? "text"}
            ayuda={campo.ayuda}
            value={valor(campo.clave)}
            onChange={(e) => cambiar(campo.clave, e.target.value)}
          />
        ))}
        <Boton
          variante="secundaria"
          disabled={!valor("nombre").trim()}
          cargando={alta.isPending}
          onClick={() => alta.mutate()}
        >
          Agregar
        </Boton>
      </div>
    </section>
  );
}

export default CatalogoGenerico;
