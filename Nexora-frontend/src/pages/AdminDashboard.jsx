import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import {
  adminCreateMovie, adminUpdateMovie, adminDeleteMovie,
  adminUploadThumbnail, adminUploadBanner, adminUploadTrailer,
} from '../services/movieService';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Users, IndianRupee, Activity, Monitor, ShieldCheck, 
  TrendingUp, RefreshCw, Clock, Search, Lock, AlertCircle, 
  ShoppingBag, Plus, Edit, Trash2, X, Check, Eye,
  Film, Upload, Image, Star, ToggleLeft, ToggleRight, Loader2
} from 'lucide-react';
import Navbar from '../components/Navbar';

// Zod schema for subscription plans
const planSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  price: z.preprocess(
    (val) => (val === '' ? undefined : Number(val)),
    z.number({ invalid_type_error: 'Price must be a valid number' }).min(0, 'Price must be a positive number')
  ),
  maxScreens: z.preprocess(
    (val) => (val === '' ? undefined : Number(val)),
    z.number({ invalid_type_error: 'Max Screens must be a valid number' }).int().min(1, 'At least 1 screen is required').max(20, 'Screen limit exceeded')
  ),
  resolution: z.string().min(1, 'Resolution is required'),
  videoQuality: z.string().min(1, 'Video Quality is required'),
  description: z.string().min(5, 'Description must be at least 5 characters'),
  isActive: z.boolean().default(true),
});

