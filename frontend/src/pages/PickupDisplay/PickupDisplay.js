import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { parentPickupAPI } from '../../services/api';
import { Users, Clock, MapPin, CheckCircle, Sparkles, Sun, Moon, AlertTriangle, Volume2 } from 'lucide-react';
import LoadingSpinner from '../../components/UI/LoadingSpinner';

const STORAGE_KEY = 'pickup-display-light-mode';
const SOUND_STORAGE_KEY = 'pickup-display-sound';

const SOUND_OPTIONS = [
  { id: 'beep', label: 'صفارة' },
  { id: 'chime', label: 'نغمة' },
  { id: 'bell', label: 'جرس' },
  { id: 'alert', label: 'تنبيه' },
  { id: 'long-chime', label: ' * نغمة طويلة' },
  { id: 'long-bell', label: 'جرس طويل' },
  { id: 'alarm', label: 'منبه طويل' },
  { id: 'melody', label: 'لحن طويل' },
  { id: 'school', label: 'المدرسة' },
];

function playNotificationSound(audioContext, soundId) {
  if (!audioContext) return;
  try {
    if (audioContext.state === 'suspended') {
      audioContext.resume().catch(() => {});
    }
    const now = audioContext.currentTime;

    const playTone = (freq, start, duration, gainVal = 0.2) => {
      const gainNode = audioContext.createGain();
      gainNode.connect(audioContext.destination);
      const osc = audioContext.createOscillator();
      osc.connect(gainNode);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gainNode.gain.setValueAtTime(gainVal, start);
      gainNode.gain.exponentialRampToValueAtTime(0.01, start + duration);
      osc.start(start);
      osc.stop(start + duration);
    };

    switch (soundId) {
      case 'chime':
        playTone(523, now, 0.15);
        playTone(659, now + 0.12, 0.15);
        playTone(784, now + 0.24, 0.25);
        break;
      case 'bell':
        playTone(880, now, 0.1);
        playTone(880, now + 0.15, 0.2, 0.15);
        break;
      case 'alert':
        playTone(660, now, 0.08);
        playTone(660, now + 0.12, 0.08);
        playTone(660, now + 0.24, 0.15);
        break;
      case 'long-chime':
        playTone(523, now, 0.4);
        playTone(659, now + 0.35, 0.4);
        playTone(784, now + 0.7, 0.5);
        playTone(1047, now + 1.05, 0.6);
        break;
      case 'long-bell':
        playTone(880, now, 0.25);
        playTone(880, now + 0.4, 0.35);
        playTone(880, now + 0.9, 0.5, 0.15);
        break;
      case 'alarm':
        for (let i = 0; i < 6; i++) {
          playTone(880, now + i * 0.4, 0.2, 0.18);
          playTone(1100, now + i * 0.4 + 0.15, 0.2, 0.18);
        }
        break;
      case 'melody':
        const notes = [523, 587, 659, 698, 784, 880, 988, 1047];
        notes.forEach((freq, i) => {
          playTone(freq, now + i * 0.35, 0.4, 0.15);
        });
        break;
      case 'school':
        // Special school chime: clear, dignified, recognizable (like a school bell / announcement tone)
        playTone(784, now, 0.2, 0.18);
        playTone(659, now + 0.22, 0.25, 0.18);
        playTone(523, now + 0.5, 0.3, 0.16);
        playTone(659, now + 0.85, 0.2, 0.15);
        playTone(784, now + 1.1, 0.45, 0.18);
        break;
      default:
        // beep (default)
        playTone(880, now, 0.2);
        playTone(1100, now + 0.15, 0.25);
    }
  } catch (_) {}
}

