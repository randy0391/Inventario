// Estructura de Subcategorías Dinámicas (Lógica de UI)
const subcategoriasMap = {
    "EQUIPOS_DE_CÓMPUTO": ["LAPTOP", "PC_ESCRITORIO"],
    "PERIFÉRICOS": ["ENTRADA", "SALIDA", "ENTRADA/SALIDA", "PERIFERICO_DE_OFICINA"],
    "RED_Y_CONECTIVIDAD": ["DISPOSITIVOS_DE_RED", "CONECTIVIDAD_INALAMBRICA", "ACCESORIOS_DE_RED", "RADIOS_DE_COMUNICACION"],
    "ALMACENAMIENTO": ["EXTERNO", "RESPALDO"],
    "ACCESORIOS_Y_OTROS": ["ACCESORIOS", "SEGURIDAD", "CELULAR"],
    "AUDIO_Y_VIDEO": ["AUDIO", "VIDEO"],
    "ACCESORIOS_DE_ENERGÍA": ["CARGADORES_DE_DISPOSITIVOS_MOVILES", "CARGADORES_DE_COMPUTADORAS", "CARGADORES_DE_RADIOS", "ESTABILIZADORES_DE_VOLTAJE", "CARGADORES_GENERALES"]
};

// Mapa de símbolos de moneda para la presentación
const simboloMonedaMap = {
    "USD": "$", "EUR": "€", "PEN": "S/", "COP": "$", "MXN": "$"
};

// REFERENCIAS DEL DOM
const D = document.getElementById.bind(document);
const categoriaSelect = D('categoria'),
      subcategoriaSelect = D('subcategoria'),
      registroForm = D('registroForm'),
      resultadoBusquedaBody = D('resultadoBusqueda'),
      monedaSelect = D('moneda'); 

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
// MOTOR DE BÚSQUEDA (USA PHP/MySQL)
// =========================================================================

window.buscarProducto = async () => {
    const termino = D('terminoBusqueda').value.trim();
    resultadoBusquedaBody.innerHTML = '<tr><td colspan="7" class="text-center text-primary">Buscando...</td></tr>';

    if (termino === "") {
        resultadoBusquedaBody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">Ingrese un término en el campo de búsqueda para ver los resultados.</td></tr>';
        return;
    }

    try {
        const response = await fetch(`api.php?action=buscar&termino=${encodeURIComponent(termino)}`);
        const data = await response.json();

        let html = '';
        if (data.success && data.data.length > 0) {
            html = data.data.map(item => {
                const simbolo = simboloMonedaMap[item.moneda] || item.moneda;
                const estadoClase = item.estado === 'Operativo' ? 'success' : 'warning';
                
                return `
                    <tr>
                        <td>${item.codigo}</td>
                        <td>${item.nombre_equipo}</td>
                        <td>${item.marca}</td>
                        <td>${item.modelo}</td>
                        <td>${item.serie}</td> 
                        <td>${item.usuario_asignado || 'N/A'}</td>
                        <td><span class="badge bg-${estadoClase}">${item.estado}</span></td>
                    </tr>
                `;
            }).join('');
        } else {
            html = `<tr><td colspan="7" class="text-center text-danger">No se encontraron productos con el término **"${termino}"**.</td></tr>`;
        }
        
        resultadoBusquedaBody.innerHTML = html;

    } catch (error) {
        console.error('Error al buscar productos:', error);
        resultadoBusquedaBody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Error de conexión al servidor.</td></tr>';
    }
}


// =========================================================================
// LÓGICA DE GUARDADO (USA PHP/MySQL)
// =========================================================================

registroForm?.addEventListener('submit', async function(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const form = e.target;

    if (form.checkValidity()) {
        const formData = new FormData(form);
        
        // Deshabilitar botón para evitar doble envío
        D('btnGuardar').disabled = true; 

        try {
            // Realizar la petición POST a la API
            const response = await fetch('api.php?action=guardar', {
                method: 'POST',
                body: formData 
            });

            const data = await response.json();
            
            if (data.success) {
                alert(`✅ ¡Guardado! Código: ${data.codigo}`);
                form.reset();
                form.classList.remove('was-validated');
                actualizarSubcategorias();
                buscarProducto(); // Intenta refrescar si hay un término
            } else {
                alert(`🔴 ¡ERROR! ${data.message}`);
            }

        } catch (error) {
            console.error('Error al guardar registro:', error);
            alert(`🔴 Error de conexión al servidor al intentar guardar.`);
        } finally {
             D('btnGuardar').disabled = false;
        }

    } else {
        form.classList.add('was-validated');
    }
});


// =========================================================================
// LÓGICA DE DESCARGA CSV (USA PHP/MySQL)
// =========================================================================

window.descargarCSV = () => {
    // Redirigir directamente al script PHP que fuerza la descarga.
    window.location.href = 'api.php?action=descargar';
    alert("💾 Se está generando la descarga del inventario...");
}

// Inicializar al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
    actualizarSubcategorias();
    // La búsqueda inicial no se ejecuta para evitar cargar toda la tabla sin término.
});