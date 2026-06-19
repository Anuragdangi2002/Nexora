import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Info, Plus, Check, Award, ChevronRight, Sparkles,
  MonitorPlay, Star, ChevronLeft, Loader2, RefreshCw, AlertCircle,
  Clock, Flame, ThumbsUp, FilmIcon, Heart, Sword, Laugh, Ghost
} from 'lucide-react';
import Navbar from '../components/Navbar';
import {
  getHomepageMovies,
  addToMyList,
  removeFromMyList,
  updateContinueWatching,
} from '../services/movieService';

// ─── Skeleton Card ────────────────────────────────────────────────────────────
const SkeletonCard = () => (
  <div className="rounded-lg overflow-hidden animate-pulse">
    <div className="h-40 sm:h-48 bg-zinc-800 w-full" />
    <div className="p-3 space-y-2 bg-zinc-900">
      <div className="h-3 bg-zinc-700 rounded w-3/4" />
      <div className="h-2.5 bg-zinc-800 rounded w-1/2" />
    </div>
  </div>
);

// ─── Movie Card ───────────────────────────────────────────────────────────────
const MovieCard = ({ movie, onPlay, onToggleList, isInList }) => {
  const [listLoading, setListLoading] = useState(false);
  const [hovered, setHovered] = useState(false);

  const handleListToggle = async (e) => {
    e.stopPropagation();
    setListLoading(true);
    await onToggleList(movie._id || movie.id, isInList);
    setListLoading(false);
  };

  const thumbnail = movie.thumbnail || movie.image ||
    `https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=600&q=80`;

  const rating = movie.rating ? parseFloat(movie.rating).toFixed(1) : null;

  return (
    <motion.div
      whileHover={{ scale: 1.05, zIndex: 10 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="rounded-lg overflow-hidden group cursor-pointer relative shadow-md select-none bg-zinc-900"
      style={{ transformOrigin: 'center bottom' }}
    >
      {/* Thumbnail */}
      <div
        className="h-40 sm:h-48 w-full overflow-hidden relative"
        onClick={() => onPlay(movie)}
      >
        <img
          src={thumbnail}
          alt={movie.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          onError={(e) => {
            e.target.src = `https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=600&q=80`;
          }}
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Rating badge */}
        {rating && (
          <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm px-1.5 py-0.5 rounded flex items-center gap-1 text-[10px] font-bold text-amber-400">
            <Star className="w-2.5 h-2.5 fill-current" />
            {rating}
          </div>
        )}

        {/* Year badge */}
        {movie.year && (
          <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] font-bold text-zinc-300">
            {movie.year}
          </div>
        )}

        {/* Continue watching progress bar */}
        {movie.progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-700">
            <div
              className="h-full bg-[#E50914] transition-all"
              style={{ width: `${movie.progress}%` }}
            />
          </div>
        )}

        {/* Play hover overlay */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-black shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
            <Play className="w-6 h-6 fill-current ml-1 text-black" />
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3
            onClick={() => onPlay(movie)}
            className="font-extrabold text-white text-sm group-hover:text-[#E50914] transition-colors truncate flex-1"
          >
            {movie.title}
          </h3>
          {/* My List toggle */}
          <button
            onClick={handleListToggle}
            disabled={listLoading}
            className={`shrink-0 w-6 h-6 rounded-full border flex items-center justify-center transition-all cursor-pointer active:scale-90 ${
              isInList
                ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400 hover:bg-red-900/20 hover:border-red-500 hover:text-red-400'
                : 'border-zinc-600 text-zinc-400 hover:border-white hover:text-white'
            }`}
            title={isInList ? 'Remove from My List' : 'Add to My List'}
          >
            {listLoading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : isInList ? (
              <Check className="w-3 h-3" />
            ) : (
              <Plus className="w-3 h-3" />
            )}
          </button>
        </div>

        <div className="flex items-center justify-between text-[11px] text-zinc-500 font-semibold">
          <span className="truncate">{movie.genre || 'Movie'}</span>
          <span className="text-[10px] text-zinc-400 border border-zinc-800 rounded px-1 flex items-center gap-0.5 shrink-0 ml-1">
            <MonitorPlay className="w-2.5 h-2.5" />
            Play
          </span>
        </div>

        {/* Progress label for continue watching */}
        {movie.progress > 0 && (
          <p className="text-[10px] text-zinc-500">
            <Clock className="w-2.5 h-2.5 inline mr-1" />
            {movie.progress}% watched
          </p>
        )}
      </div>
    </motion.div>
  );
};

// ─── Movie Row ────────────────────────────────────────────────────────────────
const MovieRow = ({ title, movies, icon: Icon, onPlay, onToggleList, myListIds, loading }) => {
  const scrollRef = React.useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (!scrollRef.current) return;
    setCanScrollLeft(scrollRef.current.scrollLeft > 0);
    setCanScrollRight(
      scrollRef.current.scrollLeft < scrollRef.current.scrollWidth - scrollRef.current.clientWidth - 10
    );
  };

  const scroll = (dir) => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir * 360, behavior: 'smooth' });
    setTimeout(checkScroll, 400);
  };

  if (!loading && (!movies || movies.length === 0)) return null;

  return (
    <div className="space-y-3 group/row">
      <div className="flex items-center gap-2 px-1">
        {Icon && <Icon className="w-4 h-4 text-[#E50914]" />}
        <h2 className="text-base sm:text-lg font-black uppercase tracking-wide text-zinc-100">
          {title}
        </h2>
        <ChevronRight className="w-4 h-4 text-zinc-600 group-hover/row:text-white transition-colors" />
      </div>

      <div className="relative">
        {/* Scroll Left */}
        {canScrollLeft && (
          <button
            onClick={() => scroll(-1)}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-black/70 rounded-full flex items-center justify-center text-white shadow-lg cursor-pointer hover:bg-black/90 transition-colors -translate-x-2"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
        {/* Scroll Right */}
        {canScrollRight && movies?.length > 3 && (
          <button
            onClick={() => scroll(1)}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-black/70 rounded-full flex items-center justify-center text-white shadow-lg cursor-pointer hover:bg-black/90 transition-colors translate-x-2"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
        >
          {loading
            ? Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
            : movies.map((movie) => (
                <MovieCard
                  key={movie._id || movie.id}
                  movie={movie}
                  onPlay={onPlay}
                  onToggleList={onToggleList}
                  isInList={myListIds.has(movie._id || movie.id)}
                />
              ))}
        </div>
      </div>
    </div>
  );
};

// ─── Hero Banner ──────────────────────────────────────────────────────────────
const HeroBanner = ({ movie, onPlay, onToggleList, isInList }) => {
  const [listLoading, setListLoading] = useState(false);

  const handleListToggle = async () => {
    setListLoading(true);
    await onToggleList(movie._id || movie.id, isInList);
    setListLoading(false);
  };

  const bannerUrl = movie?.banner || movie?.thumbnail ||
    'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1600&q=80';

  return (
    <div
      className="h-[80vh] md:h-[90vh] w-full relative bg-cover bg-center flex items-end pb-24 sm:pb-36"
      style={{
        backgroundImage: `linear-gradient(to top, #141414 0%, rgba(20,20,20,0.3) 50%, rgba(20,20,20,0.8) 100%), linear-gradient(to right, rgba(20, 20, 20, 0.9) 0%, rgba(20, 20, 20, 0.2) 60%, transparent 100%), url('${bannerUrl}')`,
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="max-w-2xl space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-[#E50914] text-xs font-black tracking-widest uppercase flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 fill-current animate-pulse" />
              {movie?.category || 'FEATURED'}
            </span>
          </div>

          <h1
            className="text-4xl sm:text-6xl font-black tracking-tighter text-white uppercase leading-none drop-shadow-md select-none"
            style={{ fontFamily: "'Arial Black', sans-serif" }}
          >
            {movie?.title || 'Welcome to Nexora'}
          </h1>

          <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm font-semibold text-zinc-300">
            {movie?.rating && (
              <span className="text-amber-400 flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-current" />
                {parseFloat(movie.rating).toFixed(1)}
              </span>
            )}
            {movie?.year && <span>{movie.year}</span>}
            {movie?.genre && (
              <>
                <span className="text-zinc-500">•</span>
                <span>{movie.genre}</span>
              </>
            )}
            <span className="border border-zinc-600 rounded px-1.5 py-0.5 text-[10px] text-zinc-400 font-bold uppercase">
              HDR 4K
            </span>
          </div>

          {movie?.description && (
            <p className="text-zinc-300 text-sm sm:text-base leading-relaxed drop-shadow-sm line-clamp-3">
              {movie.description}
            </p>
          )}

          <div className="flex items-center gap-4 pt-4">
            <button
              onClick={() => onPlay(movie)}
              className="bg-white hover:bg-zinc-200 text-black px-6 sm:px-8 py-3 rounded font-bold text-sm sm:text-base flex items-center gap-2.5 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-lg"
            >
              <Play className="w-5 h-5 fill-current text-black" />
              Play Now
            </button>

            <button
              onClick={handleListToggle}
              disabled={listLoading}
              className={`px-5 sm:px-7 py-3 rounded font-bold text-sm sm:text-base flex items-center gap-2.5 border backdrop-blur transition-all active:scale-95 cursor-pointer shadow disabled:opacity-60 ${
                isInList
                  ? 'bg-emerald-950/40 border-emerald-700 text-emerald-300 hover:bg-red-950/30 hover:border-red-700 hover:text-red-300'
                  : 'bg-zinc-800/60 hover:bg-zinc-800 text-white border-zinc-700/50'
              }`}
            >
              {listLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isInList ? (
                <Check className="w-5 h-5" />
              ) : (
                <Plus className="w-5 h-5" />
              )}
              {isInList ? 'In My List' : 'My List'}
            </button>

            <Link
              to={movie ? `/movie/${movie._id || movie.id}` : '/subscriptions'}
              className="bg-zinc-800/60 hover:bg-zinc-800 text-white px-5 sm:px-7 py-3 rounded font-bold text-sm sm:text-base flex items-center gap-2.5 border border-zinc-700/50 backdrop-blur transition-all active:scale-95 shadow"
            >
              <Info className="w-5 h-5" />
              More Info
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main Home Component ──────────────────────────────────────────────────────
const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [homepageData, setHomepageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [myListIds, setMyListIds] = useState(new Set());
  const [toastMsg, setToastMsg] = useState('');

  const isFreePlan = !user?.subscription || user?.subscription?.status !== 'active';

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2500);
  };

  const fetchHomepage = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getHomepageMovies();
      if (res.data?.success && res.data?.data) {
        const data = res.data.data;
        setHomepageData(data);
        // Build myList ID set from returned myList
        const ids = new Set((data.myList || []).map((m) => m._id || m.id).filter(Boolean));
        setMyListIds(ids);
      } else {
        setError('Unexpected response from server.');
      }
    } catch (err) {
      console.error('Homepage fetch error:', err);
      if (err.response?.status === 401) {
        setError('Session expired. Please log in again.');
      } else {
        setError(err.response?.data?.message || 'Failed to load movies. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHomepage();
  }, [fetchHomepage]);

  const handlePlay = (movie) => {
    if (movie?._id || movie?.id) {
      navigate(`/movie/${movie._id || movie.id}`);
    } else {
      navigate('/watch');
    }
  };

  const handleToggleList = async (movieId, currentlyInList) => {
    if (!movieId) return;
    try {
      if (currentlyInList) {
        await removeFromMyList(movieId);
        setMyListIds((prev) => {
          const next = new Set(prev);
          next.delete(movieId);
          return next;
        });
        showToast('Removed from My List');
      } else {
        await addToMyList(movieId);
        setMyListIds((prev) => new Set([...prev, movieId]));
        showToast('Added to My List ✓');
      }
    } catch (err) {
      console.error('My List error:', err);
      showToast(err.response?.data?.message || 'Action failed. Please try again.');
    }
  };

  const rowConfig = [
    { key: 'trendingNow', title: 'Trending Now', icon: Flame },
    { key: 'continueWatching', title: 'Continue Watching', icon: Clock },
    { key: 'topRated', title: 'Top Rated', icon: Star },
    { key: 'recentlyAdded', title: 'Recently Added', icon: ThumbsUp },
    { key: 'myList', title: 'My List', icon: Heart },
    { key: 'actionMovies', title: 'Action & Adventure', icon: Sword },
    { key: 'comedyMovies', title: 'Comedy', icon: Laugh },
    { key: 'horrorMovies', title: 'Horror', icon: Ghost },
    { key: 'recommendedForYou', title: 'Recommended For You', icon: Sparkles },
  ];

  const heroBanner = homepageData?.heroBanner;
  const heroId = heroBanner?._id || heroBanner?.id;
  const heroInList = heroId ? myListIds.has(heroId) : false;

  return (
    <div className="bg-[#141414] min-h-screen text-white pb-24 overflow-x-hidden">
      <Navbar />

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] bg-zinc-800 border border-zinc-700 text-white text-sm font-semibold px-5 py-2.5 rounded-full shadow-xl"
          >
            {toastMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Hero Banner ── */}
      {loading ? (
        <div className="h-[80vh] md:h-[90vh] w-full bg-zinc-900 animate-pulse flex items-end pb-24 sm:pb-36">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full space-y-4">
            <div className="h-4 bg-zinc-800 rounded w-24" />
            <div className="h-14 bg-zinc-800 rounded w-96 max-w-full" />
            <div className="h-4 bg-zinc-800 rounded w-64" />
            <div className="h-16 bg-zinc-800 rounded w-72" />
            <div className="flex gap-4 pt-4">
              <div className="h-12 bg-zinc-700 rounded w-32" />
              <div className="h-12 bg-zinc-700 rounded w-28" />
            </div>
          </div>
        </div>
      ) : heroBanner ? (
        <HeroBanner
          movie={heroBanner}
          onPlay={handlePlay}
          onToggleList={handleToggleList}
          isInList={heroInList}
        />
      ) : (
        /* Fallback static hero */
        <div
          className="h-[80vh] md:h-[90vh] w-full relative bg-cover bg-center flex items-end pb-24 sm:pb-36"
          style={{
            backgroundImage: `linear-gradient(to top, #141414 0%, rgba(20,20,20,0.3) 50%, rgba(20,20,20,0.8) 100%), linear-gradient(to right, rgba(20,20,20,0.9) 0%, rgba(20,20,20,0.2) 60%, transparent 100%), url('https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1600&q=80')`,
          }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <div className="max-w-2xl space-y-4">
              <span className="text-[#E50914] text-xs font-black tracking-widest uppercase flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 fill-current animate-pulse" /> NEXORA ORIGINAL
              </span>
              <h1 className="text-4xl sm:text-6xl font-black tracking-tighter text-white uppercase leading-none">
                Tears of Steel
              </h1>
              <p className="text-zinc-300 text-sm sm:text-base leading-relaxed line-clamp-3">
                Set in a neon-drenched cyberpunk future, scientists attempt to rescue the world from rogue
                cybernetic giants. A breathtaking showcase of visual fidelity.
              </p>
              <div className="flex items-center gap-4 pt-4">
                <button
                  onClick={() => navigate('/watch')}
                  className="bg-white hover:bg-zinc-200 text-black px-6 sm:px-8 py-3 rounded font-bold flex items-center gap-2.5 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-lg"
                >
                  <Play className="w-5 h-5 fill-current text-black" />
                  Play Now
                </button>
                <button
                  onClick={() => navigate('/subscriptions')}
                  className="bg-zinc-800/60 hover:bg-zinc-800 text-white px-6 sm:px-8 py-3 rounded font-bold flex items-center gap-2.5 border border-zinc-700/50 backdrop-blur transition-all active:scale-95 cursor-pointer shadow"
                >
                  <Info className="w-5 h-5" />
                  Plan Details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Content ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 sm:-mt-24 relative z-20 space-y-12">

        {/* Error state */}
        {error && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-lg bg-red-950/40 border border-red-800/60 text-red-200 flex items-center justify-between gap-4 text-sm"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={fetchHomepage}
              className="text-xs font-bold bg-red-800/40 hover:bg-red-800/60 px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry
            </button>
          </motion.div>
        )}

        {/* Free plan upgrade banner */}
        {isFreePlan && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-xl bg-gradient-to-r from-red-950/40 via-purple-950/20 to-zinc-900 border border-[#E50914]/20 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl"
          >
            <div className="space-y-1 text-center md:text-left">
              <h4 className="font-bold text-white text-base sm:text-lg flex items-center justify-center md:justify-start gap-2">
                <Award className="w-5 h-5 text-[#E50914] shrink-0" />
                Unlock Premium Streaming
              </h4>
              <p className="text-zinc-400 text-xs sm:text-sm">
                You are on a <strong className="text-white">Free plan</strong>. Upgrade to stream in 4K and unlock all movies.
              </p>
            </div>
            <Link
              to="/subscriptions"
              className="bg-[#E50914] hover:bg-[#C11119] text-white text-xs sm:text-sm font-bold px-6 py-2.5 rounded-md transition-all hover:scale-105 active:scale-95 shadow-[0_4px_12px_rgba(229,9,20,0.3)] shrink-0"
            >
              Choose Plan
            </Link>
          </motion.div>
        )}

        {/* Movie Rows */}
        {rowConfig.map(({ key, title, icon }) => {
          const movies = homepageData?.[key];
          const hasData = movies && movies.length > 0;
          if (!loading && !hasData) return null;
          return (
            <MovieRow
              key={key}
              title={title}
              icon={icon}
              movies={movies}
              loading={loading}
              onPlay={handlePlay}
              onToggleList={handleToggleList}
              myListIds={myListIds}
            />
          );
        })}

        {/* Empty state when all rows are empty */}
        {!loading && !error && homepageData && rowConfig.every(({ key }) => !(homepageData[key]?.length > 0)) && (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <FilmIcon className="w-16 h-16 text-zinc-700" />
            <h3 className="text-xl font-black text-zinc-400 uppercase tracking-wide">No Movies Yet</h3>
            <p className="text-zinc-600 text-sm">Ask an admin to add movies to the catalog.</p>
            {user?.role === 'admin' && (
              <Link
                to="/admin"
                className="mt-2 bg-[#E50914] hover:bg-[#C11119] text-white font-bold px-5 py-2.5 rounded transition-all text-sm"
              >
                Go to Admin Dashboard
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