const PickupDisplay = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const previousPickupCountRef = useRef(null);
  const audioContextRef = useRef(null);
  const [isLightMode, setIsLightMode] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [selectedSoundId, setSelectedSoundId] = useState(() => {
    try {
      const s = localStorage.getItem(SOUND_STORAGE_KEY);
      return SOUND_OPTIONS.some((o) => o.id === s) ? s : 'long-chime';
    } catch {
      return 'long-chime';
    }
  });

  const [soundUnlocked, setSoundUnlocked] = useState(false);

  // Create AudioContext on load so sound is always ready (TV/kiosk may never get a click)
  useEffect(() => {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      audioContextRef.current = ctx;
      ctx.resume().then(() => setSoundUnlocked(true)).catch(() => {});
    } catch (_) {}
  }, []);

  // Unlock audio on first user interaction (resume if browser kept it suspended)
  useEffect(() => {
    const unlock = () => {
      const ctx = audioContextRef.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        ctx.resume().then(() => setSoundUnlocked(true)).catch(() => {});
      } else {
        setSoundUnlocked(true);
      }
    };
    const onInteraction = () => {
      unlock();
      document.removeEventListener('click', onInteraction);
      document.removeEventListener('touchstart', onInteraction);
    };
    document.addEventListener('click', onInteraction);
    document.addEventListener('touchstart', onInteraction);
    return () => {
      document.removeEventListener('click', onInteraction);
      document.removeEventListener('touchstart', onInteraction);
    };
  }, []);

  // Resume audio when tab becomes visible (e.g. display switched back to this tab)
  useEffect(() => {
    const onVisible = () => {
      const ctx = audioContextRef.current;
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().then(() => setSoundUnlocked(true)).catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const toggleLightMode = () => {
    setIsLightMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch (_) {}
      return next;
    });
  };

  const setSound = (id) => {
    setSelectedSoundId(id);
    try {
      localStorage.setItem(SOUND_STORAGE_KEY, id);
    } catch (_) {}
  };

  const playTestSound = () => {
    const ctx = audioContextRef.current;
    if (ctx) playNotificationSound(ctx, selectedSoundId);
    else {
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (Ctx) {
          const newCtx = new Ctx();
          newCtx.resume().then(() => {
            audioContextRef.current = newCtx;
            playNotificationSound(newCtx, selectedSoundId);
          }).catch(() => {});
        }
      } catch (_) {}
    }
  };

  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const schoolId = user?.school_id ?? null;

  // Fetch pickups for logged-in user's school only (backend uses JWT, secure)
  const { data: pickupsData, isLoading } = useQuery(
    ['displayPickups'],
    () => parentPickupAPI.getDisplayPickups(),
    {
      enabled: !!user && !!schoolId,
      refetchInterval: 10000,
      refetchIntervalInBackground: true
    }
  );

  const allPickups = pickupsData?.pickups || [];
  const schoolName = pickupsData?.school_name || null;
  const confirmedCount = allPickups.filter((p) => p.status === 'confirmed').length;

  // Play sound when a new confirmed request appears (parent arrived at school)
  useEffect(() => {
    if (isLoading) return;
    const count = confirmedCount;
    const prev = previousPickupCountRef.current;
    if (prev !== null && count > prev) {
      const ctx = audioContextRef.current;
      if (ctx) {
        playNotificationSound(ctx, selectedSoundId);
      } else {
        try {
          const Ctx = window.AudioContext || window.webkitAudioContext;
          if (Ctx) {
            const newCtx = new Ctx();
            newCtx.resume().then(() => playNotificationSound(newCtx, selectedSoundId)).catch(() => {});
          }
        } catch (_) {}
      }
    }
    previousPickupCountRef.current = count;
  }, [confirmedCount, isLoading, selectedSoundId]);

  const WARNING_WAIT_MINUTES = 5;

  const getStatusLabel = (status) => {
    if (status === 'pending') return 'في انتظار الوصول';
    if (status === 'confirmed') return 'في انتظار الاستلام';
    return 'تم الاستلام';
  };

  const getWaitingMinutes = (confirmationTime) => {
    if (!confirmationTime) return 0;
    const then = new Date(confirmationTime).getTime();
    return Math.floor((currentTime.getTime() - then) / 60000);
  };

  const light = isLightMode;
  const bgRoot = light
    ? 'min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-100 text-gray-900'
    : 'min-h-screen bg-gradient-to-br from-sky-900 via-sky-700 to-blue-800 text-white';
  const titleGradient = light
    ? 'text-transparent bg-clip-text bg-gradient-to-r from-sky-900 to-sky-600'
    : 'text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-sky-400 animate-pulse';
  const subtitle = light ? 'text-gray-600' : 'text-blue-200';
  const clockBg = light ? 'bg-white/80 border-gray-200 shadow-lg' : 'bg-white/10 border-white/30';
  const clockText = light ? 'text-gray-800' : 'text-white';
  const clockSub = light ? 'text-gray-500' : 'text-blue-200';
  const cardBg = light ? 'bg-white border-gray-200 shadow-lg' : 'bg-white/15 border-white/40';
  const cardTitle = light ? 'text-gray-900' : 'text-white';
  const cardMeta = light ? 'text-gray-600' : 'text-blue-200';
  const timeBox = light ? 'bg-gray-50 border-gray-200' : 'bg-white/10 border-white/20';
  const timeLabel = light ? 'text-gray-600' : 'text-white';
  const timeValue = light ? 'text-green-700' : 'text-green-300';
  const badgeBox = light ? 'bg-green-50 border-green-500 text-green-800' : 'bg-green-500/30 border-green-400 text-green-100';
  const badgeIcon = light ? 'text-green-600' : 'text-green-300';
  const listHeaderBg = light ? 'bg-white border-gray-200 shadow' : 'bg-white/10 border-white/30';
  const listHeaderText = light ? 'text-gray-800' : 'text-white';
  const footerBg = light ? 'bg-white/80 border-gray-200' : 'bg-white/10 border-white/20';
  const footerText = light ? 'text-gray-600' : 'text-blue-200';
  const emptyIcon = light ? 'text-blue-500' : 'text-blue-300';
  const emptyText = light ? 'text-gray-600' : 'text-blue-200';
  const numBadge = light ? 'from-blue-500 to-indigo-600' : 'from-blue-500 to-purple-500';
  const sparkle = light ? 'text-amber-500' : 'text-yellow-300';

  // Require login and user's school — no options, secure
  if (authLoading || !user || !schoolId) {
    const isLoggedInNoSchool = user && !schoolId;
    return (
      <div className={`${bgRoot} relative min-h-screen overflow-hidden transition-colors duration-300`}>
        <div
          className={`pickup-display-bg-lines ${light ? 'text-blue-900' : 'text-white'}`}
          aria-hidden
        />
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-6">
          <img src="/logo.png" alt="تتبع" className="h-16 w-16 object-contain mb-4" />
          <h1 className={`text-2xl font-bold mb-2 ${titleGradient}`}>استلام الطلاب</h1>
          {authLoading ? (
            <LoadingSpinner className="h-10 w-10 mt-4" />
          ) : isLoggedInNoSchool ? (
            <>
              <p className={`text-lg ${subtitle} mb-6 text-center max-w-md`}>
                لا توجد مدرسة مرتبطة بحسابك لعرض طلبات الاستلام
              </p>
              <button
                type="button"
                onClick={() => navigate('/app/dashboard')}
                className={`px-6 py-3 rounded-xl font-medium ${light ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-white/20 text-white hover:bg-white/30 border border-white/30'}`}
              >
                العودة للوحة التحكم
              </button>
            </>
          ) : (
            <>
              <p className={`text-lg ${subtitle} mb-6 text-center max-w-md`}>
                سجّل الدخول لعرض طلبات الاستلام لمدرستك فقط
              </p>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className={`px-6 py-3 rounded-xl font-medium ${light ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-white/20 text-white hover:bg-white/30 border border-white/30'}`}
              >
                تسجيل الدخول
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`${bgRoot} relative min-h-screen overflow-hidden transition-colors duration-300`}>
      {/* Animated lines background */}
      <div
        className={`pickup-display-bg-lines ${light ? 'text-blue-900' : 'text-white'}`}
        aria-hidden
      />
      <div className="relative z-10 p-4 md:p-6 xl:p-4">
      {/* Hint: click to enable sound (hidden after first interaction) */}
      {!soundUnlocked && (
        <div
          className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-xl border-2 text-sm font-medium shadow-lg ${
            light ? 'bg-amber-50 border-amber-300 text-amber-800' : 'bg-amber-500/20 border-amber-400 text-amber-100'
          }`}
          role="status"
        >
          انقر على الصفحة مرة لتفعيل صوت التنبيه عند وصول طلب جديد
        </div>
      )}

      {/* Header above table — clear zones: Brand | Title block | Settings | Clock */}
      <header
        className={`mb-4 xl:mb-4 rounded-2xl xl:rounded-xl border-2 ${clockBg} overflow-hidden shadow-sm`}
        role="banner"
      >
        <div
          className={`grid grid-cols-[auto_1fr_auto_auto] gap-0 min-h-[4.5rem] xl:min-h-[4rem] items-stretch ${light ? 'divide-x divide-gray-200' : 'divide-x divide-white/20'}`}
          style={{ gridTemplateAreas: '"brand title settings clock"' }}
        >
          {/* 1. Brand — logo + app name */}
          <div className="flex items-center gap-3 px-4 xl:px-3 py-3 xl:py-2" style={{ gridArea: 'brand' }}>
            <img
              src="/logo.png"
              alt="تتبع"
              className="h-11 w-11 xl:h-10 xl:w-10 shrink-0 object-contain"
            />
            <span className={`text-base xl:text-lg font-bold whitespace-nowrap ${clockText}`}>تتبع</span>
          </div>

          {/* 2. Title block — school name, main title, subtitle (center) */}
          <div
            className="flex flex-col items-center justify-center text-center px-4 xl:px-6 py-3 xl:py-2 min-w-0"
            style={{ gridArea: 'title' }}
          >
            <p className={`text-sm xl:text-base font-medium ${subtitle} leading-tight`}>
              {schoolName ? schoolName : 'المدرسة'}
            </p>
            <h1 className={`text-xl xl:text-2xl 2xl:text-3xl font-bold mt-0.5 ${titleGradient} leading-tight`}>
              استلام الطلاب
            </h1>
            <p className={`text-xs xl:text-sm ${subtitle} mt-0.5 leading-tight`}>
              يرجى انتظار الطالب عند المدخل
            </p>
          </div>

          {/* 3. Settings — theme + sound grouped */}
          <div
            className={`flex items-center gap-2 xl:gap-3 px-3 xl:px-4 py-2 ${light ? 'bg-gray-50/80' : 'bg-white/5'}`}
            style={{ gridArea: 'settings' }}
          >
            <span className={`text-xs font-medium ${clockSub} hidden xl:inline whitespace-nowrap`}>الإعدادات</span>
            <button
              type="button"
              onClick={toggleLightMode}
              className={`p-2 rounded-lg border transition-all shrink-0 ${
                light
                  ? 'bg-white border-gray-200 text-amber-500 hover:bg-gray-100'
                  : 'bg-white/10 border-white/30 text-yellow-300 hover:bg-white/20'
              }`}
              title={light ? 'الوضع الداكن' : 'الوضع الفاتح'}
            >
              {light ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>
            <div className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 shrink-0 ${light ? 'bg-white border-gray-200' : 'bg-white/10 border-white/20'}`}>
              <Volume2 className={`h-4 w-4 shrink-0 ${light ? 'text-gray-500' : 'text-blue-300'}`} />
              <select
                value={selectedSoundId}
                onChange={(e) => setSound(e.target.value)}
                className={`text-xs xl:text-sm font-medium bg-transparent border-0 focus:ring-0 cursor-pointer min-w-0 max-w-[7rem] ${light ? 'text-gray-800' : 'text-white'}`}
                title="اختر صوت التنبيه"
              >
                {SOUND_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id} className={light ? 'bg-white text-gray-900' : 'bg-gray-800 text-white'}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={playTestSound}
                className={`px-2 py-1 rounded text-xs font-medium shrink-0 ${light ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-white/20 text-blue-100 hover:bg-white/30'}`}
                title="تجربة الصوت"
              >
                تجربة
              </button>
            </div>
          </div>

          {/* 4. Clock — fixed width block */}
          <div
            className={`flex flex-col items-center justify-center px-4 xl:px-5 py-2 w-44 xl:w-52 shrink-0 ${light ? 'bg-gray-50/80' : 'bg-white/5'}`}
            style={{ gridArea: 'clock' }}
          >
            <div className="flex items-center gap-2">
              <Clock className={`h-5 w-5 shrink-0 ${light ? 'text-blue-600' : 'text-blue-300'}`} />
              <span className={`text-xl xl:text-2xl font-bold tabular-nums ${clockText}`}>
                {currentTime.toLocaleTimeString('ar-SA', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: true
                })}
              </span>
            </div>
            <p className={`text-[10px] xl:text-xs mt-1 ${clockSub} leading-tight text-center`}>
              {currentTime.toLocaleDateString('ar-SA', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
        </div>
      </header>

      {/* Pickups Table — all statuses, ordered by priority */}
      <div className="w-full max-w-7xl xl:max-w-[1920px] mx-auto pickup-list-container">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 xl:py-8">
            <LoadingSpinner className="h-12 w-12 xl:h-10 xl:w-10" />
            <p className={`mt-3 xl:mt-2 text-xl xl:text-lg ${emptyText}`}>جاري التحميل...</p>
          </div>
        ) : allPickups.length === 0 ? (
          <div className="text-center py-12 xl:py-8">
            <Users className={`h-20 w-20 xl:h-16 xl:w-16 mx-auto mb-4 opacity-50 ${emptyIcon}`} />
            <p className={`text-2xl md:text-3xl xl:text-2xl font-semibold ${emptyText}`}>
              لا توجد طلبات استلام اليوم
            </p>
          </div>
        ) : (
          <div className={`rounded-xl xl:rounded-lg border-2 overflow-hidden ${listHeaderBg}`}>
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className={`border-b-2 ${light ? 'border-gray-200 bg-gray-50' : 'border-white/30 bg-white/10'}`}>
                    <th className={`py-3 xl:py-2 px-4 xl:px-3 text-base xl:text-sm font-bold ${listHeaderText}`}>#</th>
                    <th className={`py-3 xl:py-2 px-4 xl:px-3 text-base xl:text-sm font-bold ${listHeaderText}`}>الطالب</th>
                    <th className={`py-3 xl:py-2 px-4 xl:px-3 text-base xl:text-sm font-bold ${listHeaderText}`}>الحالة</th>
                    <th className={`py-3 xl:py-2 px-4 xl:px-3 text-base xl:text-sm font-bold ${listHeaderText}`}>وقت الطلب</th>
                    <th className={`py-3 xl:py-2 px-4 xl:px-3 text-base xl:text-sm font-bold ${listHeaderText}`}>وقت الوصول</th>
                    <th className={`py-3 xl:py-2 px-4 xl:px-3 text-base xl:text-sm font-bold ${listHeaderText}`}>مدة الانتظار</th>
                    <th className={`py-3 xl:py-2 px-4 xl:px-3 text-base xl:text-sm font-bold ${listHeaderText}`}>تنبيه</th>
                  </tr>
                </thead>
                <tbody>
                  {allPickups.map((pickup, index) => {
                    const waitingMins = pickup.status === 'confirmed' ? getWaitingMinutes(pickup.confirmation_time) : 0;
                    const isOver5Min = pickup.status === 'confirmed' && waitingMins >= WARNING_WAIT_MINUTES;
                    return (
                      <tr
                        key={pickup.id}
                        className={`border-b ${light ? 'border-gray-100 hover:bg-gray-50' : 'border-white/10 hover:bg-white/5'} transition-colors ${
                          isOver5Min ? (light ? 'bg-red-50' : 'bg-red-900/20') : ''
                        }`}
                      >
                        <td className={`py-3 xl:py-2 px-4 xl:px-3 font-bold ${cardTitle}`}>{index + 1}</td>
                        <td className={`py-3 xl:py-2 px-4 xl:px-3 ${cardTitle}`}>
                          <div>{pickup.student_name}</div>
                        
                        </td>
                        <td className="py-3 xl:py-2 px-4 xl:px-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-medium ${
                              pickup.status === 'confirmed'
                                ? light
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-green-500/30 text-green-200'
                                : pickup.status === 'pending'
                                ? light
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-amber-500/30 text-amber-200'
                                : light
                                ? 'bg-gray-100 text-gray-600'
                                : 'bg-white/10 text-gray-300'
                            }`}
                          >
                            {pickup.status === 'confirmed' && <MapPin className="h-4 w-4" />}
                            {getStatusLabel(pickup.status)}
                          </span>
                        </td>
                        <td className={`py-3 xl:py-2 px-4 xl:px-3 tabular-nums ${cardMeta}`}>
                          {pickup.request_time
                            ? new Date(pickup.request_time).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
                            : '—'}
                        </td>
                        <td className={`py-3 xl:py-2 px-4 xl:px-3 tabular-nums ${cardMeta}`}>
                          {pickup.confirmation_time
                            ? new Date(pickup.confirmation_time).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
                            : '—'}
                        </td>
                        <td className={`py-3 xl:py-2 px-4 xl:px-3 tabular-nums ${cardMeta}`}>
                          {pickup.status === 'confirmed'
                            ? `${waitingMins} د`
                            : pickup.status === 'completed' && pickup.completed_time
                            ? (() => {
                                const conf = new Date(pickup.confirmation_time).getTime();
                                const done = new Date(pickup.completed_time).getTime();
                                return `${Math.floor((done - conf) / 60000)} د`;
                              })()
                            : '—'}
                        </td>
                        <td className="py-3 xl:py-2 px-4 xl:px-3">
                          {isOver5Min ? (
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-bold ${light ? 'bg-red-100 text-red-700' : 'bg-red-500/40 text-red-200'}`}>
                              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                              أكثر من 5 دقائق
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Footer — compact on large */}
      <div className="mt-8 xl:mt-6 text-center">
        <div className={`inline-block backdrop-blur-md rounded-xl xl:rounded-lg px-4 py-2 xl:px-3 xl:py-1.5 border ${footerBg}`}>
          <p className={`text-lg xl:text-sm 2xl:text-base ${footerText}`}>
            نظام تتبع • نظام إدارة الحضور والغياب
          </p>
        </div>
      </div>

      {/* Custom Animations */}
      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
        }

        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }

        /* Auto-scroll for many students on large screens */
        @media (min-height: 900px) {
          .pickup-list-container {
            max-height: calc(100vh - 280px);
            overflow-y: auto;
            padding-left: 0.5rem;
          }

          .pickup-list-container::-webkit-scrollbar {
            width: 6px;
          }

          .pickup-list-container::-webkit-scrollbar-track {
            background: rgba(0, 0, 0, 0.06);
            border-radius: 10px;
          }

          .pickup-list-container::-webkit-scrollbar-thumb {
            background: rgba(0, 0, 0, 0.2);
            border-radius: 10px;
          }

          .pickup-list-container::-webkit-scrollbar-thumb:hover {
            background: rgba(0, 0, 0, 0.35);
          }
        }
      `}</style>
      </div>
    </div>
  );
};

export default PickupDisplay;
