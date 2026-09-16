-- ---------------------------------------------------------------
-- Quinto avance: ventas, PQR y chatbot
--
-- Anade las tablas que piden los nuevos requerimientos sin tocar las
-- que ya existian. El pedido sigue siendo el carrito que confirma el
-- cliente; la venta es la operacion comercial que queda registrada
-- cuando ese pedido se paga, o cuando un empleado la registra a mano
-- desde el mostrador.
--
-- Se aplica sobre la base ya creada, desde PowerShell:
--   cmd /c "C:\xampp\mysql\bin\mysql.exe -u root bixe_db < backend-fastapi\sql\quinto_avance.sql"
--
-- Es idempotente: se puede ejecutar varias veces sin duplicar nada.
-- ---------------------------------------------------------------

-- ============================ 1. Ventas ============================

CREATE TABLE IF NOT EXISTS ventas (
  id_venta        INT AUTO_INCREMENT PRIMARY KEY,
  numero          VARCHAR(20)  NOT NULL UNIQUE,
  consecutivo     INT          NOT NULL UNIQUE,
  id_pedido       INT          NULL UNIQUE,
  id_cliente      INT          NOT NULL,
  -- Quien registro la venta. Va vacio en las ventas de la web, porque
  -- las hace el propio cliente sin que intervenga nadie.
  id_vendedor     INT          NULL,
  canal           VARCHAR(12)  NOT NULL DEFAULT 'web',
  subtotal        DECIMAL(12,2) NOT NULL DEFAULT 0,
  descuento       DECIMAL(12,2) NOT NULL DEFAULT 0,
  impuesto        DECIMAL(12,2) NOT NULL DEFAULT 0,
  total           DECIMAL(12,2) NOT NULL DEFAULT 0,
  estado          VARCHAR(12)  NOT NULL DEFAULT 'completada',
  notas           VARCHAR(255) NULL,
  fecha           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ventas_fecha (fecha),
  INDEX idx_ventas_estado (estado),
  INDEX idx_ventas_cliente (id_cliente),
  CONSTRAINT fk_ventas_pedido   FOREIGN KEY (id_pedido)   REFERENCES pedidos(id_pedido)   ON DELETE SET NULL,
  CONSTRAINT fk_ventas_cliente  FOREIGN KEY (id_cliente)  REFERENCES usuarios(id_usuario),
  CONSTRAINT fk_ventas_vendedor FOREIGN KEY (id_vendedor) REFERENCES usuarios(id_usuario) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ======================== 2. Detalle de ventas ========================
-- El nombre y el precio se copian aqui a proposito: si manana cambia el
-- catalogo, la venta de ayer tiene que seguir diciendo lo que se vendio
-- y a que precio.

CREATE TABLE IF NOT EXISTS detalle_ventas (
  id_detalle      INT AUTO_INCREMENT PRIMARY KEY,
  id_venta        INT          NOT NULL,
  tipo            VARCHAR(10)  NOT NULL,          -- producto | servicio
  id_referencia   INT          NOT NULL,
  nombre          VARCHAR(120) NOT NULL,
  cantidad        INT          NOT NULL DEFAULT 1,
  precio_unitario DECIMAL(12,2) NOT NULL,
  descuento       DECIMAL(12,2) NOT NULL DEFAULT 0,
  subtotal        DECIMAL(12,2) NOT NULL,
  INDEX idx_detalle_venta (id_venta),
  CONSTRAINT fk_detalle_venta FOREIGN KEY (id_venta) REFERENCES ventas(id_venta) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================== 3. PQR ==============================
-- Peticiones, quejas y reclamos. El correo y el nombre se guardan aparte
-- del usuario porque tambien puede radicar alguien sin cuenta.

CREATE TABLE IF NOT EXISTS pqr (
  id_pqr          INT AUTO_INCREMENT PRIMARY KEY,
  radicado        VARCHAR(20)  NOT NULL UNIQUE,
  consecutivo     INT          NOT NULL UNIQUE,
  id_usuario      INT          NULL,
  nombre_contacto VARCHAR(80)  NOT NULL,
  email_contacto  VARCHAR(100) NOT NULL,
  tipo            VARCHAR(12)  NOT NULL,          -- peticion | queja | reclamo | sugerencia
  asunto          VARCHAR(120) NOT NULL,
  mensaje         TEXT         NOT NULL,
  estado          VARCHAR(12)  NOT NULL DEFAULT 'pendiente',
  respuesta       TEXT         NULL,
  id_atendido_por INT          NULL,
  fecha_creacion  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_respuesta DATETIME     NULL,
  INDEX idx_pqr_estado (estado),
  INDEX idx_pqr_fecha (fecha_creacion),
  CONSTRAINT fk_pqr_usuario  FOREIGN KEY (id_usuario)      REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
  CONSTRAINT fk_pqr_atendido FOREIGN KEY (id_atendido_por) REFERENCES usuarios(id_usuario) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ====================== 4. Chatbot: conversaciones ======================
-- La clave identifica la conversacion de un visitante sin cuenta; el
-- navegador la guarda y la reenvia para no perder el hilo.

CREATE TABLE IF NOT EXISTS conversaciones (
  id_conversacion INT AUTO_INCREMENT PRIMARY KEY,
  clave           VARCHAR(40)  NOT NULL UNIQUE,
  id_usuario      INT          NULL,
  fecha_creacion  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_ultimo    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_conversaciones_usuario (id_usuario),
  CONSTRAINT fk_conversacion_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS mensajes (
  id_mensaje      INT AUTO_INCREMENT PRIMARY KEY,
  id_conversacion INT          NOT NULL,
  rol             VARCHAR(10)  NOT NULL,          -- usuario | asistente
  contenido       TEXT         NOT NULL,
  fecha           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_mensajes_conversacion (id_conversacion),
  CONSTRAINT fk_mensaje_conversacion FOREIGN KEY (id_conversacion) REFERENCES conversaciones(id_conversacion) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ================= 5. Ventas de los pedidos ya pagados =================
-- Sin esto, los informes y las graficas arrancarian vacios aunque en la
-- base ya haya pedidos pagados de los avances anteriores.

SET @consecutivo := (SELECT COALESCE(MAX(consecutivo), 0) FROM ventas);

INSERT INTO ventas (
  numero, consecutivo, id_pedido, id_cliente, canal,
  subtotal, descuento, impuesto, total, estado, fecha
)
SELECT
  CONCAT('VTA-', LPAD(@consecutivo := @consecutivo + 1, 6, '0')),
  @consecutivo,
  p.id_pedido,
  p.id_usuario,
  'web',
  -- Los precios del catalogo ya llevan el IVA incluido, asi que la base
  -- gravable se obtiene quitandoselo al total, no sumandoselo.
  ROUND(p.total / 1.19, 2),
  0,
  ROUND(p.total - (p.total / 1.19), 2),
  p.total,
  'completada',
  COALESCE(f.fecha_emision, p.fecha_creacion)
FROM pedidos p
LEFT JOIN facturas f ON f.id_pedido = p.id_pedido
WHERE p.estado_pago = 'pagado'
  AND NOT EXISTS (SELECT 1 FROM ventas v WHERE v.id_pedido = p.id_pedido)
ORDER BY p.id_pedido;

INSERT INTO detalle_ventas (
  id_venta, tipo, id_referencia, nombre, cantidad, precio_unitario, descuento, subtotal
)
SELECT
  v.id_venta,
  i.tipo,
  i.id_referencia,
  i.nombre,
  i.cantidad,
  i.precio_unitario,
  0,
  ROUND(i.precio_unitario * i.cantidad, 2)
FROM ventas v
JOIN pedido_items i ON i.id_pedido = v.id_pedido
WHERE NOT EXISTS (SELECT 1 FROM detalle_ventas d WHERE d.id_venta = v.id_venta);
