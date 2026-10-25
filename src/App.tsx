import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import './App.css';

const SUPABASE_URL = 'https://huccnokboulyqhhilsqf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Q5j7U4j7ZR5LIRXEAi5fAw_Cidw2_XC'; 
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const TMDB_API_KEY = '4ec39cc9f48d3568468324a2ba4581a9';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';
const TMDB_BACKDROP_BASE = 'https://image.tmdb.org/t/p/original';

export default function App() {
  const [movies, setMovies] = useState<any[]>([]);
  const [trailers, setTrailers] = useState<any[]>([]);
  const [featuredMovie, setFeaturedMovie] = useState<any>(null);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'all' | 'movie' | 'tv'>('all');
  const [loading, setLoading] = useState<boolean>(true);

  // Mezclar un arreglo aleatoriamente
  const shuffleArray = (array: any[]) => {
    return [...array].sort(() => Math.random() - 0.5);
  };

  const loadCatalog = async () => {
    setLoading(true);
    try {
      const { data: dbItems, error } = await supabase.from('Movies').select('*');
      if (error || !dbItems) return;

      const enrichedItems = await Promise.all(
        dbItems.map(async (item) => {
          try {
            const tmdbId = item.Tmdb_id || item.tmdb_id;
            const videoUrl = item.Video_url || item.video_url;
            const mediaType = item.type === 'tv' ? 'tv' : 'movie'; // 'movie' por defecto
            
            const res = await fetch(
              `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}&language=es-ES&append_to_response=videos`
            );
            const tmdbData = await res.json();
            
            // Buscar trailer oficial de YouTube
            let trailerKey = null;
            if (tmdbData.videos && tmdbData.videos.results) {
              const trailer = tmdbData.videos.results.find(
                (v: any) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')
              );
              if (trailer) trailerKey = trailer.key;
            }

            return {
              id: item.id,
              videoUrl: videoUrl,
              type: mediaType,
              title: tmdbData.title || tmdbData.name || 'Título no disponible',
              overview: tmdbData.overview || 'Sin descripción disponible.',
              poster: tmdbData.poster_path ? `${TMDB_IMAGE_BASE}${tmdbData.poster_path}` : null,
              backdrop: tmdbData.backdrop_path ? `${TMDB_BACKDROP_BASE}${tmdbData.backdrop_path}` : null,
              trailerKey: trailerKey,
              numberOfSeasons: tmdbData.number_of_seasons || null,
              numberOfEpisodes: tmdbData.number_of_episodes || null
            };
          } catch (err) {
            return null;
          }
        })
      );

      const validItems = enrichedItems.filter(m => m !== null);
      const randomized = shuffleArray(validItems);
      
      setMovies(randomized);

      if (randomized.length > 0) {
        setFeaturedMovie(randomized[0]);
      }

      // Filtrar todos los que tengan trailer disponible
      const withTrailers = randomized.filter(m => m.trailerKey !== null);
      setTrailers(withTrailers);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCatalog();
  }, []);

  // Rotación automática del Banner destacado cada 15 segundos
  useEffect(() => {
    if (movies.length <= 1) return;
    const bannerInterval = setInterval(() => {
      setFeaturedMovie((currentFeatured: any) => {
        const currentIndex = movies.findIndex(m => m.id === currentFeatured?.id);
        const nextIndex = (currentIndex + 1) % movies.length;
        return movies[nextIndex];
      });
    }, 15000);

    return () => clearInterval(bannerInterval);
  }, [movies]);

  // Volver al inicio al hacer clic en el Logo
  const handleHomeClick = () => {
    setSearchTerm('');
    setActiveTab('all');
    const randomized = shuffleArray(movies);
    setMovies(randomized);
    if (randomized.length > 0) {
      setFeaturedMovie(randomized[0]);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Filtrado según pestaña (Películas / Series) y término de búsqueda
  const filteredMovies = movies.filter(item => {
    const matchesTab = activeTab === 'all' ? true : item.type === activeTab;
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTab && matchesSearch;
  });

  if (loading) {
    return (
      <div className="loading-screen">
        <div>MECHAFLIX_</div>
      </div>
    );
  }

  return (
    <div className="app">
      {/* Navbar con pestañas de Navegación */}
      <nav className="navbar">
        <div className="brand-logo" onClick={handleHomeClick}>
          MECHAFLIX
        </div>

        <div className="nav-tabs">
          <button 
            className={`nav-btn ${activeTab === 'all' ? 'active' : ''}`} 
            onClick={() => setActiveTab('all')}
          >
            INICIO
          </button>
          <button 
            className={`nav-btn ${activeTab === 'movie' ? 'active' : ''}`} 
            onClick={() => setActiveTab('movie')}
          >
            PELÍCULAS
          </button>
          <button 
            className={`nav-btn ${activeTab === 'tv' ? 'active' : ''}`} 
            onClick={() => setActiveTab('tv')}
          >
            SERIES
          </button>
        </div>

        <div className="search-container">
          <input 
            type="text" 
            className="search-bar" 
            placeholder="Buscar..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </nav>

      {/* Hero Banner Destacado */}
      {featuredMovie && !searchTerm && activeTab === 'all' && (
        <header 
          className="hero-banner" 
          style={{ 
            backgroundImage: `url(${featuredMovie.backdrop || featuredMovie.poster})` 
          }}
        >
          <div className="hero-overlay"></div>
          <div className="hero-content">
            <span className="badge-type">
              {featuredMovie.type === 'tv' ? 'SERIE' : 'PELÍCULA'}
            </span>
            <h1 className="hero-title">{featuredMovie.title}</h1>
            <p className="hero-overview">{featuredMovie.overview}</p>
            <button 
              className="btn-neon" 
              onClick={() => setSelectedVideoUrl(featuredMovie.videoUrl)}
            >
              ▶ REPRODUCIR AHORA
            </button>
          </div>
        </header>
      )}

      {/* Carrusel de Trailers Oficiales */}
      {!searchTerm && activeTab === 'all' && trailers.length > 0 && (
        <section className="section-container">
          <h2 className="section-title">🎬 Trailers Oficiales</h2>
          <div className="trailers-carousel">
            {trailers.map((item) => (
              <div 
                key={`trailer-${item.id}`} 
                className="trailer-card"
                onClick={() => setSelectedVideoUrl(`https://www.youtube.com/embed/${item.trailerKey}?autoplay=1`)}
              >
                <div 
                  className="trailer-thumb" 
                  style={{ backgroundImage: `url(${item.backdrop || item.poster})` }}
                >
                  <div className="play-icon">▶</div>
                </div>
                <div className="trailer-info">{item.title}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Catálogo Principal */}
      <main className="catalog-container" style={{ marginTop: searchTerm || activeTab !== 'all' ? '90px' : '0' }}>
        <h2 className="section-title">
          {searchTerm 
            ? `Resultados para "${searchTerm}"` 
            : activeTab === 'tv' 
            ? '📺 Catálogo de Series' 
            : activeTab === 'movie' 
            ? '🎬 Catálogo de Películas' 
            : '⚡ Catálogo Principal'}
        </h2>
        <div className="movies-grid">
          {filteredMovies.map((item) => (
            <div 
              key={item.id} 
              className="movie-card"
              onClick={() => setSelectedVideoUrl(item.videoUrl)}
            >
              <span className="card-badge">
                {item.type === 'tv' ? 'SERIE' : 'PELÍCULA'}
              </span>
              <img 
                className="movie-poster"
                src={item.poster || 'https://via.placeholder.com/500x750?text=Sin+Imagen'} 
                alt={item.title} 
              />
              <div className="movie-title-bar">{item.title}</div>
            </div>
          ))}
        </div>
      </main>

      {/* Modal del Reproductor */}
      {selectedVideoUrl && (
        <div className="modal-backdrop" onClick={() => setSelectedVideoUrl(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setSelectedVideoUrl(null)}>✕</button>
            <div className="video-container">
              <iframe 
                src={selectedVideoUrl} 
                title="Reproductor Mechaflix"
                allow="autoplay; encrypted-media; fullscreen"
                allowFullScreen
              ></iframe>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
