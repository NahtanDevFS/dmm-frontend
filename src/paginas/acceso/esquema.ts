import { z } from "zod";

/**
 * Espejo de loginSchema en dmm-backend/src/modules/auth/auth.schema.ts.
 *
 * Solo comprueba presencia, igual que el backend. No se valida aquí longitud
 * ni formato de la contraseña: las reglas de complejidad aplican al crearla
 * desde el módulo de Usuarios, y exigirlas al entrar rechazaría de antemano a
 * quien tenga una cuenta antigua que no las cumple, sin dejarle siquiera
 * intentarlo.
 */
export const esquemaAcceso = z.object({
  username: z.string().trim().min(1, "Ingrese su usuario."),
  password: z.string().min(1, "Ingrese su contraseña."),
});

export type DatosAcceso = z.infer<typeof esquemaAcceso>;
