// Estado global de la aplicación
let todasLasPeliculas = [];
let todasLasSeries = [];
let paginaActual = 1;
const ITEMS_POR_PAGINA = 12;
let serieActual = null;
let temporadaActual = 1;

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

// Desplazamiento correcto para lista de temporadas
function scrollTemporadas(direccion) {
  const lista = document.getElementById('lista-temporadas');
  if (lista) {
    lista.scrollBy({ top: direccion * 120, behavior: 'smooth' });
  }
}

// Ocultar cursor tras 3 segundos de inactividad durante la reproducción
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
      
      // Enriquecemos cada película usando la API de OMDb
      todasLasPeliculas = await Promise.all(peliculasLocales.map(async (peli) => {
        const query = peli.tituloIngles || peli.titulo;
        const datosOmdb = await consultarOmdb(query);
        
        return {
          ...peli,
          imagen: (datosOmdb && datosOmdb.Poster && datosOmdb.Poster !== "N/A") ? datosOmdb.Poster : peli.imagen,
          descorta: (datosOmdb && datosOmdb.Plot && datosOmdb.Plot !== "N/A") ? datosOmdb.Plot : peli.descorta
        };
      }));
    }
  } catch (err) {
    console.error("Error al cargar películas:", err);
  }
}

async function obtenerSeries() {
  const seriesIds = ['rick-and-morty'];
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

// Función auxiliar para consultar OMDb API
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

// Renderiza películas y series aplicando Filtros y Paginación
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

  let itemsAMostrar = [];

  if (filtroActivo.includes('peliculas')) {
    secPelis.style.display = 'block';
    secSeries.style.display = 'none';
    itemsAMostrar = pelisFiltradas.map(p => ({ ...p, tipo: 'pelicula' }));
  } else if (filtroActivo.includes('series')) {
    secPelis.style.display = 'none';
    secSeries.style.display = 'block';
    itemsAMostrar = seriesFiltradas.map(s => ({ ...s, tipo: 'serie' }));
  } else {
    secPelis.style.display = 'block';
    secSeries.style.display = 'block';
    itemsAMostrar = [
      ...pelisFiltradas.map(p => ({ ...p, tipo: 'pelicula' })),
      ...seriesFiltradas.map(s => ({ ...s, tipo: 'serie' }))
    ];
  }

  const totalPaginas = Math.ceil(itemsAMostrar.length / ITEMS_POR_PAGINA) || 1;
  if (paginaActual > totalPaginas) paginaActual = 1;

  const inicio = (paginaActual - 1) * ITEMS_POR_PAGINA;
  const fin = inicio + ITEMS_POR_PAGINA;
  const paginaItems = itemsAMostrar.slice(inicio, fin);

  const pelisPagina = paginaItems.filter(i => i.tipo === 'pelicula');
  const seriesPagina = paginaItems.filter(i => i.tipo === 'serie');

  gridPelis.innerHTML = pelisPagina.map(peli => {
    const tituloEscapado = peli.titulo.replace(/'/g, "\\'");
    return `
      <div class="card" tabindex="0" onclick="reproducirPelicula('${tituloEscapado}', '${peli.idDrive}', '${peli.imagen}')" onkeydown="if(event.key==='Enter') reproducirPelicula('${tituloEscapado}', '${peli.idDrive}', '${peli.imagen}')">
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
function reproducirPelicula(titulo, idDrive, imagen) {
  document.getElementById('modal-titulo').innerText = titulo;
  document.getElementById('contenedor-temporadas').classList.add('oculto');
  
  if (imagen) {
    document.getElementById('modal-backdrop').style.backgroundImage = `url('${imagen}')`;
  }
  
  const contenedorVideo = document.getElementById('contenedor-video');
  const iframe = document.getElementById('iframe-drive');
  
  iframe.src = `https://drive.google.com/file/d/${idDrive}/preview`;
  contenedorVideo.classList.remove('oculto');
  
  document.getElementById('modal-reproductor').classList.remove('oculto');
  document.querySelector('.cerrar-modal').focus();

  iniciarOcultarCursor();
}

// Apertura de Serie
function abrirSerie(serieId, titulo, temporadas, imagenFondo) {
  serieActual = serieId;
  document.getElementById('modal-titulo').innerText = titulo;
  document.getElementById('contenedor-video').classList.add('oculto');
  document.getElementById('iframe-drive').src = '';

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

    const episodios = await res.json();

    listaEpisodios.innerHTML = episodios.map(ep => {
      const tituloEscapado = ep.titulo.replace(/'/g, "\\'");
      return `
        <div class="card-episodio" tabindex="0" onclick="reproducirEpisodio('${tituloEscapado}', '${ep.idDrive}')" onkeydown="if(event.key==='Enter') reproducirEpisodio('${tituloEscapado}', '${ep.idDrive}')">
          <div class="info-episodio">
            <span class="num-capitulo">Capítulo ${ep.capitulo}</span>
            <span class="titulo-capitulo">${ep.titulo}</span>
          </div>
          <span class="icono-play">▶</span>
        </div>
      `;
    }).join('');
  } catch (err) {
    listaEpisodios.innerHTML = '<p style="color: #aaa; padding: 20px; text-align: center;">Esta temporada estará disponible próximamente.</p>';
  }
}

function reproducirEpisodio(tituloCapitulo, idDrive) {
  const contenedorVideo = document.getElementById('contenedor-video');
  const iframe = document.getElementById('iframe-drive');
  
  iframe.src = `https://drive.google.com/file/d/${idDrive}/preview`;
  contenedorVideo.classList.remove('oculto');

  document.querySelector('.modal-contenido').scrollTop = 0;
  iniciarOcultarCursor();
}

function cerrarModal() {
  document.getElementById('modal-reproductor').classList.add('oculto');
  document.getElementById('iframe-drive').src = '';
  document.getElementById('modal-backdrop').style.backgroundImage = 'none';
  
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
