-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Nov 27, 2026 at 09:17 AM
-- Server version: 8.4.3
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
  `tipo_corte` enum('Diario','Semanal','Mensual') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
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
(2, 2, 'Diario', 500.00, 500.00, 0.00, 160.00, 1160.00, '2026-11-20 06:00:00'),
(4, 2, 'Diario', 500.00, 0.00, 0.00, 9680.00, 10180.00, '2026-11-26 06:00:00'),
(5, 2, 'Diario', 500.00, 0.00, 0.00, 0.00, 500.00, '2026-11-26 06:00:00'),
(6, 2, 'Diario', 500.00, 0.00, 0.00, 0.00, 500.00, '2026-11-27 06:00:00'),
(7, 2, 'Diario', 500.00, 0.00, 0.00, 0.00, 500.00, '2026-11-27 06:00:00');

-- --------------------------------------------------------

--
-- Table structure for table `cupones_canjeados`
--

CREATE TABLE `cupones_canjeados` (
  `id` int NOT NULL,
  `correo` varchar(180) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `codigo` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha_canje` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `cupones_vip`
--

CREATE TABLE `cupones_vip` (
  `id` int NOT NULL,
  `codigo` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion_descuento` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
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
  `nombre` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `categoria_abc` enum('Clase A','Clase B','Clase C') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo_unidad` enum('Costal','Kg','Piezas','Litros') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
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
(1, 2, 'Arroz japonés grano corto (Nishiki)', 'Clase A', 'Costal', 25.00, 4, 97222, 20000, 1250.00),
(2, 2, 'Alga Nori tostada (Paquete 50 hojas)', 'Clase B', 'Piezas', 0.50, 3, 1260, 100, 180.00),
(3, 2, 'Queso Crema tipo Philadelphia', 'Clase A', 'Kg', 1.00, 12, 12120, 3000, 110.00),
(4, 2, 'Pan molido Panko', 'Clase B', 'Costal', 10.00, 3, 29200, 8000, 480.00),
(5, 2, 'Salsa de Soja Premium / Sriracha', 'Clase B', 'Litros', 1.00, 22, 22245, 5000, 65.00),
(6, 1, 'Lomo de Salmón fresco de importación', 'Clase A', 'Kg', 1.00, 17, 16670, 5000, 340.00),
(7, 1, 'Atún aleta azul / aleta amarilla', 'Clase A', 'Kg', 1.00, 15, 14970, 4000, 380.00),
(8, 3, 'Aguacate Hass', 'Clase B', 'Kg', 1.00, 17, 16590, 5000, 55.00),
(9, 3, 'Pepino japonés sin semilla', 'Clase C', 'Kg', 1.00, 11, 11120, 2500, 25.00);

-- --------------------------------------------------------

--
-- Table structure for table `mermas`
--

CREATE TABLE `mermas` (
  `id` int NOT NULL,
  `insumo_id` int DEFAULT NULL,
  `cantidad` decimal(10,2) DEFAULT NULL,
  `motivo` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `notificaciones_stock`
--

CREATE TABLE `notificaciones_stock` (
  `id` int NOT NULL,
  `mensaje` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
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
(106, 'Cupón VIP activo disponible para clientes: HANAMI10 (10% de descuento acumulado (Al alcanzar 10 pedidos))', '2026-11-24 04:30:10'),
(107, 'Consumo venta (HM-4148): -80.0g de Arroz japonés grano corto (Nishiki).', '2026-11-27 02:24:35'),
(108, 'Consumo venta (HM-4148): -80.0g de Lomo de Salmón fresco de importación.', '2026-11-27 02:24:35'),
(109, 'Consumo venta (HM-4148): -80.0g de Queso Crema tipo Philadelphia.', '2026-11-27 02:24:35'),
(110, 'Consumo venta (HM-4148): -80.0g de Aguacate Hass.', '2026-11-27 02:24:35'),
(111, 'Consumo venta (HM-3079): -400.0g de Arroz japonés grano corto (Nishiki).', '2026-11-27 05:20:27'),
(112, 'Consumo venta (HM-3079): -400.0g de Lomo de Salmón fresco de importación.', '2026-11-27 05:20:27'),
(113, 'Consumo venta (HM-3079): -400.0g de Queso Crema tipo Philadelphia.', '2026-11-27 05:20:27'),
(114, 'Consumo venta (HM-3079): -400.0g de Aguacate Hass.', '2026-11-27 05:20:27'),
(115, 'Reabastecimiento #5 (Pendiente) por $760.00: Atún aleta azul / aleta amarilla: 2.0 kg ($760.00)', '2026-11-27 07:29:17'),
(116, 'Reabastecimiento #6 (Pendiente) por $360.00: Alga Nori tostada (Paquete 50 hojas): 2.0 pieza ($360.00)', '2026-11-27 07:51:54'),
(117, 'Reabastecimiento #7 (Entregado) por $360.00: Alga Nori tostada (Paquete 50 hojas): 2.0 pieza ($360.00)', '2026-11-27 07:52:04'),
(118, 'Consumo venta (HM-4398): -6260.0g de Arroz japonés grano corto (Nishiki).', '2026-11-27 08:07:59'),
(119, 'Consumo venta (HM-4398): -2260.0g de Salsa de Soja Premium / Sriracha.', '2026-11-27 08:07:59'),
(120, 'Consumo venta (HM-4398): -3360.0g de Lomo de Salmón fresco de importación.', '2026-11-27 08:07:59'),
(121, 'Consumo venta (HM-4398): -1830.0g de Atún aleta azul / aleta amarilla.', '2026-11-27 08:07:59'),
(122, 'Stock critico (HM-4398): Alga Nori tostada (Paquete 50 hojas) bajo a 90.0g.', '2026-11-27 08:07:59'),
(123, 'Consumo venta (HM-4398): -1280.0g de Queso Crema tipo Philadelphia.', '2026-11-27 08:07:59'),
(124, 'Consumo venta (HM-4398): -720.0g de Pan molido Panko.', '2026-11-27 08:07:59'),
(125, 'Consumo venta (HM-4398): -1800.0g de Aguacate Hass.', '2026-11-27 08:07:59'),
(126, 'Consumo venta (HM-4398): -840.0g de Pepino japonés sin semilla.', '2026-11-27 08:07:59'),
(127, 'Reabastecimiento #8 (Pendiente) por $360.00: Alga Nori tostada (Paquete 50 hojas): 2.0 paquete ($360.00)', '2026-11-27 08:24:29'),
(128, 'Orden #5 ENTREGADA: Mercancia sumada al inventario.', '2026-11-27 08:24:45'),
(129, 'Orden #8 ENTREGADA: Mercancia sumada al inventario.', '2026-11-27 08:24:47'),
(130, 'Orden #6 ENTREGADA: Mercancia sumada al inventario.', '2026-11-27 08:24:49'),
(131, 'Consumo venta (HM-9822): -120.0g de Arroz japonés grano corto (Nishiki).', '2026-11-27 08:32:57'),
(132, 'Consumo venta (HM-9822): -90.0g de Lomo de Salmón fresco de importación.', '2026-11-27 08:32:57'),
(133, 'Consumo venta (HM-9822): -50.0g de Aguacate Hass.', '2026-11-27 08:32:57'),
(134, 'Consumo venta (HM-9822): -40.0g de Pepino japonés sin semilla.', '2026-11-27 08:32:57'),
(135, 'Consumo venta (HM-9822): -15.0g de Salsa de Soja Premium / Sriracha.', '2026-11-27 08:32:57'),
(136, 'Consumo venta (HM-3593): -220.0g de Arroz japonés grano corto (Nishiki).', '2026-11-27 08:35:02'),
(137, 'Consumo venta (HM-3593): -30.0g de Alga Nori tostada (Paquete 50 hojas).', '2026-11-27 08:35:02'),
(138, 'Consumo venta (HM-3593): -80.0g de Queso Crema tipo Philadelphia.', '2026-11-27 08:35:02'),
(139, 'Consumo venta (HM-3593): -120.0g de Lomo de Salmón fresco de importación.', '2026-11-27 08:35:02'),
(140, 'Reabastecimiento #9 (Entregado) por $680.00: Lomo de Salmón fresco de importación: 2.0 kg ($680.00)', '2026-11-27 09:01:32');

-- --------------------------------------------------------

--
-- Table structure for table `ordenes_compra`
--

CREATE TABLE `ordenes_compra` (
  `id` int NOT NULL,
  `proveedor_id` int DEFAULT NULL,
  `insumo` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cantidad_costales` int DEFAULT NULL,
  `estado` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Pendiente',
  `fecha` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `ordenes_compra`
--

INSERT INTO `ordenes_compra` (`id`, `proveedor_id`, `insumo`, `cantidad_costales`, `estado`, `fecha`) VALUES
(1, 2, NULL, NULL, 'Entregado', '2026-11-19 05:24:48'),
(2, 2, NULL, NULL, 'Entregado', '2026-11-20 10:29:34'),
(3, 2, NULL, NULL, 'Entregado', '2026-11-20 21:37:38'),
(4, 2, NULL, NULL, 'Entregado', '2026-11-20 21:37:45'),
(5, 1, NULL, NULL, 'Entregado', '2026-11-27 07:29:17'),
(6, 2, NULL, NULL, 'Entregado', '2026-11-27 07:51:54'),
(7, 2, NULL, NULL, 'Entregado', '2026-11-27 07:52:04'),
(8, 2, NULL, NULL, 'Entregado', '2026-11-27 08:24:29'),
(9, 1, NULL, NULL, 'Entregado', '2026-11-27 09:01:32');

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
(4, 4, 1, 2000.00, 2500.00),
(5, 5, 7, 2000.00, 760.00),
(6, 6, 2, 200.00, 360.00),
(7, 7, 2, 200.00, 360.00),
(8, 8, 2, 1000.00, 360.00),
(9, 9, 6, 2000.00, 680.00);

-- --------------------------------------------------------

--
-- Table structure for table `pedidos`
--

CREATE TABLE `pedidos` (
  `id` int NOT NULL,
  `usuario_id` int NOT NULL,
  `folio` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo_pedido` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `estado` enum('Pendiente','En preparación','Completado','Listo para recoger','Entregado al Uber','Entregado','Cancelado') COLLATE utf8mb4_unicode_ci NOT NULL,
  `monto_total` decimal(10,2) NOT NULL,
  `resumen_articulos` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `notas` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `fecha_creacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `stock_descontado` tinyint(1) NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `pedidos`
--

INSERT INTO `pedidos` (`id`, `usuario_id`, `folio`, `tipo_pedido`, `estado`, `monto_total`, `resumen_articulos`, `notas`, `fecha_creacion`, `stock_descontado`) VALUES
(8, 3, 'HM-8445', 'Programado', 'Entregado', 313.00, '1x Nigiri (Base: [Arroz Nishiki, Salmón fresco, Aguacate, Pepino]), 1x Oshizushi (Base: [Arroz Nishiki, Salmón fresco, Aguacate] | Extras: [Salsa Tampico])', 'Pago: Transferencia | Fecha/Hora: 2026-11-19T23:14 | POS: Transferencia (Recibido)', '2026-11-19 05:14:51', 0),
(10, 5, 'HM-7907', 'Programado', 'Entregado', 135.00, '1x Nigiri (Base: [Arroz japonés grano corto (Nishiki), Alga Nori tostada (Paquete 50 hojas), Salsa de Soja Premium / Sriracha])', 'Pago: Transferencia | Fecha/Hora: 2026-11-20T14:21 | URGENTE', '2026-11-20 05:21:31', 0),
(11, 5, 'HM-1624', 'Uber Eats', 'Entregado', 163.00, '1x Gunkan (Base: [Arroz japonés grano corto (Nishiki), Salsa de Soja Premium / Sriracha] | Extras: [Salsa Tampico] | Nota: sins alsa)', 'Pago: Tarjeta | Dirección: lll | ALERGIAS: alergia a el arroz', '2026-11-20 05:22:02', 0),
(12, 5, 'HM-7450', 'Al Momento', 'Entregado', 160.00, '1x Oshizushi (Base: [Arroz Nishiki, Salmón fresco, Aguacate, Pepino])', 'Pago: Tarjeta | POS: Tarjeta / Ventanilla', '2026-11-20 05:23:17', 0),
(13, 5, 'HM-2317', 'Al Momento', 'Entregado', 160.00, '1x Oshizushi (Base: [Arroz japonés grano corto (Nishiki), Lomo de Salmón fresco de importación, Queso Crema tipo Philadelphia, Aguacate Hass])', 'Pago: Tarjeta | POS: Tarjeta / Ventanilla', '2026-11-20 05:23:26', 0),
(17, 5, 'HM-8973', 'Al Momento', 'Entregado', 160.00, '1x Oshizushi (Base: [Arroz Nishiki, Salmón fresco, Aguacate, Pepino])', 'Pago: Transferencia | Pendiente enviar comprobante y mostrar en ventanilla | POS: Transferencia (Recibido) | POS: Transferencia (Recibido) | POS: Transferencia (Recibido) | POS: Transferencia (Recibido)', '2026-11-20 07:54:31', 0),
(23, 18, 'HM-4703', 'Al Momento', 'Entregado', 348.00, '1x Oshizushi (Base: [Arroz japonés grano corto (Nishiki), Lomo de Salmón fresco de importación, Queso Crema tipo Philadelphia, Aguacate Hass] | Extras: [Queso Crema Extra]), 1x Nigiri (Base: [Arroz japonés grano corto (Nishiki), Salsa de Soja Premium / Sriracha, Lomo de Salmón fresco de importación, Atún aleta azul / aleta amarilla] | Extras: [Salsa Tampico, Chile Toreado])', 'Pago: Tarjeta | Tarjeta terminación 1234 (Aprobado) | URGENTE | [IMPRESO] POS: Tarjeta / Ventanilla', '2026-11-20 21:33:29', 0),
(26, 3, 'HM-9420', 'Uber Eats', 'Entregado', 466.00, '1x Nigiri (Base: [Arroz japonés grano corto (Nishiki), Salsa de Soja Premium / Sriracha, Lomo de Salmón fresco de importación, Atún aleta azul / aleta amarilla] | Extras: [Salsa Tampico]), 1x Nigiri, 1x Oshizushi (Extras: [Salsa Tampico])', 'Pago: Transferencia | Pendiente enviar comprobante y mostrar en ventanilla | Dirección: Paseo de los Insurgentes 300, León, Gto. | [IMPRESO] POS: Transferencia (Recibido)', '2026-11-24 00:06:48', 0),
(28, 3, 'HM-4148', 'Al Momento', 'Cancelado', 160.00, '1x Oshizushi (Base: [Arroz japonés grano corto (Nishiki), Lomo de Salmón fresco de importación, Queso Crema tipo Philadelphia, Aguacate Hass])', 'Pago: Transferencia | Pendiente enviar comprobante y mostrar en ventanilla | [CANCELADO: no quiero we]', '2026-11-27 02:24:35', 0),
(29, 3, 'HM-3079', 'Al Momento', 'Entregado', 800.00, '5x Oshizushi (Base: [Arroz japonés grano corto (Nishiki), Lomo de Salmón fresco de importación, Queso Crema tipo Philadelphia, Aguacate Hass])', 'Pago: Transferencia | Pendiente enviar comprobante y mostrar en ventanilla | [IMPRESO] POS: Transferencia (Recibido)', '2026-11-27 02:53:25', 1),
(30, 3, 'HM-4398', 'Al Momento', 'Entregado', 8880.00, '9x Nigiri (Base: [Arroz japonés grano corto (Nishiki), Salsa de Soja Premium / Sriracha, Lomo de Salmón fresco de importación, Atún aleta azul / aleta amarilla]), 8x Gunkan (Base: [Arroz japonés grano corto (Nishiki), Salsa de Soja Premium / Sriracha, Alga Nori tostada (Paquete 50 hojas), Atún aleta azul / aleta amarilla]), 9x Uramaki Estilo Mexicano (Base: [Arroz japonés grano corto (Nishiki), Queso Crema tipo Philadelphia, Pan molido Panko, Aguacate Hass, Salsa de Soja Premium / Sriracha, Atún aleta azul / aleta amarilla]), 14x Hosomaki (Base: [Arroz japonés grano corto (Nishiki), Alga Nori tostada (Paquete 50 hojas), Queso Crema tipo Philadelphia, Lomo de Salmón fresco de importación]), 12x Temaki (Base: [Arroz japonés grano corto (Nishiki), Alga Nori tostada (Paquete 50 hojas), Aguacate Hass, Pepino japonés sin semilla, Lomo de Salmón fresco de importación]), 12x Chirashizushi (Base: [Arroz japonés grano corto (Nishiki), Lomo de Salmón fresco de importación, Aguacate Hass, Pepino japonés sin semilla, Salsa de Soja Premium / Sriracha])', 'Pago: Transferencia | Pendiente enviar comprobante y mostrar en ventanilla | URGENTE | [IMPRESO] POS: Transferencia (Recibido)', '2026-11-27 05:37:25', 1),
(31, 3, 'HM-9822', 'Al Momento', 'Entregado', 243.00, '1x Chirashizushi (Base: [Arroz japonés grano corto (Nishiki), Lomo de Salmón fresco de importación, Aguacate Hass, Pepino japonés sin semilla, Salsa de Soja Premium / Sriracha] | Extras: [Queso Crema Extra, Aguacate Extra, Salsa Tampico, Chile Toreado])', 'Pago: Transferencia | Pendiente enviar comprobante y mostrar en ventanilla | [IMPRESO] POS: Transferencia (Recibido) | [IMPRESO] POS: Transferencia (Recibido)', '2026-11-27 08:20:14', 1),
(32, 3, 'HM-3593', 'Programado', 'Entregado', 406.00, '2x Hosomaki (Base: [Arroz japonés grano corto (Nishiki), Alga Nori tostada (Paquete 50 hojas), Queso Crema tipo Philadelphia, Lomo de Salmón fresco de importación] | Extras: [Queso Crema Extra, Aguacate Extra, Salsa Tampico, Chile Toreado])', 'Pago: Transferencia | Pendiente enviar comprobante y mostrar en ventanilla | Fecha/Hora: 2026-11-27T20:00 | [IMPRESO] POS: Transferencia (Recibido)', '2026-11-27 08:29:59', 1);

-- --------------------------------------------------------

--
-- Table structure for table `pedido_detalles`
--

CREATE TABLE `pedido_detalles` (
  `id` int NOT NULL,
  `pedido_id` int NOT NULL,
  `producto_id` int NOT NULL,
  `cantidad` int NOT NULL,
  `ingredientes` json DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `pedido_detalles`
--

INSERT INTO `pedido_detalles` (`id`, `pedido_id`, `producto_id`, `cantidad`, `ingredientes`) VALUES
(1, 29, 7, 5, '[\"Arroz japonés grano corto (Nishiki)\", \"Lomo de Salmón fresco de importación\", \"Queso Crema tipo Philadelphia\", \"Aguacate Hass\"]'),
(2, 30, 6, 9, '[\"Arroz japonés grano corto (Nishiki)\", \"Salsa de Soja Premium / Sriracha\", \"Lomo de Salmón fresco de importación\", \"Atún aleta azul / aleta amarilla\"]'),
(3, 30, 5, 8, '[\"Arroz japonés grano corto (Nishiki)\", \"Salsa de Soja Premium / Sriracha\", \"Alga Nori tostada (Paquete 50 hojas)\", \"Atún aleta azul / aleta amarilla\"]'),
(4, 30, 4, 9, '[\"Arroz japonés grano corto (Nishiki)\", \"Queso Crema tipo Philadelphia\", \"Pan molido Panko\", \"Aguacate Hass\", \"Salsa de Soja Premium / Sriracha\", \"Atún aleta azul / aleta amarilla\"]'),
(5, 30, 3, 14, '[\"Arroz japonés grano corto (Nishiki)\", \"Alga Nori tostada (Paquete 50 hojas)\", \"Queso Crema tipo Philadelphia\", \"Lomo de Salmón fresco de importación\"]'),
(6, 30, 2, 12, '[\"Arroz japonés grano corto (Nishiki)\", \"Alga Nori tostada (Paquete 50 hojas)\", \"Aguacate Hass\", \"Pepino japonés sin semilla\", \"Lomo de Salmón fresco de importación\"]'),
(7, 30, 1, 12, '[\"Arroz japonés grano corto (Nishiki)\", \"Lomo de Salmón fresco de importación\", \"Aguacate Hass\", \"Pepino japonés sin semilla\", \"Salsa de Soja Premium / Sriracha\"]'),
(8, 31, 1, 1, '[\"Arroz japonés grano corto (Nishiki)\", \"Lomo de Salmón fresco de importación\", \"Aguacate Hass\", \"Pepino japonés sin semilla\", \"Salsa de Soja Premium / Sriracha\"]'),
(9, 32, 3, 2, '[\"Arroz japonés grano corto (Nishiki)\", \"Alga Nori tostada (Paquete 50 hojas)\", \"Queso Crema tipo Philadelphia\", \"Lomo de Salmón fresco de importación\"]');

-- --------------------------------------------------------

--
-- Table structure for table `productos`
--

CREATE TABLE `productos` (
  `id` int NOT NULL,
  `nombre` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `precio` decimal(10,2) NOT NULL,
  `stock_porciones` int NOT NULL,
  `imagen_url` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `disponible` tinyint(1) DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `productos`
--

INSERT INTO `productos` (`id`, `nombre`, `descripcion`, `precio`, `stock_porciones`, `imagen_url`, `disponible`) VALUES
(1, 'Chirashizushi', 'Bowl de arroz sazonado con cortes frescos de salmón, aguacate cremoso, pepino y toque cítrico.', 165.00, 0, 'assets/chirashizushi.jpg', 1),
(2, 'Temaki', 'Cono crujiente de alga nori relleno de arroz al vapor, surimi estilo tampico, aguacate y pepino fresco.', 115.00, 0, 'https://www.orientalmarket.es/wp-content/uploads/2015/10/Temaki-Salm%C3%A3o-1024x683.jpg', 1),
(3, 'Hosomaki', 'Rollo tradicional delgado envuelto en alga nori con relleno clásico, queso crema y frescura equilibrada.', 125.00, 0, 'https://cdn.shopify.com/s/files/1/0353/5621/articles/Hosomaki-Sushi-Rolls_1112x.jpg?v=1612387843', 1),
(4, 'Uramaki Estilo Mexicano', 'Rollo empanizado crujiente por fuera con arroz por dentro, queso crema, aguacate y aderezo chipotle-sriracha.', 155.00, 0, 'https://gomagcdn.ro/domains/eihshop.ro/files/files/uramaki-sushi-header-17329.jpeg', 1),
(5, 'Gunkan', 'Barquitos de arroz envueltos en nori coronados con pasta tampico artesanal y toque picante de sriracha.', 145.00, 0, 'https://images.unsplash.com/photo-1611143669185-af224c5e3252?auto=format&fit=crop&w=600&q=80', 1),
(6, 'Nigiri', 'Arroz moldeado a mano cubierto con láminas frescas de salmón seleccionado y un sutil barniz de soya dulce.', 135.00, 0, 'https://img.freepik.com/premium-photo/photo-platter-sushi-nigiri-with-fresh-fish-slices-perfectly-formed-rice-generative-ai_630290-10506.jpg', 1),
(7, 'Oshizushi', 'Sushi prensado estilo Osaka en capas geométricas de arroz sazonado, salmón, queso crema y aguacate.', 160.00, 0, 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=600&q=80', 1);

-- --------------------------------------------------------

--
-- Table structure for table `proveedores`
--

CREATE TABLE `proveedores` (
  `id` int NOT NULL,
  `nombre` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `contacto_nombre` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `telefono` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `correo` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `categoria` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL
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
  `cliente` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `horario` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `estado` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Reservada',
  `fecha` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `reservas`
--

INSERT INTO `reservas` (`id`, `mesa`, `cliente`, `horario`, `estado`, `fecha`) VALUES
(2, 1, 'q@gmail.com', '20:00 - 21:30', 'Confirmada / Reservada', '2026-11-20'),
(3, 1, 'q@gmail.com', '14:00 - 15:30', 'Confirmada / Reservada', '2026-11-21'),
(4, 3, 'CRIS@GMAIL.COM', '18:00 - 19:30', 'Confirmada / Reservada', '2026-11-21'),
(5, 3, 'ramon@gmail.com', '18:00 - 19:30', 'Confirmada / Reservada', '2026-11-28');

-- --------------------------------------------------------

--
-- Table structure for table `roles`
--

CREATE TABLE `roles` (
  `id` int NOT NULL,
  `nombre` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL
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
  `nombre` varchar(60) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `apellido` varchar(60) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `telefono` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `correo` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `direccion` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `contrasena_hash` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha_nacimiento` date NOT NULL,
  `genero` enum('Masculino','Femenino','Otro') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha_creacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `rol` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'cliente',
  `turno` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Sin asignar'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `usuarios`
--

INSERT INTO `usuarios` (`id`, `rol_id`, `nombre`, `apellido`, `telefono`, `correo`, `direccion`, `contrasena_hash`, `fecha_nacimiento`, `genero`, `fecha_creacion`, `rol`, `turno`) VALUES
(1, 1, 'Luz Alejandra', 'Palma Osorno', '4771234567', 'administrador@hanami.com', 'Blvd. Adolfo López Mateos 1802, León, Gto.', '12345', '2005-11-15', 'Femenino', '2026-11-18 06:02:08', 'cliente', 'Sin asignar'),
(2, 2, 'Chef', 'Cocina Hanami', '4779876543', 'cocina@hanami.com', 'Sucursal Vía Alta León, Gto.', '12345', '2000-01-01', 'Masculino', '2026-11-18 06:02:08', 'cliente', 'Sin asignar'),
(3, 3, 'Luz Alejandra', 'Palma Osorno', '4771554475', 'cliente@hanami.com', 'Paseo de los Insurgentes 300, León, Gto.', '12345', '2002-05-20', 'Femenino', '2026-11-18 06:02:08', 'cliente', 'Sin asignar'),
(5, 3, 'aa', 'bb', '4771554475', 'q@gmail.com', 'lll', '12345', '2000-01-01', 'Femenino', '2026-11-19 05:41:14', 'cliente', 'Sin asignar'),
(18, 3, 'ramon', 'osorno', '1234567899', 'ramon@gmail.com', 'yuca 120', '12345', '2000-01-01', 'Masculino', '2026-11-20 21:31:06', 'cliente', 'Sin asignar'),
(19, 3, 'leonardo', 'hz', '4670123456', 'leonardozepedax@outlook.com', 'Calle # 67', '12345', '2000-01-01', 'Masculino', '2026-11-26 23:39:29', 'cliente', 'Sin asignar');

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
-- Indexes for table `pedido_detalles`
--
ALTER TABLE `pedido_detalles`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_pedido_detalles_pedido` (`pedido_id`),
  ADD KEY `idx_pedido_detalles_producto` (`producto_id`);

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
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

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
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=141;

--
-- AUTO_INCREMENT for table `ordenes_compra`
--
ALTER TABLE `ordenes_compra`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `ordenes_compra_detalle`
--
ALTER TABLE `ordenes_compra_detalle`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `pedidos`
--
ALTER TABLE `pedidos`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=33;

--
-- AUTO_INCREMENT for table `pedido_detalles`
--
ALTER TABLE `pedido_detalles`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

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
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `roles`
--
ALTER TABLE `roles`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `usuarios`
--
ALTER TABLE `usuarios`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

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
