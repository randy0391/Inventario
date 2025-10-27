// Array para almacenar todos los registros (Base de Datos Temporal en la Memoria del Navegador)
let inventarioData = [];
// Contador global para la generación de código numérico secuencial
let codigoContador = 1;

// Estructura de Subcategorías Dinámicas (Compactada)
const subcategoriasMap = {
    "EQUIPOS_DE_CÓMPUTO": ["LAPTOP", "PC_ESCRITORIO"],
    "PERIFÉRICOS": ["ENTRADA", "SALIDA", "ENTRADA/SALIDA", "PERIFERICO_DE_OFICINA"],
    "RED_Y_CONECTIVIDAD": ["DISPOSITIVOS_DE_RED", "CONECTIVIDAD_INALAMBRICA", "ACCESORIOS_DE_RED", "RADIOS_DE_COMUNICACION"],
    "ALMACENAMIENTO": ["EXTERNO", "RESPALDO"],
    "ACCESORIOS_Y_OTROS": ["ACCESORIOS", "SEGURIDAD", "CELULAR"],
    "AUDIO_Y_VIDEO": ["AUDIO", "VIDEO"],
    "ACCESORIOS_DE_ENERGÍA": ["CARGADORES_DE_DISPOSITIVOS_MOVILES", "CARGADORES_DE_COMPUTADORAS", "CARGADORES_DE_RADIOS", "ESTABILIZADORES_DE_VOLTAJE", "CARGADORES_GENERALES"]
};

// Encabezados del CSV
const CSV_HEADERS = [
    "Código", "Categoría", "Subcategoría", "Nombre del Equipo", "Marca", "Modelo", 
    "Serie", "Usuario", "CC", "Fecha de Adquisición", "Precio", "Ubicación", 
    "Estado", "Estado de Asignación", "Observación"
];

// REFERENCIAS DEL DOM (Compactadas)
const D = document.getElementById.bind(document);
const categoriaSelect = D('categoria'),
      subcategoriaSelect = D('subcategoria'),
      registroForm = D('registroForm'),
      resultadoBusquedaBody = D('resultadoBusqueda'); 

// =========================================================================
// LÓGICA DINÁMICA DE CATEGORÍAS
// =========================================================================

const actualizarSubcategorias = () => {
    const cat = categoriaSelect.value;
    subcategoriaSelect.innerHTML = '<option value="" disabled selected>Seleccione una subcategoría</option>';

    if (cat && subcategoriasMap[cat]) {
        subcategoriaSelect.disabled = false;
        subcategoriasMap[cat].forEach(subcat => {
            const opt = document.createElement('option');
            opt.value = subcat;
            opt.textContent = subcat.replace(/_/g, ' '); 
            subcategoriaSelect.appendChild(opt);
        });
    } else {
        subcategoriaSelect.disabled = true;
    }
}

categoriaSelect?.addEventListener('change', actualizarSubcategorias);

// =========================================================================
// LÓGICA DE GENERACIÓN DE CÓDIGO Y SERIE (OPTIMIZADA)
// =========================================================================

// Función auxiliar para obtener N caracteres alfanuméricos de un texto
const getAlphaNum = (str, len) => str.replace(/[^a-zA-Z0-9]/g, '').substring(0, len).toUpperCase();

/**
 * Genera la Serie Automática (Alfanumérica sin 'AUTO' ni 'X').
 */
const generarSerieAutomatica = (serieIngresada, nombreEquipo) => {
    if (serieIngresada.trim() !== "") return serieIngresada;

    // Prefijo basado en las 2 primeras letras del nombre del equipo (si existen)
    const prefijo = getAlphaNum(nombreEquipo, 2) || 'Z'; 
    // Generar un ID numérico de 6 dígitos basado en la fecha y un aleatorio.
    const datePart = (Date.now() % 100000).toString().padStart(5, '0'); // Últimos 5 dígitos del timestamp
    const randomPart = Math.floor(Math.random() * 10).toString(); // Un dígito aleatorio
    
    return `${prefijo}${datePart}${randomPart}`; // Ejemplo: LP3456789
}

/**
 * Genera el código de inventario (sin 'X'). 
 * Formato: [CAT_3]-[SUBCAT_3]-[MODELO_4]-[CONT_4]
 */
const generarCodigoInventario = (datos) => {
    // Componente de Categoría (3 caracteres)
    const cat = getAlphaNum(datos.categoria, 3);
    
    // Componente de Subcategoría (3 caracteres)
    const subcat = getAlphaNum(datos.subcategoria, 3);

    // Componente de Modelo (4 caracteres)
    const modelo = getAlphaNum(datos.modelo.trim() || datos.nombreEquipo.trim(), 4); 

    // Componente Numérico Secuencial (4 dígitos)
    const numeroSecuencial = codigoContador.toString().padStart(4, '0');
    
    // Código final 
    return `${cat}-${subcat}-${modelo}-${numeroSecuencial}`;
}

/**
 * Valida si un equipo ya está registrado.
 */
