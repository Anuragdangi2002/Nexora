import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Mail, KeyRound, Lock, ArrowLeft, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';

// Zod schemas
const requestSchema = z.object({
  email: z.string().min(1, 'Email address is required').email('Invalid email address'),
});

const resetSchema = z.object({
  otp: z.string().length(6, 'OTP must be exactly 6 digits').regex(/^\d+$/, 'OTP must contain numbers only'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters long'),
});

const ForgotPassword = () => {
  const { forgotPassword, resetPassword } = useAuth();
  const navigate = useNavigate();

  // Step state: 'request' | 'reset'
  const [step, setStep] = useState('request');
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState('');
  const [apiSuccess, setApiSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const otpInputRefs = useRef([]);

  // React Hook Form for Step 1
  const {
    register: registerRequest,
    handleSubmit: handleRequestSubmit,
    formState: { errors: requestErrors },
  } = useForm({
    resolver: zodResolver(requestSchema),
  });

  // React Hook Form for Step 2
  const {
    register: registerReset,
    handleSubmit: handleResetSubmit,
    setValue: setResetValue,
    trigger: triggerReset,
    formState: { errors: resetErrors },
  } = useForm({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      otp: '',
      newPassword: '',
    },
  });

  // Focus OTP input on step transition
  useEffect(() => {
    if (step === 'reset' && otpInputRefs.current[0]) {
      otpInputRefs.current[0].focus();
    }
  }, [step]);

  // Sync visual OTP digits array with react-hook-form state
  const syncOtpCode = (digitsArray) => {
    const code = digitsArray.join('');
    setResetValue('otp', code, { shouldValidate: true });
  };

  // Handle OTP digit entry
  const handleOtpChange = (index, value) => {
    if (isNaN(value)) return; // Allow numbers only
    const newDigits = [...otpDigits];
    newDigits[index] = value.substring(value.length - 1);
    setOtpDigits(newDigits);
    syncOtpCode(newDigits);

    // Auto-focus next input box if value entered
    if (value && index < 5) {
      otpInputRefs.current[index + 1].focus();
    }
  };

  // Handle backspace navigation for OTP
  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!otpDigits[index] && index > 0) {
        otpInputRefs.current[index - 1].focus();
      }
    }
  };

  // Handle paste operation for OTP
  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (!/^\d{6}$/.test(pastedData)) return; // Valid 6-digit number check

    const digits = pastedData.split('');
    setOtpDigits(digits);
    syncOtpCode(digits);
    otpInputRefs.current[5].focus();
  };

  // Step 1: Submit email to request OTP
  const onRequestSubmit = async (data) => {
    setApiError('');
    setApiSuccess('');
    setIsLoading(true);

    try {
      const res = await forgotPassword(data.email);
      setApiSuccess(res.message || 'Verification OTP sent to your email.');
      setSubmittedEmail(data.email);
      setStep('reset');
    } catch (err) {
      console.error(err);
      setApiError(err || 'Failed to request reset OTP. User not found.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Submit OTP and new password
  const onResetSubmit = async (data) => {
    setApiError('');
    setApiSuccess('');
    setIsLoading(true);

    try {
      await resetPassword(submittedEmail, data.otp, data.newPassword);
      setApiSuccess('Password updated successfully! Redirecting to login page...');
      setTimeout(() => {
        navigate('/login');
      }, 2500);
    } catch (err) {
      console.error(err);
      setApiError(err || 'Failed to reset password. Invalid or expired OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="relative min-h-screen flex items-center justify-center bg-cover bg-center px-4 py-20"
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
          <KeyRound className="w-6 h-6" />
        </div>

        <h2 className="text-3xl font-extrabold text-white text-center mb-2 tracking-wide">
          {step === 'request' ? 'Forgot Password' : 'Reset Password'}
        </h2>
        <p className="text-zinc-400 text-sm text-center mb-8">
          {step === 'request'
            ? "Enter your email address and we'll send you a 6-digit OTP to reset your password."
            : `Enter the OTP sent to ${submittedEmail} and choose a new password.`}
        </p>

        {apiError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6 p-4 rounded bg-red-950/40 border border-red-800 text-red-200 flex items-start gap-3 text-sm"
          >
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <span>{apiError}</span>
          </motion.div>
        )}

        {apiSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6 p-4 rounded bg-emerald-950/40 border border-emerald-800 text-emerald-200 flex items-start gap-3 text-sm"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            <span>{apiSuccess}</span>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {step === 'request' ? (
            <motion.form
              key="request"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onSubmit={handleRequestSubmit(onRequestSubmit)}
              className="space-y-6"
            >
              {/* Email Address */}
              <div className="space-y-1">
                <label className="text-sm font-semibold text-zinc-300 block">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                  <input
                    type="email"
                    {...registerRequest('email')}
                    placeholder="name@example.com"
                    className={`w-full bg-zinc-800/60 border ${
                      requestErrors.email ? 'border-red-600 focus:ring-red-600' : 'border-zinc-700/50 focus:border-[#E50914]'
                    } rounded-md pl-11 pr-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#E50914] transition-all bg-opacity-70 text-sm`}
                  />
                </div>
                {requestErrors.email && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    {requestErrors.email.message}
                  </p>
                )}
              </div>

              {/* Action Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#E50914] hover:bg-[#C11119] text-white py-3.5 rounded-md font-bold text-base tracking-wide transition-all shadow-[0_4px_14px_rgba(229,9,20,0.3)] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none mt-2 flex items-center justify-center cursor-pointer"
              >
                {isLoading ? (
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  'Send OTP Code'
                )}
              </button>
            </motion.form>
          ) : (
            <motion.form
              key="reset"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleResetSubmit(onResetSubmit)}
              className="space-y-6"
            >
              {/* OTP Input Grid */}
              <div className="space-y-1">
                <label className="text-sm font-semibold text-zinc-300 block text-center mb-2">
                  Enter 6-Digit Code
                </label>
                <div className="flex justify-between items-center gap-2" onPaste={handleOtpPaste}>
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => (otpInputRefs.current[idx] = el)}
                      type="text"
                      maxLength="1"
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      className={`w-12 h-14 text-center bg-zinc-800/60 border-2 ${
                        resetErrors.otp ? 'border-red-600 focus:ring-red-600' : 'border-zinc-700/50 focus:border-[#E50914]'
                      } rounded-md text-2xl font-bold text-white focus:outline-none focus:ring-1 focus:ring-[#E50914] transition-all bg-opacity-70`}
                    />
                  ))}
                </div>
                {/* Hidden input for react-hook-form registration */}
                <input type="hidden" {...registerReset('otp')} />
                {resetErrors.otp && (
                  <p className="text-red-500 text-xs mt-2 text-center flex items-center justify-center gap-1 font-medium">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    {resetErrors.otp.message}
                  </p>
                )}
              </div>

              {/* New Password */}
              <div className="space-y-1">
                <label className="text-sm font-semibold text-zinc-300 block">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    {...registerReset('newPassword')}
                    placeholder="••••••••"
                    className={`w-full bg-zinc-800/60 border ${
                      resetErrors.newPassword ? 'border-red-600 focus:ring-red-600' : 'border-zinc-700/50 focus:border-[#E50914]'
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
                {resetErrors.newPassword && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    {resetErrors.newPassword.message}
                  </p>
                )}
              </div>

              {/* Reset Password Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#E50914] hover:bg-[#C11119] text-white py-3.5 rounded-md font-bold text-base tracking-wide transition-all shadow-[0_4px_14px_rgba(229,9,20,0.3)] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none mt-2 flex items-center justify-center cursor-pointer"
              >
                {isLoading ? (
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  'Reset Password'
                )}
              </button>

              <div className="text-center mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setStep('request');
                    setOtpDigits(['', '', '', '', '', '']);
                    setResetValue('otp', '');
                    setResetValue('newPassword', '');
                    setApiError('');
                    setApiSuccess('');
                  }}
                  className="text-zinc-400 hover:text-white transition-colors text-xs font-semibold"
                >
                  Change email address
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
