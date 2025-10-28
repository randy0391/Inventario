<?php
require_once 'db_config.php';
// Incluimos la lógica de generación de código/serie de JS, adaptada a PHP
require_once 'script_logic.php'; 

header('Content-Type: application/json');
$response = ['success' => false, 'message' => ''];

$action = $_GET['action'] ?? '';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'guardar') {
    // -----------------------------------------------------------
    // Lógica para GUARDAR un nuevo registro
    // -----------------------------------------------------------

    // Recoger y sanear datos del formulario POST (¡usar la conexión para sanear!)
    $data = [
        'categoria' => $conn->real_escape_string($_POST['categoria'] ?? ''),
        'subcategoria' => $conn->real_escape_string($_POST['subcategoria'] ?? ''),
        'nombreEquipo' => $conn->real_escape_string($_POST['nombreEquipo'] ?? ''),
        'marca' => $conn->real_escape_string($_POST['marca'] ?? ''),
        'modelo' => $conn->real_escape_string($_POST['modelo'] ?? ''),
        'serie' => $conn->real_escape_string($_POST['serie'] ?? ''),
        'usuario' => $conn->real_escape_string($_POST['usuario'] ?? ''),
        'cc' => $conn->real_escape_string($_POST['cc'] ?? ''),
        'fechaAdquisicion' => $conn->real_escape_string($_POST['fechaAdquisicion'] ?? ''),
        'precio' => (float)($_POST['precio'] ?? 0),
        'moneda' => $conn->real_escape_string($_POST['moneda'] ?? ''),
        'ubicacion' => $conn->real_escape_string($_POST['ubicacion'] ?? ''),
        'estado' => $conn->real_escape_string($_POST['estado'] ?? ''),
        'estadoAsignacion' => $conn->real_escape_string($_POST['estadoAsignacion'] ?? ''),
        'observacion' => $conn->real_escape_string($_POST['observacion'] ?? '')
    ];

    // Validación básica
    if (empty($data['nombreEquipo']) || empty($data['categoria']) || empty($data['precio'])) {
        $response['message'] = 'Faltan campos obligatorios.';
        echo json_encode($response);
        exit;
    }

    // 1. Generar Serie y Código usando las funciones de PHP (script_logic.php)
    $contador_secuencial = getAndIncrementContador($conn);
    
    if ($contador_secuencial === 0) {
        $response['message'] = 'Error al obtener el contador secuencial. No se puede guardar.';
        echo json_encode($response);
        exit;
    }

    $serie_final = generarSerieAutomatica($data['serie'], $data['nombreEquipo']);
    $codigo_generado = generarCodigoInventario($data, $contador_secuencial);

    // 2. Preparar la inserción en la BD
    $sql = "INSERT INTO equipos (
        codigo, serie, categoria, subcategoria, nombre_equipo, marca, modelo, 
        usuario_asignado, cc, fecha_adquisicion, precio, moneda, ubicacion, 
        estado, estado_asignacion, observacion
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    
    $stmt = $conn->prepare($sql);

    // Enlazar parámetros (16 parámetros)
    // s: string, d: double/decimal
    $stmt->bind_param("ssssssssssdsssss", 
        $codigo_generado, 
        $serie_final, 
        $data['categoria'], 
        $data['subcategoria'], 
        $data['nombreEquipo'], 
        $data['marca'], 
        $data['modelo'], 
        $data['usuario'], 
        $data['cc'], 
        $data['fechaAdquisicion'], 
        $data['precio'], 
        $data['moneda'], 
        $data['ubicacion'], 
        $data['estado'], 
        $data['estadoAsignacion'], 
        $data['observacion']
    );

    if ($stmt->execute()) {
        $response['success'] = true;
        $response['message'] = "Registro guardado con éxito. Código: " . $codigo_generado;
        $response['codigo'] = $codigo_generado;
        $response['id'] = $conn->insert_id;
    } else {
        // Error 1062 es por duplicado (código o serie)
        if ($conn->errno == 1062) {
             $response['message'] = "Error: El Código o la Serie ya existe en la base de datos.";
        } else {
             $response['message'] = "Error al guardar: " . $stmt->error;
        }
    }

    $stmt->close();


} elseif ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'buscar') {
    // -----------------------------------------------------------
    // Lógica para BUSCAR registros
    // -----------------------------------------------------------
    
    $termino = $conn->real_escape_string($_GET['termino'] ?? '');
    $equipos = [];

    // La búsqueda se realizará contra múltiples campos
    $sql = "SELECT codigo, nombre_equipo, marca, modelo, serie, usuario_asignado, estado, moneda, precio
            FROM equipos";
    
    if (!empty($termino)) {
        // Utilizamos LIKE para una búsqueda parcial en varios campos
        $search_term = "%{$termino}%";
        $sql .= " WHERE codigo LIKE ? OR nombre_equipo LIKE ? OR marca LIKE ? OR modelo LIKE ? OR serie LIKE ?";
        
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("sssss", $search_term, $search_term, $search_term, $search_term, $search_term);
    } else {
        // Si no hay término, no buscamos (podemos retornar vacío o todo, elegimos vacío por defecto)
        $sql .= " WHERE 1 = 0"; // No devuelve resultados si el término está vacío
        $stmt = $conn->prepare($sql);
    }
    
    $stmt->execute();
    $result = $stmt->get_result();

    while ($row = $result->fetch_assoc()) {
        $equipos[] = $row;
    }
    
    $stmt->close();
    
    $response['success'] = true;
    $response['data'] = $equipos;


} elseif ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'descargar') {
    // -----------------------------------------------------------
    // Lógica para DESCARGAR el CSV
    // -----------------------------------------------------------
    
    $sql = "SELECT 
        codigo AS 'Código',
        REPLACE(categoria, '_', ' ') AS 'Categoría',
        REPLACE(subcategoria, '_', ' ') AS 'Subcategoría',
        nombre_equipo AS 'Nombre del Equipo',
        marca AS 'Marca',
        modelo AS 'Modelo',
        serie AS 'Serie',
        usuario_asignado AS 'Usuario',
        cc AS 'CC',
        fecha_adquisicion AS 'Fecha de Adquisición',
        CONCAT(
            CASE moneda 
                WHEN 'USD' THEN '$' 
                WHEN 'EUR' THEN '€' 
                WHEN 'PEN' THEN 'S/' 
                ELSE moneda 
            END,
            ' ',
            FORMAT(precio, 2)
        ) AS 'Precio', -- Precio formateado para el CSV
        ubicacion AS 'Ubicación',
        estado AS 'Estado',
        estado_asignacion AS 'Estado de Asignación',
        observacion AS 'Observación'
    FROM equipos
    ORDER BY fecha_registro DESC";

    $result = $conn->query($sql);
    
    if ($result && $result->num_rows > 0) {
        $delimiter = ";";
        $filename = "Inventario_Equipos_" . date('Ymd') . ".csv";
        
        // Configurar encabezados para descarga de CSV
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="' . $filename . '";');
        
        // Abrir el puntero de salida
        $output = fopen('php://output', 'w');
        
        // Escribir la marca de byte para UTF-8 (BOM)
        fprintf($output, chr(0xEF).chr(0xBB).chr(0xBF));

        // Obtener encabezados de la consulta (nombres de las columnas)
        $headers = [];
        $fields = $result->fetch_fields();
        foreach ($fields as $field) {
            $headers[] = $field->name;
        }
        fputcsv($output, $headers, $delimiter);
        
        // Escribir filas de datos
        while ($row = $result->fetch_assoc()) {
            fputcsv($output, $row, $delimiter);
        }
        
        fclose($output);
        exit;
    } else {
        $response['success'] = false;
        $response['message'] = "No hay registros para descargar.";
        // Esto no se verá en el navegador, solo en caso de un error de PHP.
    }

} else {
    // Si la acción no es válida
    $response['message'] = 'Acción o método no permitido.';
    http_response_code(400); // Bad Request
}

echo json_encode($response);

$conn->close();
?>