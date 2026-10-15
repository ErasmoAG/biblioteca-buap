-- Añade la clasificación específica de la persona prestataria.
-- tipo_prestatario conserva los cuatro grupos de política que ya existen.
-- Los registros internos anteriores quedan pendientes de clasificar para que
-- el personal bibliotecario confirme su perfil al editarlos.

BEGIN;

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS perfil_prestatario VARCHAR(40);

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS fecha_actualizacion_registro DATE;

UPDATE usuarios
   SET perfil_prestatario = CASE
     WHEN tipo_prestatario = 'externo' THEN 'externo'
     ELSE 'pendiente_clasificacion'
   END
 WHERE rol = 'prestatario'
   AND perfil_prestatario IS NULL;

-- Revisa también duplicados de registros heredados cuyo tipo anterior estuviera vacío.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM usuarios
     WHERE rol = 'prestatario'
       AND perfil_prestatario IS DISTINCT FROM 'externo'
       AND NULLIF(BTRIM(matricula_o_num_trabajador), '') IS NOT NULL
     GROUP BY LOWER(BTRIM(matricula_o_num_trabajador))
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Hay matrículas o números de trabajador duplicados; corrígelos antes de ampliar la clasificación.';
  END IF;
END $$;

-- Actualiza el índice anterior para que cubra todo prestatario interno, incluidos
-- los registros heredados que no tenían tipo_prestatario informado.
DROP INDEX IF EXISTS usuarios_prestatarios_identificador_unico;
CREATE UNIQUE INDEX usuarios_prestatarios_identificador_unico
  ON usuarios (LOWER(BTRIM(matricula_o_num_trabajador)))
  WHERE rol = 'prestatario'
    AND perfil_prestatario IS DISTINCT FROM 'externo'
    AND NULLIF(BTRIM(matricula_o_num_trabajador), '') IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'usuarios_perfil_prestatario_valido'
       AND conrelid = 'usuarios'::regclass
  ) THEN
    ALTER TABLE usuarios
      ADD CONSTRAINT usuarios_perfil_prestatario_valido
      CHECK (
        perfil_prestatario IS NULL OR perfil_prestatario IN (
          'preparatoria',
          'licenciatura',
          'carrera_tecnica',
          'egresado_pasante',
          'intercambio',
          'trabajador_administrativo',
          'jubilado',
          'docente',
          'maestria',
          'doctorado',
          'investigador',
          'estudiante_instituto',
          'externo',
          'pendiente_clasificacion'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'usuarios_perfil_grupo_prestatario_coherente'
       AND conrelid = 'usuarios'::regclass
  ) THEN
    ALTER TABLE usuarios
      ADD CONSTRAINT usuarios_perfil_grupo_prestatario_coherente
      CHECK (
        (rol = 'prestatario' AND perfil_prestatario IS NOT NULL AND (
          (perfil_prestatario IN (
            'preparatoria', 'licenciatura', 'carrera_tecnica',
            'egresado_pasante', 'intercambio', 'trabajador_administrativo', 'jubilado'
          ) AND tipo_prestatario = 'prepa_lic_tecnica')
          OR (perfil_prestatario IN ('docente', 'maestria', 'doctorado')
              AND tipo_prestatario = 'posgrado')
          OR (perfil_prestatario IN ('investigador', 'estudiante_instituto')
              AND tipo_prestatario = 'investigador_instituto')
          OR (perfil_prestatario = 'externo' AND tipo_prestatario = 'externo')
          OR (perfil_prestatario = 'pendiente_clasificacion'
              AND (tipo_prestatario IS NULL OR tipo_prestatario IN (
                'prepa_lic_tecnica', 'posgrado', 'investigador_instituto'
              )))
        ))
        OR (rol <> 'prestatario' AND perfil_prestatario IS NULL)
      );
  END IF;
END $$;

COMMENT ON COLUMN usuarios.perfil_prestatario IS
  'Perfil específico del prestatario; se usa junto al grupo tipo_prestatario para aplicar las reglas de préstamo.';

COMMENT ON COLUMN usuarios.fecha_actualizacion_registro IS
  'Última fecha en que el personal bibliotecario verificó la actualización periódica del registro y sus documentos.';

COMMIT;
