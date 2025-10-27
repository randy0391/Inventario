// =========================================================================
// SCRIPT.JS FINAL: Conectado a Google Apps Script
// =========================================================================

// ¡ATENCIÓN! ESTA ES LA URL DE TU APLICACIÓN WEB DE GOOGLE APPS SCRIPT.
// Si el error CORS regresa, debes REDESPLEGAR y actualizar esta URL.
const GOOGLE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzae2eff0v8HSli3RLXK1sQkdIRKN1m6aOm2A_9W84p7PEt5Fjr4bCPfu0LUxlqNZUckA/exec'; 

let codigoContador = 1; 

const subcategoriasMap = {
    "EQUIPOS_DE_CÓMPUTO": ["LAPTOP", "PC_ESCRITORIO"],
    "PERIFÉRICOS": ["ENTRADA", "SALIDA", "ENTRADA/SALIDA", "PERIFERICO_DE_OFICINA"],
    "RED_Y_CONECTIVIDAD": ["DISPOSITIVOS_DE_RED", "CONECTIVIDAD_INALAMBRICA", "ACCESORIOS_DE_RED", "RADIOS_DE_COMUNICACION"],
    "ALMACENAMIENTO": ["EXTERNO", "RESPALDO"],
    "ACCESORIOS_Y_OTROS": ["ACCESORIOS", "SEGURIDAD", "CELULAR"],
    "AUDIO_Y_VIDEO": ["AUDIO", "VIDEO"],
    "ACCESORIOS_DE_ENERGÍA": ["CARGADORES_DE_DISPOSITIVOS_MOVILES", "CARGADORES_DE_COMPUTADORAS", "CARGADORES_DE_RADIOS", "ESTABILIZADORES_DE_VOLTAJE", "CARGADORES_GENERALES"]
};

const D = document.getElementById.bind(document);
const categoriaSelect = D('categoria'),
      subcategoriaSelect = D('subcategoria'),
      registroForm = D('registroForm'),
      resultadoBusquedaBody = D('resultadoBusqueda'); 

// ... LÓGICA DINÁMICA DE CATEGORÍAS ...

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

// ... LÓGICA DE GENERACIÓN DE CÓDIGO Y SERIE ...

const getAlphaNum = (str, len) => str.replace(/[^a-zA-Z0-9]/g, '').substring(0, len).toUpperCase();

const generarSerieAutomatica = (serieIngresada, nombreEquipo) => {
    if (serieIngresada.trim() !== "") return serieIngresada;
    const prefijo = getAlphaNum(nombreEquipo, 2) || 'Z'; 
    const datePart = (Date.now() % 100000).toString().padStart(5, '0'); 
    const randomPart = Math.floor(Math.random() * 10).toString(); 
    return `${prefijo}${datePart}${randomPart}`;
}

const generarCodigoInventario = (datos) => {
    const cat = getAlphaNum(datos.categoria, 3);
    const subcat = getAlphaNum(datos.subcategoria, 3);
    const modelo = getAlphaNum(datos.modelo.trim() || datos.nombreEquipo.trim(), 4); 
    const numeroSecuencial = codigoContador.toString().padStart(4, '0');
    return `${cat}-${subcat}-${modelo}-${numeroSecuencial}`;
}

// =========================================================================
// MOTOR DE BÚSQUEDA (FINAL: ESPERANDO JSON)
// =========================================================================

window.handleSearchResults = (resultados) => {
    // Muestra los resultados una vez que el script de Google se ha ejecutado
    mostrarResultados(resultados);
    
    // Limpia la etiqueta script inyectada para no saturar el DOM
    const scriptTag = document.getElementById('jsonpScript');
    if (scriptTag) {
        scriptTag.remove();
    }
};

