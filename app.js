const API_KEY = '794853cc';
let contenidoGlobal = [];
let filtroActivo = 'todo';

// 1. Iniciar la aplicación
document.addEventListener('DOMContentLoaded', () => {
    cargarContenido();
});

async function cargarContenido() {
    try {
        const respuesta = await fetch('peliculas.json');
        contenidoGlobal = await respuesta.json();
        renderizarCatalogo();
    } catch (error) {
        console.error("Error al cargar peliculas.json:", error);
    }
}

// 2. Consulta a OMDb API
async function obtenerPortada(titulo) {
    try {
        const respuesta = await fetch(`https://www.omdbapi.com/?apikey=${API_KEY}&t=${encodeURIComponent(titulo)}`);
        const datos = await respuesta.json();
        if (datos.Response === "True" && datos.Poster && datos.Poster !== "N/A") {
            return datos.Poster;
        }
        return 'https://via.placeholder.com/300x450/222/fff?text=Sin+Portada';
    } catch (error) {
        return 'https://via.placeholder.com/300x450/222/e50914?text=Error';
    }
}

// 3. Sistema de Búsqueda y Filtrado
function buscarContenido() {
    renderizarCatalogo();
}

function filtrar(tipo, evento) {
    filtroActivo = tipo;
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    if (evento) evento.target.classList.add('active');
    renderizarCatalogo();
}

// 4. Renderizar Interfaz (Optimizado para no congelar la pantalla)
function renderizarCatalogo() {
    const busqueda = document.getElementById('input-busqueda').value.toLowerCase();
    
    // Filtrar por texto
    const filtrados = contenidoGlobal.filter(item => 
        item.titulo.toLowerCase().includes(busqueda) || 
        (item.tituloIngles && item.tituloIngles.toLowerCase().includes(busqueda))
    );

    // Separar en categorías (asume que tu JSON tiene una propiedad "tipo": "pelicula" o "serie")
    const peliculas = filtrados.filter(item => !item.tipo || item.tipo === 'pelicula');
    const series = filtrados.filter(item => item.tipo === 'serie');

    const secPeliculas = document.getElementById('seccion-peliculas');
    const secSeries = document.getElementById('seccion-series');
    const gridPeliculas = document.getElementById('grid-peliculas');
    const gridSeries = document.getElementById('grid-series');

    // Controlar qué secciones se ven según el botón del menú pulsado
    secPeliculas.style.display = (filtroActivo === 'todo' || filtroActivo === 'pelicula') && peliculas.length > 0 ? 'block' : 'none';
    secSeries.style.display = (filtroActivo === 'todo' || filtroActivo === 'serie') && series.length > 0 ? 'block' : 'none';

    // Inyectar HTML con un "Cargando..."
    gridPeliculas.innerHTML = peliculas.map(p => crearTarjetaHTML(p)).join('');
    gridSeries.innerHTML = series.map(s => crearTarjetaHTML(s)).join('');

    // Cargar las portadas en segundo plano
    cargarPortadasAsincronas(peliculas.concat(series));
}

function crearTarjetaHTML(item) {
    const idImg = `img-${item.id}`;
    // Definir si se abre como peli o serie
    const tipo = item.tipo || 'pelicula';
    
    return `
        <div class="card" onclick="abrirModal('${item.id}', '${tipo}')" tabindex="0">
            <img id="${idImg}" src="https://via.placeholder.com/300x450/111/444?text=Cargando..." alt="${item.titulo}">
            <div class="card-info">
                <h4>${item.titulo}</h4>
                <p>${item.descorta || ''}</p>
            </div>
        </div>
    `;
}

async function cargarPortadasAsincronas(listaItems) {
    for (let item of listaItems) {
        const imgEl = document.getElementById(`img-${item.id}`);
        if (imgEl) {
            const tituloABuscar = item.tituloIngles || item.titulo;
            const urlPortada = await obtenerPortada(tituloABuscar);
            imgEl.src = urlPortada;
        }
    }
}

