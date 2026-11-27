-- Agrega el turno asignado al personal de Hanami.
-- Los usuarios existentes quedan como "Sin asignar" hasta que el gerente
-- actualice su horario.
ALTER TABLE usuarios
    ADD COLUMN turno VARCHAR(30) NOT NULL DEFAULT 'Sin asignar' AFTER rol;
