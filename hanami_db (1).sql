-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Nov 24, 2026 at 05:16 AM
-- Server version: 8.0.44
-- PHP Version: 8.3.33

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `hanami_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `cortes_caja`
--

CREATE TABLE `cortes_caja` (
  `id` int NOT NULL,
  `usuario_id` int NOT NULL,
  `tipo_corte` enum('Diario','Semanal','Mensual') COLLATE utf8mb4_unicode_ci NOT NULL,
  `fondo_inicial` decimal(10,2) NOT NULL,
  `ventas_efectivo` decimal(10,2) NOT NULL,
  `ventas_tarjeta` decimal(10,2) NOT NULL,
  `ventas_transferencia` decimal(10,2) NOT NULL,
  `ingreso_total` decimal(10,2) NOT NULL,
  `fecha_corte` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `cortes_caja`
--

INSERT INTO `cortes_caja` (`id`, `usuario_id`, `tipo_corte`, `fondo_inicial`, `ventas_efectivo`, `ventas_tarjeta`, `ventas_transferencia`, `ingreso_total`, `fecha_corte`) VALUES
(1, 1, 'Diario', 500.00, 3100.00, 2200.00, 950.00, 6750.00, '2026-11-18 06:02:08'),
(2, 2, 'Diario', 500.00, 500.00, 0.00, 160.00, 1160.00, '2026-11-20 06:00:00');

-- --------------------------------------------------------

--
-- Table structure for table `cupones_canjeados`
--

CREATE TABLE `cupones_canjeados` (
  `id` int NOT NULL,
  `correo` varchar(180) COLLATE utf8mb4_unicode_ci NOT NULL,
  `codigo` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha_canje` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `cupones_vip`
--

