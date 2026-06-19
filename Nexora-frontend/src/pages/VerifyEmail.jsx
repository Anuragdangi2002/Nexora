import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Mail, ArrowLeft, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

const verifySchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  otp: z.string().length(6, 'OTP must be exactly 6 digits').regex(/^\d+$/, 'OTP must contain numbers only'),
});

const VerifyEmail = () => {
  const { verifyEmail, resendVerificationOtp } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(30);

  const inputRefs = useRef([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(verifySchema),
    defaultValues: {
      email: location.state?.email || localStorage.getItem('pending_verification_email') || '',
      otp: '',
    },
  });

  const email = watch('email');
  const otpValue = watch('otp');

  // Store email for reload safety
  useEffect(() => {
    if (email) {
      localStorage.setItem('pending_verification_email', email);
    }
  }, [email]);

  // Handle resend countdown timer
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // Sync visual OTP digits array with react-hook-form state
  const syncOtpCode = (digitsArray) => {
    const code = digitsArray.join('');
    setValue('otp', code, { shouldValidate: true });
  };

  // Handle OTP digit entry
  const handleChange = (index, value) => {
    if (isNaN(value)) return; // Allow numbers only
    const newOtp = [...otpDigits];
    // Keep only the last character if pasted/entered multiple
    newOtp[index] = value.substring(value.length - 1);
    setOtpDigits(newOtp);
    syncOtpCode(newOtp);

    // Auto-focus next input box if value entered
    if (value && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  // Handle backspace navigation
  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!otpDigits[index] && index > 0) {
        // Focus previous box on empty delete
        inputRefs.current[index - 1].focus();
      }
    }
  };

  // Handle paste operation
  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (!/^\d{6}$/.test(pastedData)) return; // Valid 6-digit number check

    const digits = pastedData.split('');
    setOtpDigits(digits);
    syncOtpCode(digits);
    // Focus last input box
    inputRefs.current[5].focus();
  };

  const onSubmit = async (data) => {
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const res = await verifyEmail(data.email, data.otp);
      if (res.success) {
        setSuccess('Email verified successfully! Redirecting you to sign in...');
        localStorage.removeItem('pending_verification_email');
        setTimeout(() => {
          navigate('/login');
        }, 2500);
      } else {
        setError(res.message || 'OTP verification failed.');
      }
    } catch (err) {
      console.error(err);
      setError(err || 'Invalid OTP code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Auto trigger verification when all 6 digits are typed
  useEffect(() => {
    if (otpValue && otpValue.length === 6) {
      handleSubmit(onSubmit)();
    }
  }, [otpValue]);

  const handleResend = async () => {
    if (countdown > 0 || isResending) return;
    setError('');
    setSuccess('');
    setIsResending(true);

    try {
      await resendVerificationOtp(email);
      setSuccess('Verification OTP sent successfully to your inbox.');
      setCountdown(30);
    } catch (err) {
      console.error(err);
      setError(err || 'Failed to resend verification OTP.');
    } finally {
      setIsResending(false);
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
      <div className="absolute top-0 left-0 p-8 flex items-center justify-between w-full">
        <Link
          to="/"
          className="text-4xl font-extrabold tracking-tighter text-[#E50914] select-none"
          style={{ fontFamily: "'Arial Black', sans-serif" }}
        >
          NEXORA
        </Link>
        <Link
          to="/login"
          className="text-sm font-semibold flex items-center gap-2 hover:text-[#E50914] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Sign In
        </Link>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md glass-panel-heavy rounded-lg p-10 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 via-netflix-red to-red-600" />

        <div className="w-12 h-12 bg-red-950/40 border border-[#E50914]/40 text-[#E50914] rounded-full flex items-center justify-center mx-auto mb-6">
          <Mail className="w-6 h-6" />
        </div>

        <h2 className="text-3xl font-extrabold text-white text-center mb-2 tracking-wide">Verify Your Email</h2>
        <p className="text-zinc-400 text-sm text-center mb-8">
          We sent a verification code to <br />
          <span className="text-white font-semibold">{email || 'your email'}</span>
        </p>

        {/* Input box fallback in case no email state is passed */}
        {!location.state?.email && !localStorage.getItem('pending_verification_email') && (
          <div className="mb-6 space-y-2">
            <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block">Confirm Email Address</label>
            <input
              type="email"
              {...register('email')}
              placeholder="user@example.com"
              className={`w-full bg-zinc-800/60 border ${
                errors.email ? 'border-red-600 focus:ring-red-600' : 'border-zinc-700/50 focus:border-[#E50914]'
              } rounded-md px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none text-sm`}
            />
            {errors.email && (
              <p className="text-red-500 text-xs mt-1 flex items-center gap-1 font-medium">
                <AlertCircle className="w-3 h-3 shrink-0" />
                {errors.email.message}
              </p>
            )}
          </div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6 p-4 rounded bg-red-950/40 border border-red-800 text-red-200 flex items-start gap-3 text-sm animate-shake"
          >
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <span>{error}</span>
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6 p-4 rounded bg-emerald-950/40 border border-emerald-800 text-emerald-200 flex items-start gap-3 text-sm"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            <span>{success}</span>
          </motion.div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* OTP Grid Layout */}
          <div className="flex justify-between items-center gap-2" onPaste={handlePaste}>
            {otpDigits.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => (inputRefs.current[idx] = el)}
                type="text"
                maxLength="1"
                value={digit}
                onChange={(e) => handleChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className={`w-12 h-14 text-center bg-zinc-800/60 border-2 ${
                  errors.otp ? 'border-red-600 focus:ring-red-600' : 'border-zinc-700/50 focus:border-[#E50914]'
                } rounded-md text-2xl font-bold text-white focus:outline-none focus:ring-1 focus:ring-[#E50914] transition-all bg-opacity-70`}
              />
            ))}
          </div>

          {/* Hidden input for react-hook-form registration */}
          <input type="hidden" {...register('otp')} />
          {errors.otp && (
            <p className="text-red-500 text-xs mt-2 text-center flex items-center justify-center gap-1 font-medium">
              <AlertCircle className="w-3 h-3 shrink-0" />
              {errors.otp.message}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading || (otpValue && otpValue.length !== 6)}
            className="w-full bg-[#E50914] hover:bg-[#C11119] text-white py-3.5 rounded-md font-bold text-base tracking-wide transition-all shadow-[0_4px_14px_rgba(229,9,20,0.3)] hover:shadow-[0_4px_20px_rgba(229,9,20,0.5)] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none mt-2 flex items-center justify-center"
          >
            {isLoading ? (
              <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              'Verify Code'
            )}
          </button>
        </form>

        {/* Resend Option */}
        <div className="mt-8 text-center text-sm text-zinc-400">
          <p>
            Didn't receive the email?{' '}
            <button
              onClick={handleResend}
              disabled={countdown > 0 || isResending}
              className={`font-semibold inline-flex items-center gap-1 transition-colors select-none ${
                countdown > 0 || isResending
                  ? 'text-zinc-600 cursor-not-allowed'
                  : 'text-white hover:text-[#E50914] cursor-pointer'
              }`}
            >
              {isResending ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : countdown > 0 ? (
                `Resend in ${countdown}s`
              ) : (
                'Resend Code'
              )}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default VerifyEmail;
