import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Play,
  Plus,
  Check,
  Star,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Clock,
  Film,
} from 'lucide-react';

import Navbar from '../components/Navbar';
import {
  getMovieById,
  addToMyList,
  removeFromMyList,
} from '../services/movieService';

const MovieDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [inList, setInList] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  useEffect(() => {
    if (!id) return;

    const fetchMovie = async () => {
      setLoading(true);
      setError('');

      try {
        const res = await getMovieById(id);

        if (res.data?.success && res.data?.data) {
          setMovie(res.data.data);
        } else {
          setError('Movie not found.');
        }
      } catch (err) {
        if (err.response?.status === 404) {
          setError('This movie does not exist.');
        } else {
          setError(
            err.response?.data?.message ||
              'Failed to load movie details.'
          );
        }
      } finally {
        setLoading(false);
      }
    };

    fetchMovie();
  }, [id]);

  const handleToggleList = async () => {
    setListLoading(true);

    try {
      if (inList) {
        await removeFromMyList(id);
        setInList(false);
        showToast('Removed from My List');
      } else {
        await addToMyList(id);
        setInList(true);
        showToast('Added to My List ✓');
      }
    } catch (err) {
      showToast(
        err.response?.data?.message || 'Action failed.'
      );
    } finally {
      setListLoading(false);
    }
  };

  // ✅ FIXED PLAY FUNCTION
  const handlePlayTrailer = () => {
    if (!movie?.videoUrl) {
      showToast('Trailer not available');
      return;
    }

    navigate('/watch', {
      state: {
        videoUrl: movie.videoUrl,
        title: movie.title,
        movieId: movie._id || movie.id,
      },
    });
  };

  if (loading) {
    return (
      <div className="bg-[#141414] min-h-screen text-white">
        <Navbar />

        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full border-4 border-t-[#E50914] border-zinc-800 animate-spin" />

            <p className="text-zinc-500 text-sm">
              Loading movie details...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#141414] min-h-screen text-white">
        <Navbar />

        <div className="flex items-center justify-center min-h-[80vh] px-4">
          <div className="text-center space-y-4 max-w-sm">
            <AlertCircle className="w-14 h-14 text-red-500 mx-auto" />

            <h2 className="text-xl font-black text-white">
              {error}
            </h2>

            <button
              onClick={() => navigate('/')}
              className="bg-[#E50914] hover:bg-[#C11119] text-white font-bold px-6 py-2.5 rounded transition-all"
            >
              Back to Browse
            </button>
          </div>
        </div>
      </div>
    );
  }

  const banner =
    movie?.banner ||
    movie?.thumbnail ||
    'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1600&q=80';

  return (
    <div className="bg-[#141414] min-h-screen text-white pb-24">
      <Navbar />

      {/* Toast */}
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] bg-zinc-800 border border-zinc-700 text-white text-sm font-semibold px-5 py-2.5 rounded-full shadow-xl"
        >
          {toast}
        </motion.div>
      )}

      {/* Hero */}
      <div
        className="h-[60vh] md:h-[70vh] w-full relative bg-cover bg-center"
        style={{
          backgroundImage: `linear-gradient(to top, #141414 0%, rgba(20,20,20,0.2) 60%, rgba(20,20,20,0.7) 100%), url('${banner}')`,
        }}
      >
        <div className="absolute top-20 left-4 sm:left-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-zinc-300 hover:text-white transition-colors text-sm font-semibold bg-black/40 hover:bg-black/60 px-3 py-2 rounded-lg backdrop-blur"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>
      </div>

      {/* Details */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-28 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Title */}
          <div className="space-y-3">
            {movie?.category && (
              <span className="text-[#E50914] text-xs font-black tracking-widest uppercase">
                {movie.category}
              </span>
            )}

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white uppercase leading-tight">
              {movie?.title}
            </h1>

            <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-300 font-semibold">
              {movie?.rating && (
                <span className="flex items-center gap-1 text-amber-400">
                  <Star className="w-4 h-4 fill-current" />
                  {parseFloat(movie.rating).toFixed(1)} / 10
                </span>
              )}

              {movie?.year && (
                <span className="text-zinc-400">
                  {movie.year}
                </span>
              )}

              {movie?.genre && (
                <>
                  <span className="text-zinc-600">•</span>
                  <span>{movie.genre}</span>
                </>
              )}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            {/* ✅ FIXED PLAY BUTTON */}
            <button
              onClick={handlePlayTrailer}
              className="bg-white hover:bg-zinc-200 text-black px-7 py-3 rounded font-bold flex items-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-lg text-sm"
            >
              <Play className="w-5 h-5 fill-current" />
              Play
            </button>

            {/* My List */}
            <button
              onClick={handleToggleList}
              disabled={listLoading}
              className={`px-6 py-3 rounded font-bold flex items-center gap-2 border transition-all active:scale-95 cursor-pointer text-sm disabled:opacity-60 ${
                inList
                  ? 'bg-emerald-950/40 border-emerald-700 text-emerald-300 hover:bg-red-950/30 hover:border-red-700 hover:text-red-300'
                  : 'bg-zinc-800/70 border-zinc-700 text-white hover:bg-zinc-700'
              }`}
            >
              {listLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : inList ? (
                <Check className="w-4 h-4" />
              ) : (
                <Plus className="w-4 h-4" />
              )}

              {inList ? 'In My List' : 'Add to My List'}
            </button>
          </div>

          {/* Description */}
          {movie?.description && (
            <p className="text-zinc-300 text-sm sm:text-base leading-relaxed max-w-2xl">
              {movie.description}
            </p>
          )}

          {/* Info Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
            {movie?.genre && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                <p className="text-zinc-500 text-xs uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Film className="w-3 h-3" />
                  Genre
                </p>

                <p className="text-white font-bold text-sm">
                  {movie.genre}
                </p>
              </div>
            )}

            {movie?.year && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                <p className="text-zinc-500 text-xs uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Year
                </p>

                <p className="text-white font-bold text-sm">
                  {movie.year}
                </p>
              </div>
            )}

            {movie?.rating && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                <p className="text-zinc-500 text-xs uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Star className="w-3 h-3" />
                  Rating
                </p>

                <p className="text-amber-400 font-bold text-sm">
                  {parseFloat(movie.rating).toFixed(1)} / 10
                </p>
              </div>
            )}

            {movie?.category && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                <p className="text-zinc-500 text-xs uppercase tracking-wider mb-1">
                  Category
                </p>

                <p className="text-white font-bold text-sm">
                  {movie.category}
                </p>
              </div>
            )}
          </div>

          {/* Thumbnail */}
          {movie?.thumbnail &&
            movie?.banner &&
            movie.thumbnail !== movie.banner && (
              <div className="pt-4">
                <p className="text-zinc-500 text-xs uppercase tracking-wider mb-3">
                  Thumbnail
                </p>

                <img
                  src={movie.thumbnail}
                  alt={movie.title}
                  className="w-48 rounded-lg border border-zinc-800 shadow-lg object-cover"
                />
              </div>
            )}
        </motion.div>
      </div>
    </div>
  );
};

export default MovieDetail;