const AdminDashboard = () => {
  const { user } = useAuth();
  
  // Dashboard Telemetry States
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('streams'); // 'streams' | 'users' | 'transactions' | 'plans' | 'movies'

  // Movie Management States
  const [movies, setMovies] = useState([]);
  const [moviesLoading, setMoviesLoading] = useState(false);
  const [isMovieModalOpen, setIsMovieModalOpen] = useState(false);
  const [movieModalMode, setMovieModalMode] = useState('create');
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [deleteMovieId, setDeleteMovieId] = useState(null);
  const [movieSearchQuery, setMovieSearchQuery] = useState('');

  // Plan Management States
  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [planError, setPlanError] = useState('');
  const [deletePlanId, setDeletePlanId] = useState(null);

  // Fetch telemetry from server
  const fetchDashboardStats = async () => {
    try {
      const res = await API.get('/admin/dashboard-stats');
      if (res.data?.success && res.data?.data) {
        setStats(res.data.data);
      } else {
        setError('Unexpected telemetry data format.');
      }
    } catch (err) {
      console.error('Error fetching admin stats', err);
      setError(err.response?.data?.message || 'Access Denied: Administrative permissions required.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch admin-level plans list (active + inactive)
  const fetchAdminPlans = async () => {
    setPlansLoading(true);
    try {
      const res = await API.get('/subscriptions/admin/plans');
      if (res.data?.success && res.data?.data) {
        setPlans(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching admin plans', err);
    } finally {
      setPlansLoading(false);
    }
  };

  // Fetch all movies (admin)
  const fetchAdminMovies = async () => {
    setMoviesLoading(true);
    try {
      // Use /movies/homepage to gather all movies, or a dedicated admin list if available
      const res = await API.get('/admin/movies').catch(() => null);
      if (res?.data?.success && Array.isArray(res.data.data)) {
        setMovies(res.data.data);
      } else {
        // Fallback: try /movies/homepage and flatten all rows
        const homeRes = await API.get('/movies/homepage');
        if (homeRes.data?.success && homeRes.data?.data) {
          const d = homeRes.data.data;
          const all = [
            d.heroBanner,
            ...(d.trendingNow || []),
            ...(d.topRated || []),
            ...(d.recentlyAdded || []),
            ...(d.actionMovies || []),
            ...(d.comedyMovies || []),
            ...(d.horrorMovies || []),
            ...(d.recommendedForYou || []),
          ].filter(Boolean);
          const unique = Array.from(new Map(all.map(m => [(m._id || m.id), m])).values());
          setMovies(unique);
        }
      }
    } catch (err) {
      console.error('Error fetching movies', err);
    } finally {
      setMoviesLoading(false);
    }
  };

  // Synchronous sync trigger
  const handleDataSync = () => {
    setIsLoading(true);
    fetchDashboardStats();
    fetchAdminPlans();
    if (activeTab === 'movies') fetchAdminMovies();
  };

  useEffect(() => {
    fetchDashboardStats();
    fetchAdminPlans();
  }, []);

  // Poll dashboard statistics (active screens/users/transactions)
  useEffect(() => {
    if (!autoRefresh || activeTab === 'plans') return;
    const interval = setInterval(() => {
      fetchDashboardStats();
    }, 8000);
    return () => clearInterval(interval);
  }, [autoRefresh, activeTab]);

  // Fetch plans / movies specifically on tab activate
  useEffect(() => {
    if (activeTab === 'plans') fetchAdminPlans();
    if (activeTab === 'movies') fetchAdminMovies();
  }, [activeTab]);

  const handleDeleteMovie = async () => {
    if (!deleteMovieId) return;
    try {
      await adminDeleteMovie(deleteMovieId);
      fetchAdminMovies();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete movie.');
    } finally {
      setDeleteMovieId(null);
    }
  };

  const handleOpenMovieModal = (mode, movie = null) => {
    setMovieModalMode(mode);
    setSelectedMovie(movie);
    setIsMovieModalOpen(true);
  };

  const filteredMovies = movies.filter(m =>
    m.title?.toLowerCase().includes(movieSearchQuery.toLowerCase()) ||
    m.genre?.toLowerCase().includes(movieSearchQuery.toLowerCase()) ||
    m.category?.toLowerCase().includes(movieSearchQuery.toLowerCase())
  );

  // Access check
  if (user?.role !== 'admin') {
    return (
      <div className="bg-[#141414] min-h-screen text-white flex items-center justify-center p-6">
        <Navbar />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full glass-panel-heavy rounded-xl p-8 text-center border border-red-900/30"
        >
          <div className="w-16 h-16 bg-red-950/40 border border-red-600/40 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black mb-2 uppercase tracking-wide">Access Denied</h1>
          <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
            You do not possess the required administrative credentials to access this system. 
            All access logs are recorded for compliance.
          </p>
          <a
            href="/"
            className="inline-block bg-[#E50914] hover:bg-[#C11119] text-white px-6 py-2.5 rounded-lg font-bold text-sm tracking-wide transition-all shadow-[0_4px_12px_rgba(229,9,20,0.2)]"
          >
            Return to Browse
          </a>
        </motion.div>
      </div>
    );
  }

  const formatCurrency = (value) => {
    const numeric = Number(value ?? 0);
    const amount = Number.isFinite(numeric) ? numeric : 0;
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  };

  const parseNumericAmount = (value) => {
    if (value == null) return null;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    const normalized = String(value).replace(/[₹,\s]/g, '').trim();
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const resolveTransactionAmount = (transaction) => {
    const candidates = [
      transaction?.amountPaid,
      transaction?.amount,
      transaction?.price,
      transaction?.total,
      transaction?.transactionAmount,
      transaction?.plan?.price,
      transaction?.paymentAmount,
    ];

    for (const candidate of candidates) {
      const parsed = parseNumericAmount(candidate);
      if (parsed !== null) return parsed;
    }

    return null;
  };

  const resolveTransactionDate = (transaction) => {
    return transaction?.transactionDate || transaction?.createdAt || transaction?.updatedAt || transaction?.date || null;
  };

  const getRelativeTime = (dateStr) => {
    if (!dateStr) return 'N/A';

    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return 'N/A';

    const now = new Date();
    const diffMs = now - date;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);

    if (diffSecs < 60) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Plan Modals Trigger
  const handleOpenPlanModal = (mode, plan = null) => {
    setModalMode(mode);
    setSelectedPlan(plan);
    setPlanError('');
    setIsPlanModalOpen(true);
  };

  // Delete plan endpoint
  const handleDeletePlan = async () => {
    if (!deletePlanId) return;
    try {
      const res = await API.delete(`/subscriptions/plans/${deletePlanId}`);
      if (res.data?.success) {
        fetchAdminPlans();
        fetchDashboardStats();
      }
    } catch (err) {
      console.error('Delete error', err);
      alert(err.response?.data?.message || 'Failed to delete subscription plan.');
    } finally {
      setDeletePlanId(null);
    }
  };

  // Filtered queries based on Search keyword
  const filteredUsers = stats?.activeUsersList?.filter(u => 
    u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const filteredScreens = stats?.activeScreensList?.filter(s => 
    s.userId?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.userId?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.screenName?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const filteredTransactions = stats?.recentTransactions?.filter(t => {
    const searchLower = searchQuery.toLowerCase();
    const amountText = String(resolveTransactionAmount(t));
    return (
      t.userId?.username?.toLowerCase().includes(searchLower) ||
      t.userId?.email?.toLowerCase().includes(searchLower) ||
      t.planName?.toLowerCase().includes(searchLower) ||
      amountText.includes(searchLower)
    );
  }) || [];

  const filteredPlans = plans.filter(p =>
    p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.resolution?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.videoQuality?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-[#141414] min-h-screen text-white pb-20 overflow-x-hidden">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28">
        
        {/* Header telemetry section */}
        <div className="glass-panel p-6 rounded-3xl border border-zinc-800 shadow-2xl mb-10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#E50914]/10 px-3 py-1 text-[11px] uppercase tracking-[0.35em] font-semibold text-[#E50914]">
                ADMIN CONTROL CENTER
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">Streaming Operations & Plan Intelligence</h1>
                <p className="text-zinc-400 text-sm max-w-2xl">Monitor concurrent device streams, subscription health, and revenue performance in one polished command center.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full sm:w-auto">
              {activeTab !== 'plans' && (
                <button
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={`w-full inline-flex text-xs px-4 py-3 rounded-2xl font-bold uppercase tracking-[0.18em] transition-all items-center justify-center gap-2 select-none ${
                    autoRefresh
                      ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                      : 'bg-zinc-800/80 border border-zinc-700 text-zinc-300'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  {autoRefresh ? 'Live Sync Enabled' : 'Pause Live Sync'}
                </button>
              )}
              <button
                onClick={handleDataSync}
                disabled={isLoading || plansLoading}
                className="w-full inline-flex justify-center items-center gap-2 bg-[#E50914] hover:bg-[#C11119] text-white px-4 py-3 rounded-2xl font-bold text-xs uppercase tracking-[0.18em] transition-all shadow-lg active:scale-[0.98] disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${(isLoading || plansLoading) ? 'animate-spin' : ''}`} />
                Refresh Now
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-8 p-4 rounded bg-red-950/40 border border-red-800 text-red-200 flex items-start gap-3 text-sm shadow-md animate-pulse">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* 1. Stat Counters Grid */}
        {isLoading && !stats ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <RefreshCw className="w-10 h-10 animate-spin text-[#E50914]" />
            <p className="text-zinc-400 text-sm">Syncing admin telemetry widgets...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5 mb-10">
              {/* Stat 1 */}
              <div className="glass-panel p-6 rounded-3xl border border-white/5 shadow-xl min-h-[170px] overflow-hidden relative">
                <div className="absolute top-4 right-4 w-14 h-14 rounded-full bg-blue-500/10 blur-xl pointer-events-none" />
                <div className="flex items-center justify-between mb-5">
                  <span className="text-zinc-400 text-[11px] font-semibold uppercase tracking-[0.24em]">Total users</span>
                  <div className="w-11 h-11 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-300">
                    <Users className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <h3 className="text-3xl font-black text-white tracking-tight">{stats?.summary?.totalUsers || 0}</h3>
                  <span className="text-xs text-zinc-500">Registered accounts</span>
                </div>
              </div>

              {/* Stat 2 */}
              <div className="glass-panel p-6 rounded-3xl border border-white/5 shadow-xl min-h-[170px] overflow-hidden relative">
                <div className="absolute top-4 right-4 w-14 h-14 rounded-full bg-emerald-500/10 blur-xl pointer-events-none" />
                <div className="flex items-center justify-between mb-5">
                  <span className="text-zinc-400 text-[11px] font-semibold uppercase tracking-[0.24em]">Online Users</span>
                  <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-300">
                    <Activity className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <h3 className="text-3xl font-black text-white tracking-tight">{stats?.summary?.activeUsersCount || 0}</h3>
                  <span className="text-xs text-zinc-500">Live sessions</span>
                </div>
              </div>

              {/* Stat 3 */}
              <div className="glass-panel p-6 rounded-3xl border border-white/5 shadow-xl min-h-[170px] overflow-hidden relative">
                <div className="absolute top-4 right-4 w-14 h-14 rounded-full bg-amber-500/10 blur-xl pointer-events-none" />
                <div className="flex items-center justify-between mb-5">
                  <span className="text-zinc-400 text-[11px] font-semibold uppercase tracking-[0.24em]">Paid Members</span>
                  <div className="w-11 h-11 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-300">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <h3 className="text-3xl font-black text-white tracking-tight">{stats?.summary?.activeSubscribersCount || 0}</h3>
                  <span className="text-xs text-zinc-500">Active subscriptions</span>
                </div>
              </div>

              {/* Stat 4 */}
              <div className="glass-panel p-6 rounded-3xl border border-white/5 shadow-xl min-h-[170px] overflow-hidden relative">
                <div className="absolute top-4 right-4 w-14 h-14 rounded-full bg-purple-500/10 blur-xl pointer-events-none" />
                <div className="flex items-center justify-between mb-5">
                  <span className="text-zinc-400 text-[11px] font-semibold uppercase tracking-[0.24em]">Live Streams</span>
                  <div className="w-11 h-11 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-300">
                    <Monitor className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <h3 className="text-3xl font-black text-white tracking-tight">{stats?.summary?.activeStreamsCount || 0}</h3>
                  <span className="text-xs text-zinc-500">Concurrent devices</span>
                </div>
              </div>

              {/* Stat 5 */}
              <div className="glass-panel p-6 rounded-3xl border border-white/5 shadow-xl min-h-[170px] overflow-hidden relative">
                <div className="absolute top-4 right-4 w-14 h-14 rounded-full bg-red-500/10 blur-xl pointer-events-none" />
                <div className="flex items-center justify-between mb-5">
                  <span className="text-zinc-400 text-[11px] font-semibold uppercase tracking-[0.24em]">Revenue</span>
                  <div className="w-11 h-11 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-300">
                    <IndianRupee className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <h3 className="text-3xl font-black text-white tracking-tight">{formatCurrency(stats?.summary?.totalRevenue)}</h3>
                  <span className="text-xs text-zinc-500">Net earnings</span>
                </div>
              </div>

              {/* Stat 6 */}
              <div className="glass-panel p-6 rounded-3xl border border-white/5 shadow-xl min-h-[170px] overflow-hidden relative">
                <div className="absolute top-4 right-4 w-14 h-14 rounded-full bg-[#E50914]/10 blur-xl pointer-events-none" />
                <div className="flex items-center justify-between mb-5">
                  <span className="text-zinc-400 text-[11px] font-semibold uppercase tracking-[0.24em]">Est. MRR</span>
                  <div className="w-11 h-11 rounded-2xl bg-[#E50914]/10 flex items-center justify-center text-[#E50914]">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <h3 className="text-3xl font-black text-white tracking-tight">{formatCurrency(stats?.summary?.estimatedMRR)}</h3>
                  <span className="text-xs text-zinc-500">Monthly recurring</span>
                </div>
              </div>
            </div>

            {/* 2. Plan Distribution & Main Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start mb-12">
              
              {/* Plan Distribution Progress Meters */}
              <div className="lg:col-span-1 glass-panel p-6 rounded-xl">
                <h3 className="text-lg font-black tracking-wide mb-6">PLAN DISTRIBUTION</h3>
                
                <div className="space-y-5">
                  {stats?.planDistribution?.map((dist) => {
                    const totalPlanCount = stats.planDistribution.reduce((acc, curr) => acc + curr.count, 0) || 1;
                    const percentage = Math.round((dist.count / totalPlanCount) * 100);
                    
                    let barColor = 'bg-zinc-600';
                    if (dist.planName?.toLowerCase() === 'premium') barColor = 'bg-gradient-to-r from-red-600 to-purple-600';
                    else if (dist.planName?.toLowerCase() === 'standard') barColor = 'bg-blue-600';
                    else if (dist.planName?.toLowerCase() === 'basic') barColor = 'bg-green-600';

                    return (
                      <div key={dist.planName} className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
                            {dist.planName}
                            <span className="text-[10px] text-zinc-500">(₹{dist.price}/mo)</span>
                          </span>
                          <span className="font-bold text-zinc-400">{dist.count} users ({percentage}%)</span>
                        </div>
                        <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                          <div className={`h-full ${barColor} rounded-full`} style={{ width: `${percentage}%` }} />
                        </div>
                      </div>
                    );
                  })}
                  {(!stats?.planDistribution || stats.planDistribution.length === 0) && (
                    <p className="text-zinc-500 text-sm text-center py-4">No active user distributions recorded.</p>
                  )}
                </div>
              </div>

              {/* Live Lists & Tables Layout */}
              <div className="lg:col-span-2 glass-panel rounded-3xl border border-zinc-800 shadow-2xl overflow-hidden">
                {/* Search Bar & Tabs Menu */}
                <div className="p-4 bg-zinc-900/60 backdrop-blur border-b border-zinc-800/70 flex flex-col lg:flex-row items-center justify-between gap-4">
                  <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                    <button
                      onClick={() => setActiveTab('streams')}
                      className={`rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] transition ${
                        activeTab === 'streams'
                          ? 'bg-[#E50914] text-white shadow-lg'
                          : 'bg-zinc-800/80 text-zinc-300 hover:bg-zinc-800'
                      }`}
                    >
                      Live Streams ({stats?.activeScreensList?.length || 0})
                    </button>
                    <button
                      onClick={() => setActiveTab('users')}
                      className={`rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] transition ${
                        activeTab === 'users'
                          ? 'bg-[#E50914] text-white shadow-lg'
                          : 'bg-zinc-800/80 text-zinc-300 hover:bg-zinc-800'
                      }`}
                    >
                      Active Users ({stats?.activeUsersList?.length || 0})
                    </button>
                    <button
                      onClick={() => setActiveTab('transactions')}
                      className={`rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] transition ${
                        activeTab === 'transactions'
                          ? 'bg-[#E50914] text-white shadow-lg'
                          : 'bg-zinc-800/80 text-zinc-300 hover:bg-zinc-800'
                      }`}
                    >
                      Transactions ({stats?.recentTransactions?.length || 0})
                    </button>
                    <button
                      onClick={() => setActiveTab('plans')}
                      className={`rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] transition ${
                        activeTab === 'plans'
                          ? 'bg-[#E50914] text-white shadow-lg'
                          : 'bg-zinc-800/80 text-zinc-300 hover:bg-zinc-800'
                      }`}
                    >
                      Manage Plans ({plans.length})
                    </button>
                    <button
                      onClick={() => setActiveTab('movies')}
                      className={`rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] transition ${
                        activeTab === 'movies'
                          ? 'bg-[#E50914] text-white shadow-lg'
                          : 'bg-zinc-800/80 text-zinc-300 hover:bg-zinc-800'
                      }`}
                    >
                      Movies ({movies.length})
                    </button>
                  </div>

                  {/* Table Search bar */}
                  <div className="relative w-full lg:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                      type="text"
                      placeholder={`Search ${activeTab}...`}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-zinc-800/80 border border-zinc-700 rounded-full pl-11 pr-4 py-2 text-sm text-white focus:border-[#E50914] focus:outline-none focus:ring-1 focus:ring-[#E50914]"
                    />
                  </div>
                </div>

                {/* Tab Contents */}
                <div className="p-6 space-y-6">
                  {/* Tab 1: Live Screens List */}
                  {activeTab === 'streams' && (
                    <div className="overflow-x-auto">
                      {filteredScreens.length === 0 ? (
                        <div className="text-center py-10 text-zinc-500 text-sm">
                          No active device streams found.
                        </div>
                      ) : (
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-zinc-800 text-zinc-500 uppercase font-black tracking-wider">
                              <th className="pb-3">User Profile</th>
                              <th className="pb-3">Screen / Device</th>
                              <th className="pb-3">Device ID</th>
                              <th className="pb-3 text-right">Last Ping</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredScreens.map((screen, idx) => (
                              <tr key={idx} className="border-b border-zinc-900/60 hover:bg-zinc-800/10">
                                <td className="py-3.5">
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center font-bold text-[#E50914]">
                                      {screen.userId?.username?.charAt(0).toUpperCase() || 'U'}
                                    </div>
                                    <div>
                                      <p className="font-semibold text-white">{screen.userId?.username}</p>
                                      <p className="text-[10px] text-zinc-500 truncate max-w-[150px]">{screen.userId?.email}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3.5 text-zinc-300 font-medium">
                                  <div className="flex items-center gap-1.5">
                                    <Monitor className="w-3.5 h-3.5 text-zinc-500" />
                                    <span>{screen.screenName}</span>
                                  </div>
                                </td>
                                <td className="py-3.5 font-mono text-zinc-500 text-[10px]">{screen.deviceId}</td>
                                <td className="py-3.5 text-right font-medium text-emerald-400 flex items-center justify-end gap-1.5">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                                  <span>{getRelativeTime(screen.lastHeartbeat || screen.updatedAt)}</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}

                  {/* Tab 2: Active Users List */}
                  {activeTab === 'users' && (
                    <div className="overflow-x-auto">
                      {filteredUsers.length === 0 ? (
                        <div className="text-center py-10 text-zinc-500 text-sm">
                          No online users found.
                        </div>
                      ) : (
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-zinc-800 text-zinc-500 uppercase font-black tracking-wider">
                              <th className="pb-3">User</th>
                              <th className="pb-3">Status</th>
                              <th className="pb-3 text-right">Last Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredUsers.map((usr, idx) => (
                              <tr key={idx} className="border-b border-zinc-900/60 hover:bg-zinc-800/10">
                                <td className="py-3.5">
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center font-bold text-white">
                                      {usr.username?.charAt(0).toUpperCase() || 'U'}
                                    </div>
                                    <div>
                                      <p className="font-semibold text-white">{usr.username}</p>
                                      <p className="text-[10px] text-zinc-500">{usr.email}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3.5">
                                  {usr.isLoggedIn ? (
                                    <span className="bg-emerald-950/40 border border-emerald-800 text-emerald-400 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                                      Online
                                    </span>
                                  ) : (
                                    <span className="bg-zinc-800 text-zinc-400 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                                      Offline
                                    </span>
                                  )}
                                </td>
                                <td className="py-3.5 text-right font-medium text-zinc-400">
                                  {getRelativeTime(usr.lastActive)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}

                  {/* Tab 3: Transactions */}
                  {activeTab === 'transactions' && (
                    <div className="overflow-x-auto">
                      {filteredTransactions.length === 0 ? (
                        <div className="text-center py-10 text-zinc-500 text-sm">
                          No recent billing transactions found.
                        </div>
                      ) : (
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-zinc-800 text-zinc-500 uppercase font-black tracking-wider">
                              <th className="pb-3">Subscriber</th>
                              <th className="pb-3">Plan Purchased</th>
                              <th className="pb-3">Amount Paid</th>
                              <th className="pb-3 text-right">Transaction Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredTransactions.map((tx, idx) => (
                              <tr key={idx} className="border-b border-zinc-900/60 hover:bg-zinc-800/10">
                                <td className="py-3.5">
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center font-bold text-white">
                                      {tx.userId?.username?.charAt(0).toUpperCase() || 'U'}
                                    </div>
                                    <div>
                                      <p className="font-semibold text-white">{tx.userId?.username}</p>
                                      <p className="text-[10px] text-zinc-500 truncate max-w-[150px]">{tx.userId?.email}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3.5">
                                  <span className="bg-purple-950/40 border border-purple-800 text-purple-400 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                                    {tx.planName || tx.plan?.name || 'Subscription'} Plan
                                  </span>
                                </td>
                                <td className="py-3.5 text-zinc-200 font-extrabold text-sm">
                                  {resolveTransactionAmount(tx) !== null ? formatCurrency(resolveTransactionAmount(tx)) : '—'}
                                </td>
                                <td className="py-3.5 text-right font-medium text-zinc-400">
                                  {getRelativeTime(resolveTransactionDate(tx))}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}

                  {/* Tab 4: Plans Management CRUD */}
                  {activeTab === 'plans' && (
                    <div className="space-y-6">
                      <div className="flex justify-between items-center">
                        <p className="text-zinc-400 text-xs">
                          Configure tiers. Deleting active plans flags them on user updates.
                        </p>
                        <button
                          onClick={() => handleOpenPlanModal('create')}
                          className="bg-[#E50914] hover:bg-[#C11119] text-white px-3.5 py-1.5 rounded font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 active:scale-95 shadow cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add Tier
                        </button>
                      </div>

                      {plansLoading && plans.length === 0 ? (
                        <div className="flex items-center justify-center py-10 gap-3 text-zinc-400 text-xs">
                          <RefreshCw className="w-5 h-5 animate-spin text-[#E50914]" />
                          Syncing available plans...
                        </div>
                      ) : filteredPlans.length === 0 ? (
                        <div className="text-center py-10 text-zinc-500 text-sm">
                          No plans found. Click "+ Add Tier" to define custom plans.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="border-b border-zinc-800 text-zinc-500 uppercase font-black tracking-wider">
                                <th className="pb-3">Plan Name</th>
                                <th className="pb-3">Price</th>
                                <th className="pb-3">Screens</th>
                                <th className="pb-3">Specs</th>
                                <th className="pb-3">Status</th>
                                <th className="pb-3 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredPlans.map((plan) => (
                                <tr key={plan._id} className="border-b border-zinc-900/60 hover:bg-zinc-800/10">
                                  <td className="py-3.5 font-bold text-white text-sm">
                                    {plan.name}
                                  </td>
                                  <td className="py-3.5 font-black text-white">
                                    {formatCurrency(plan.price)}<span className="text-[10px] text-zinc-500 font-normal">/mo</span>
                                  </td>
                                  <td className="py-3.5 text-zinc-300 font-medium">
                                    {plan.maxScreens} Screen{plan.maxScreens > 1 ? 's' : ''}
                                  </td>
                                  <td className="py-3.5">
                                    <div className="flex flex-col gap-0.5">
                                      <span className="text-zinc-200 font-semibold">{plan.resolution}</span>
                                      <span className="text-[10px] text-zinc-500">{plan.videoQuality} Quality</span>
                                    </div>
                                  </td>
                                  <td className="py-3.5">
                                    {plan.isActive ? (
                                      <span className="bg-emerald-950/40 border border-emerald-800 text-emerald-400 text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider">
                                        Active
                                      </span>
                                    ) : (
                                      <span className="bg-zinc-800 border border-zinc-700 text-zinc-400 text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider">
                                        Inactive
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-3.5 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      <button
                                        onClick={() => handleOpenPlanModal('edit', plan)}
                                        className="p-1.5 rounded hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                                        title="Edit Plan"
                                      >
                                        <Edit className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => setDeletePlanId(plan._id)}
                                        className="p-1.5 rounded hover:bg-red-950/20 text-zinc-400 hover:text-red-500 transition-colors cursor-pointer"
                                        title="Delete Plan"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tab 5: Movies Management */}
                  {activeTab === 'movies' && (
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <p className="text-zinc-400 text-xs">Create, edit, or remove movies in the catalog.</p>
                        <button
                          onClick={() => handleOpenMovieModal('create')}
                          className="bg-[#E50914] hover:bg-[#C11119] text-white px-3.5 py-1.5 rounded font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 active:scale-95 shadow cursor-pointer shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add Movie
                        </button>
                      </div>

                      {/* Movie search */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                        <input
                          type="text"
                          placeholder="Search movies by title, genre, category..."
                          value={movieSearchQuery}
                          onChange={(e) => setMovieSearchQuery(e.target.value)}
                          className="w-full bg-zinc-800/60 border border-zinc-700/50 rounded-md pl-9 pr-4 py-1.5 text-xs text-white focus:border-[#E50914] focus:outline-none focus:ring-1 focus:ring-[#E50914]"
                        />
                      </div>

                      {moviesLoading && movies.length === 0 ? (
                        <div className="flex items-center justify-center py-10 gap-3 text-zinc-400 text-xs">
                          <RefreshCw className="w-5 h-5 animate-spin text-[#E50914]" />
                          Loading movies...
                        </div>
                      ) : filteredMovies.length === 0 ? (
                        <div className="text-center py-10 text-zinc-500 text-sm">
                          No movies found. Click "+ Add Movie" to create one.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="border-b border-zinc-800 text-zinc-500 uppercase font-black tracking-wider">
                                <th className="pb-3">Movie</th>
                                <th className="pb-3">Genre</th>
                                <th className="pb-3">Rating</th>
                                <th className="pb-3">Year</th>
                                <th className="pb-3">Category</th>
                                <th className="pb-3 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredMovies.map((movie) => (
                                <tr key={movie._id || movie.id} className="border-b border-zinc-900/60 hover:bg-zinc-800/10">
                                  <td className="py-3.5">
                                    <div className="flex items-center gap-2.5">
                                      {movie.thumbnail ? (
                                        <img
                                          src={movie.thumbnail}
                                          alt={movie.title}
                                          className="w-10 h-7 rounded object-cover border border-zinc-800 shrink-0"
                                          onError={(e) => { e.target.style.display = 'none'; }}
                                        />
                                      ) : (
                                        <div className="w-10 h-7 rounded bg-zinc-800 flex items-center justify-center shrink-0">
                                          <Film className="w-3.5 h-3.5 text-zinc-600" />
                                        </div>
                                      )}
                                      <span className="font-bold text-white truncate max-w-[140px]">{movie.title}</span>
                                    </div>
                                  </td>
                                  <td className="py-3.5 text-zinc-300">{movie.genre || '—'}</td>
                                  <td className="py-3.5">
                                    {movie.rating ? (
                                      <span className="flex items-center gap-1 text-amber-400 font-bold">
                                        <Star className="w-3 h-3 fill-current" />
                                        {parseFloat(movie.rating).toFixed(1)}
                                      </span>
                                    ) : '—'}
                                  </td>
                                  <td className="py-3.5 text-zinc-400">{movie.year || '—'}</td>
                                  <td className="py-3.5">
                                    {movie.category && (
                                      <span className="bg-zinc-800 border border-zinc-700 text-zinc-300 text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider">
                                        {movie.category}
                                      </span>
                                    )}
                                    {movie.trending && (
                                      <span className="ml-1 bg-orange-950/40 border border-orange-800 text-orange-400 text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider">
                                        Trending
                                      </span>
                                    )}
                                    {movie.featured && (
                                      <span className="ml-1 bg-purple-950/40 border border-purple-800 text-purple-400 text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider">
                                        Featured
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-3.5 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      <button
                                        onClick={() => handleOpenMovieModal('edit', movie)}
                                        className="p-1.5 rounded hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                                        title="Edit Movie"
                                      >
                                        <Edit className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => setDeleteMovieId(movie._id || movie.id)}
                                        className="p-1.5 rounded hover:bg-red-950/20 text-zinc-400 hover:text-red-500 transition-colors cursor-pointer"
                                        title="Delete Movie"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

            </div>
          </>
        )}

      </div>

      {/* PLAN FORM MODAL (React Hook Form & Zod) */}
      <AnimatePresence>
        {isPlanModalOpen && (
          <PlanFormModal
            mode={modalMode}
            plan={selectedPlan}
            onClose={() => setIsPlanModalOpen(false)}
            onSuccess={() => {
              setIsPlanModalOpen(false);
              fetchAdminPlans();
              fetchDashboardStats();
            }}
          />
        )}
      </AnimatePresence>

      {/* DELETE PLAN CONFIRMATION MODAL */}
      <AnimatePresence>
        {deletePlanId && (
          <>
            <div 
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 transition-opacity"
              onClick={() => setDeletePlanId(null)}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-lg p-6 shadow-2xl relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-red-600" />
                <h3 className="text-lg font-bold text-white mb-2 uppercase tracking-wide">Delete Plan?</h3>
                <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
                  Are you sure you want to permanently delete this subscription plan? Users currently subscribed will not be impacted until they switch plans, but new signups will be blocked.
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setDeletePlanId(null)}
                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold px-4 py-2 rounded text-xs uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeletePlan}
                    className="bg-[#E50914] hover:bg-[#C11119] text-white font-bold px-4 py-2 rounded text-xs uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Delete Plan
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* MOVIE FORM MODAL */}
      <AnimatePresence>
        {isMovieModalOpen && (
          <MovieFormModal
            mode={movieModalMode}
            movie={selectedMovie}
            onClose={() => setIsMovieModalOpen(false)}
            onSuccess={() => {
              setIsMovieModalOpen(false);
              fetchAdminMovies();
            }}
          />
        )}
      </AnimatePresence>

      {/* DELETE MOVIE CONFIRMATION MODAL */}
      <AnimatePresence>
        {deleteMovieId && (
          <>
            <div
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
              onClick={() => setDeleteMovieId(null)}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-lg p-6 shadow-2xl relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-red-600" />
                <h3 className="text-lg font-bold text-white mb-2 uppercase tracking-wide">Delete Movie?</h3>
                <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
                  This will permanently remove this movie from the catalog. This action cannot be undone.
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setDeleteMovieId(null)}
                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold px-4 py-2 rounded text-xs uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteMovie}
                    className="bg-[#E50914] hover:bg-[#C11119] text-white font-bold px-4 py-2 rounded text-xs uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Delete Movie
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Movie Form Modal ────────────────────────────────────────────────────────
const MovieFormModal = ({ mode, movie, onClose, onSuccess }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingTrailer, setUploadingTrailer] = useState(false);

  const [form, setForm] = useState({
    title: movie?.title || '',
    description: movie?.description || '',
    thumbnail: movie?.thumbnail || '',
    banner: movie?.banner || '',
    videoUrl: movie?.videoUrl || '',
    genre: movie?.genre || '',
    category: movie?.category || 'Trending',
    rating: movie?.rating || '',
    year: movie?.year || new Date().getFullYear(),
    featured: movie?.featured || false,
    trending: movie?.trending || false,
  });

  const thumbRef = useRef();
  const bannerRef = useRef();
  const trailerRef = useRef();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleFileUpload = async (file, type) => {
    if (!file) return;
    const setLoading = type === 'thumbnail' ? setUploadingThumb : type === 'banner' ? setUploadingBanner : setUploadingTrailer;
    const field = type === 'thumbnail' ? 'thumbnail' : type === 'banner' ? 'banner' : 'videoUrl';
    setLoading(true);
    try {
      let res;
      if (type === 'thumbnail') res = await adminUploadThumbnail(file);
      else if (type === 'banner') res = await adminUploadBanner(file);
      else res = await adminUploadTrailer(file);
      if (res.data?.success && res.data?.data?.url) {
        setForm((prev) => ({ ...prev, [field]: res.data.data.url }));
      }
    } catch (err) {
      setSubmitError(`Upload failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setSubmitError('Title is required.'); return; }
    setIsSubmitting(true);
    setSubmitError('');
    try {
      const payload = {
        ...form,
        rating: form.rating !== '' ? Number(form.rating) : undefined,
        year: form.year !== '' ? Number(form.year) : undefined,
      };
      if (mode === 'create') {
        await adminCreateMovie(payload);
      } else {
        await adminUpdateMovie(movie._id || movie.id, payload);
      }
      onSuccess();
    } catch (err) {
      setSubmitError(err.response?.data?.message || 'Failed to save movie.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const UploadField = ({ label, field, uploadType, loading, inputRef, accept }) => (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block">{label}</label>
      <div className="flex gap-2">
        <input
          type="text"
          name={field}
          value={form[field]}
          onChange={handleChange}
          placeholder="URL or upload below"
          className="flex-1 bg-zinc-800 border border-zinc-700 focus:border-[#E50914] rounded px-3 py-1.5 text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-[#E50914] text-xs"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={loading}
          className="bg-zinc-700 hover:bg-zinc-600 text-white px-2.5 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          Upload
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => handleFileUpload(e.target.files[0], uploadType)}
      />
      {form[field] && uploadType !== 'trailer' && (
        <img src={form[field]} alt="preview" className="mt-1 w-20 h-12 object-cover rounded border border-zinc-700" onError={(e) => { e.target.style.display='none'; }} />
      )}
      {form[field] && uploadType === 'trailer' && (
        <p className="text-[10px] text-zinc-500 truncate mt-1">{form[field]}</p>
      )}
    </div>
  );

  return (
    <>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl relative max-h-[92vh] overflow-y-auto"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-[#E50914]" />
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black uppercase tracking-wide flex items-center gap-2">
                <Film className="w-5 h-5 text-[#E50914]" />
                {mode === 'create' ? 'Add New Movie' : 'Edit Movie'}
              </h3>
              <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {submitError && (
              <div className="mb-5 p-3 rounded bg-red-950/40 border border-red-800 text-red-200 flex items-start gap-2 text-xs">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                {submitError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Title */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block">Title *</label>
                <input
                  type="text"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="e.g. Inception"
                  required
                  className="w-full bg-zinc-800 border border-zinc-700 focus:border-[#E50914] rounded px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#E50914] text-sm"
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block">Description</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows="3"
                  placeholder="A brief synopsis of the movie..."
                  className="w-full bg-zinc-800 border border-zinc-700 focus:border-[#E50914] rounded px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#E50914] text-sm resize-none"
                />
              </div>

              {/* Genre, Category, Rating, Year */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block">Genre</label>
                  <select
                    name="genre"
                    value={form.genre}
                    onChange={handleChange}
                    className="w-full bg-zinc-800 border border-zinc-700 focus:border-[#E50914] rounded px-2 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[#E50914] text-xs"
                  >
                    <option value="">Select...</option>
                    <option>Action</option>
                    <option>Comedy</option>
                    <option>Drama</option>
                    <option>Horror</option>
                    <option>Sci-Fi</option>
                    <option>Thriller</option>
                    <option>Romance</option>
                    <option>Documentary</option>
                    <option>Animation</option>
                    <option>Fantasy</option>
                    <option>Crime</option>
                    <option>Adventure</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block">Category</label>
                  <select
                    name="category"
                    value={form.category}
                    onChange={handleChange}
                    className="w-full bg-zinc-800 border border-zinc-700 focus:border-[#E50914] rounded px-2 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[#E50914] text-xs"
                  >
                    <option>Trending</option>
                    <option>Top Rated</option>
                    <option>Recently Added</option>
                    <option>Recommended</option>
                    <option>Original</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block">Rating</label>
                  <input
                    type="number"
                    name="rating"
                    value={form.rating}
                    onChange={handleChange}
                    placeholder="8.8"
                    min="0"
                    max="10"
                    step="0.1"
                    className="w-full bg-zinc-800 border border-zinc-700 focus:border-[#E50914] rounded px-2 py-2 text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-[#E50914] text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block">Year</label>
                  <input
                    type="number"
                    name="year"
                    value={form.year}
                    onChange={handleChange}
                    placeholder="2024"
                    min="1900"
                    max="2099"
                    className="w-full bg-zinc-800 border border-zinc-700 focus:border-[#E50914] rounded px-2 py-2 text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-[#E50914] text-xs"
                  />
                </div>
              </div>

              {/* File Uploads */}
              <div className="space-y-3 pt-2 border-t border-zinc-800">
                <p className="text-xs font-black text-zinc-400 uppercase tracking-wider">Media Assets</p>
                <UploadField
                  label="Thumbnail Image"
                  field="thumbnail"
                  uploadType="thumbnail"
                  loading={uploadingThumb}
                  inputRef={thumbRef}
                  accept="image/*"
                />
                <UploadField
                  label="Banner Image"
                  field="banner"
                  uploadType="banner"
                  loading={uploadingBanner}
                  inputRef={bannerRef}
                  accept="image/*"
                />
                <UploadField
                  label="Trailer / Video URL"
                  field="videoUrl"
                  uploadType="trailer"
                  loading={uploadingTrailer}
                  inputRef={trailerRef}
                  accept="video/*"
                />
              </div>

              {/* Flags */}
              <div className="flex items-center gap-6 pt-2 border-t border-zinc-800">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    name="featured"
                    checked={form.featured}
                    onChange={handleChange}
                    className="w-4 h-4 rounded bg-zinc-800 border-zinc-700 text-[#E50914] focus:ring-0 cursor-pointer"
                  />
                  <span className="text-xs text-zinc-300 font-semibold uppercase tracking-wider">Featured (Hero Banner)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    name="trending"
                    checked={form.trending}
                    onChange={handleChange}
                    className="w-4 h-4 rounded bg-zinc-800 border-zinc-700 text-[#E50914] focus:ring-0 cursor-pointer"
                  />
                  <span className="text-xs text-zinc-300 font-semibold uppercase tracking-wider">Trending Now</span>
                </label>
              </div>

              {/* Submit */}
              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold px-5 py-2.5 rounded text-xs uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#E50914] hover:bg-[#C11119] text-white font-bold px-5 py-2.5 rounded text-xs uppercase tracking-wider transition-colors disabled:opacity-45 flex items-center gap-2 cursor-pointer shadow-md"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  {mode === 'create' ? 'Create Movie' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </>
  );
};

// Plan form sub-component using react-hook-form + zod resolver
const PlanFormModal = ({ mode, plan, onClose, onSuccess }) => {
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(planSchema),
    defaultValues: plan || {
      name: '',
      price: '',
      maxScreens: 1,
      resolution: '1080p',
      videoQuality: 'Better',
      description: '',
      isActive: true,
    },
  });

  useEffect(() => {
    if (mode === 'edit' && plan) {
      reset(plan);
    } else {
      reset({
        name: '',
        price: '',
        maxScreens: 1,
        resolution: '1080p',
        videoQuality: 'Better',
        description: '',
        isActive: true,
      });
    }
  }, [mode, plan, reset]);

  const onSubmit = async (data) => {
    setSubmitError('');
    setIsSubmitting(true);

    try {
      if (mode === 'create') {
        const res = await API.post('/subscriptions/plans', data);
        if (res.data?.success) {
          onSuccess();
        }
      } else {
        const res = await API.put(`/subscriptions/plans/${plan._id}`, data);
        if (res.data?.success) {
          onSuccess();
        }
      }
    } catch (err) {
      console.error(err);
      setSubmitError(err.response?.data?.message || 'Error occurred while saving plan data.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 transition-opacity" 
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-lg p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-[#E50914]" />
          
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-black uppercase tracking-wide">
              {mode === 'create' ? 'Create New Plan' : 'Modify Subscription Plan'}
            </h3>
            <button 
              onClick={onClose}
              className="text-zinc-500 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {submitError && (
            <div className="mb-6 p-4 rounded bg-red-950/40 border border-red-800 text-red-200 flex items-start gap-3 text-sm">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <span>{submitError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Plan Name */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block">Plan Name</label>
              <input
                type="text"
                {...register('name')}
                placeholder="e.g. Premium Plus"
                className={`w-full bg-zinc-800 border ${
                  errors.name ? 'border-red-600 focus:ring-red-600' : 'border-zinc-700 focus:border-[#E50914]'
                } rounded px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#E50914] text-sm`}
              />
              {errors.name && (
                <p className="text-red-500 text-[11px] font-medium flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" /> {errors.name.message}
                </p>
              )}
            </div>

            {/* Price & Max Screens Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Price */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block">Price (INR / mo)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">₹</span>
                  <input
                    type="number"
                    {...register('price')}
                    placeholder="649"
                    className={`w-full bg-zinc-800 border ${
                      errors.price ? 'border-red-600 focus:ring-red-600' : 'border-zinc-700 focus:border-[#E50914]'
                    } rounded pl-7 pr-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#E50914] text-sm`}
                  />
                </div>
                {errors.price && (
                  <p className="text-red-500 text-[11px] font-medium flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" /> {errors.price.message}
                  </p>
                )}
              </div>

              {/* Max Screens */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block">Max Concurrent Screens</label>
                <input
                  type="number"
                  {...register('maxScreens')}
                  placeholder="4"
                  className={`w-full bg-zinc-800 border ${
                    errors.maxScreens ? 'border-red-600 focus:ring-red-600' : 'border-zinc-700 focus:border-[#E50914]'
                  } rounded px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#E50914] text-sm`}
                />
                {errors.maxScreens && (
                  <p className="text-red-500 text-[11px] font-medium flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" /> {errors.maxScreens.message}
                  </p>
                )}
              </div>
            </div>

            {/* Resolution & Quality Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Resolution */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block">Resolution</label>
                <select
                  {...register('resolution')}
                  className={`w-full bg-zinc-800 border ${
                    errors.resolution ? 'border-red-600 focus:ring-red-600' : 'border-zinc-700 focus:border-[#E50914]'
                  } rounded px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[#E50914] text-sm`}
                >
                  <option value="480p">480p (SD)</option>
                  <option value="720p">720p (HD)</option>
                  <option value="1080p">1080p (FHD)</option>
                  <option value="4K+HDR">4K + HDR (UHD)</option>
                </select>
                {errors.resolution && (
                  <p className="text-red-500 text-[11px] font-medium flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" /> {errors.resolution.message}
                  </p>
                )}
              </div>

              {/* Video Quality */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block">Video Quality</label>
                <select
                  {...register('videoQuality')}
                  className={`w-full bg-zinc-800 border ${
                    errors.videoQuality ? 'border-red-600 focus:ring-red-600' : 'border-zinc-700 focus:border-[#E50914]'
                  } rounded px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[#E50914] text-sm`}
                >
                  <option value="Good">Good (SD/HD)</option>
                  <option value="Better">Better (Full HD)</option>
                  <option value="Best">Best (4K & HDR)</option>
                </select>
                {errors.videoQuality && (
                  <p className="text-red-500 text-[11px] font-medium flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" /> {errors.videoQuality.message}
                  </p>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block">Description</label>
              <textarea
                {...register('description')}
                rows="3"
                placeholder="Describe features: device compatibility, audio profiles, etc."
                className={`w-full bg-zinc-800 border ${
                  errors.description ? 'border-red-600 focus:ring-red-600' : 'border-zinc-700 focus:border-[#E50914]'
                } rounded px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#E50914] text-sm`}
              />
              {errors.description && (
                <p className="text-red-500 text-[11px] font-medium flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" /> {errors.description.message}
                </p>
              )}
            </div>

            {/* Status Option */}
            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="isActive"
                {...register('isActive')}
                className="w-4 h-4 rounded bg-zinc-800 border-zinc-700 text-[#E50914] focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              <label htmlFor="isActive" className="text-xs text-zinc-300 font-semibold uppercase tracking-wider select-none cursor-pointer">
                Publish Tier Immediately (Active)
              </label>
            </div>

            {/* Actions Grid */}
            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
              <button
                type="button"
                onClick={onClose}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold px-5 py-2.5 rounded text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-[#E50914] hover:bg-[#C11119] text-white font-bold px-5 py-2.5 rounded text-xs uppercase tracking-wider transition-colors disabled:opacity-45 flex items-center gap-2 cursor-pointer shadow-md"
              >
                {isSubmitting ? (
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    {mode === 'create' ? 'Save Plan' : 'Update Plan'}
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </>
  );
};

export default AdminDashboard;
