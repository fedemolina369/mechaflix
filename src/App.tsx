import { useEffect, useState, useRef } from 'react';
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

  // Estados para Series y Sagas
  const [selectedSeries, setSelectedSeries] = useState<any | null>(null);
  const [seasons, setSeasons] = useState<any[]>([]);
  const [currentSeasonNumber, setCurrentSeasonNumber] = useState<number>(1);
  const [episodes, setEpisodes] = useState<any[]>([]);

  const [sagasList, setSagasList] = useState<any[]>([]);
  const [selectedSaga, setSelectedSaga] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'all' | 'movie' | 'tv' | 'sagas'>('all');
  const [loading, setLoading] = useState<boolean>(true);

  const audioRef = useRef<HTMLAudioElement | null>(null);

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
            const mediaType = item.type === 'tv' ? 'tv' : 'movie';
            
            const res = await fetch(
              `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}&language=es-ES&append_to_response=videos`
            );
            const tmdbData = await res.json();
            
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
              tmdbId: tmdbId,
              saga: item.saga || item.Saga || null,
              sagaMusic: item.saga_music || item.Saga_music || null,
              title: tmdbData.title || tmdbData.name || 'Título no disponible',
              overview: tmdbData.overview || 'Sin descripción disponible.',
              poster: tmdbData.poster_path ? `${TMDB_IMAGE_BASE}${tmdbData.poster_path}` : null,
              backdrop: tmdbData.backdrop_path ? `${TMDB_BACKDROP_BASE}${tmdbData.backdrop_path}` : null,
              trailerKey: trailerKey,
              seasonsData: tmdbData.seasons || []
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

      setTrailers(randomized.filter(m => m.trailerKey !== null));

      // Construir lista única de Sagas
      const sagasMap: { [key: string]: any } = {};
      validItems.forEach(item => {
        if (item.saga) {
          if (!sagasMap[item.saga]) {
            sagasMap[item.saga] = {
              name: item.saga,
              backdrop: item.backdrop || item.poster,
              music: item.sagaMusic
            };
          } else if (item.sagaMusic && !sagasMap[item.saga].music) {
            sagasMap[item.saga].music = item.sagaMusic;
          }
        }
      });
      setSagasList(Object.values(sagasMap));

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCatalog();
  }, []);

  // Rotación del Banner automático cada 15s
  useEffect(() => {
    if (movies.length <= 1 || selectedSeries || selectedSaga) return;
    const bannerInterval = setInterval(() => {
      setFeaturedMovie((currentFeatured: any) => {
        const currentIndex = movies.findIndex(m => m.id === currentFeatured?.id);
        const nextIndex = (currentIndex + 1) % movies.length;
        return movies[nextIndex];
      });
    }, 15000);

    return () => clearInterval(bannerInterval);
  }, [movies, selectedSeries, selectedSaga]);

  // Manejo de Series
  const handleSeriesClick = async (series: any) => {
    setSelectedSeries(series);
    setSelectedSaga(null);
    const validSeasons = (series.seasonsData || []).filter((s: any) => s.season_number > 0);
    setSeasons(validSeasons);
    
    if (validSeasons.length > 0) {
      const firstSeasonNum = validSeasons[0].season_number;
      setCurrentSeasonNumber(firstSeasonNum);
      await fetchEpisodes(series.tmdbId, firstSeasonNum);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const fetchEpisodes = async (tmdbId: number, seasonNumber: number) => {
    try {
      const res = await fetch(
        `https://api.themoviedb.org/3/tv/${tmdbId}/season/${seasonNumber}?api_key=${TMDB_API_KEY}&language=es-ES`
      );
      const data = await res.json();
      setEpisodes(data.episodes || []);
    } catch (err) {
      console.error(err);
      setEpisodes([]);
    }
  };

  const handleSeasonChange = async (seasonNum: number) => {
    setCurrentSeasonNumber(seasonNum);
    if (selectedSeries) {
      await fetchEpisodes(selectedSeries.tmdbId, seasonNum);
    }
  };

  // Volver al inicio
  const handleHomeClick = () => {
    setSelectedSeries(null);
    setSelectedSaga(null);
    setSearchTerm('');
    setActiveTab('all');
    const randomized = shuffleArray(movies);
    setMovies(randomized);
    if (randomized.length > 0) {
      setFeaturedMovie(randomized[0]);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filteredMovies = movies.filter(item => {
    if (activeTab === 'sagas') return true;
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
      {/* Navbar */}
      <nav className="navbar">
        <div className="brand-logo" onClick={handleHomeClick}>
          MECHAFLIX
        </div>

        <div className="nav-tabs">
          <button 
            className={`nav-btn ${activeTab === 'all' && !selectedSeries && !selectedSaga ? 'active' : ''}`} 
            onClick={handleHomeClick}
          >
            INICIO
          </button>
          <button 
            className={`nav-btn ${activeTab === 'movie' && !selectedSeries && !selectedSaga ? 'active' : ''}`} 
            onClick={() => { setSelectedSeries(null); setSelectedSaga(null); setActiveTab('movie'); setSearchTerm(''); }}
          >
            PELÍCULAS
          </button>
          <button 
            className={`nav-btn ${activeTab === 'tv' && !selectedSeries && !selectedSaga ? 'active' : ''}`} 
            onClick={() => { setSelectedSeries(null); setSelectedSaga(null); setActiveTab('tv'); setSearchTerm(''); }}
          >
            SERIES
          </button>
          <button 
            className={`nav-btn ${activeTab === 'sagas' || selectedSaga ? 'active' : ''}`} 
            onClick={() => { setSelectedSeries(null); setSelectedSaga(null); setActiveTab('sagas'); setSearchTerm(''); }}
          >
            SAGAS
          </button>
        </div>

        <div className="search-container">
          <input 
            type="text" 
            className="search-bar" 
            placeholder="Buscar..." 
            value={searchTerm}
            onChange={(e) => { setSelectedSeries(null); setSelectedSaga(null); setSearchTerm(e.target.value); }}
          />
        </div>
      </nav>

      {/* VISTA DETALLE DE SAGA */}
      {selectedSaga ? (() => {
        const currentSagaData = sagasList.find(s => s.name === selectedSaga);
        const sagaMovies = movies.filter(m => m.saga === selectedSaga);

        return (
          <div className="saga-detail-view" style={{ backgroundImage: `url(${currentSagaData?.backdrop})` }}>
            <div className="saga-detail-overlay"></div>
            
            {/* Notificación Flotante tipo Menú PES en la esquina superior */}
            {currentSagaData?.music && (
              <>
                <audio 
                  ref={audioRef} 
                  src={currentSagaData.music} 
                  autoPlay 
                  loop 
                  style={{ display: 'none' }} 
                />
                <div className="pes-music-widget">
                  <span className="pes-music-icon">🎵</span>
                  <div className="pes-music-text">
                    <span className="pes-music-label">REPRODUCIENDO</span>
                    <span className="pes-music-title">Tema Oficial de {selectedSaga}</span>
                  </div>
                </div>
              </>
            )}

            <div className="series-detail-container" style={{ position: 'relative', zIndex: 2 }}>
              <button className="back-btn" onClick={() => setSelectedSaga(null)}>
                ← Volver a Sagas
              </button>

              <div className="series-header">
                <div className="series-info">
                  <span className="badge-type">SAGA EXCLUSIVA</span>
                  <h1>{selectedSaga}</h1>
                  <p>Colección completa de películas y entregas de la saga.</p>
                </div>
              </div>

              <div className="section-title">Películas de la Saga</div>
              <div className="movies-grid">
                {sagaMovies.map((item) => (
                  <div 
                    key={item.id} 
                    className="movie-card"
                    onClick={() => {
                      if (item.type === 'tv') handleSeriesClick(item);
                      else setSelectedVideoUrl(item.videoUrl);
                    }}
                  >
                    <span className="card-badge">SAGA</span>
                    <img className="movie-poster" src={item.poster || 'https://via.placeholder.com/500x750?text=Sin+Imagen'} alt={item.title} />
                    <div className="movie-title-bar">{item.title}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })() : selectedSeries ? (
        /* VISTA DETALLE DE SERIE */
        <div className="series-detail-container">
          <button className="back-btn" onClick={() => setSelectedSeries(null)}>
            ← Volver al Catálogo
          </button>

          <div className="series-header">
            <img src={selectedSeries.poster || 'https://via.placeholder.com/500x750?text=Sin+Imagen'} alt={selectedSeries.title} className="series-poster" />
            <div className="series-info">
              <span className="badge-type">SERIE</span>
              <h1>{selectedSeries.title}</h1>
              <p>{selectedSeries.overview}</p>
            </div>
          </div>

          <div className="section-title">Temporadas</div>
          <div className="seasons-tabs">
            {seasons.map((season) => (
              <button
                key={season.id}
                className={`season-btn ${currentSeasonNumber === season.season_number ? 'active' : ''}`}
                onClick={() => handleSeasonChange(season.season_number)}
              >
                {season.name || `Temporada ${season.season_number}`}
              </button>
            ))}
          </div>

          <div className="section-title" style={{ marginTop: '30px' }}>Capítulos</div>
          <div className="episodes-grid">
            {episodes.map((ep) => (
              <div 
                key={ep.id} 
                className="episode-card"
                onClick={() => setSelectedVideoUrl(selectedSeries.videoUrl)}
              >
                <img 
                  className="episode-thumb"
                  src={ep.still_path ? `${TMDB_IMAGE_BASE}${ep.still_path}` : (selectedSeries.backdrop || selectedSeries.poster)} 
                  alt={ep.name} 
                />
                <div className="episode-details">
                  <div className="episode-title">{ep.episode_number}. {ep.name}</div>
                  <div className="episode-overview">{ep.overview || 'Sin descripción disponible.'}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : activeTab === 'sagas' ? (
        /* VISTA PRINCIPAL DE SECCIÓN SAGAS */
        <main className="catalog-container" style={{ marginTop: '90px' }}>
          <h2 className="section-title">🔥 Sagas Cinematográficas</h2>
          <div className="sagas-grid">
            {sagasList.map((saga) => (
              <div 
                key={saga.name} 
                className="saga-card"
                style={{ backgroundImage: `url(${saga.backdrop})` }}
                onClick={() => setSelectedSaga(saga.name)}
              >
                <div className="saga-card-title">{saga.name}</div>
              </div>
            ))}
          </div>
        </main>
      ) : (
        /* VISTA PRINCIPAL (INICIO, PELÍCULAS, SERIES) */
        <>
          {featuredMovie && !searchTerm && activeTab === 'all' && (
            <header 
              className="hero-banner" 
              style={{ backgroundImage: `url(${featuredMovie.backdrop || featuredMovie.poster})` }}
            >
              <div className="hero-overlay"></div>
              <div className="hero-content">
                <span className="badge-type">{featuredMovie.type === 'tv' ? 'SERIE' : 'PELÍCULA'}</span>
                <h1 className="hero-title">{featuredMovie.title}</h1>
                <p className="hero-overview">{featuredMovie.overview}</p>
                <button 
                  className="btn-neon" 
                  onClick={() => {
                    if (featuredMovie.type === 'tv') handleSeriesClick(featuredMovie);
                    else setSelectedVideoUrl(featuredMovie.videoUrl);
                  }}
                >
                  {featuredMovie.type === 'tv' ? '▶ VER CAPÍTULOS' : '▶ REPRODUCIR AHORA'}
                </button>
              </div>
            </header>
          )}

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
                    <div className="trailer-thumb" style={{ backgroundImage: `url(${item.backdrop || item.poster})` }}>
                      <div className="play-icon">▶</div>
                    </div>
                    <div className="trailer-info">{item.title}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

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
                  onClick={() => {
                    if (item.type === 'tv') handleSeriesClick(item);
                    else setSelectedVideoUrl(item.videoUrl);
                  }}
                >
                  <span className="card-badge">{item.type === 'tv' ? 'SERIE' : 'PELÍCULA'}</span>
                  <img className="movie-poster" src={item.poster || 'https://via.placeholder.com/500x750?text=Sin+Imagen'} alt={item.title} />
                  <div className="movie-title-bar">{item.title}</div>
                </div>
              ))}
            </div>
          </main>
        </>
      )}

      {/* Modal Reproductor */}
      {selectedVideoUrl && (
        <div className="modal-backdrop" onClick={() => setSelectedVideoUrl(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setSelectedVideoUrl(null)}>✕</button>
            <div className="video-container">
              <iframe src={selectedVideoUrl} title="Reproductor Mechaflix" allow="autoplay; encrypted-media; fullscreen" allowFullScreen></iframe>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
