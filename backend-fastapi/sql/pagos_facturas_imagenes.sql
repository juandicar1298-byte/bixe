-- ============================================================
--  BIXE - Galería de imágenes, pagos y facturación
--
--  Ejecutar sobre bixe_db, DESPUÉS de backend/sql/servicios_pedidos.sql:
--    mysql -u root -p bixe_db < backend-fastapi/sql/pagos_facturas_imagenes.sql
--
--  El script es idempotente: se puede correr varias veces sin romper nada.
--  Probado en MariaDB 10.4 (XAMPP).
-- ============================================================

USE bixe_db;

-- ------------------------------------------------------------
-- 1. Galería del producto
--
--    productos.imagen_url se conserva como la foto de portada (la que sale
--    en el catálogo). Esta tabla guarda las fotos adicionales de la ficha.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS producto_imagenes (
  id_imagen      INT AUTO_INCREMENT PRIMARY KEY,
  id_producto    INT           NOT NULL,
  url            VARCHAR(255)  NOT NULL,
  descripcion    VARCHAR(120)  NULL COMMENT 'Texto alternativo de la imagen',
  orden          INT           NOT NULL DEFAULT 0,
  fecha_creacion TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_imagenes_producto (id_producto, orden),
  CONSTRAINT fk_imagenes_producto
    FOREIGN KEY (id_producto) REFERENCES productos(id_producto) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 2. Pagos
--
--    Un pedido tiene como mucho un pago aprobado. Del número de tarjeta solo
--    se guardan los cuatro últimos dígitos y la marca: nunca el número
--    completo ni el CVV.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pagos (
  id_pago        INT AUTO_INCREMENT PRIMARY KEY,
  id_pedido      INT           NOT NULL,
  referencia     VARCHAR(40)   NOT NULL COMMENT 'Referencia que devuelve la pasarela',
  metodo         VARCHAR(20)   NOT NULL DEFAULT 'tarjeta',
  marca          VARCHAR(20)   NULL COMMENT 'visa, mastercard, amex...',
  ultimos_cuatro CHAR(4)       NULL,
  titular        VARCHAR(60)   NULL,
  monto          DECIMAL(12,2) NOT NULL,
  estado         ENUM('aprobado','rechazado') NOT NULL,
  motivo_rechazo VARCHAR(120)  NULL,
  fecha_creacion TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE INDEX uq_pagos_referencia (referencia),
  INDEX idx_pagos_pedido (id_pedido, estado),
  CONSTRAINT fk_pagos_pedido
    FOREIGN KEY (id_pedido) REFERENCES pedidos(id_pedido) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 3. Facturas
--
--    Se emite una por pedido cuando el pago queda aprobado. El consecutivo
--    lo asigna el backend dentro de la misma transacción del pago.
--
--    Los precios del catálogo ya incluyen IVA, así que la factura NO suma
--    nada al total: discrimina cuánto de ese total corresponde al impuesto.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS facturas (
  id_factura     INT AUTO_INCREMENT PRIMARY KEY,
  numero         VARCHAR(20)   NOT NULL COMMENT 'Consecutivo visible, ej. BIXE-000001',
  consecutivo    INT           NOT NULL,
  id_pedido      INT           NOT NULL,
  base_gravable  DECIMAL(12,2) NOT NULL COMMENT 'Total sin IVA',
  porcentaje_iva DECIMAL(5,2)  NOT NULL DEFAULT 19.00,
  valor_iva      DECIMAL(12,2) NOT NULL,
  total          DECIMAL(12,2) NOT NULL COMMENT 'Lo que efectivamente pagó el cliente',
  fecha_emision  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE INDEX uq_facturas_numero (numero),
  UNIQUE INDEX uq_facturas_consecutivo (consecutivo),
  UNIQUE INDEX uq_facturas_pedido (id_pedido),
  CONSTRAINT fk_facturas_pedido
    FOREIGN KEY (id_pedido) REFERENCES pedidos(id_pedido) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 4. El pedido necesita saber si ya está pagado
-- ------------------------------------------------------------
ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS estado_pago ENUM('pendiente','pagado','rechazado')
    NOT NULL DEFAULT 'pendiente' AFTER estado;

CREATE INDEX IF NOT EXISTS idx_pedidos_estado_pago ON pedidos (estado_pago);

-- ------------------------------------------------------------
-- 5. El detalle del pedido guarda también la foto del artículo
--
--    Igual que el nombre y el precio, la imagen se congela en el momento de
--    la compra: así la página de pago y la factura muestran lo que el cliente
--    vio, aunque después se cambie la foto en el catálogo.
-- ------------------------------------------------------------
ALTER TABLE pedido_items
  ADD COLUMN IF NOT EXISTS imagen_url VARCHAR(255) NULL AFTER nombre;

-- ------------------------------------------------------------
-- 6. Galería del servicio
--
--    Igual que producto_imagenes: servicios.imagen_url es la portada que sale
--    en la tarjeta del catálogo, y aquí van las fotos adicionales que se ven
--    al abrir el detalle del servicio.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS servicio_imagenes (
  id_imagen      INT AUTO_INCREMENT PRIMARY KEY,
  id_servicio    INT           NOT NULL,
  url            VARCHAR(255)  NOT NULL,
  descripcion    VARCHAR(120)  NULL COMMENT 'Texto alternativo de la imagen',
  orden          INT           NOT NULL DEFAULT 0,
  fecha_creacion TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_imagenes_servicio (id_servicio, orden),
  CONSTRAINT fk_imagenes_servicio
    FOREIGN KEY (id_servicio) REFERENCES servicios(id_servicio) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