const equipoYaRegistrado = (nombreEquipo, marca, modelo) => {
    const [n, m, mod] = [nombreEquipo, marca, modelo].map(s => s.toUpperCase().trim());
    return inventarioData.some(item => 
        item['Nombre del Equipo'].toUpperCase().trim() === n &&
        item['Marca'].toUpperCase().trim() === m &&
        item['Modelo'].toUpperCase().trim() === mod
    );
}

// =========================================================================
// MOTOR DE BÚSQUEDA
// =========================================================================

/**
 * Filtra los productos y muestra SOLO los resultados de la búsqueda.
 */
window.buscarProducto = () => {
    const termino = D('terminoBusqueda').value.toUpperCase().trim();
    let html = '';

    if (termino !== "") {
        const resultados = inventarioData.filter(item => 
            (item['Código'] + item['Nombre del Equipo'] + item['Marca'] + item['Modelo']).toUpperCase().includes(termino)
        );

        html = resultados.length > 0
            ? resultados.map(item => `
                <tr>
                    <td>${item['Código']}</td>
                    <td>${item['Nombre del Equipo']}</td>
                    <td>${item['Marca']}</td>
                    <td>${item['Modelo']}</td>
                    <td>${item['Usuario'] || 'N/A'}</td>
                    <td><span class="badge bg-${item['Estado'] === 'Operativo' ? 'success' : 'warning'}">${item['Estado']}</span></td>
                </tr>
            `).join('')
            : `<tr><td colspan="6" class="text-center text-danger">No se encontraron productos con el término **"${termino}"**.</td></tr>`;
    } else {
        html = '<tr><td colspan="6" class="text-center text-muted">Ingrese un término en el campo de búsqueda para ver los resultados.</td></tr>';
    }

    resultadoBusquedaBody.innerHTML = html;
}


// =========================================================================
// LÓGICA DE GUARDADO (ENVÍO DEL FORMULARIO) - CORREGIDA
// =========================================================================

registroForm?.addEventListener('submit', function(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const form = e.target;

    if (form.checkValidity()) {
        const datos = {
            categoria: categoriaSelect.value,
            subcategoria: subcategoriaSelect.value,
            nombreEquipo: D('nombreEquipo').value,
            marca: D('marca').value,
            modelo: D('modelo').value,
            serie: D('serie').value, 
            usuario: D('usuario').value,
            cc: D('cc').value,
            fechaAdquisicion: D('fechaAdquisicion').value,
            precio: D('precio').value,
            ubicacion: D('ubicacion').value,
            estado: D('estado').value,
            estadoAsignacion: D('estadoAsignacion').value,
            observacion: D('observacion').value
        };

        if (equipoYaRegistrado(datos.nombreEquipo, datos.marca, datos.modelo)) {
            alert(`🔴 ¡ERROR! El equipo ${datos.nombreEquipo} - ${datos.modelo} ya está registrado.`);
            return; 
        }

        // 1. Generar Serie y Código
        datos.serie = generarSerieAutomatica(datos.serie, datos.nombreEquipo);
        const codigoGenerado = generarCodigoInventario(datos);

        // 2. Creación del Objeto de Producto Final (Mapeo explícito y CORREGIDO)
        const productoFinal = {
            'Código': codigoGenerado,
            'Categoría': datos.categoria.replace(/_/g, ' '),
            'Subcategoría': datos.subcategoria.replace(/_/g, ' '),
            'Nombre del Equipo': datos.nombreEquipo,
            'Marca': datos.marca,
            'Modelo': datos.modelo,
            'Serie': datos.serie, // La serie solo se asigna aquí, corrigiendo la duplicación en CSV.
            'Usuario': datos.usuario,
            'CC': datos.cc,
            'Fecha de Adquisición': datos.fechaAdquisicion,
            'Precio': datos.precio,
            'Ubicación': datos.ubicacion,
            'Estado': datos.estado,
            'Estado de Asignación': datos.estadoAsignacion,
            'Observación': datos.observacion
        };


        inventarioData.push(productoFinal);
        codigoContador++; 
        
        alert(`✅ ¡Guardado! Código: ${codigoGenerado}`);
        
        form.reset();
        form.classList.remove('was-validated');
        actualizarSubcategorias();
        buscarProducto();

    } else {
        form.classList.add('was-validated');
    }
});


// =========================================================================
// LÓGICA DE DESCARGA CSV
// =========================================================================

window.descargarCSV = () => {
    if (inventarioData.length === 0) {
        alert("No hay datos en el inventario para descargar.");
        return;
    }

    const SEP = ";"; 
    let csvContent = CSV_HEADERS.join(SEP) + "\n"; 

    inventarioData.forEach(item => {
        const row = CSV_HEADERS.map(header => {
            let value = (item[header] || "").toString();
            // Escapar el valor para CSV
            if (value.includes(SEP) || value.includes('\n') || value.includes('"')) {
                value = `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        });
        csvContent += row.join(SEP) + "\n";
    });

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' }); 
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    link.href = url;
    const fecha = new Date().toISOString().slice(0, 10).replace(/-/g, ''); 
    link.download = `Inventario_Equipos_${fecha}.csv`;
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    alert(`💾 Descarga del inventario (${inventarioData.length} registros) iniciada.`);
}

// Inicializar al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
    actualizarSubcategorias();
    buscarProducto();
});
