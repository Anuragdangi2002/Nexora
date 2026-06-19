import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import { motion } from 'framer-motion';

import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  RotateCcw,
  AlertTriangle,
  ArrowLeft,
  RefreshCw,
  Settings,
} from 'lucide-react';

const WatchSimulator = () => {
  const { user } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();

  const videoRef = useRef(null);

  // ✅ GET MOVIE DATA FROM NAVIGATION
  const videoUrl = location.state?.videoUrl;
  const movieTitle = location.state?.title || 'Movie Trailer';

  // States
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState('0:00');
  const [duration, setDuration] = useState('0:00');
  const [isControlsVisible, setIsControlsVisible] = useState(true);

  const [streamingAllowed, setStreamingAllowed] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const [maxScreens, setMaxScreens] = useState(1);
  const [activeScreens, setActiveScreens] = useState(1);

  const [heartbeatCount, setHeartbeatCount] = useState(0);
  const [isHeartbeatActive, setIsHeartbeatActive] = useState(false);

  // Device ID
  const [deviceId] = useState(() => {
    let devId = localStorage.getItem('netflix_device_id');

    if (!devId) {
      devId =
        'device-' +
        Math.random().toString(36).substring(2, 15);

      localStorage.setItem('netflix_device_id', devId);
    }

    return devId;
  });

  const [screenName] = useState(() => {
    const userAgent = navigator.userAgent;

    let browser = 'Chrome';

    if (userAgent.indexOf('Firefox') > -1)
      browser = 'Firefox';
    else if (
      userAgent.indexOf('Safari') > -1 &&
      userAgent.indexOf('Chrome') === -1
    )
      browser = 'Safari';
    else if (userAgent.indexOf('Edg') > -1)
      browser = 'Edge';

    const os = navigator.platform || 'Desktop';

    return `${browser} on ${os}`;
  });

  // Start Stream
  const startStream = async () => {
    try {
      setStreamingAllowed('checking');

      const res = await API.post('/screens/start', {
        deviceId,
        screenName,
      });

      if (res.data?.success) {
        setStreamingAllowed('allowed');
        setIsHeartbeatActive(true);

        if (res.data.data) {
          setActiveScreens(
            res.data.data.activeScreensCount
          );

          setMaxScreens(
            res.data.data.maxScreensAllowed
          );
        }
      }
    } catch (err) {
      console.error('Error starting video stream', err);

      setStreamingAllowed('denied');

      if (
        err.response &&
        err.response.status === 403
      ) {
        setErrorMessage(
          err.response.data?.message ||
            'Screen limit reached.'
        );
      } else {
        setErrorMessage(
          'Server connection error. Please try again later.'
        );
      }
    }
  };

  // Stop Stream
  const stopStream = async () => {
    try {
      await API.post('/screens/stop', {
        deviceId,
      });
    } catch (err) {
      console.error('Error stopping stream', err);
    }
  };

  // Start on mount
  useEffect(() => {
    startStream();

    const handleBeforeUnload = () => {
      const token =
        localStorage.getItem('netflix_token');

      if (token && deviceId) {
        fetch(
          'http://localhost:5000/api/screens/stop',
          {
            method: 'POST',

            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },

            body: JSON.stringify({ deviceId }),

            keepalive: true,
          }
        );
      }
    };

    window.addEventListener(
      'beforeunload',
      handleBeforeUnload
    );

    return () => {
      setIsHeartbeatActive(false);

      stopStream();

      window.removeEventListener(
        'beforeunload',
        handleBeforeUnload
      );
    };
  }, []);

  // Heartbeat
  useEffect(() => {
    if (
      streamingAllowed !== 'allowed' ||
      !isHeartbeatActive
    )
      return;

    const interval = setInterval(async () => {
      try {
        await API.post('/screens/heartbeat', {
          deviceId,
        });

        setHeartbeatCount((c) => c + 1);
      } catch (err) {
        console.error('Heartbeat lost', err);

        if (
          err.response &&
          (err.response.status === 403 ||
            err.response.status === 401)
        ) {
          setStreamingAllowed('denied');

          setErrorMessage(
            err.response.data?.message ||
              'Streaming session expired.'
          );

          setIsHeartbeatActive(false);

          if (videoRef.current) {
            videoRef.current.pause();
          }
        }
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [
    streamingAllowed,
    isHeartbeatActive,
    deviceId,
  ]);

  // Play/Pause
  const handlePlayPause = async () => {
    if (!videoRef.current) return;

    try {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        await videoRef.current.play();
        setIsPlaying(true);
      }
    } catch (err) {
      console.log('Playback error', err);
    }
  };

  // Mute
  const handleMute = () => {
    if (!videoRef.current) return;

    videoRef.current.muted = !isMuted;

    setIsMuted(!isMuted);
  };

  // Time formatter
  const formatTime = (time) => {
    const mins = Math.floor(time / 60);

    const secs = Math.floor(time % 60);

    return `${mins}:${
      secs < 10 ? '0' : ''
    }${secs}`;
  };

  // Time update
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;

    const current = videoRef.current.currentTime;

    const dur = videoRef.current.duration || 0;

    setProgress(
      dur > 0 ? (current / dur) * 100 : 0
    );

    setCurrentTime(formatTime(current));
  };

  // Metadata loaded
  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;

    setDuration(
      formatTime(videoRef.current.duration)
    );
  };

  // Scrubber
  const handleScrubChange = (e) => {
    if (!videoRef.current) return;

    const value = e.target.value;

    setProgress(value);

    const dur = videoRef.current.duration || 0;

    videoRef.current.currentTime =
      (value / 100) * dur;
  };

  // Fullscreen
  const handleFullscreen = () => {
    if (!videoRef.current) return;

    if (videoRef.current.requestFullscreen) {
      videoRef.current.requestFullscreen();
    } else if (
      videoRef.current.webkitRequestFullscreen
    ) {
      videoRef.current.webkitRequestFullscreen();
    }
  };

  // Restart
  const handleRestart = () => {
    if (!videoRef.current) return;

    videoRef.current.currentTime = 0;

    videoRef.current.play();

    setIsPlaying(true);
  };

  // Hide controls
  useEffect(() => {
    if (!isPlaying) return;

    const handleMouseMove = () => {
      setIsControlsVisible(true);

      clearTimeout(window.controlsTimeout);

      window.controlsTimeout = setTimeout(() => {
        setIsControlsVisible(false);
      }, 4000);
    };

    window.addEventListener(
      'mousemove',
      handleMouseMove
    );

    return () => {
      window.removeEventListener(
        'mousemove',
        handleMouseMove
      );

      clearTimeout(window.controlsTimeout);
    };
  }, [isPlaying]);

  // ❌ NO VIDEO FOUND
  if (!videoUrl) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-5">
        <h1 className="text-3xl font-bold">
          No Trailer Found
        </h1>

        <button
          onClick={() => navigate('/')}
          className="bg-red-600 hover:bg-red-700 px-5 py-2 rounded"
        >
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="bg-black min-h-screen relative flex items-center justify-center overflow-hidden">

      {/* LOADING */}
      {streamingAllowed === 'checking' && (
        <div className="flex flex-col items-center gap-4 text-center z-10">
          <div className="w-16 h-16 rounded-full border-4 border-t-[#E50914] border-zinc-800 animate-spin" />

          <h2 className="text-xl font-bold text-white tracking-wider">
            CONNECTING...
          </h2>
        </div>
      )}

      {/* BLOCKED */}
      {streamingAllowed === 'denied' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-[#0c0c0c] z-50 flex items-center justify-center p-6"
        >
          <div className="max-w-2xl w-full bg-zinc-950 border border-red-800/40 rounded-2xl p-10 text-center">

            <div className="w-16 h-16 bg-red-950/40 border border-red-600/40 text-[#E50914] rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <h1 className="text-3xl font-black text-white uppercase mb-4">
              Stream Limit Reached
            </h1>

            <p className="text-zinc-300 text-lg mb-8">
              {errorMessage}
            </p>

            <button
              onClick={() => navigate('/')}
              className="bg-[#E50914] hover:bg-[#C11119] text-white py-3 px-6 rounded-lg font-bold"
            >
              Back
            </button>
          </div>
        </motion.div>
      )}

      {/* PLAYER */}
      {streamingAllowed === 'allowed' && (
        <div
          className="w-full h-screen relative flex items-center justify-center bg-black"
          onClick={() =>
            setIsControlsVisible(true)
          }
        >
          {/* ✅ REAL VIDEO */}
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full h-full object-contain bg-black"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={
              handleLoadedMetadata
            }
            autoPlay
            playsInline
            controls={false}
          >
            <source
              src={videoUrl}
              type="video/mp4"
            />
          </video>

          {/* TOP BAR */}
          <div
            className={`absolute top-6 left-6 right-6 z-30 flex items-center justify-between transition-opacity duration-300 ${
              isControlsVisible
                ? 'opacity-100'
                : 'opacity-0'
            }`}
          >
            <button
              onClick={() => navigate('/')}
              className="bg-black/60 hover:bg-black/80 text-white p-3 rounded-full"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>

            <div className="bg-black/60 px-4 py-2 rounded-full text-white text-sm">
              {activeScreens}/{maxScreens}{' '}
              Screens Active
            </div>
          </div>

          {/* CONTROLS */}
          <div
            className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent pt-24 pb-8 px-8 z-20 transition-opacity duration-300 ${
              isControlsVisible
                ? 'opacity-100'
                : 'opacity-0'
            }`}
          >
            {/* PROGRESS */}
            <div className="flex items-center gap-4 mb-4">
              <span className="text-xs text-zinc-400 font-mono">
                {currentTime}
              </span>

              <input
                type="range"
                min="0"
                max="100"
                value={progress}
                onChange={handleScrubChange}
                className="flex-grow accent-[#E50914]"
              />

              <span className="text-xs text-zinc-400 font-mono">
                {duration}
              </span>
            </div>

            {/* CONTROLS */}
            <div className="flex items-center justify-between">

              {/* LEFT */}
              <div className="flex items-center gap-6">
                <button
                  onClick={handlePlayPause}
                  className="text-white hover:text-red-500"
                >
                  {isPlaying ? (
                    <Pause className="w-8 h-8 fill-current" />
                  ) : (
                    <Play className="w-8 h-8 fill-current" />
                  )}
                </button>

                <button
                  onClick={handleRestart}
                  className="text-zinc-300 hover:text-white"
                >
                  <RotateCcw className="w-6 h-6" />
                </button>

                <button
                  onClick={handleMute}
                  className="text-zinc-300 hover:text-white"
                >
                  {isMuted ? (
                    <VolumeX className="w-6 h-6" />
                  ) : (
                    <Volume2 className="w-6 h-6" />
                  )}
                </button>

                <span className="text-white text-sm font-semibold">
                  {movieTitle}
                </span>
              </div>

              {/* CENTER */}
              <div className="hidden md:block text-center">
                <h3 className="text-lg font-black tracking-wide text-white uppercase">
                  {movieTitle}
                </h3>

                <p className="text-xs text-zinc-400">
                  Streaming Trailer
                </p>
              </div>

              {/* RIGHT */}
              <div className="flex items-center gap-6">
                <button
                  onClick={startStream}
                  className="text-zinc-400 hover:text-white"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>

                <button className="text-zinc-400 hover:text-white">
                  <Settings className="w-5 h-5" />
                </button>

                <button
                  onClick={handleFullscreen}
                  className="text-zinc-300 hover:text-white"
                >
                  <Maximize className="w-6 h-6" />
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WatchSimulator;