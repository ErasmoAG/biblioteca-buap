-- Evita registrar dos prestatarios internos con la misma matrícula o número de trabajador.
-- Las cuentas administrativas y los usuarios externos quedan fuera del índice.
-- Ejecuta este archivo en Supabase después de revisar/atender posibles duplicados existentes.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM usuarios
     WHERE rol = 'prestatario'
       AND tipo_prestatario <> 'externo'
       AND NULLIF(BTRIM(matricula_o_num_trabajador), '') IS NOT NULL
     GROUP BY LOWER(BTRIM(matricula_o_num_trabajador))
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Hay matrículas o números de trabajador duplicados; corrígelos antes de crear el índice.';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS usuarios_prestatarios_identificador_unico
  ON usuarios (LOWER(BTRIM(matricula_o_num_trabajador)))
  WHERE rol = 'prestatario'
    AND tipo_prestatario <> 'externo'
    AND NULLIF(BTRIM(matricula_o_num_trabajador), '') IS NOT NULL;
