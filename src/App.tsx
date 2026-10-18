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
  const [loading, setLoading] = useState<boolean>(true);

  // Mezclar un arreglo aleatoriamente
  const shuffleArray = (array: any[]) => {
    return [...array].sort(() => Math.random() - 0.5);
  };

  const loadCatalog = async () => {
    setLoading(true);
    try {
      const { data: dbMovies, error } = await supabase.from('Movies').select('*');
      if (error || !dbMovies) return;

      const enrichedMovies = await Promise.all(
        dbMovies.map(async (movie) => {
          try {
            const tmdbId = movie.Tmdb_id || movie.tmdb_id;
            const videoUrl = movie.Video_url || movie.video_url;
            
            const res = await fetch(
              `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=es-ES&append_to_response=videos`
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
              id: movie.id,
              videoUrl: videoUrl,
              title: tmdbData.title || 'Título no disponible',
              overview: tmdbData.overview || 'Sin descripción disponible.',
              poster: tmdbData.poster_path ? `${TMDB_IMAGE_BASE}${tmdbData.poster_path}` : null,
              backdrop: tmdbData.backdrop_path ? `${TMDB_BACKDROP_BASE}${tmdbData.backdrop_path}` : null,
              trailerKey: trailerKey
            };
          } catch (err) {
            return null;
          }
        })
      );

      const validMovies = enrichedMovies.filter(m => m !== null);
      const randomized = shuffleArray(validMovies);
      
      setMovies(randomized);

      if (randomized.length > 0) {
        setFeaturedMovie(randomized[0]);
      }

      // Filtrar todas las que tengan trailer disponible
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

  // Volver al inicio al hacer clic en el Logo (reinicia aleatoriamente)
  const handleHomeClick = () => {
    setSearchTerm('');
    const randomized = shuffleArray(movies);
    setMovies(randomized);
    if (randomized.length > 0) {
      setFeaturedMovie(randomized[0]);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filteredMovies = movies.filter(movie =>
    movie.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="loading-screen">
        <div>MECHAFLIX_</div>
      </div>
    );
  }

  return (
    <div className="app">
      {/* Navbar Adaptada y Limpia */}
      <nav className="navbar">
        <div className="brand-logo" onClick={handleHomeClick}>
          MECHAFLIX
        </div>
        <div className="search-container">
          <input 
            type="text" 
            className="search-bar" 
            placeholder="Buscar película..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </nav>

      {/* Hero Banner Destacado con Cambio Automático cada 15s */}
      {featuredMovie && !searchTerm && (
        <header 
          className="hero-banner" 
          style={{ 
            backgroundImage: `url(${featuredMovie.backdrop || featuredMovie.poster})` 
          }}
        >
          <div className="hero-overlay"></div>
          <div className="hero-content">
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
      {!searchTerm && trailers.length > 0 && (
        <section className="section-container">
          <h2 className="section-title">🎬 Trailers Oficiales</h2>
          <div className="trailers-carousel">
            {trailers.map((movie) => (
              <div 
                key={`trailer-${movie.id}`} 
                className="trailer-card"
                onClick={() => setSelectedVideoUrl(`https://www.youtube.com/embed/${movie.trailerKey}?autoplay=1`)}
              >
                <div 
                  className="trailer-thumb" 
                  style={{ backgroundImage: `url(${movie.backdrop || movie.poster})` }}
                >
                  <div className="play-icon">▶</div>
                </div>
                <div className="trailer-info">{movie.title}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Catálogo Principal de Películas */}
      <main className="catalog-container">
        <h2 className="section-title">
          {searchTerm ? `Resultados para "${searchTerm}"` : '⚡ Catálogo Principal'}
        </h2>
        <div className="movies-grid">
          {filteredMovies.map((movie) => (
            <div 
              key={movie.id} 
              className="movie-card"
              onClick={() => setSelectedVideoUrl(movie.videoUrl)}
            >
              <img 
                className="movie-poster"
                src={movie.poster || 'https://via.placeholder.com/500x750?text=Sin+Imagen'} 
                alt={movie.title} 
              />
              <div className="movie-title-bar">{movie.title}</div>
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
