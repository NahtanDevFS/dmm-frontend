import { useState } from "react";
import { CampoSelect } from "../../componentes/ui/Campo";
import { useCatalogo } from "../../hooks/useCatalogo";
import type { Departamento, Municipio } from "../../types/api";
import estilos from "./Formulario.module.css";

/**
 * Departamento → municipio, para el lugar de nacimiento.
 *
 * De los dos, **el único que se guarda es el municipio**: el departamento ya
 * cuelga de él en la base y repetirlo en la persona permitiría que se
 * contradijeran. El primer selector existe solo para acotar el segundo: con
 * 340 municipios sembrados, un desplegable plano es inmanejable.
 *
 * Es la misma idea que SelectorComunidad pero sin el tercer nivel: dónde
 * nació alguien es un municipio, no una comunidad, y pedir tanto detalle de
 * un dato que casi nunca se verifica sería exigir de más.
 *
 * Al abrir con un municipio ya elegido no se sabe su departamento sin
 * consultarlo, así que se deduce de la lista de municipios en cuanto llega.
 */
function SelectorMunicipio({
  value,
  onChange,
  etiqueta = "Municipio de nacimiento",
  ayuda,
}: {
  /** Id del municipio, como texto porque viene de un <select>. */
  value: string;
  onChange: (municipioId: string) => void;
  etiqueta?: string;
  ayuda?: string;
}) {
  const [departamentoId, setDepartamentoId] = useState("");

  const departamentos = useCatalogo<Departamento>("departamentos");

  // Todos los municipios, para poder deducir el departamento de un valor que
  // ya venía elegido. Filtrar por departamento en el servidor obligaría a
  // saberlo de antemano, que es justo lo que falta.
  const municipios = useCatalogo<Municipio>("municipios");

  const departamentoDelValor = value
    ? municipios.opciones.find((m) => String(m.id) === value)?.departamento_id
    : undefined;

  const departamentoVigente =
    departamentoId ||
    (departamentoDelValor ? String(departamentoDelValor) : "");

  const municipiosVisibles = departamentoVigente
    ? municipios.opciones.filter(
        (m) => String(m.departamento_id) === departamentoVigente,
      )
    : [];

  return (
    <div className={estilos.rejilla}>
      <CampoSelect
        etiqueta="Departamento de nacimiento"
        value={departamentoVigente}
        onChange={(e) => {
          setDepartamentoId(e.target.value);
          // El municipio elegido pertenece al departamento anterior: si no se
          // limpia, queda uno que no corresponde a lo que se ve en pantalla.
          onChange("");
        }}
        ayuda="No se guarda: sirve para encontrar el municipio."
      >
        {departamentos.opciones.map((d) => (
          <option key={d.id} value={d.id}>
            {d.nombre}
          </option>
        ))}
      </CampoSelect>

      <CampoSelect
        etiqueta={etiqueta}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={departamentoVigente === ""}
        ayuda={ayuda ?? "Elija antes el departamento."}
      >
        {municipiosVisibles.map((m) => (
          <option key={m.id} value={m.id}>
            {m.nombre}
          </option>
        ))}
      </CampoSelect>
    </div>
  );
}

export default SelectorMunicipio;
