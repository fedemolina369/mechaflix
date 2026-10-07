// Estado global de la aplicación
let todasLasPeliculas = [];
let todasLasSeries = [];
let paginaActual = 1;
const ITEMS_POR_PAGINA = 24;
let serieActual = null;
let temporadaActual = 1;

// Control de episodios de series
let episodiosTemporadaActual = [];
let indiceEpisodioActual = -1;
let esSerie = false;

let peliculaActualDrive = { principal: '', respaldo: '' };

// Clave de OMDb proporcionada
const OMDB_API_KEY = '794853cc';

let timerCursor = null;

document.addEventListener('DOMContentLoaded', () => {
  cargarTodoElCatalogo();

  // Prevención de pérdida de foco y atajos en Smart TV
  document.addEventListener('keydown', (e) => {
    const activo = document.activeElement;

    if (e.key === 'ArrowUp' || e.keyCode === 38) {
      if (activo && (activo.classList.contains('nav-btn') || activo.classList.contains('cerrar-modal') || activo.id === 'input-busqueda')) {
        e.preventDefault();
      }
    }

    if (e.key === 'Escape' || e.key === 'Back' || e.keyCode === 10009 || e.keyCode === 27) {
      cerrarModal();
    }
  });
});

// Desplazamiento para lista de temporadas
function scrollTemporadas(direccion) {
  const lista = document.getElementById('lista-temporadas');
  if (lista) {
    lista.scrollBy({ top: direccion * 120, behavior: 'smooth' });
  }
}

// Ocultar cursor tras 3 segundos de inactividad
function iniciarOcultarCursor() {
  detenerOcultarCursor();
  document.addEventListener('mousemove', resetearTimerCursor);
  document.addEventListener('keydown', resetearTimerCursor);
  resetearTimerCursor();
}

function resetearTimerCursor() {
  document.body.classList.remove('ocultar-cursor');
  clearTimeout(timerCursor);
  timerCursor = setTimeout(() => {
    document.body.classList.add('ocultar-cursor');
  }, 3000);
}

function detenerOcultarCursor() {
  clearTimeout(timerCursor);
  document.removeEventListener('mousemove', resetearTimerCursor);
  document.removeEventListener('keydown', resetearTimerCursor);
  document.body.classList.remove('ocultar-cursor');
}

// Carga inicial de datos enriquecidos con OMDb
async function cargarTodoElCatalogo() {
  await Promise.all([obtenerPeliculas(), obtenerSeries()]);
  renderizarCatalogoConPaginacion();
}

async function obtenerPeliculas() {
  try {
    const res = await fetch('./data/peliculas.json');
    if (res.ok) {
      const peliculasLocales = await res.json();
      
      todasLasPeliculas = await Promise.all(peliculasLocales.map(async (peli) => {
        if (peli.imagen && peli.imagen.trim() !== "" && peli.imagen !== "N/A") {
          return peli;
        }

        const query = peli.tituloIngles || peli.titulo;
        const datosOmdb = await consultarOmdb(query);

        return {
          ...peli,
          imagen: (datosOmdb && datosOmdb.Poster && datosOmdb.Poster !== "N/A") 
            ? datosOmdb.Poster 
            : 'https://via.placeholder.com/300x450?text=Sin+Imagen',
          descorta: peli.descorta || (datosOmdb && datosOmdb.Plot !== "N/A" ? datosOmdb.Plot : 'Sin descripción')
        };
      }));
    }
  } catch (err) {
    console.error("Error al cargar películas:", err);
  }
}

async function obtenerSeries() {
  const seriesIds = ['rick-and-morty','moon-knight'];
  todasLasSeries = [];

  for (const id of seriesIds) {
    try {
      const res = await fetch(`./data/series/${id}/info.json`);
      if (res.ok) {
        let info = await res.json();
        const datosOmdb = await consultarOmdb(info.tituloIngles || info.titulo);
        
        if (datosOmdb && datosOmdb.Poster && datosOmdb.Poster !== "N/A") {
          info.imagen = datosOmdb.Poster;
        }
        if (datosOmdb && datosOmdb.Plot && datosOmdb.Plot !== "N/A") {
          info.descorta = datosOmdb.Plot;
        }

        todasLasSeries.push(info);
      }
    } catch (err) {
      console.error(`Error al cargar la serie ${id}:`, err);
    }
  }
}

