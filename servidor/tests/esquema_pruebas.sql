-- Esquema inicial para un proyecto Supabase de PRUEBAS vacío.
-- Ejecutar solo en biblioteca-buap-pruebas; nunca en la base original.
-- Crea estructura, restricciones e índices; no copia registros.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_name = ANY (ARRAY['usuarios', 'materiales', 'prestamos', 'multas'])
  ) THEN
    RAISE EXCEPTION
      'La base ya contiene una o más tablas del sistema. Este inicializador es solo para una base de pruebas vacía.';
  END IF;
END $$;

BEGIN;

CREATE TABLE public.usuarios (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  rol VARCHAR(20) NOT NULL
    CHECK (rol IN ('prestatario', 'administrativo')),
  tipo_prestatario VARCHAR(30)
    CHECK (tipo_prestatario IN (
      'prepa_lic_tecnica', 'posgrado', 'investigador_instituto', 'externo'
    )),
  matricula_o_num_trabajador VARCHAR(30),
  vigencia_credencial DATE,
  fecha_registro DATE NOT NULL DEFAULT CURRENT_DATE,
  email VARCHAR UNIQUE,
  password_hash VARCHAR,
  perfil_prestatario VARCHAR(40)
    CHECK (perfil_prestatario IS NULL OR perfil_prestatario IN (
      'preparatoria', 'licenciatura', 'carrera_tecnica', 'egresado_pasante',
      'intercambio', 'trabajador_administrativo', 'jubilado', 'docente',
      'maestria', 'doctorado', 'investigador', 'estudiante_instituto',
      'externo', 'pendiente_clasificacion'
    )),
  fecha_actualizacion_registro DATE,
  CONSTRAINT usuarios_perfil_grupo_prestatario_coherente CHECK (
    (
      rol = 'prestatario'
      AND perfil_prestatario IS NOT NULL
      AND (
        (
          perfil_prestatario IN (
            'preparatoria', 'licenciatura', 'carrera_tecnica',
            'egresado_pasante', 'intercambio',
            'trabajador_administrativo', 'jubilado'
          )
          AND tipo_prestatario = 'prepa_lic_tecnica'
        )
        OR (
          perfil_prestatario IN ('docente', 'maestria', 'doctorado')
          AND tipo_prestatario = 'posgrado'
        )
        OR (
          perfil_prestatario IN ('investigador', 'estudiante_instituto')
          AND tipo_prestatario = 'investigador_instituto'
        )
        OR (perfil_prestatario = 'externo' AND tipo_prestatario = 'externo')
        OR (
          perfil_prestatario = 'pendiente_clasificacion'
          AND (
            tipo_prestatario IS NULL
            OR tipo_prestatario IN (
              'prepa_lic_tecnica', 'posgrado', 'investigador_instituto'
            )
          )
        )
      )
    )
    OR (rol <> 'prestatario' AND perfil_prestatario IS NULL)
  )
);

CREATE TABLE public.materiales (
  id SERIAL PRIMARY KEY,
  tipo VARCHAR(30) NOT NULL
    CHECK (tipo IN (
      'libro', 'tesis', 'revista', 'material_especial', 'cd', 'dvd',
      'ipad', 'equipo_computo'
    )),
  titulo VARCHAR(200) NOT NULL,
  autor VARCHAR(150),
  categoria VARCHAR(100),
  ejemplares_totales INT NOT NULL DEFAULT 1,
  ejemplares_disponibles INT NOT NULL DEFAULT 1,
  solo_consulta BOOLEAN NOT NULL DEFAULT FALSE,
  signatura VARCHAR(60),
  editorial VARCHAR(120),
  anio INT CHECK (anio >= 1400 AND anio <= 2100),
  isbn_issn VARCHAR(20),
  grado_academico VARCHAR(20)
    CHECK (grado_academico IN ('licenciatura', 'maestria', 'doctorado')),
  marca VARCHAR(60),
  modelo VARCHAR(60),
  numero_serie VARCHAR(80),
  dias_prestamo INT CHECK (dias_prestamo > 0),
  CONSTRAINT materiales_solo_consulta_por_tipo CHECK (
    tipo NOT IN ('tesis', 'revista', 'material_especial')
    OR solo_consulta IS TRUE
  ),
  CONSTRAINT materiales_equipo_una_unidad CHECK (
    tipo NOT IN ('ipad', 'equipo_computo') OR ejemplares_totales = 1
  )
);

CREATE TABLE public.prestamos (
  id SERIAL PRIMARY KEY,
  id_usuario INT NOT NULL REFERENCES public.usuarios(id),
  id_material INT NOT NULL REFERENCES public.materiales(id),
  fecha_prestamo DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_vencimiento DATE NOT NULL,
  renovaciones_usadas INT NOT NULL DEFAULT 0,
  estado VARCHAR(10) NOT NULL DEFAULT 'activo'
    CHECK (estado IN ('activo', 'devuelto', 'atrasado')),
  fecha_devolucion DATE,
  CONSTRAINT prestamos_renovaciones_rango_rf3 CHECK (
    renovaciones_usadas BETWEEN 0 AND 2
  ),
  CONSTRAINT prestamos_fechas_coherentes_rf3 CHECK (
    fecha_vencimiento >= fecha_prestamo
    AND (fecha_devolucion IS NULL OR fecha_devolucion >= fecha_prestamo)
  )
);

CREATE TABLE public.multas (
  id SERIAL PRIMARY KEY,
  id_prestamo INT NOT NULL REFERENCES public.prestamos(id),
  dias_atraso INT NOT NULL,
  monto NUMERIC NOT NULL,
  pagada BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE UNIQUE INDEX usuarios_prestatarios_identificador_unico
  ON public.usuarios (LOWER(BTRIM(matricula_o_num_trabajador)))
  WHERE rol = 'prestatario'
    AND perfil_prestatario IS DISTINCT FROM 'externo'
    AND NULLIF(BTRIM(matricula_o_num_trabajador), '') IS NOT NULL;

CREATE UNIQUE INDEX materiales_numero_serie_unico
  ON public.materiales (numero_serie)
  WHERE numero_serie IS NOT NULL;

CREATE INDEX prestamos_activos_usuario_vencimiento_idx
  ON public.prestamos (id_usuario, fecha_vencimiento)
  WHERE fecha_devolucion IS NULL AND estado <> 'devuelto';

CREATE INDEX prestamos_activos_material_idx
  ON public.prestamos (id_material)
  WHERE fecha_devolucion IS NULL AND estado <> 'devuelto';

CREATE INDEX prestamos_devoluciones_pendientes_rf4_idx
  ON public.prestamos (fecha_vencimiento, id)
  WHERE fecha_devolucion IS NULL AND estado <> 'devuelto';

CREATE UNIQUE INDEX multas_una_por_prestamo_rf4_idx
  ON public.multas (id_prestamo);

CREATE INDEX multas_pendientes_prestamo_idx
  ON public.multas (id_prestamo)
  WHERE pagada = FALSE;

COMMIT;
