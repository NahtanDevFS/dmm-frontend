/* Qué modal está encima de todo en este momento.

   Un `dialog` abierto con `showModal()` vive en la capa superior del
   navegador: ningún z-index lo supera, y todo lo que queda fuera de él se
   vuelve inerte. Por eso los avisos, que se montaban en el body con
   z-index 1000, quedaban detrás del modal y ni siquiera se podían cerrar.

   Los avisos se montan dentro del modal superior (ver ProveedorAvisos). Para
   eso hace falta saber cuál es: el orden del DOM no lo dice, porque un modal
   abierto desde otro (la confirmación sobre la ficha) puede estar antes en el
   árbol. Se lleva una pila en el orden en que se abrieron. */

type Oyente = () => void;

let pila: HTMLDialogElement[] = [];
const oyentes = new Set<Oyente>();

function avisarCambio(): void {
  for (const oyente of oyentes) oyente();
}

export function registrarModalAbierto(dialogo: HTMLDialogElement): void {
  pila = [...pila.filter((d) => d !== dialogo), dialogo];
  avisarCambio();
}

export function quitarModal(dialogo: HTMLDialogElement): void {
  if (!pila.includes(dialogo)) return;
  pila = pila.filter((d) => d !== dialogo);
  avisarCambio();
}

export function suscribirCapaSuperior(oyente: Oyente): () => void {
  oyentes.add(oyente);
  return () => oyentes.delete(oyente);
}

// Para useSyncExternalStore: devuelve siempre la misma referencia mientras
// la pila no cambie.
export function modalSuperior(): HTMLDialogElement | null {
  return pila.at(-1) ?? null;
}