async function consultarOmdb(titulo) {
  try {
    const url = `https://www.omdbapi.com/?t=${encodeURIComponent(titulo)}&apikey=${OMDB_API_KEY}`;
    const respuesta = await fetch(url);
    const data = await respuesta.json();
    if (data.Response === "True") {
      return data;
    }
  } catch (e) {
    console.error("Error conectando con OMDb para:", titulo, e);
  }
  return null;
}

// Renderiza catálogo con filtros y paginación
function renderizarCatalogoConPaginacion() {
  const inputBusqueda = document.getElementById('input-busqueda').value.toLowerCase().trim();
  const secPelis = document.getElementById('seccion-peliculas');
  const secSeries = document.getElementById('seccion-series');
  const gridPelis = document.getElementById('grid-peliculas');
  const gridSeries = document.getElementById('grid-series');
  const paginacionContainer = document.getElementById('paginacion-container');

  const pelisFiltradas = todasLasPeliculas.filter(p => p.titulo.toLowerCase().includes(inputBusqueda));
  const seriesFiltradas = todasLasSeries.filter(s => s.titulo.toLowerCase().includes(inputBusqueda));

  const filtroActivo = document.querySelector('.nav-btn.active')?.getAttribute('onclick') || 'todo';

  let pelisPagina = [];
  let seriesPagina = [];
  let totalPaginas = 1;

  if (filtroActivo.includes('pelicula')) {
    secPelis.style.display = 'block';
    secSeries.style.display = 'none';
    
    totalPaginas = Math.ceil(pelisFiltradas.length / ITEMS_POR_PAGINA) || 1;
    if (paginaActual > totalPaginas) paginaActual = 1;
    const inicio = (paginaActual - 1) * ITEMS_POR_PAGINA;
    
    pelisPagina = pelisFiltradas.slice(inicio, inicio + ITEMS_POR_PAGINA);
    
  } else if (filtroActivo.includes('serie')) {
    secPelis.style.display = 'none';
    secSeries.style.display = 'block';
    
    totalPaginas = Math.ceil(seriesFiltradas.length / ITEMS_POR_PAGINA) || 1;
    if (paginaActual > totalPaginas) paginaActual = 1;
    const inicio = (paginaActual - 1) * ITEMS_POR_PAGINA;
    
    seriesPagina = seriesFiltradas.slice(inicio, inicio + ITEMS_POR_PAGINA);
    
  } else {
    secPelis.style.display = 'block';
    secSeries.style.display = 'block';
    
    totalPaginas = Math.max(
      Math.ceil(pelisFiltradas.length / ITEMS_POR_PAGINA),
      Math.ceil(seriesFiltradas.length / ITEMS_POR_PAGINA)
    ) || 1;
    
    if (paginaActual > totalPaginas) paginaActual = 1;
    const inicio = (paginaActual - 1) * ITEMS_POR_PAGINA;
    
    pelisPagina = pelisFiltradas.slice(inicio, inicio + ITEMS_POR_PAGINA);
    seriesPagina = seriesFiltradas.slice(inicio, inicio + ITEMS_POR_PAGINA);
  }

  gridPelis.innerHTML = pelisPagina.map(peli => {
    const tituloEscapado = peli.titulo.replace(/'/g, "\\'");
    const idRespaldo = (peli.idDriveRespaldo && peli.idDriveRespaldo.length > 0) ? peli.idDriveRespaldo[0] : '';
    
    return `
      <div class="card" tabindex="0" onclick="reproducirPelicula('${tituloEscapado}', '${peli.idDrive}', '${peli.imagen}', '${idRespaldo}')" onkeydown="if(event.key==='Enter') reproducirPelicula('${tituloEscapado}', '${peli.idDrive}', '${peli.imagen}', '${idRespaldo}')">
        <img src="${peli.imagen}" alt="${peli.titulo}">
        <div class="card-info">
          <h4>${peli.titulo}</h4>
          <p>${peli.descorta}</p>
        </div>
      </div>
    `;
  }).join('');

  gridSeries.innerHTML = seriesPagina.map(info => {
    const temporadasJSON = JSON.stringify(info.temporadasDisponibles).replace(/"/g, '&quot;');
    const tituloEscapado = info.titulo.replace(/'/g, "\\'");
    return `
      <div class="card" tabindex="0" onclick="abrirSerie('${info.id}', '${tituloEscapado}', ${temporadasJSON}, '${info.imagen}')" onkeydown="if(event.key==='Enter') abrirSerie('${info.id}', '${tituloEscapado}', ${temporadasJSON}, '${info.imagen}')">
        <img src="${info.imagen}" alt="${info.titulo}">
        <div class="card-info">
          <h4>${info.titulo}</h4>
          <p>${info.descorta}</p>
        </div>
      </div>
    `;
  }).join('');

  let paginacionHTML = '';
  if (totalPaginas > 1) {
    for (let i = 1; i <= totalPaginas; i++) {
      paginacionHTML += `
        <button class="btn-pagina ${i === paginaActual ? 'activa' : ''}" tabindex="0" onclick="cambiarPagina(${i})">
          ${i}
        </button>
      `;
    }
  }
  paginacionContainer.innerHTML = paginacionHTML;
}

function buscarContenido() {
  paginaActual = 1;
  renderizarCatalogoConPaginacion();
}

function cambiarPagina(numPagina) {
  paginaActual = numPagina;
  renderizarCatalogoConPaginacion();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Reproducción de Películas
function reproducirPelicula(titulo, idDrive, imagen, idRespaldo) {
  esSerie = false;
  indiceEpisodioActual = -1;

  document.getElementById('modal-titulo').innerText = titulo;
  document.getElementById('contenedor-temporadas').classList.add('oculto');
  
  if (imagen) {
    document.getElementById('modal-backdrop').style.backgroundImage = `url('${imagen}')`;
  }
  
  const contenedorVideo = document.getElementById('contenedor-video');
  const iframe = document.getElementById('iframe-drive');
  
  peliculaActualDrive = {
    principal: idDrive,
    respaldo: (idRespaldo && idRespaldo !== 'undefined') ? idRespaldo.trim() : ''
  };

  iframe.src = `https://drive.google.com/file/d/${idDrive}/preview`;
  contenedorVideo.classList.remove('oculto');
  
  renderizarCapaServidores();

  document.getElementById('modal-reproductor').classList.remove('oculto');
  document.querySelector('.cerrar-modal').focus();

  iniciarOcultarCursor();
}

function renderizarCapaServidores() {
  const contenedorVideo = document.getElementById('contenedor-video');
  let capa = document.getElementById('capa-servidores');
  
  if (!capa) {
    capa = document.createElement('div');
    capa.id = 'capa-servidores';
    capa.className = 'capa-servidores';
    contenedorVideo.appendChild(capa);
  }

  const tieneRespaldo = peliculaActualDrive.respaldo !== '';

  capa.innerHTML = `
    <button class="btn-servidor activo" tabindex="0" onclick="cambiarServidor(1)">Servidor 1</button>
    ${tieneRespaldo ? `<button class="btn-servidor" tabindex="0" onclick="cambiarServidor(2)">Servidor 2 (Respaldo)</button>` : ''}
  `;
}

function cambiarServidor(numServidor) {
  const iframe = document.getElementById('iframe-drive');
  const btns = document.querySelectorAll('.capa-servidores .btn-servidor');
  
  btns.forEach(btn => btn.classList.remove('activo'));

  if (numServidor === 1) {
    iframe.src = `https://drive.google.com/file/d/${peliculaActualDrive.principal}/preview`;
    if (btns[0]) btns[0].classList.add('activo');
  } else if (numServidor === 2 && peliculaActualDrive.respaldo) {
    iframe.src = `https://drive.google.com/file/d/${peliculaActualDrive.respaldo}/preview`;
    if (btns[1]) btns[1].classList.add('activo');
  }
}

// Reproducción y Navegación de Series (Estilo Reproductor de Música)
function abrirSerie(serieId, titulo, temporadas, imagenFondo) {
  serieActual = serieId;
  esSerie = true;
  indiceEpisodioActual = -1;

  document.getElementById('modal-titulo').innerText = titulo;
  document.getElementById('contenedor-video').classList.add('oculto');
  document.getElementById('iframe-drive').src = '';

  const capa = document.getElementById('capa-servidores');
  if (capa) capa.innerHTML = '';

  if (imagenFondo) {
    document.getElementById('modal-backdrop').style.backgroundImage = `url('${imagenFondo}')`;
  }

  const listaTemp = document.getElementById('lista-temporadas');
  listaTemp.innerHTML = temporadas.map((t, index) => `
    <button class="btn-temporada ${index === 0 ? 'activa' : ''}" tabindex="0" onclick="seleccionarTemporada(${t}, event)">
      Temporada ${t}
    </button>
  `).join('');

  document.getElementById('contenedor-temporadas').classList.remove('oculto');
  document.getElementById('modal-reproductor').classList.remove('oculto');

  cargarCapitulosTemporada(temporadas[0]);
  document.querySelector('.cerrar-modal').focus();
}

function seleccionarTemporada(numTemp, event) {
  document.querySelectorAll('.btn-temporada').forEach(btn => btn.classList.remove('activa'));
  if (event && event.target) {
    event.target.classList.add('activa');
  }
  cargarCapitulosTemporada(numTemp);
}

async function cargarCapitulosTemporada(numTemp) {
  temporadaActual = numTemp;
  const listaEpisodios = document.getElementById('lista-capitulos');

  try {
    const res = await fetch(`./data/series/${serieActual}/t${numTemp}.json`);
    if (!res.ok) throw new Error("Archivo no encontrado");

    episodiosTemporadaActual = await res.json();

    listaEpisodios.innerHTML = episodiosTemporadaActual.map((ep, index) => `
      <div class="card-episodio ${index === indiceEpisodioActual ? 'activa' : ''}" tabindex="0" onclick="reproducirEpisodio(${index})" onkeydown="if(event.key==='Enter') reproducirEpisodio(${index})">
        <div class="info-episodio">
          <span class="num-capitulo">Capítulo ${ep.capitulo}</span>
          <span class="titulo-capitulo">${ep.titulo}</span>
        </div>
        <span class="icono-play">▶</span>
      </div>
    `).join('');
  } catch (err) {
    episodiosTemporadaActual = [];
    listaEpisodios.innerHTML = '<p style="color: #aaa; padding: 20px; text-align: center;">Esta temporada estará disponible próximamente.</p>';
  }
}

function reproducirEpisodio(index) {
  if (!episodiosTemporadaActual || !episodiosTemporadaActual[index]) return;

  indiceEpisodioActual = index;
  esSerie = true;

  const ep = episodiosTemporadaActual[index];
  const contenedorVideo = document.getElementById('contenedor-video');
  const iframe = document.getElementById('iframe-drive');
  
  iframe.src = `https://drive.google.com/file/d/${ep.idDrive}/preview`;
  contenedorVideo.classList.remove('oculto');

  // Resaltar episodio activo en la lista
  document.querySelectorAll('.card-episodio').forEach((card, i) => {
    if (i === index) {
      card.classList.add('activa');
    } else {
      card.classList.remove('activa');
    }
  });

  renderizarControlesSerie();

  document.querySelector('.modal-contenido').scrollTop = 0;
  iniciarOcultarCursor();
}

function renderizarControlesSerie() {
  const contenedorVideo = document.getElementById('contenedor-video');
  let capa = document.getElementById('capa-servidores');
  
  if (!capa) {
    capa = document.createElement('div');
    capa.id = 'capa-servidores';
    capa.className = 'capa-servidores';
    contenedorVideo.appendChild(capa);
  }

  const epActual = episodiosTemporadaActual[indiceEpisodioActual];
  const tieneAnterior = indiceEpisodioActual > 0;
  const tieneSiguiente = indiceEpisodioActual < episodiosTemporadaActual.length - 1;

  capa.innerHTML = `
    <button class="btn-servidor" tabindex="0" ${tieneAnterior ? 'onclick="cambiarEpisodio(-1)"' : 'disabled style="opacity:0.4; cursor:not-allowed;"'}>
      ⏮ Anterior
    </button>
    <span class="info-ep-pantalla">Cap. ${epActual ? epActual.capitulo : ''}</span>
    <button class="btn-servidor" tabindex="0" ${tieneSiguiente ? 'onclick="cambiarEpisodio(1)"' : 'disabled style="opacity:0.4; cursor:not-allowed;"'}>
      Siguiente ⏭
    </button>
  `;
}

function cambiarEpisodio(direccion) {
  const nuevoIndice = indiceEpisodioActual + direccion;
  if (nuevoIndice >= 0 && nuevoIndice < episodiosTemporadaActual.length) {
    reproducirEpisodio(nuevoIndice);
  }
}

function cerrarModal() {
  document.getElementById('modal-reproductor').classList.add('oculto');
  document.getElementById('iframe-drive').src = '';
  document.getElementById('modal-backdrop').style.backgroundImage = 'none';
  
  const capa = document.getElementById('capa-servidores');
  if (capa) capa.innerHTML = '';
  
  esSerie = false;
  indiceEpisodioActual = -1;
  
  detenerOcultarCursor();
}

function filtrar(tipo, event) {
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
  if (event && event.target) {
    event.target.classList.add('active');
  }
  paginaActual = 1;
  renderizarCatalogoConPaginacion();
}
