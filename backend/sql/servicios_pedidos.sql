-- ============================================================
--  BIXE - Servicios (ampliación), Pedidos y detalle del pedido
--
--  Ejecutar sobre bixe_db. Desde la terminal:
--    mysql -u root -p bixe_db < backend/sql/servicios_pedidos.sql
--  O pegando el contenido en phpMyAdmin / MySQL Workbench.
--
--  El script es idempotente: se puede correr varias veces sin romper nada
--  ni duplicar los servicios de ejemplo.
--
--  Probado en MariaDB 10.4 (XAMPP). En MySQL 8 hay que quitar los
--  "IF NOT EXISTS" de las sentencias ALTER TABLE, que allí no existen.
-- ============================================================

USE bixe_db;

-- ------------------------------------------------------------
-- 1. La tabla "servicios" ya existía con las columnas mínimas
--    (id_servicio, nombre, descripcion, precio, estado).
--    Aquí se le agregan las que necesita el catálogo y el carrito.
-- ------------------------------------------------------------
ALTER TABLE servicios
  MODIFY COLUMN nombre VARCHAR(120) NOT NULL,
  ADD COLUMN IF NOT EXISTS categoria VARCHAR(60) NOT NULL DEFAULT 'mantenimiento' AFTER nombre,
  ADD COLUMN IF NOT EXISTS descripcion_larga TEXT NULL AFTER descripcion,
  ADD COLUMN IF NOT EXISTS duracion_min INT NULL COMMENT 'Duración estimada en minutos' AFTER descripcion_larga,
  ADD COLUMN IF NOT EXISTS imagen_url VARCHAR(255) NULL AFTER precio,
  ADD COLUMN IF NOT EXISTS fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Evita servicios repetidos y permite que el INSERT IGNORE de abajo sea seguro.
ALTER TABLE servicios
  ADD UNIQUE INDEX IF NOT EXISTS uq_servicios_nombre (nombre);

-- ------------------------------------------------------------
-- 2. Pedidos: lo que el cliente confirma desde el carrito
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pedidos (
  id_pedido      INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario     INT           NOT NULL,
  total          DECIMAL(12,2) NOT NULL DEFAULT 0,
  estado         ENUM('pendiente','confirmado','completado','cancelado')
                   NOT NULL DEFAULT 'pendiente',
  notas          VARCHAR(255)  NULL,
  fecha_creacion TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_pedidos_usuario (id_usuario),
  INDEX idx_pedidos_estado (estado),
  CONSTRAINT fk_pedidos_usuario
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 3. Detalle del pedido: una fila por producto o servicio comprado.
--    Se guarda el nombre y el precio del momento de la compra, para que
--    el historial no cambie si después se edita el catálogo.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pedido_items (
  id_item         INT AUTO_INCREMENT PRIMARY KEY,
  id_pedido       INT           NOT NULL,
  tipo            ENUM('producto','servicio') NOT NULL,
  id_referencia   INT           NOT NULL COMMENT 'id_producto o id_servicio segun el tipo',
  nombre          VARCHAR(120)  NOT NULL,
  precio_unitario DECIMAL(12,2) NOT NULL,
  cantidad        INT           NOT NULL DEFAULT 1,
  INDEX idx_items_pedido (id_pedido),
  CONSTRAINT fk_items_pedido
    FOREIGN KEY (id_pedido) REFERENCES pedidos(id_pedido) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 4. Servicios de ejemplo para que el catálogo no arranque vacío.
--    INSERT IGNORE + índice único = no se duplican al re-ejecutar.
-- ------------------------------------------------------------
INSERT IGNORE INTO servicios
  (nombre, categoria, descripcion, descripcion_larga, duracion_min, precio, estado)
VALUES
  ('Mantenimiento preventivo', 'mantenimiento',
   'Revisión completa de los 20 puntos críticos.',
   'Cambio de aceite y filtro, revisión de frenos, tensión de cadena, presión de llantas, luces, batería y niveles. Incluye informe escrito del estado de la moto.',
   90, 180000, 'activo'),
  ('Cambio de aceite y filtro', 'mantenimiento',
   'Aceite sintético de alto desempeño.',
   'Drenaje completo, reemplazo del filtro y carga de aceite sintético según la ficha del fabricante. Incluye revisión rápida de niveles.',
   45, 95000, 'activo'),
  ('Sincronización y carburación', 'mecanica',
   'Ajuste fino de motor para máximo rendimiento.',
   'Calibración de válvulas, limpieza de inyectores o carburador, ajuste de ralentí y prueba en ruta para verificar la respuesta del acelerador.',
   120, 240000, 'activo'),
  ('Cambio de llantas', 'mecanica',
   'Montaje, balanceo y alineación.',
   'Desmontaje de las llantas usadas, montaje de las nuevas, balanceo dinámico y verificación de presión. No incluye el precio de las llantas.',
   60, 120000, 'activo'),
  ('Detailing y pulido', 'estetica',
   'Tu máquina como recién salida de fábrica.',
   'Lavado profundo, descontaminación de pintura, pulido en tres pasos, sellado cerámico y acondicionamiento de plásticos y cuero.',
   180, 320000, 'activo'),
  ('Diagnóstico electrónico', 'mecanica',
   'Escaneo computarizado de fallas.',
   'Conexión al módulo de control, lectura y borrado de códigos de error, revisión de sensores y entrega de un reporte técnico detallado.',
   45, 85000, 'activo');
