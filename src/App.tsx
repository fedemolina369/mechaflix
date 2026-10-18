import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import './App.css';

const SUPABASE_URL = 'https://huccnokboulyqhhilsqf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Q5j7U4j7ZR5LIRXEAi5fAw_Cidw2_XC'; 
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const TMDB_API_KEY = '4ec39cc9f48d3568468324a2ba4581a9';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

export default function App() {
  const [movies, setMovies] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadCatalog() {
      try {
        // Apuntamos a 'Movies' con la M mayúscula tal como está en tu base de datos
        const { data: dbMovies, error } = await supabase.from('Movies').select('*');
        
        if (error) {
          setErrorMsg('Error en Supabase: ' + error.message);
          setLoading(false);
          return;
        }

        if (!dbMovies || dbMovies.length === 0) {
          setErrorMsg('La tabla "Movies" está vacía o no tiene registros.');
          setLoading(false);
          return;
        }

        const enrichedMovies = await Promise.all(
          dbMovies.map(async (movie) => {
            try {
              // Mapeamos exactamente los nombres de tus columnas (con mayúsculas)
              const tmdbId = movie.Tmdb_id || movie.tmdb_id;
              const videoUrl = movie.Video_url || movie.video_url;
              
              const res = await fetch(
                `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=es-ES`
              );
              const tmdbData = await res.json();
              return {
                id: movie.id,
                videoUrl: videoUrl,
                title: tmdbData.title || tmdbData.name || 'Título no disponible',
                poster: tmdbData.poster_path ? `${TMDB_IMAGE_BASE}${tmdbData.poster_path}` : null
              };
            } catch (err) {
              return null;
            }
          })
        );

        setMovies(enrichedMovies.filter(m => m !== null));
      } catch (err: any) {
        setErrorMsg('Error general: ' + err.message);
      } finally {
        setLoading(false);
      }
    }

    loadCatalog();
  }, []);

  return (
    <div className="app">
      <header className="header">
        <h1>Mechaflix 2.0</h1>
      </header>

      <main className="content">
        {loading && <p className="loading">Cargando catálogo...</p>}
        
        {errorMsg && (
          <div style={{ background: '#331111', border: '1px solid #e50914', padding: '1.5rem', borderRadius: '8px', margin: '2rem auto', maxWidth: '600px' }}>
            <p style={{ color: '#ff6b6b', fontWeight: 'bold', fontSize: '1.1rem' }}>⚠️ {errorMsg}</p>
          </div>
        )}

        <div className="grid">
          {movies.map((movie) => (
            <div key={movie.id} className="card" onClick={() => window.open(movie.videoUrl, '_blank')}>
              <img 
                src={movie.poster || 'https://via.placeholder.com/500x750?text=Sin+Imagen'} 
                alt={movie.title} 
              />
              <h3>{movie.title}</h3>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}