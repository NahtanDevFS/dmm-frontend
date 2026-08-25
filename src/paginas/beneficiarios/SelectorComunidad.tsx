import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Boton from "../../componentes/ui/Boton";
import { CampoSelect, CampoTexto } from "../../componentes/ui/Campo";
import { useAvisos } from "../../componentes/ui/avisos/useAvisos";
import { claveCatalogo, useCatalogo } from "../../hooks/useCatalogo";
import { useAuth } from "../../auth/useAuth";
import { crearElemento } from "../../api/catalogos";
import { mensajeDeError } from "../../lib/errores";
import {
  DIRECCION,
  tieneRol,
  type Comunidad,
  type Departamento,
  type Municipio,
} from "../../types/api";
import estilos from "./Formulario.module.css";

/**
 * Departamento → municipio → comunidad.
 *
 * De los tres, **el único que se guarda es la comunidad**: `persona` tiene
 * `comunidad_id` y nada más, porque el municipio y el departamento ya cuelgan
 * de ella en la base y repetirlos en la persona permitiría que se
 * contradijeran. Los dos primeros selectores existen para acotar el tercero:
 * con 340 municipios sembrados, un desplegable plano de comunidades sería
 * inmanejable en cuanto el catálogo crezca.
 *
 * Por eso tampoco hacen falta en la ficha ni en la edición: el departamento y
 * el municipio de un beneficiario se leen siguiendo su comunidad.
 */
function SelectorComunidad({
  value,
  onChange,
  error,
}: {
  /** Id de la comunidad, como texto porque viene de un <select>. */
  value: string;
  onChange: (comunidadId: string) => void;
  error?: string;
}) {
  const { usuario } = useAuth();
  const { avisar } = useAvisos();
  const clienteQuery = useQueryClient();

  const [departamentoId, setDepartamentoId] = useState("");
  const [municipioId, setMunicipioId] = useState("");
  const [creando, setCreando] = useState(false);
  const [nombreNuevo, setNombreNuevo] = useState("");

  /**
   * Crear comunidades es de dirección: POST /comunidades lleva
   * requireRole(DIRECCION). A un empleado no se le ofrece el botón, se le dice
   * a quién pedírselo; enseñarle un atajo que termina en 403 es peor que no
   * enseñarle ninguno.
   */
  const puedeCrear = tieneRol(usuario?.rol, DIRECCION);

  const departamentos = useCatalogo<Departamento>("departamentos");
  const municipios = useCatalogo<Municipio>("municipios", {
    parametros: { departamentoId },
    habilitado: departamentoId !== "",
  });
  const comunidades = useCatalogo<Comunidad>("comunidades", {
    parametros: { municipioId },
    habilitado: municipioId !== "",
  });

  // Cambiar de departamento invalida el municipio elegido, y cambiar de
  // municipio invalida la comunidad: si no se limpiaran, quedaría seleccionado
  // un valor que ya no pertenece a la rama visible.
  const cambiarDepartamento = (valor: string) => {
    setDepartamentoId(valor);
    setMunicipioId("");
    setCreando(false);
    onChange("");
  };

  const cambiarMunicipio = (valor: string) => {
    setMunicipioId(valor);
    setCreando(false);
    onChange("");
  };

  const alta = useMutation({
    mutationFn: () =>
      crearElemento("comunidades", {
        nombre: nombreNuevo.trim(),
        municipio_id: Number(municipioId),
      }) as Promise<Comunidad>,
    onSuccess: async (comunidad: Comunidad) => {
      await clienteQuery.invalidateQueries({
        queryKey: claveCatalogo("comunidades"),
      });
      // Se deja elegida: quien la acaba de crear la está creando para usarla.
      onChange(String(comunidad.id));
      setCreando(false);
      setNombreNuevo("");
      avisar("Comunidad agregada al catálogo.", "exito");
    },
    onError: (error) => avisar(mensajeDeError(error), "error"),
  });

  const sinComunidades = municipioId !== "" && comunidades.opciones.length === 0;

  const ayudaComunidad = () => {
    if (municipioId === "") return "Elija antes el departamento y el municipio.";
    if (sinComunidades) {
      return puedeCrear
        ? "Este municipio todavía no tiene comunidades registradas. Agregue la primera."
        : "Este municipio todavía no tiene comunidades registradas. Pida a dirección que la agregue desde Catálogos.";
    }
    return puedeCrear
      ? "Si la comunidad no aparece en la lista, agréguela sin salir de aquí."
      : "Si la comunidad no aparece, pida a dirección que la agregue desde Catálogos.";
  };

  return (
    <>
      <CampoSelect
        etiqueta="Departamento"
        marcador="Seleccione el departamento"
        value={departamentoId}
        onChange={(e) => cambiarDepartamento(e.target.value)}
        ayuda="No se guarda en la persona: sirve para encontrar su comunidad."
      >
        {departamentos.opciones.map((departamento) => (
          <option key={departamento.id} value={departamento.id}>
            {departamento.nombre}
          </option>
        ))}
      </CampoSelect>

      <CampoSelect
        etiqueta="Municipio"
        marcador={
          departamentoId === "" ? "Elija primero el departamento" : "Seleccione el municipio"
        }
        value={municipioId}
        disabled={departamentoId === ""}
        onChange={(e) => cambiarMunicipio(e.target.value)}
      >
        {municipios.opciones.map((municipio) => (
          <option key={municipio.id} value={municipio.id}>
            {municipio.nombre}
          </option>
        ))}
      </CampoSelect>

      <CampoSelect
        etiqueta="Comunidad"
        marcador={
          municipioId === "" ? "Elija primero el municipio" : "Seleccione la comunidad"
        }
        value={value}
        disabled={municipioId === ""}
        onChange={(e) => onChange(e.target.value)}
        error={error}
        ayuda={ayudaComunidad()}
        accion={
          puedeCrear && municipioId !== "" && !creando ? (
            <Boton
              pequeno
              variante="secundaria"
              onClick={() => setCreando(true)}
            >
              Nueva
            </Boton>
          ) : undefined
        }
      >
        {comunidades.opciones.map((comunidad) => (
          <option key={comunidad.id} value={comunidad.id}>
            {comunidad.nombre}
          </option>
        ))}
      </CampoSelect>

      {creando && (
        /*
          El alta va aquí y no en Catálogos porque es donde aparece la
          necesidad: al registrar a alguien de una aldea que nadie había
          registrado antes. Mandarlo a otra pantalla le costaría el formulario
          entero, que en este punto ya lleva medio llenar.
        */
        <div className={estilos.altaEnLinea}>
          <CampoTexto
            etiqueta="Nombre de la nueva comunidad"
            obligatorio
            maxLength={100}
            autoFocus
            value={nombreNuevo}
            onChange={(e) => setNombreNuevo(e.target.value)}
            ayuda="Queda en el catálogo del municipio seleccionado y podrá reutilizarse."
          />
          <Boton
            variante="secundaria"
            disabled={nombreNuevo.trim() === ""}
            cargando={alta.isPending}
            onClick={() => alta.mutate()}
          >
            Crear comunidad
          </Boton>
          <Boton
            variante="terciaria"
            disabled={alta.isPending}
            onClick={() => {
              setCreando(false);
              setNombreNuevo("");
            }}
          >
            Cancelar
          </Boton>
        </div>
      )}
    </>
  );
}

export default SelectorComunidad;
