<?php
/**
 * Configuración de la Base de Datos y Conexión
 */
const DB_SERVER = 'localhost';
const DB_USERNAME = 'root';     // ¡IMPORTANTE: CAMBIAR por tu usuario de MySQL!
const DB_PASSWORD = '';         // ¡IMPORTANTE: CAMBIAR por tu contraseña de MySQL!
const DB_NAME = 'inventario_db';

// Establecer la conexión
$conn = new mysqli(DB_SERVER, DB_USERNAME, DB_PASSWORD, DB_NAME);

// Verificar la conexión
if ($conn->connect_error) {
    // En producción, usa un mensaje menos específico por seguridad.
    http_response_code(500);
    die(json_encode(['success' => false, 'message' => 'Error de conexión a la base de datos: ' . $conn->connect_error]));
}

// Establecer el charset a UTF-8
$conn->set_charset("utf8mb4");


/**
 * Función para obtener el contador secuencial y actualizarlo de forma segura (Transacción).
 * @param mysqli $conn La conexión a la base de datos.
 * @return int El valor del contador.
 */
function getAndIncrementContador($conn) {
    $conn->begin_transaction();
    try {
        // 1. Bloquear y obtener el valor actual
        $stmt_select = $conn->prepare("SELECT valor FROM contador WHERE id = 1 FOR UPDATE");
        $stmt_select->execute();
        $result = $stmt_select->get_result();
        $row = $result->fetch_assoc();
        $contador_actual = $row['valor'];
        $stmt_select->close();

        // 2. Incrementar el valor
        $nuevo_contador = $contador_actual + 1;

        // 3. Actualizar el valor en la BD
        $stmt_update = $conn->prepare("UPDATE contador SET valor = ? WHERE id = 1");
        $stmt_update->bind_param("i", $nuevo_contador);
        $stmt_update->execute();
        $stmt_update->close();

        // 4. Confirmar la transacción
        $conn->commit();
        return $contador_actual;

    } catch (Exception $e) {
        $conn->rollback();
        error_log("Error al gestionar el contador: " . $e->getMessage());
        return 0; // Devolver 0 indicando error
    }
}
?>