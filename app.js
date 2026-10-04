// Estado global de la aplicación
let todasLasPeliculas = [];
let todasLasSeries = [];
let paginaActual = 1;
const ITEMS_POR_PAGINA = 12;
let serieActual = null;
let temporadaActual = 1;

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

// Desplazamiento correcto para lista de temporadas (▲ sube -120px, ▼ baja +120px)
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

// Carga inicial de datos
async function cargarTodoElCatalogo() {
  await Promise.all([obtenerPeliculas(), obtenerSeries()]);
  renderizarCatalogoConPaginacion();
}

async function obtenerPeliculas() {
  try {
    const res = await fetch('./data/peliculas.json');
    if (res.ok) {
      let pelis = await res.json();
      
      // Recorremos las películas para autocompletar la imagen con OMDb si no la tiene
      for (let peli of pelis) {
        if (!peli.imagen || peli.imagen.trim() === "") {
          try {
            const omdbRes = await fetch(`https://www.omdbapi.com/?t=${encodeURIComponent(peli.titulo)}&apikey=794853cc`);
            const omdbData = await omdbRes.json();
            
            if (omdbData.Response === "True" && omdbData.Poster && omdbData.Poster !== "N/A") {
              let posterUrl = omdbData.Poster;
              if (posterUrl.startsWith("http://")) {
                posterUrl = posterUrl.replace("http://", "https://");
              }
              peli.imagen = posterUrl;
            } else {
              peli.imagen = 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=300&q=80';
            }
          } catch (apiErr) {
            console.error(`No se pudo obtener el póster para: ${peli.titulo}`, apiErr);
            peli.imagen = 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=300&q=80';
          }
        }
      }
      
      todasLasPeliculas = pelis;
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
        const info = await res.json();
        todasLasSeries.push(info);
      }
    } catch (err) {
      console.error(`Error al cargar la serie ${id}:`, err);
    }
  }
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
    const respaldosJSON = JSON.stringify(peli.idDriveRespaldo || []).replace(/"/g, '&quot;');
    return `
      <div class="card" tabindex="0" onclick="reproducirPelicula('${tituloEscapado}', '${peli.idDrive}', '${peli.imagen}', ${respaldosJSON})" onkeydown="if(event.key==='Enter') reproducirPelicula('${tituloEscapado}', '${peli.idDrive}', '${peli.imagen}', ${respaldosJSON})">
        <img src="${peli.imagen}" alt="${peli.titulo}" loading="lazy">
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
        <img src="${info.imagen}" alt="${info.titulo}" loading="lazy">
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

// Reproducción de Películas con Links de Respaldo opcionales
function reproducirPelicula(titulo, idDrive, imagen, respaldos = []) {
  document.getElementById('modal-titulo').innerText = titulo;
  document.getElementById('contenedor-temporadas').classList.add('oculto');
  
  if (imagen) {
    document.getElementById('modal-backdrop').style.backgroundImage = `url('${imagen}')`;
  }
  
  const iframe = document.getElementById('iframe-drive');
  const contenedorVideo = document.getElementById('contenedor-video');
  const contenedorServidores = document.getElementById('opciones-servidores');

  iframe.src = `https://drive.google.com/file/d/${idDrive}/preview`;
  contenedorVideo.classList.remove('oculto');

  if (respaldos && respaldos.length > 0) {
    let botonesHTML = `<span style="font-size:13px; color:#aaa; margin-right:5px;">Servidores:</span>`;
    botonesHTML += `<button class="btn-servidor activo" onclick="cambiarServidor('${idDrive}', this)">Enlace 1 (Principal)</button>`;
    
    respaldos.forEach((idResp, index) => {
      botonesHTML += `<button class="btn-servidor" onclick="cambiarServidor('${idResp}', this)">Enlace ${index + 2} (Respaldo)</button>`;
    });

    contenedorServidores.innerHTML = botonesHTML;
    contenedorServidores.classList.remove('oculto');
  } else {
    contenedorServidores.classList.add('oculto');
    contenedorServidores.innerHTML = '';
  }
  
  document.getElementById('modal-reproductor').classList.remove('oculto');
  document.querySelector('.cerrar-modal').focus();

  iniciarOcultarCursor();
}

// Función para alternar servidores en caliente
function cambiarServidor(idDrive, elementoBtn) {
  const iframe = document.getElementById('iframe-drive');
  iframe.src = `https://drive.google.com/file/d/${idDrive}/preview`;

  const botones = document.querySelectorAll('.btn-servidor');
  botones.forEach(b => b.classList.remove('activo'));
  if (elementoBtn) {
    elementoBtn.classList.add('activo');
  }
}

// Apertura de Serie
function abrirSerie(serieId, titulo, temporadas, imagenFondo) {
  serieActual = serieId;
  document.getElementById('modal-titulo').innerText = titulo;
  document.getElementById('contenedor-video').classList.add('oculto');
  document.getElementById('opciones-servidores').classList.add('oculto');
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
      const respaldosEpJSON = JSON.stringify(ep.idDriveRespaldo || []).replace(/"/g, '&quot;');
      return `
        <div class="card-episodio" tabindex="0" onclick="reproducirEpisodio('${tituloEscapado}', '${ep.idDrive}', ${respaldosEpJSON})" onkeydown="if(event.key==='Enter') reproducirEpisodio('${tituloEscapado}', '${ep.idDrive}', ${respaldosEpJSON})">
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

function reproducirEpisodio(tituloCapitulo, idDrive, respaldos = []) {
  const contenedorVideo = document.getElementById('contenedor-video');
  const iframe = document.getElementById('iframe-drive');
  const contenedorServidores = document.getElementById('opciones-servidores');
  
  iframe.src = `https://drive.google.com/file/d/${idDrive}/preview`;
  contenedorVideo.classList.remove('oculto');

  if (respaldos && respaldos.length > 0) {
    let botonesHTML = `<span style="font-size:13px; color:#aaa; margin-right:5px;">Servidores:</span>`;
    botonesHTML += `<button class="btn-servidor activo" onclick="cambiarServidor('${idDrive}', this)">Enlace 1 (Principal)</button>`;
    
    respaldos.forEach((idResp, index) => {
      botonesHTML += `<button class="btn-servidor" onclick="cambiarServidor('${idResp}', this)">Enlace ${index + 2} (Respaldo)</button>`;
    });

    contenedorServidores.innerHTML = botonesHTML;
    contenedorServidores.classList.remove('oculto');
  } else {
    contenedorServidores.classList.add('oculto');
    contenedorServidores.innerHTML = '';
  }

  document.querySelector('.modal-contenido').scrollTop = 0;
  iniciarOcultarCursor();
}

function cerrarModal() {
  document.getElementById('modal-reproductor').classList.add('oculto');
  document.getElementById('iframe-drive').src = '';
  document.getElementById('modal-backdrop').style.backgroundImage = 'none';
  document.getElementById('opciones-servidores').classList.add('oculto');
  
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
