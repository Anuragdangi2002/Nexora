import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import { motion } from 'framer-motion';
import { Check, ShieldCheck, XCircle, AlertTriangle, Monitor, Tv, Smartphone, RefreshCw } from 'lucide-react';
import Navbar from '../components/Navbar';

const loadRazorpay = () => {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const Subscriptions = () => {
  const { user, subscribe, cancelSubscription, fetchProfile } = useAuth();
  const [plans, setPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null); // stores plan._id or 'cancel'
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch Netflix subscription tiers
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await API.get('/subscriptions/plans');
        if (res.data?.success && res.data?.data) {
          setPlans(res.data.data);
        } else {
          // Fallback static plans in case backend is loading seed
          setPlans([
            {
              _id: '647de952ab9a4f4efb1e3e78',
              name: 'Basic',
              price: 149,
              maxScreens: 1,
              resolution: '720p',
              videoQuality: 'Good',
              description: 'Watch on 1 screen in Standard Definition.',
            },
            {
              _id: '647de952ab9a4f4efb1e3e79',
              name: 'Standard',
              price: 899,
              maxScreens: 2,
              resolution: '1080p',
              videoQuality: 'Better',
              description: 'Watch on 2 screens concurrently in Full HD.',
            },
            {
              _id: '647de952ab9a4f4efb1e3e80',
              name: 'Premium',
              price: 1439,
              maxScreens: 4,
              resolution: '4K+HDR',
              videoQuality: 'Best',
              description: 'Watch on 4 screens concurrently in Ultra HD.',
            },
          ]);
        }
      } catch (err) {
        console.error('Error fetching subscription plans', err);
        setError('Could not connect to the subscription server.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlans();
  }, []);

  const handleSubscribe = async (plan) => {
    setError('');
    setSuccess('');
    setActionLoading(plan._id);

    try {
      // 1. Dynamic Load of Razorpay Script SDK
      const isLoaded = await loadRazorpay();
      if (!isLoaded) {
        throw new Error('Razorpay SDK failed to load. Please verify your connection.');
      }

      // 2. Set up Razorpay Checkout Options
      const options = {
        key: "rzp_test_SbJDzChZ18vIEO",
        amount: plan.price * 100,
        currency: "INR",
        name: "NEXORA",
        description: `Subscription Upgrade: ${plan.name} Plan`,
        image: "https://assets.nflxext.com/us/ffe/siteui/common/icons/nficon2016.ico",
        method: {
          netbanking: true,
          card: true,
          upi: true,
          wallet: true,
          paylater: false, // Disables the Pay Later option completely
        },
        handler: async function (response) {
          // Payment Succeeded callback
          setActionLoading(plan._id);
          try {
            await subscribe(plan._id, plan.name);
            setSuccess(`Congratulations! Your payment was captured successfully (ID: ${response.razorpay_payment_id}). You are now subscribed to the ${plan.name} plan!`);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } catch (err) {
            setError(err || 'Failed to update subscription on server.');
          } finally {
            setActionLoading(null);
          }
        },
        prefill: {
          name: user?.username || "NEXORA Subscriber",
          email: user?.email || "subscriber@example.com",
        },
        theme: {
          color: "#E50914", // Signature NEXORA red!
        },
        modal: {
          ondismiss: function () {
            setActionLoading(null);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error(err);
      setError(err.message || err || 'Failed to initialize payment.');
      setActionLoading(null);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Are you absolutely sure you want to cancel your NEXORA subscription? All streaming sessions will be forcefully stopped immediately.')) {
      return;
    }

    setError('');
    setSuccess('');
    setActionLoading('cancel');

    try {
      await cancelSubscription();
      setSuccess('Your subscription has been successfully cancelled. Your plan is now downgraded to Free.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error(err);
      setError(err || 'Failed to cancel subscription.');
    } finally {
      setActionLoading(null);
    }
  };

  const activePlanId = user?.subscription?.planId;
  const isFreePlan = !user?.subscription || user?.subscription?.status !== 'active';

  return (
    <div className="bg-[#141414] min-h-screen text-white pb-16">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28">
        {/* Header Title */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-4"
          >
            Choose the plan that's right for you
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-zinc-400 text-lg"
          >
            Watch all you want. Ad-free. Cancel or change your subscription at any time.
          </motion.p>
        </div>

        {/* Global Notifications */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-8 p-4 max-w-4xl mx-auto rounded bg-red-950/40 border border-red-800 text-red-200 flex items-start gap-3 text-sm shadow-lg"
          >
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <span>{error}</span>
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-8 p-4 max-w-4xl mx-auto rounded bg-emerald-950/40 border border-emerald-800 text-emerald-200 flex items-start gap-3 text-sm shadow-lg animate-pulse"
          >
            <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            <span>{success}</span>
          </motion.div>
        )}

        {/* Plan Grid */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <RefreshCw className="w-10 h-10 animate-spin text-[#E50914]" />
            <p className="text-zinc-400 text-sm">Loading Nexora seeded tiers...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
            {plans.map((plan, idx) => {
              const isCurrent = activePlanId === plan._id;
              const isPremium = plan.name?.toLowerCase() === 'premium';

              return (
                <motion.div
                  key={plan._id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1, duration: 0.5 }}
                  className={`relative rounded-2xl flex flex-col p-8 transition-all overflow-hidden ${isCurrent
                    ? 'bg-zinc-900 border-2 border-[#E50914] shadow-[0_8px_30px_rgba(229,9,20,0.25)]'
                    : isPremium
                      ? 'glass-panel border-purple-500/20 shadow-[0_8px_24px_rgba(168,85,247,0.05)] hover:border-purple-500/40'
                      : 'glass-panel hover:border-zinc-700/60'
                    }`}
                >
                  {/* Decorative glowing gradient for Premium / Active */}
                  {isPremium && (
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />
                  )}
                  {isCurrent && (
                    <div className="absolute top-0 right-0 bg-[#E50914] text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-bl-lg shadow">
                      Current Plan
                    </div>
                  )}

                  {/* Plan Meta */}
                  <div className="mb-6">
                    <h3 className="text-2xl font-black tracking-wide text-white mb-2">{plan.name}</h3>
                    <p className="text-zinc-400 text-sm min-h-[40px]">{plan.description}</p>
                    <div className="mt-4 flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold text-white">₹{plan.price}</span>
                      <span className="text-zinc-500 text-sm">/month</span>
                    </div>
                  </div>

                  {/* Plan Features Spec */}
                  <ul className="space-y-4 mb-8 flex-grow">
                    <li className="flex items-center gap-3 text-sm text-zinc-300">
                      <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center shrink-0 border border-zinc-700">
                        <Check className="w-3.5 h-3.5 text-[#E50914]" />
                      </div>
                      <span>Concurrent Screens: <strong className="text-white font-semibold">{plan.maxScreens} Screen{plan.maxScreens > 1 ? 's' : ''}</strong></span>
                    </li>
                    <li className="flex items-center gap-3 text-sm text-zinc-300">
                      <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center shrink-0 border border-zinc-700">
                        <Check className="w-3.5 h-3.5 text-[#E50914]" />
                      </div>
                      <span>Resolution: <strong className="text-white font-semibold">{plan.resolution}</strong></span>
                    </li>
                    <li className="flex items-center gap-3 text-sm text-zinc-300">
                      <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center shrink-0 border border-zinc-700">
                        <Check className="w-3.5 h-3.5 text-[#E50914]" />
                      </div>
                      <span>Video Quality: <strong className="text-white font-semibold">{plan.videoQuality}</strong></span>
                    </li>
                    <li className="flex items-center gap-3 text-sm text-zinc-300">
                      <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center shrink-0 border border-zinc-700">
                        <Check className="w-3.5 h-3.5 text-[#E50914]" />
                      </div>
                      <span>Supported Devices: Laptop, TV, Mobile</span>
                    </li>
                  </ul>

                  {/* Button Action */}
                  {isCurrent ? (
                    <button
                      disabled
                      className="w-full bg-zinc-800 border border-zinc-700 text-zinc-400 py-3.5 rounded-lg font-bold text-sm tracking-wide"
                    >
                      Active Plan
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSubscribe(plan)}
                      disabled={actionLoading !== null}
                      className={`w-full py-3.5 rounded-lg font-bold text-sm tracking-wide transition-all active:scale-[0.98] flex items-center justify-center disabled:opacity-40 disabled:pointer-events-none ${isPremium
                        ? 'bg-gradient-to-r from-red-600 to-purple-600 text-white shadow-[0_4px_16px_rgba(229,9,20,0.2)] hover:shadow-[0_4px_22px_rgba(229,9,20,0.4)]'
                        : 'bg-[#E50914] hover:bg-[#C11119] text-white shadow-[0_4px_12px_rgba(229,9,20,0.15)] hover:shadow-[0_4px_18px_rgba(229,9,20,0.35)]'
                        }`}
                    >
                      {actionLoading === plan._id ? (
                        <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      ) : activePlanId ? (
                        'Change to this Plan'
                      ) : (
                        'Subscribe Now'
                      )}
                    </button>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Cancellation Section */}
        {!isFreePlan && !isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-16 p-8 glass-panel max-w-4xl mx-auto rounded-xl flex flex-col sm:flex-row items-center justify-between gap-6 border-red-900/20"
          >
            <div className="space-y-1 text-center sm:text-left">
              <h4 className="text-lg font-bold text-white flex items-center justify-center sm:justify-start gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                Want to pause or cancel your subscription?
              </h4>
              <p className="text-zinc-400 text-sm">
                Cancelling will downgrade your plan to Free and forcefully close any ongoing device streams.
              </p>
            </div>
            <button
              onClick={handleCancel}
              disabled={actionLoading === 'cancel'}
              className="bg-zinc-800 hover:bg-red-950/20 hover:text-red-400 hover:border-red-800/40 border border-zinc-700 text-zinc-300 px-6 py-3 rounded-lg font-bold text-sm tracking-wide transition-all active:scale-[0.98] shrink-0 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2"
            >
              {actionLoading === 'cancel' ? (
                <svg className="animate-spin h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <>
                  <XCircle className="w-4 h-4" />
                  Cancel Subscription
                </>
              )}
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Subscriptions;