window.buscarProducto = async () => {
    const termino = D('terminoBusqueda').value.trim();
    resultadoBusquedaBody.innerHTML = '<tr><td colspan="6" class="text-center text-info">Cargando resultados...</td></tr>';

    if (termino.length < 3 && termino.length !== 0) {
        resultadoBusquedaBody.innerHTML = '<tr><td colspan="6" class="text-center text-warning">Ingrese al menos 3 caracteres para buscar.</td></tr>';
        return;
    }
    
    if (termino === '') {
        resultadoBusquedaBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Ingrese un término para iniciar la búsqueda.</td></tr>';
        return;
    }

    try {
        const urlBusqueda = `${GOOGLE_APPS_SCRIPT_URL}?action=buscar&query=${encodeURIComponent(termino)}`;

        // 🔥 CRÍTICO: fetch estándar (sin 'mode: no-cors' ni JSONP)
        const response = await fetch(urlBusqueda); 
        
        if (response.ok) {
            // Leer la respuesta como JSON
            const resultados = await response.json(); 
            mostrarResultados(resultados);
        } else {
            throw new Error(`Error en la respuesta del servidor: ${response.status} ${response.statusText}`);
        }

    } catch (error) {
        console.error('Error al realizar la búsqueda:', error);
        // Si sale este error aquí, verifica la Consola (F12) por un error CORS.
        resultadoBusquedaBody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">🔴 Error al conectar. Si ve CORS, debe redesplegar en Apps Script.</td></tr>';
    }
}

const mostrarResultados = (data) => {
    if (data.length === 0) {
        resultadoBusquedaBody.innerHTML = '<tr><td colspan="6" class="text-center text-secondary">No se encontraron resultados para su búsqueda.</td></tr>';
        return;
    }

    resultadoBusquedaBody.innerHTML = ''; 

    data.forEach(item => {
        const row = `
            <tr>
                <td>${item.Código || ''}</td>
                <td>${item['Nombre del Equipo'] || ''}</td>
                <td>${item.Marca || ''}</td>
                <td>${item.Modelo || ''}</td>
                <td>${item.Usuario || 'N/A'}</td>
                <td>${item.Estado || 'N/A'}</td>
            </tr>
        `;
        resultadoBusquedaBody.innerHTML += row;
    });
}


// =========================================================================
// LÓGICA DE GUARDADO (POST) - Mantiene no-cors
// =========================================================================

registroForm?.addEventListener('submit', async function(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const form = e.target;

    if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return;
    }

    const btnGuardar = D('btnGuardar');
    btnGuardar.disabled = true;
    btnGuardar.textContent = 'Guardando...';

    // 1. Recoger datos
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

    // 2. Generar Serie y Código
    datos.serie = generarSerieAutomatica(datos.serie, datos.nombreEquipo);
    datos.codigo = generarCodigoInventario(datos);
    
    // 3. Crear el objeto de datos FINAL
    const dataToSend = {
        'Código': datos.codigo,
        'Categoría': datos.categoria.replace(/_/g, ' '),
        'Subcategoría': datos.subcategoria.replace(/_/g, ' '),
        'Nombre del Equipo': datos.nombreEquipo,
        'Marca': datos.marca,
        'Modelo': datos.modelo,
        'Serie': datos.serie,
        'Usuario': datos.usuario,
        'CC': datos.cc,
        'Fecha de Adquisición': datos.fechaAdquisicion,
        'Precio': datos.precio,
        'Ubicación': datos.ubicacion,
        'Estado': datos.estado,
        'Estado de Asignación': datos.estadoAsignacion,
        'Observación': datos.observacion
    };
    
    // 4. Enviar los datos
    try {
        // Mantiene 'no-cors' para el POST (Guardado)
        const response = await fetch(GOOGLE_APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors', 
            cache: 'no-cache',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(dataToSend)
        });
        
        // Asumimos el éxito si no hay error de red
        alert(`✅ ¡Guardado! El registro se ha enviado a Google Sheets. Código: ${datos.codigo}`);
        codigoContador++; 
        
        form.reset();
        form.classList.remove('was-validated');
        actualizarSubcategorias();

    } catch (error) {
        console.error('Error al enviar datos:', error);
        alert(`🔴 ERROR: Falló la conexión de red. Revisa la consola y tu URL de Apps Script. Detalle: ${error.message}`);
    } finally {
        btnGuardar.disabled = false;
        btnGuardar.textContent = 'Guardar';
    }
});


// ... LÓGICA DE DESCARGA CSV ...

window.descargarCSV = () => {
    alert("La descarga CSV ha sido reemplazada. Los datos se guardan directamente en el Google Sheet centralizado en Google Drive.");
}


document.addEventListener('DOMContentLoaded', () => {
    actualizarSubcategorias();
    buscarProducto();
});