// 5. Control del Modal Pantalla Completa
async function abrirModal(id, tipo) {
    const itemActual = contenidoGlobal.find(i => i.id === id);
    if (!itemActual) return;

    const modal = document.getElementById('modal-reproductor');
    const tituloEl = document.getElementById('modal-titulo');
    const backdrop = document.getElementById('modal-backdrop');
    const contVideo = document.getElementById('contenedor-video');
    const contTemporadas = document.getElementById('contenedor-temporadas');
    
    tituloEl.textContent = itemActual.titulo;
    
    // Aplicar portada de fondo en el modal
    const portada = await obtenerPortada(itemActual.tituloIngles || itemActual.titulo);
    backdrop.style.backgroundImage = `url('${portada}')`;

    if (tipo === 'pelicula') {
        contVideo.classList.remove('oculto');
        contTemporadas.classList.add('oculto');
        prepararServidores(itemActual); // Activa la lógica de Enlace 1 y 2
    } else if (tipo === 'serie') {
        contVideo.classList.add('oculto');
        contTemporadas.classList.remove('oculto');
        cargarTemporadas(itemActual);
    }

    modal.classList.remove('oculto');
}

function cerrarModal() {
    document.getElementById('modal-reproductor').classList.add('oculto');
    document.getElementById('iframe-drive').src = '';
    const contVideo = document.getElementById('contenedor-video');
    contVideo.classList.add('oculto'); // Ocultar iframe para evitar sonido fantasma
}

// 6. Lógica de Enlaces de Respaldo (Servidores)
function prepararServidores(peli) {
    const opcionesDiv = document.getElementById('opciones-servidores');
    const enlaces = [peli.idDrive];
    
    if (peli.idDriveRespaldo && Array.isArray(peli.idDriveRespaldo)) {
        enlaces.push(...peli.idDriveRespaldo);
    }

    if (enlaces.length > 1) {
        opcionesDiv.innerHTML = enlaces.map((id, index) => `
            <button class="btn-servidor ${index === 0 ? 'activo' : ''}" onclick="cambiarServidor('${id}', this)">
                ${index === 0 ? 'Enlace 1 (Principal)' : `Enlace ${index + 1} (Respaldo)`}
            </button>
        `).join('');
        opcionesDiv.classList.remove('oculto');
    } else {
        opcionesDiv.classList.add('oculto');
    }

    // Arrancar reproduciendo el enlace 1
    cambiarServidor(enlaces[0]);
}

function cambiarServidor(idDrive, botonClickeado = null) {
    document.getElementById('iframe-drive').src = `https://drive.google.com/file/d/${idDrive}/preview`;
    
    if (botonClickeado) {
        document.querySelectorAll('.btn-servidor').forEach(btn => btn.classList.remove('activo'));
        botonClickeado.classList.add('activo');
    }
}

// 7. Lógica de Series (Temporadas y Capítulos)
function cargarTemporadas(serie) {
    const listaTemp = document.getElementById('lista-temporadas');
    listaTemp.innerHTML = '';
    
    if (!serie.temporadas) return;

    serie.temporadas.forEach((temp, index) => {
        const btn = document.createElement('button');
        btn.className = `btn-temporada ${index === 0 ? 'activa' : ''}`;
        btn.textContent = `Temporada ${temp.numero}`;
        btn.onclick = (e) => {
            document.querySelectorAll('.btn-temporada').forEach(b => b.classList.remove('activa'));
            e.target.classList.add('activa');
            cargarCapitulos(temp);
        };
        listaTemp.appendChild(btn);
    });

    // Cargar los capítulos de la primera temporada por defecto
    if (serie.temporadas.length > 0) {
        cargarCapitulos(serie.temporadas[0]);
    }
}

function cargarCapitulos(temporada) {
    const listaCap = document.getElementById('lista-capitulos');
    listaCap.innerHTML = '';

    temporada.capitulos.forEach(cap => {
        listaCap.innerHTML += `
            <div class="card-episodio" onclick="reproducirCapitulo('${cap.idDrive}')" tabindex="0">
                <div class="info-episodio">
                    <span class="num-capitulo">Capítulo ${cap.num}</span>
                    <span class="titulo-capitulo">${cap.titulo || `Episodio ${cap.num}`}</span>
                </div>
                <span class="icono-play">▶</span>
            </div>
        `;
    });
}

function reproducirCapitulo(idDrive) {
    // Ocultar menú de temporadas y mostrar reproductor
    document.getElementById('contenedor-temporadas').classList.add('oculto');
    const contVideo = document.getElementById('contenedor-video');
    contVideo.classList.remove('oculto');
    
    // Ocultar botones de servidores para los capítulos
    document.getElementById('opciones-servidores').classList.add('oculto');
    
    document.getElementById('iframe-drive').src = `https://drive.google.com/file/d/${idDrive}/preview`;
}

function scrollTemporadas(direccion) {
    const lista = document.getElementById('lista-temporadas');
    lista.scrollBy({ top: direccion * 60, behavior: 'smooth' });
}