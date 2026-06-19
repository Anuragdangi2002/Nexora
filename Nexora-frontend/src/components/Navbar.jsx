import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, User, ShieldAlert, MonitorPlay, CreditCard, Menu, X, Home } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  // Monitor page scroll to toggle solid background like Netflix
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 30) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navLinks = [
    { name: 'Browse', path: '/', icon: Home, show: !!user },
    { name: 'Plans', path: '/subscriptions', icon: CreditCard, show: !!user },
    { name: 'Stream Simulator', path: '/watch', icon: MonitorPlay, show: !!user },
    { name: 'Admin Panel', path: '/admin', icon: ShieldAlert, show: user?.role === 'admin' },
  ];

  // Helper to get subscription plan colors
  const getPlanBadge = (planName) => {
    switch (planName?.toLowerCase()) {
      case 'premium':
        return 'bg-gradient-to-r from-red-600 to-purple-600 text-white shadow-[0_0_8px_rgba(229,9,20,0.5)]';
      case 'standard':
        return 'bg-blue-600 text-white';
      case 'basic':
        return 'bg-green-600 text-white';
      default:
        return 'bg-zinc-700 text-zinc-300';
    }
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-in-out ${
        isScrolled
          ? 'bg-[#141414]/95 backdrop-blur-md shadow-lg border-b border-zinc-800/40 py-3'
          : 'bg-gradient-to-b from-black/80 to-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-12">
          
          {/* Logo & Main Nav */}
          <div className="flex items-center gap-10">
            <Link
              to="/"
              className="text-3xl font-extrabold tracking-tighter text-[#E50914] select-none hover:opacity-90 active:scale-95 transition-all"
              style={{ fontFamily: "'Arial Black', sans-serif" }}
            >
              NEXORA
            </Link>

            {/* Desktop Navigation Links */}
            {user && (
              <div className="hidden md:flex items-center gap-6">
                {navLinks
                  .filter((link) => link.show)
                  .map((link) => {
                    const isActive = location.pathname === link.path;
                    return (
                      <Link
                        key={link.path}
                        to={link.path}
                        className={`text-sm font-medium tracking-wide transition-colors relative py-1 ${
                          isActive
                            ? 'text-white font-semibold'
                            : 'text-zinc-300 hover:text-zinc-400'
                        }`}
                      >
                        {link.name}
                        {isActive && (
                          <motion.div
                            layoutId="activeNavLine"
                            className="absolute -bottom-1 left-0 right-0 h-0.5 bg-[#E50914]"
                            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                          />
                        )}
                      </Link>
                    );
                  })}
              </div>
            )}
          </div>

          {/* User Section & Profile Panel */}
          <div className="flex items-center gap-4">
            {user ? (
              <>
                {/* User Stats/Badges */}
                <div className="hidden sm:flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${getPlanBadge(user.subscription?.planName || 'Free')}`}>
                    {user.subscription?.planName || 'Free'} Plan
                  </span>
                </div>

                {/* Profile Selector */}
                <div className="relative">
                  <button
                    onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                    className="flex items-center gap-2 focus:outline-none p-1.5 rounded-full hover:bg-zinc-800/40 border border-transparent hover:border-zinc-700/50 transition-all active:scale-95"
                  >
                    <div className="w-8 h-8 rounded bg-red-600 flex items-center justify-center font-bold text-white shadow-md">
                      {user.username?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <span className="hidden sm:block text-sm font-medium text-zinc-200">
                      {user.username}
                    </span>
                  </button>

                  {/* Desktop Dropdown */}
                  <AnimatePresence>
                    {isProfileDropdownOpen && (
                      <>
                        {/* Overlay to close */}
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setIsProfileDropdownOpen(false)}
                        />
                        
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 mt-3 w-64 glass-panel-heavy rounded-lg overflow-hidden shadow-2xl z-20 border border-zinc-800"
                        >
                          <div className="px-4 py-3 bg-zinc-900/50 border-b border-zinc-800">
                            <p className="text-sm text-zinc-400">Signed in as</p>
                            <p className="text-sm font-semibold text-white truncate">{user.email}</p>
                            <div className="mt-2 flex items-center gap-2">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${getPlanBadge(user.subscription?.planName || 'Free')}`}>
                                {user.subscription?.planName || 'Free'}
                              </span>
                              {user.role === 'admin' && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-red-600 text-white rounded font-bold uppercase tracking-wider shadow">
                                  Admin
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="p-1.5">
                            {navLinks
                              .filter((link) => link.show)
                              .map((link) => (
                                <button
                                  key={link.path}
                                  onClick={() => {
                                    navigate(link.path);
                                    setIsProfileDropdownOpen(false);
                                  }}
                                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-zinc-300 hover:text-white rounded hover:bg-zinc-800/40 transition-colors"
                                >
                                  <link.icon className="w-4 h-4 text-zinc-400" />
                                  <span>{link.name}</span>
                                </button>
                              ))}

                            <div className="my-1 border-t border-zinc-800" />

                            <button
                              onClick={handleLogout}
                              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-500 hover:text-red-400 rounded hover:bg-red-950/20 transition-colors text-left"
                            >
                              <LogOut className="w-4 h-4" />
                              <span>Sign Out of NEXORA</span>
                            </button>
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <Link
                to="/login"
                className="bg-[#E50914] text-white text-sm font-semibold px-4 py-1.5 rounded hover:bg-[#C11119] transition-all hover:shadow-[0_0_12px_rgba(229,9,20,0.4)] active:scale-95"
              >
                Sign In
              </Link>
            )}

            {/* Mobile Hamburger menu */}
            {user && (
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800/40 focus:outline-none"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu Panel */}
      <AnimatePresence>
        {isMobileMenuOpen && user && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-[#141414] border-b border-zinc-800/60 overflow-hidden"
          >
            <div className="px-2 pt-2 pb-4 space-y-1 sm:px-3">
              {navLinks
                .filter((link) => link.show)
                .map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-md text-base font-medium text-zinc-300 hover:text-white hover:bg-zinc-800/40 transition-colors"
                  >
                    <link.icon className="w-5 h-5 text-zinc-400" />
                    <span>{link.name}</span>
                  </Link>
                ))}
              <div className="my-2 border-t border-zinc-800 px-3 pt-2">
                <div className="flex items-center gap-2 mb-2 px-3">
                  <span className="text-sm font-medium text-zinc-400">Tier:</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${getPlanBadge(user.subscription?.planName || 'Free')}`}>
                    {user.subscription?.planName || 'Free'}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-base font-medium text-red-500 hover:bg-red-950/15"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
