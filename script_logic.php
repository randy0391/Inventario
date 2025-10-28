<?php
/**
 * LÓGICA DE GENERACIÓN DE CÓDIGO Y SERIE (ADAPTADA A PHP)
 */

/**
 * Función auxiliar para obtener N caracteres alfanuméricos de un texto
 * @param string $str El texto de entrada.
 * @param int $len La longitud deseada.
 * @return string Los caracteres alfanuméricos en mayúsculas.
 */
function getAlphaNum($str, $len) {
    // Reemplaza cualquier cosa que no sea a-z, A-Z, 0-9 con vacío
    $clean_str = preg_replace('/[^a-zA-Z0-9]/', '', $str);
    return strtoupper(substr($clean_str, 0, $len));
}

/**
 * Genera la Serie Automática (Alfanumérica).
 * @param string $serieIngresada La serie ingresada por el usuario (si existe).
 * @param string $nombreEquipo El nombre del equipo.
 * @return string La serie final.
 */
function generarSerieAutomatica($serieIngresada, $nombreEquipo) {
    if (trim($serieIngresada) !== "") return trim($serieIngresada);

    // Prefijo basado en las 2 primeras letras del nombre del equipo (si existen)
    $prefijo = getAlphaNum($nombreEquipo, 2) ?: 'Z'; 
    // Generar un ID numérico de 6 dígitos basado en la fecha y un aleatorio.
    $datePart = str_pad(substr(time(), -5), 5, '0', STR_PAD_LEFT); 
    $randomPart = (string)rand(0, 9);
    
    return "{$prefijo}{$datePart}{$randomPart}";
}

/**
 * Genera el código de inventario. 
 * Formato: [CAT_3]-[SUBCAT_3]-[MODELO_4]-[CONT_4]
 * @param array $datos Los datos del formulario.
 * @param int $contadorSecuencial El valor del contador de la BD.
 * @return string El código de inventario final.
 */
function generarCodigoInventario($datos, $contadorSecuencial) {
    // Componente de Categoría (3 caracteres)
    $cat = getAlphaNum($datos['categoria'], 3);
    
    // Componente de Subcategoría (3 caracteres)
    $subcat = getAlphaNum($datos['subcategoria'], 3);

    // Componente de Modelo (4 caracteres)
    $modelo_or_name = trim($datos['modelo']) ?: trim($datos['nombreEquipo']);
    $modelo = getAlphaNum($modelo_or_name, 4); 

    // Componente Numérico Secuencial (4 dígitos)
    $numeroSecuencial = str_pad($contadorSecuencial, 4, '0', STR_PAD_LEFT);
    
    // Código final 
    return "{$cat}-{$subcat}-{$modelo}-{$numeroSecuencial}";
}
?>