CREATE TABLE `cupones_vip` (
  `id` int NOT NULL,
  `codigo` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion_descuento` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `minimo_pedidos_requeridos` int NOT NULL,
  `activo` tinyint(1) DEFAULT '1',
  `valido_hasta` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `cupones_vip`
--

INSERT INTO `cupones_vip` (`id`, `codigo`, `descripcion_descuento`, `minimo_pedidos_requeridos`, `activo`, `valido_hasta`) VALUES
(1, 'HANAMI10', '10% de descuento acumulado (Al alcanzar 10 pedidos)', 10, 1, '2027-02-18'),
(2, 'ENVIOGRATIS20', 'Envío Gratis en tus pedidos (Al alcanzar 20 pedidos)', 20, 1, '2027-02-18'),
(3, 'VIP50GOLD', 'Rollo Especial Gratis + 25% OFF (Nivel 50 Diamond)', 50, 1, '2027-02-18');

-- --------------------------------------------------------

--
-- Table structure for table `materias_primas`
--

CREATE TABLE `materias_primas` (
  `id` int NOT NULL,
  `proveedor_id` int NOT NULL,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `categoria_abc` enum('Clase A','Clase B','Clase C') COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo_unidad` enum('Costal','Kg','Piezas','Litros') COLLATE utf8mb4_unicode_ci NOT NULL,
  `peso_unitario_kg` decimal(10,2) NOT NULL DEFAULT '1.00',
  `stock_unidades` int NOT NULL,
  `stock_gramos` int NOT NULL,
  `stock_minimo_gramos` int NOT NULL,
  `costo_por_unidad` decimal(10,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `materias_primas`
--

INSERT INTO `materias_primas` (`id`, `proveedor_id`, `nombre`, `categoria_abc`, `tipo_unidad`, `peso_unitario_kg`, `stock_unidades`, `stock_gramos`, `stock_minimo_gramos`, `costo_por_unidad`) VALUES
(1, 2, 'Arroz japonés grano corto (Nishiki)', 'Clase A', 'Costal', 25.00, 4, 104302, 20000, 1250.00),
(2, 2, 'Alga Nori tostada (Paquete 50 hojas)', 'Clase B', 'Piezas', 0.50, 1, 340, 100, 180.00),
(3, 2, 'Queso Crema tipo Philadelphia', 'Clase A', 'Kg', 1.00, 14, 13960, 3000, 110.00),
(4, 2, 'Pan molido Panko', 'Clase B', 'Costal', 10.00, 3, 29920, 8000, 480.00),
(5, 2, 'Salsa de Soja Premium / Sriracha', 'Clase B', 'Litros', 1.00, 25, 24520, 5000, 65.00),
(6, 1, 'Lomo de Salmón fresco de importación', 'Clase A', 'Kg', 1.00, 19, 18720, 5000, 340.00),
(7, 1, 'Atún aleta azul / aleta amarilla', 'Clase A', 'Kg', 1.00, 15, 14800, 4000, 380.00),
(8, 3, 'Aguacate Hass', 'Clase B', 'Kg', 1.00, 19, 18920, 5000, 55.00),
(9, 3, 'Pepino japonés sin semilla', 'Clase C', 'Kg', 1.00, 12, 12000, 2500, 25.00);

-- --------------------------------------------------------

--
-- Table structure for table `mermas`
--

CREATE TABLE `mermas` (
  `id` int NOT NULL,
  `insumo_id` int DEFAULT NULL,
  `cantidad` decimal(10,2) DEFAULT NULL,
  `motivo` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `notificaciones_stock`
--

CREATE TABLE `notificaciones_stock` (
  `id` int NOT NULL,
  `mensaje` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `notificaciones_stock`
--

INSERT INTO `notificaciones_stock` (`id`, `mensaje`, `fecha`) VALUES
(1, 'Reabastecimiento #1 (Pendiente) por $2500.00: Arroz japonés grano corto (Nishiki): 2.0 kg ($2500.00)', '2026-11-19 05:24:48'),
(2, 'Orden #1 ENTREGADA: Mercancia sumada al inventario.', '2026-11-19 05:25:54'),
(3, 'Consumo venta (HM-5204): -80.0g de Arroz japonés grano corto (Nishiki).', '2026-11-20 05:21:06'),
(4, 'Consumo venta (HM-5204): -80.0g de Lomo de Salmón fresco de importación.', '2026-11-20 05:21:06'),
(5, 'Consumo venta (HM-5204): -80.0g de Queso Crema tipo Philadelphia.', '2026-11-20 05:21:06'),
(6, 'Consumo venta (HM-5204): -80.0g de Aguacate Hass.', '2026-11-20 05:21:06'),
(7, 'Consumo venta (HM-7907): -80.0g de Arroz japonés grano corto (Nishiki).', '2026-11-20 05:21:31'),
(8, 'Consumo venta (HM-7907): -80.0g de Alga Nori tostada (Paquete 50 hojas).', '2026-11-20 05:21:31'),
(9, 'Consumo venta (HM-7907): -80.0g de Salsa de Soja Premium / Sriracha.', '2026-11-20 05:21:31'),
(10, 'Consumo venta (HM-1624): -80.0g de Arroz japonés grano corto (Nishiki).', '2026-11-20 05:22:02'),
(11, 'Consumo venta (HM-1624): -80.0g de Salsa de Soja Premium / Sriracha.', '2026-11-20 05:22:02'),
(12, 'Consumo venta (HM-7450): -80.0g de Arroz japonés grano corto (Nishiki).', '2026-11-20 05:23:17'),
(13, 'Consumo venta (HM-7450): -80.0g de Lomo de Salmón fresco de importación.', '2026-11-20 05:23:17'),
(14, 'Consumo venta (HM-7450): -80.0g de Queso Crema tipo Philadelphia.', '2026-11-20 05:23:17'),
(15, 'Consumo venta (HM-7450): -80.0g de Aguacate Hass.', '2026-11-20 05:23:17'),
(16, 'Consumo venta (HM-2317): -80.0g de Arroz japonés grano corto (Nishiki).', '2026-11-20 05:23:26'),
(17, 'Consumo venta (HM-2317): -80.0g de Lomo de Salmón fresco de importación.', '2026-11-20 05:23:26'),
(18, 'Consumo venta (HM-2317): -80.0g de Queso Crema tipo Philadelphia.', '2026-11-20 05:23:26'),
(19, 'Consumo venta (HM-2317): -80.0g de Aguacate Hass.', '2026-11-20 05:23:26'),
(20, 'Consumo venta (HM-2196): -80.0g de Arroz japonés grano corto (Nishiki).', '2026-11-20 05:25:39'),
(21, 'Consumo venta (HM-2196): -80.0g de Alga Nori tostada (Paquete 50 hojas).', '2026-11-20 05:25:39'),
(22, 'Consumo venta (HM-2196): -80.0g de Salsa de Soja Premium / Sriracha.', '2026-11-20 05:25:39'),
(23, 'Consumo venta (HM-6446): -80.0g de Arroz japonés grano corto (Nishiki).', '2026-11-20 05:37:35'),
(24, 'Consumo venta (HM-6446): -80.0g de Lomo de Salmón fresco de importación.', '2026-11-20 05:37:35'),
(25, 'Consumo venta (HM-6446): -80.0g de Queso Crema tipo Philadelphia.', '2026-11-20 05:37:35'),
(26, 'Consumo venta (HM-6446): -80.0g de Aguacate Hass.', '2026-11-20 05:37:35'),
(27, 'Consumo venta (HM-8666): -80.0g de Arroz japonés grano corto (Nishiki).', '2026-11-20 05:43:09'),
(28, 'Consumo venta (HM-8666): -80.0g de Lomo de Salmón fresco de importación.', '2026-11-20 05:43:09'),
(29, 'Consumo venta (HM-8666): -80.0g de Queso Crema tipo Philadelphia.', '2026-11-20 05:43:09'),
(30, 'Consumo venta (HM-8666): -80.0g de Aguacate Hass.', '2026-11-20 05:43:09'),
(31, 'Consumo venta (HM-8973): -80.0g de Arroz japonés grano corto (Nishiki).', '2026-11-20 07:54:31'),
(32, 'Consumo venta (HM-8973): -80.0g de Lomo de Salmón fresco de importación.', '2026-11-20 07:54:31'),
(33, 'Consumo venta (HM-8973): -80.0g de Queso Crema tipo Philadelphia.', '2026-11-20 07:54:31'),
(34, 'Consumo venta (HM-8973): -80.0g de Aguacate Hass.', '2026-11-20 07:54:31'),
(35, 'Consumo venta (HM-6272): -80.0g de Arroz japonés grano corto (Nishiki).', '2026-11-20 08:53:14'),
(36, 'Consumo venta (HM-6272): -80.0g de Lomo de Salmón fresco de importación.', '2026-11-20 08:53:14'),
(37, 'Consumo venta (HM-6272): -80.0g de Queso Crema tipo Philadelphia.', '2026-11-20 08:53:14'),
(38, 'Consumo venta (HM-6272): -80.0g de Aguacate Hass.', '2026-11-20 08:53:14'),
(39, 'Consumo venta (HM-6824): -80.0g de Arroz japonés grano corto (Nishiki).', '2026-11-20 09:00:54'),
(40, 'Consumo venta (HM-6824): -80.0g de Lomo de Salmón fresco de importación.', '2026-11-20 09:00:54'),
(41, 'Consumo venta (HM-6824): -80.0g de Queso Crema tipo Philadelphia.', '2026-11-20 09:00:54'),
(42, 'Consumo venta (HM-6824): -80.0g de Aguacate Hass.', '2026-11-20 09:00:54'),
(49, 'Consumo venta (HM-5835): -80.0g de Arroz japonés grano corto (Nishiki).', '2026-11-20 09:40:59'),
(50, 'Consumo venta (HM-5835): -80.0g de Lomo de Salmón fresco de importación.', '2026-11-20 09:40:59'),
(51, 'Consumo venta (HM-5835): -80.0g de Queso Crema tipo Philadelphia.', '2026-11-20 09:40:59'),
(52, 'Consumo venta (HM-5835): -80.0g de Aguacate Hass.', '2026-11-20 09:40:59'),
(53, 'Reabastecimiento #2 (Pendiente) por $2625.00: Arroz japonés grano corto (Nishiki): 2.1 gramos ($2625.00)', '2026-11-20 10:29:34'),
(54, 'Orden #2 ENTREGADA: Mercancia sumada al inventario.', '2026-11-20 10:29:44'),
(59, 'Consumo venta (HM-2141): -80.0g de Arroz japonés grano corto (Nishiki).', '2026-11-20 11:26:00'),
(60, 'Consumo venta (HM-2141): -80.0g de Lomo de Salmón fresco de importación.', '2026-11-20 11:26:00'),
(61, 'Consumo venta (HM-2141): -80.0g de Queso Crema tipo Philadelphia.', '2026-11-20 11:26:00'),
(62, 'Consumo venta (HM-2141): -80.0g de Aguacate Hass.', '2026-11-20 11:26:00'),
(63, 'Consumo venta (HM-8221): -100.0g de Arroz japonés grano corto (Nishiki).', '2026-11-20 12:02:41'),
(64, 'Consumo venta (HM-8221): -40.0g de Aguacate Hass.', '2026-11-20 12:02:41'),
(65, 'Consumo venta (HM-8221): -80.0g de Arroz japonés grano corto (Nishiki).', '2026-11-20 12:02:41'),
(66, 'Consumo venta (HM-8221): -80.0g de Queso Crema tipo Philadelphia.', '2026-11-20 12:02:41'),
(67, 'Consumo venta (HM-8221): -80.0g de Pan molido Panko.', '2026-11-20 12:02:41'),
(68, 'Consumo venta (HM-8221): -80.0g de Aguacate Hass.', '2026-11-20 12:02:41'),
(69, 'Consumo venta (HM-8221): -80.0g de Salsa de Soja Premium / Sriracha.', '2026-11-20 12:02:41'),
(70, 'Consumo venta (HM-8221): -70.0g de Atún aleta azul / aleta amarilla.', '2026-11-20 12:02:41'),
(72, 'Consumo venta (HM-4703): -80.0g de Arroz japonés grano corto (Nishiki).', '2026-11-20 21:33:29'),
(73, 'Consumo venta (HM-4703): -80.0g de Lomo de Salmón fresco de importación.', '2026-11-20 21:33:29'),
(74, 'Consumo venta (HM-4703): -80.0g de Arroz japonés grano corto (Nishiki).', '2026-11-20 21:33:29'),
(75, 'Consumo venta (HM-4703): -80.0g de Lomo de Salmón fresco de importación.', '2026-11-20 21:33:29'),
(76, 'Consumo venta (HM-4703): -80.0g de Queso Crema tipo Philadelphia.', '2026-11-20 21:33:29'),
(77, 'Consumo venta (HM-4703): -80.0g de Aguacate Hass.', '2026-11-20 21:33:29'),
(78, 'Reabastecimiento #3 (Pendiente) por $2500.00: Arroz japonés grano corto (Nishiki): 2.0 kg ($2500.00)', '2026-11-20 21:37:38'),
(79, 'Reabastecimiento #4 (Pendiente) por $2500.00: Arroz japonés grano corto (Nishiki): 2.0 kg ($2500.00)', '2026-11-20 21:37:45'),
(80, 'Orden #3 ENTREGADA: Mercancia sumada al inventario.', '2026-11-20 21:38:10'),
(81, 'Orden #4 ENTREGADA: Mercancia sumada al inventario.', '2026-11-20 21:38:11'),
(83, 'Consumo venta (HM-4980): -80.0g de Arroz japonés grano corto (Nishiki).', '2026-11-20 23:14:05'),
(84, 'Consumo venta (HM-4980): -80.0g de Lomo de Salmón fresco de importación.', '2026-11-20 23:14:05'),
(85, 'Consumo venta (HM-4980): -80.0g de Queso Crema tipo Philadelphia.', '2026-11-20 23:14:05'),
(86, 'Consumo venta (HM-4980): -80.0g de Aguacate Hass.', '2026-11-20 23:14:05'),
(90, 'Consumo venta (HM-1971): -80.0g de Arroz japonés grano corto (Nishiki).', '2026-11-21 01:11:17'),
(91, 'Consumo venta (HM-1971): -80.0g de Salsa de Soja Premium / Sriracha.', '2026-11-21 01:11:17'),
(92, 'Consumo venta (HM-1971): -80.0g de Lomo de Salmón fresco de importación.', '2026-11-21 01:11:17'),
(93, 'Consumo venta (HM-1971): -50.0g de Atún aleta azul / aleta amarilla.', '2026-11-21 01:11:17'),
(97, 'Consumo venta (HM-9420): -80.0g de Arroz japonés grano corto (Nishiki).', '2026-11-24 00:06:48'),
(98, 'Consumo venta (HM-9420): -80.0g de Salsa de Soja Premium / Sriracha.', '2026-11-24 00:06:48'),
(99, 'Consumo venta (HM-9420): -80.0g de Lomo de Salmón fresco de importación.', '2026-11-24 00:06:48'),
(100, 'Consumo venta (HM-9420): -80.0g de Atún aleta azul / aleta amarilla.', '2026-11-24 00:06:48'),
(101, 'Consumo venta (HM-9420): -80.0g de Arroz japonés grano corto (Nishiki).', '2026-11-24 00:06:48'),
(102, 'Consumo venta (HM-9420): -80.0g de Lomo de Salmón fresco de importación.', '2026-11-24 00:06:48'),
(104, 'Cupón VIP activo disponible para clientes: VIP50GOLD (Rollo Especial Gratis + 25% OFF (Nivel 50 Diamond))', '2026-11-24 04:30:08'),
(105, 'Cupón VIP activo disponible para clientes: ENVIOGRATIS20 (Envío Gratis en tus pedidos (Al alcanzar 20 pedidos))', '2026-11-24 04:30:09'),
(106, 'Cupón VIP activo disponible para clientes: HANAMI10 (10% de descuento acumulado (Al alcanzar 10 pedidos))', '2026-11-24 04:30:10');

-- --------------------------------------------------------

--
-- Table structure for table `ordenes_compra`
--

CREATE TABLE `ordenes_compra` (
  `id` int NOT NULL,
  `proveedor_id` int DEFAULT NULL,
  `insumo` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cantidad_costales` int DEFAULT NULL,
  `estado` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'Pendiente',
  `fecha` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `ordenes_compra`
--

INSERT INTO `ordenes_compra` (`id`, `proveedor_id`, `insumo`, `cantidad_costales`, `estado`, `fecha`) VALUES
(1, 2, NULL, NULL, 'Entregado', '2026-11-19 05:24:48'),
(2, 2, NULL, NULL, 'Entregado', '2026-11-20 10:29:34'),
(3, 2, NULL, NULL, 'Entregado', '2026-11-20 21:37:38'),
(4, 2, NULL, NULL, 'Entregado', '2026-11-20 21:37:45');

-- --------------------------------------------------------

--
-- Table structure for table `ordenes_compra_detalle`
--

CREATE TABLE `ordenes_compra_detalle` (
  `id` int NOT NULL,
  `orden_compra_id` int NOT NULL,
  `materia_prima_id` int NOT NULL,
  `gramos_solicitados` decimal(10,2) NOT NULL,
  `costo_estimado` decimal(10,2) DEFAULT '0.00'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `ordenes_compra_detalle`
--

INSERT INTO `ordenes_compra_detalle` (`id`, `orden_compra_id`, `materia_prima_id`, `gramos_solicitados`, `costo_estimado`) VALUES
(1, 1, 1, 2000.00, 2500.00),
(2, 2, 1, 2.10, 2625.00),
(3, 3, 1, 2000.00, 2500.00),
(4, 4, 1, 2000.00, 2500.00);

-- --------------------------------------------------------

--
-- Table structure for table `pedidos`
--

CREATE TABLE `pedidos` (
  `id` int NOT NULL,
  `usuario_id` int NOT NULL,
  `folio` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo_pedido` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `estado` enum('En preparación','Listo para recoger','Entregado al Uber','Entregado') COLLATE utf8mb4_unicode_ci NOT NULL,
  `monto_total` decimal(10,2) NOT NULL,
  `resumen_articulos` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `notas` text COLLATE utf8mb4_unicode_ci,
  `fecha_creacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `pedidos`
--

INSERT INTO `pedidos` (`id`, `usuario_id`, `folio`, `tipo_pedido`, `estado`, `monto_total`, `resumen_articulos`, `notas`, `fecha_creacion`) VALUES
(4, 3, 'HM-8271', 'Al Momento', 'Entregado', 330.00, '2x Chirashizushi (Base: [Arroz Nishiki, Salmón fresco, Aguacate Hass, Pepino japonés])', 'Pago: Efectivo | POS: Efectivo (Cambio: $0.00)', '2026-11-18 07:33:13'),
(5, 3, 'HM-3543', 'Al Momento', 'Entregado', 165.00, '1x Chirashizushi (Base: [Arroz Nishiki, Salmón fresco, Aguacate Hass, Pepino japonés])', 'Pago: Efectivo | POS: Efectivo (Cambio: $0.00)', '2026-11-18 07:40:32'),
(6, 3, 'HM-6603', 'Uber Eats', 'Entregado', 115.00, '1x Temaki (Preparación tradicional estándar)', 'Pago: Efectivo | URGENTE', '2026-11-18 09:08:12'),
(7, 3, 'HM-5465', 'Al Momento', 'Entregado', 180.00, 'Rollo Sushi', ' | POS: Efectivo (Cambio: $0.00)', '2026-11-18 23:43:12'),
(8, 3, 'HM-8445', 'Programado', 'Entregado', 313.00, '1x Nigiri (Base: [Arroz Nishiki, Salmón fresco, Aguacate, Pepino]), 1x Oshizushi (Base: [Arroz Nishiki, Salmón fresco, Aguacate] | Extras: [Salsa Tampico])', 'Pago: Transferencia | Fecha/Hora: 2026-11-19T23:14 | POS: Transferencia (Recibido)', '2026-11-19 05:14:51'),
(9, 5, 'HM-5204', 'Al Momento', 'Entregado', 160.00, '1x Oshizushi (Base: [Arroz Nishiki, Salmón fresco, Aguacate, Pepino])', 'Pago: Efectivo | URGENTE | POS: Efectivo (Cambio: $0.00)', '2026-11-20 05:21:06'),
(10, 5, 'HM-7907', 'Programado', 'Entregado', 135.00, '1x Nigiri (Base: [Arroz japonés grano corto (Nishiki), Alga Nori tostada (Paquete 50 hojas), Salsa de Soja Premium / Sriracha])', 'Pago: Transferencia | Fecha/Hora: 2026-11-20T14:21 | URGENTE', '2026-11-20 05:21:31'),
(11, 5, 'HM-1624', 'Uber Eats', 'Entregado', 163.00, '1x Gunkan (Base: [Arroz japonés grano corto (Nishiki), Salsa de Soja Premium / Sriracha] | Extras: [Salsa Tampico] | Nota: sins alsa)', 'Pago: Tarjeta | Dirección: lll | ALERGIAS: alergia a el arroz', '2026-11-20 05:22:02'),
(12, 5, 'HM-7450', 'Al Momento', 'Entregado', 160.00, '1x Oshizushi (Base: [Arroz Nishiki, Salmón fresco, Aguacate, Pepino])', 'Pago: Tarjeta | POS: Tarjeta / Ventanilla', '2026-11-20 05:23:17'),
(13, 5, 'HM-2317', 'Al Momento', 'Entregado', 160.00, '1x Oshizushi (Base: [Arroz japonés grano corto (Nishiki), Lomo de Salmón fresco de importación, Queso Crema tipo Philadelphia, Aguacate Hass])', 'Pago: Tarjeta | POS: Tarjeta / Ventanilla', '2026-11-20 05:23:26'),
(14, 5, 'HM-2196', 'Al Momento', 'Entregado', 135.00, '1x Nigiri (Base: [Arroz japonés grano corto (Nishiki), Alga Nori tostada (Paquete 50 hojas), Salsa de Soja Premium / Sriracha])', 'Pago: Efectivo | POS: Efectivo (Cambio: $0.00)', '2026-11-20 05:25:39'),
(15, 5, 'HM-6446', 'Al Momento', 'Entregado', 144.00, '1x Oshizushi (Base: [Arroz japonés grano corto (Nishiki), Lomo de Salmón fresco de importación, Queso Crema tipo Philadelphia, Aguacate Hass])', 'Pago: Efectivo | Boleto HANAMI10 (-10% = -$16.00) | POS: Efectivo (Cambio: $0.00) | POS: Efectivo (Cambio: $0.00) | POS: Efectivo (Cambio: $0.00)', '2026-11-20 05:37:35'),
(16, 5, 'HM-8666', 'Al Momento', 'Entregado', 144.00, '1x Oshizushi (Base: [Arroz japonés grano corto (Nishiki), Lomo de Salmón fresco de importación, Queso Crema tipo Philadelphia, Aguacate Hass])', 'Pago: Efectivo | Boleto HANAMI10 (-10% = -$16.00) | POS: Efectivo (Cambio: $0.00) | POS: Efectivo (Cambio: $0.00) | POS: Efectivo (Cambio: $0.00)', '2026-11-20 05:43:09'),
(17, 5, 'HM-8973', 'Al Momento', 'Entregado', 160.00, '1x Oshizushi (Base: [Arroz Nishiki, Salmón fresco, Aguacate, Pepino])', 'Pago: Transferencia | Pendiente enviar comprobante y mostrar en ventanilla | POS: Transferencia (Recibido) | POS: Transferencia (Recibido) | POS: Transferencia (Recibido) | POS: Transferencia (Recibido)', '2026-11-20 07:54:31'),
(18, 5, 'HM-6272', 'Al Momento', 'Entregado', 180.00, '1x Oshizushi (Base: [Arroz japonés grano corto (Nishiki), Lomo de Salmón fresco de importación, Queso Crema tipo Philadelphia, Aguacate Hass] | Extras: [Queso Crema Extra] | Nota: Sin salsa)', 'Pago: Efectivo | URGENTE | [IMPRESO] POS: Efectivo (Cambio: $0.00)', '2026-11-20 08:53:14'),
(19, 5, 'HM-6824', 'Programado', 'Entregado', 160.00, '1x Oshizushi (Base: [Arroz japonés grano corto (Nishiki), Lomo de Salmón fresco de importación, Queso Crema tipo Philadelphia, Aguacate Hass])', 'Pago: Efectivo | Fecha/Hora: 2026-11-21T06:00 | [IMPRESO] POS: Tarjeta / Ventanilla', '2026-11-20 09:00:54'),
(20, 5, 'HM-5835', 'Al Momento', 'Entregado', 160.00, '1x Oshizushi (Base: [Arroz japonés grano corto (Nishiki), Lomo de Salmón fresco de importación, Queso Crema tipo Philadelphia, Aguacate Hass])', 'Pago: Efectivo | [IMPRESO] POS: Efectivo (Cambio: $0.00)', '2026-11-20 09:40:59'),
(21, 5, 'HM-2141', 'Al Momento', 'Entregado', 160.00, '1x Oshizushi (Base: [Arroz japonés grano corto (Nishiki), Lomo de Salmón fresco de importación, Queso Crema tipo Philadelphia, Aguacate Hass])', 'Pago: Efectivo | URGENTE | [IMPRESO] POS: Efectivo (Cambio: $0.00)', '2026-11-20 11:26:00'),
(23, 18, 'HM-4703', 'Al Momento', 'Entregado', 348.00, '1x Oshizushi (Base: [Arroz japonés grano corto (Nishiki), Lomo de Salmón fresco de importación, Queso Crema tipo Philadelphia, Aguacate Hass] | Extras: [Queso Crema Extra]), 1x Nigiri (Base: [Arroz japonés grano corto (Nishiki), Salsa de Soja Premium / Sriracha, Lomo de Salmón fresco de importación, Atún aleta azul / aleta amarilla] | Extras: [Salsa Tampico, Chile Toreado])', 'Pago: Tarjeta | Tarjeta terminación 1234 (Aprobado) | URGENTE | [IMPRESO] POS: Tarjeta / Ventanilla', '2026-11-20 21:33:29'),
(24, 5, 'HM-4980', 'Al Momento', 'Entregado', 160.00, '1x Oshizushi (Base: [Arroz japonés grano corto (Nishiki), Lomo de Salmón fresco de importación, Queso Crema tipo Philadelphia, Aguacate Hass])', 'Pago: Efectivo | [IMPRESO] POS: Efectivo (Cambio: $0.00)', '2026-11-20 23:14:05'),
(25, 5, 'HM-1971', 'Al Momento', 'Entregado', 135.00, '1x Nigiri (Base: [Arroz japonés grano corto (Nishiki), Salsa de Soja Premium / Sriracha, Lomo de Salmón fresco de importación, Atún aleta azul / aleta amarilla])', 'Pago: Efectivo | [IMPRESO] POS: Efectivo (Cambio: $165.00)', '2026-11-21 01:11:17'),
(26, 3, 'HM-9420', 'Uber Eats', 'Entregado', 466.00, '1x Nigiri (Base: [Arroz japonés grano corto (Nishiki), Salsa de Soja Premium / Sriracha, Lomo de Salmón fresco de importación, Atún aleta azul / aleta amarilla] | Extras: [Salsa Tampico]), 1x Nigiri, 1x Oshizushi (Extras: [Salsa Tampico])', 'Pago: Transferencia | Pendiente enviar comprobante y mostrar en ventanilla | Dirección: Paseo de los Insurgentes 300, León, Gto. | [IMPRESO] POS: Transferencia (Recibido)', '2026-11-24 00:06:48'),
(27, 3, 'HM-6433', 'Al Momento', 'En preparación', 230.00, '1x Temaki (Base: []), 1x Temaki', 'Pago: Efectivo', '2026-11-24 04:25:10');

-- --------------------------------------------------------

--
-- Table structure for table `productos`
--

CREATE TABLE `productos` (
  `id` int NOT NULL,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `precio` decimal(10,2) NOT NULL,
  `stock_porciones` int NOT NULL,
  `imagen_url` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `disponible` tinyint(1) DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `productos`
--

INSERT INTO `productos` (`id`, `nombre`, `descripcion`, `precio`, `stock_porciones`, `imagen_url`, `disponible`) VALUES
(1, 'Chirashizushi', 'Bowl de arroz sazonado con cortes frescos de salmón, aguacate cremoso, pepino y toque cítrico.', 165.00, 12, 'assets/chirashizushi.jpg', 1),
(2, 'Temaki', 'Cono crujiente de alga nori relleno de arroz al vapor, surimi estilo tampico, aguacate y pepino fresco.', 115.00, 12, 'https://www.orientalmarket.es/wp-content/uploads/2015/10/Temaki-Salm%C3%A3o-1024x683.jpg', 1),
(3, 'Hosomaki', 'Rollo tradicional delgado envuelto en alga nori con relleno clásico, queso crema y frescura equilibrada.', 125.00, 14, 'https://cdn.shopify.com/s/files/1/0353/5621/articles/Hosomaki-Sushi-Rolls_1112x.jpg?v=1612387843', 1),
(4, 'Uramaki Estilo Mexicano', 'Rollo empanizado crujiente por fuera con arroz por dentro, queso crema, aguacate y aderezo chipotle-sriracha.', 155.00, 9, 'https://gomagcdn.ro/domains/eihshop.ro/files/files/uramaki-sushi-header-17329.jpeg', 1),
(5, 'Gunkan', 'Barquitos de arroz envueltos en nori coronados con pasta tampico artesanal y toque picante de sriracha.', 145.00, 8, 'https://images.unsplash.com/photo-1611143669185-af224c5e3252?auto=format&fit=crop&w=600&q=80', 1),
(6, 'Nigiri', 'Arroz moldeado a mano cubierto con láminas frescas de salmón seleccionado y un sutil barniz de soya dulce.', 135.00, 9, 'https://img.freepik.com/premium-photo/photo-platter-sushi-nigiri-with-fresh-fish-slices-perfectly-formed-rice-generative-ai_630290-10506.jpg', 1),
(7, 'Oshizushi', 'Sushi prensado estilo Osaka en capas geométricas de arroz sazonado, salmón, queso crema y aguacate.', 160.00, 6, 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=600&q=80', 1);

-- --------------------------------------------------------

--
-- Table structure for table `proveedores`
--

CREATE TABLE `proveedores` (
  `id` int NOT NULL,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `contacto_nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `telefono` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `correo` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `categoria` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `proveedores`
--

INSERT INTO `proveedores` (`id`, `nombre`, `contacto_nombre`, `telefono`, `correo`, `categoria`) VALUES
(1, 'Distribuidora de Mariscos del Bajío', 'Carlos Mendoza', '4772345678', 'ventas@mariscosbajio.com', 'Mariscos Frescos'),
(2, 'Importaciones Asía Gourmet S.A.', 'Akira Tanaka', '5551239876', 'contacto@asiagourmet.mx', 'Abarrotes Asiáticos y Algas'),
(3, 'Verduras y Vegetales Frescos León', 'Sofía Ramírez', '4778765432', 'pedidos@verdurasleon.com', 'Verduras e Insumos Agrícolas');

-- --------------------------------------------------------

--
-- Table structure for table `recetas`
--

CREATE TABLE `recetas` (
  `id` int NOT NULL,
  `producto_id` int NOT NULL,
  `materia_prima_id` int NOT NULL,
  `gramos_requeridos` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `recetas`
--

INSERT INTO `recetas` (`id`, `producto_id`, `materia_prima_id`, `gramos_requeridos`) VALUES
(1, 1, 1, 120),
(2, 1, 6, 90),
(3, 1, 8, 50),
(4, 1, 9, 40),
(5, 2, 1, 100),
(6, 2, 2, 10),
(7, 2, 8, 40),
(8, 2, 9, 30),
(9, 3, 1, 110),
(10, 3, 2, 15),
(11, 3, 3, 40),
(12, 3, 6, 60),
(24, 5, 1, 80),
(25, 5, 5, 80),
(26, 4, 1, 80),
(27, 4, 3, 80),
(28, 4, 4, 80),
(29, 4, 8, 80),
(30, 4, 5, 80),
(31, 7, 1, 80),
(32, 7, 6, 80),
(33, 7, 3, 80),
(34, 7, 8, 80),
(47, 1, 5, 15),
(48, 2, 6, 60),
(49, 4, 7, 70),
(50, 5, 2, 15),
(51, 5, 7, 60),
(55, 6, 1, 80),
(56, 6, 5, 80),
(57, 6, 6, 80),
(58, 6, 7, 80);

-- --------------------------------------------------------

--
-- Table structure for table `reservas`
--

CREATE TABLE `reservas` (
  `id` int NOT NULL,
  `mesa` int DEFAULT NULL,
  `cliente` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `horario` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `estado` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT 'Reservada',
  `fecha` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `reservas`
--

INSERT INTO `reservas` (`id`, `mesa`, `cliente`, `horario`, `estado`, `fecha`) VALUES
(2, 1, 'q@gmail.com', '20:00 - 21:30', 'Confirmada / Reservada', '2026-11-20'),
(3, 1, 'q@gmail.com', '14:00 - 15:30', 'Confirmada / Reservada', '2026-11-21'),
(4, 3, 'CRIS@GMAIL.COM', '18:00 - 19:30', 'Confirmada / Reservada', '2026-11-21'),
(5, 3, 'ramon@gmail.com', '18:00 - 19:30', 'Confirmada / Reservada', '2026-11-28'),
(6, 4, 'cliente@hanami.com', '14:00 - 15:30', 'Confirmada / Reservada', '2026-11-24');

-- --------------------------------------------------------

--
-- Table structure for table `roles`
--

CREATE TABLE `roles` (
  `id` int NOT NULL,
  `nombre` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `roles`
--

INSERT INTO `roles` (`id`, `nombre`) VALUES
(1, 'Administrador'),
(3, 'Cliente'),
(2, 'Cocina');

-- --------------------------------------------------------

--
-- Table structure for table `usuarios`
--

CREATE TABLE `usuarios` (
  `id` int NOT NULL,
  `rol_id` int NOT NULL,
  `nombre` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `apellido` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `telefono` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `correo` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `direccion` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `contrasena_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha_nacimiento` date NOT NULL,
  `genero` enum('Masculino','Femenino','Otro') COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha_creacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `rol` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'cliente'
) ;

--
-- Dumping data for table `usuarios`
--

INSERT INTO `usuarios` (`id`, `rol_id`, `nombre`, `apellido`, `telefono`, `correo`, `direccion`, `contrasena_hash`, `fecha_nacimiento`, `genero`, `fecha_creacion`, `rol`) VALUES
(1, 1, 'Luz Alejandra', 'Palma Osorno', '4771234567', 'administrador@hanami.com', 'Blvd. Adolfo López Mateos 1802, León, Gto.', '12345', '2005-11-15', 'Femenino', '2026-11-18 06:02:08', 'cliente'),
(2, 2, 'Chef', 'Cocina Hanami', '4779876543', 'cocina@hanami.com', 'Sucursal Vía Alta León, Gto.', '12345', '2000-01-01', 'Masculino', '2026-11-18 06:02:08', 'cliente'),
(3, 3, 'Luz Alejandra', 'Palma Osorno', '4771554475', 'cliente@hanami.com', 'Paseo de los Insurgentes 300, León, Gto.', '12345', '2002-05-20', 'Femenino', '2026-11-18 06:02:08', 'cliente'),
(5, 3, 'aa', 'bb', '4771554475', 'q@gmail.com', 'lll', '12345', '2000-01-01', 'Femenino', '2026-11-19 05:41:14', 'cliente'),
(18, 3, 'ramon', 'osorno', '1234567899', 'ramon@gmail.com', 'yuca 120', '12345', '2000-01-01', 'Masculino', '2026-11-20 21:31:06', 'cliente');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `cortes_caja`
--
ALTER TABLE `cortes_caja`
  ADD PRIMARY KEY (`id`),
  ADD KEY `usuario_id` (`usuario_id`);

--
-- Indexes for table `cupones_canjeados`
--
ALTER TABLE `cupones_canjeados`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_correo_codigo` (`correo`,`codigo`);

--
-- Indexes for table `cupones_vip`
--
ALTER TABLE `cupones_vip`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `codigo` (`codigo`);

--
-- Indexes for table `materias_primas`
--
ALTER TABLE `materias_primas`
  ADD PRIMARY KEY (`id`),
  ADD KEY `proveedor_id` (`proveedor_id`);

--
-- Indexes for table `mermas`
--
ALTER TABLE `mermas`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `notificaciones_stock`
--
ALTER TABLE `notificaciones_stock`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `ordenes_compra`
--
ALTER TABLE `ordenes_compra`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `ordenes_compra_detalle`
--
ALTER TABLE `ordenes_compra_detalle`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `pedidos`
--
ALTER TABLE `pedidos`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `folio` (`folio`),
  ADD KEY `usuario_id` (`usuario_id`);

--
-- Indexes for table `productos`
--
ALTER TABLE `productos`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `proveedores`
--
ALTER TABLE `proveedores`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `recetas`
--
ALTER TABLE `recetas`
  ADD PRIMARY KEY (`id`),
  ADD KEY `producto_id` (`producto_id`),
  ADD KEY `materia_prima_id` (`materia_prima_id`);

--
-- Indexes for table `reservas`
--
ALTER TABLE `reservas`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `nombre` (`nombre`);

--
-- Indexes for table `usuarios`
--
ALTER TABLE `usuarios`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `correo` (`correo`),
  ADD KEY `rol_id` (`rol_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `cortes_caja`
--
ALTER TABLE `cortes_caja`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `cupones_canjeados`
--
ALTER TABLE `cupones_canjeados`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `cupones_vip`
--
ALTER TABLE `cupones_vip`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `materias_primas`
--
ALTER TABLE `materias_primas`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `mermas`
--
ALTER TABLE `mermas`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `notificaciones_stock`
--
ALTER TABLE `notificaciones_stock`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=107;

--
-- AUTO_INCREMENT for table `ordenes_compra`
--
ALTER TABLE `ordenes_compra`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `ordenes_compra_detalle`
--
ALTER TABLE `ordenes_compra_detalle`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `pedidos`
--
ALTER TABLE `pedidos`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=28;

--
-- AUTO_INCREMENT for table `productos`
--
ALTER TABLE `productos`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `proveedores`
--
ALTER TABLE `proveedores`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=24;

--
-- AUTO_INCREMENT for table `recetas`
--
ALTER TABLE `recetas`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=59;

--
-- AUTO_INCREMENT for table `reservas`
--
ALTER TABLE `reservas`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `roles`
--
ALTER TABLE `roles`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `usuarios`
--
ALTER TABLE `usuarios`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `cortes_caja`
--
ALTER TABLE `cortes_caja`
  ADD CONSTRAINT `cortes_caja_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`);

--
-- Constraints for table `materias_primas`
--
ALTER TABLE `materias_primas`
  ADD CONSTRAINT `materias_primas_ibfk_1` FOREIGN KEY (`proveedor_id`) REFERENCES `proveedores` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `pedidos`
--
ALTER TABLE `pedidos`
  ADD CONSTRAINT `pedidos_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`);

--
-- Constraints for table `recetas`
--
ALTER TABLE `recetas`
  ADD CONSTRAINT `recetas_ibfk_1` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `recetas_ibfk_2` FOREIGN KEY (`materia_prima_id`) REFERENCES `materias_primas` (`id`);

--
-- Constraints for table `usuarios`
--
ALTER TABLE `usuarios`
  ADD CONSTRAINT `usuarios_ibfk_1` FOREIGN KEY (`rol_id`) REFERENCES `roles` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
