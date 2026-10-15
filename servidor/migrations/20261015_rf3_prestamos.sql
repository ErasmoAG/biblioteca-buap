-- RF3: habilita el registro consistente de préstamos y renovaciones.
-- Ejecutar en Supabase SQL Editor después de revisar la estructura actual.
-- La migración es idempotente para fecha_devolucion e índices.

BEGIN;

ALTER TABLE prestamos
  ADD COLUMN IF NOT EXISTS fecha_devolucion DATE;

-- Los CHECK quedan NOT VALID para no bloquear el despliegue por datos históricos;
-- PostgreSQL sí los aplicará a las nuevas escrituras.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'prestamos_renovaciones_rango_rf3'
       AND conrelid = 'prestamos'::regclass
  ) THEN
    ALTER TABLE prestamos
      ADD CONSTRAINT prestamos_renovaciones_rango_rf3
      CHECK (renovaciones_usadas BETWEEN 0 AND 2) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'prestamos_fechas_coherentes_rf3'
       AND conrelid = 'prestamos'::regclass
  ) THEN
    ALTER TABLE prestamos
      ADD CONSTRAINT prestamos_fechas_coherentes_rf3
      CHECK (fecha_vencimiento >= fecha_prestamo
             AND (fecha_devolucion IS NULL OR fecha_devolucion >= fecha_prestamo)) NOT VALID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS prestamos_activos_usuario_vencimiento_idx
  ON prestamos (id_usuario, fecha_vencimiento)
  WHERE fecha_devolucion IS NULL AND estado <> 'devuelto';

CREATE INDEX IF NOT EXISTS prestamos_activos_material_idx
  ON prestamos (id_material)
  WHERE fecha_devolucion IS NULL AND estado <> 'devuelto';

CREATE INDEX IF NOT EXISTS multas_pendientes_prestamo_idx
  ON multas (id_prestamo) WHERE pagada = FALSE;

COMMENT ON COLUMN prestamos.fecha_devolucion IS
  'Fecha de devolución efectiva. Los registros históricos devueltos pueden conservar estado=devuelto aunque esta fecha sea NULL.';

COMMIT;
