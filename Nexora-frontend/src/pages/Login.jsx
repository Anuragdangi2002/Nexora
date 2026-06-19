import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Mail, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data) => {
    setError('');
    setIsLoading(true);

    try {
      await login(data.email, data.password);
      navigate('/');
    } catch (err) {
      console.error(err);
      setError(err || 'Invalid email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="relative min-h-screen flex items-center justify-center bg-cover bg-center px-4"
      style={{
        backgroundImage: `linear-gradient(to top, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.45) 50%, rgba(0, 0, 0, 0.85) 100%), url('https://assets.nflxext.com/ffe/siteui/vlv3/ab180a27-b661-44d7-a6d9-940cb32f2f4a/7fb62e44-31fd-4e74-b6e4-167807402914/US-en-20231009-popsignuptwoweeks-perspective_alpha_website_large.jpg')`,
      }}
    >
      {/* Top Header Logo */}
      <div className="absolute top-0 left-0 p-8">
        <Link
          to="/"
          className="text-4xl font-extrabold tracking-tighter text-[#E50914] select-none"
          style={{ fontFamily: "'Arial Black', sans-serif" }}
        >
          NEXORA
        </Link>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-md glass-panel-heavy rounded-lg p-10 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 via-netflix-red to-red-600" />
        
        <h2 className="text-3xl font-extrabold text-white mb-8 tracking-wide">Sign In</h2>

        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-6 p-4 rounded bg-red-950/40 border border-red-800 text-red-200 flex items-start gap-3 text-sm"
          >
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <span>{error}</span>
          </motion.div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Email field */}
          <div className="space-y-1">
            <label className="text-sm font-semibold text-zinc-300 block">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
              <input
                type="email"
                {...register('email')}
                placeholder="name@example.com"
                className={`w-full bg-zinc-800/60 border ${
                  errors.email ? 'border-red-600 focus:ring-red-600' : 'border-zinc-700/50 focus:border-[#E50914]'
                } rounded-md pl-11 pr-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#E50914] transition-all bg-opacity-70 text-sm`}
              />
            </div>
            {errors.email && (
              <p className="text-red-500 text-xs mt-1 flex items-center gap-1 font-medium">
                <AlertCircle className="w-3 h-3 shrink-0" />
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Password field */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-zinc-300 block">Password</label>
              <Link
                to="/forgot-password"
                className="text-xs text-zinc-400 hover:text-white hover:underline transition-colors font-medium"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                {...register('password')}
                placeholder="••••••••"
                className={`w-full bg-zinc-800/60 border ${
                  errors.password ? 'border-red-600 focus:ring-red-600' : 'border-zinc-700/50 focus:border-[#E50914]'
                } rounded-md pl-11 pr-12 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#E50914] transition-all bg-opacity-70 text-sm`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-red-500 text-xs mt-1 flex items-center gap-1 font-medium">
                <AlertCircle className="w-3 h-3 shrink-0" />
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#E50914] hover:bg-[#C11119] text-white py-3.5 rounded-md font-bold text-base tracking-wide transition-all shadow-[0_4px_14px_rgba(229,9,20,0.3)] hover:shadow-[0_4px_20px_rgba(229,9,20,0.5)] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none mt-4 flex items-center justify-center cursor-pointer"
          >
            {isLoading ? (
              <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-zinc-800/80 text-sm text-zinc-400 flex items-center justify-between">
          <span>New to NEXORA?</span>
          <Link
            to="/signup"
            className="text-white hover:underline font-bold text-right hover:text-[#E50914] transition-colors"
          >
            Sign up now
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
