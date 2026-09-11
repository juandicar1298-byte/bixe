-- ---------------------------------------------------------------
-- Codigo de verificacion para la recuperacion de contrasena
--
-- Antes se enviaba solo un enlace con un token largo. Ahora el correo
-- lleva ademas un codigo de seis digitos que el usuario escribe en la
-- pagina, y el token se sigue usando por debajo para el ultimo paso.
--
-- Se aplica sobre la base ya creada:
--     mysql -u root -p bixe_db < sql/codigo_recuperacion.sql
--
-- Es idempotente: se puede ejecutar varias veces sin romper nada.
-- ---------------------------------------------------------------

-- Los seis digitos que se envian por correo.
ALTER TABLE recuperaciones
  ADD COLUMN IF NOT EXISTS codigo VARCHAR(6) NOT NULL DEFAULT '' AFTER token;

-- Intentos fallidos. A los 5 el codigo se da por quemado, para que no se
-- pueda adivinar probando combinaciones.
ALTER TABLE recuperaciones
  ADD COLUMN IF NOT EXISTS intentos TINYINT UNSIGNED NOT NULL DEFAULT 0 AFTER codigo;

-- Las recuperaciones anteriores a este cambio no tienen codigo, asi que se
-- cierran: quien las pidio tendra que solicitar una nueva.
UPDATE recuperaciones
   SET usado_en = NOW()
 WHERE codigo = ''
   AND usado_en IS NULL;
