-- RF4: fecha de devolución e invariantes para el registro de multas.
-- Idempotente: puede ejecutarse aunque fecha_devolucion o los índices ya existan.

BEGIN;

ALTER TABLE public.prestamos
  ADD COLUMN IF NOT EXISTS fecha_devolucion DATE;

DO $$
DECLARE
  v_id_prestamo_att SMALLINT;
BEGIN
  SELECT attnum
    INTO v_id_prestamo_att
    FROM pg_attribute
   WHERE attrelid = 'public.multas'::regclass
     AND attname = 'id_prestamo'
     AND NOT attisdropped;

  IF v_id_prestamo_att IS NULL THEN
    RAISE EXCEPTION 'No se encontró la columna public.multas.id_prestamo.';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM public.multas
     GROUP BY id_prestamo
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Hay préstamos con multas duplicadas. No se creó el índice único; revisa esos registros primero.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_index i
     WHERE i.indrelid = 'public.multas'::regclass
       AND i.indisunique
       AND i.indisvalid
       AND i.indpred IS NULL
       AND i.indnkeyatts = 1
       AND i.indkey[0] = v_id_prestamo_att
  ) THEN
    IF to_regclass('public.multas_una_por_prestamo_rf4_idx') IS NOT NULL THEN
      RAISE EXCEPTION
        'El nombre multas_una_por_prestamo_rf4_idx ya está ocupado por otro objeto.';
    END IF;

    EXECUTE
      'CREATE UNIQUE INDEX multas_una_por_prestamo_rf4_idx
         ON public.multas (id_prestamo)';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS prestamos_devoluciones_pendientes_rf4_idx
  ON public.prestamos (fecha_vencimiento, id)
  WHERE fecha_devolucion IS NULL
    AND estado <> 'devuelto';

COMMIT;
