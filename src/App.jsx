import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, ChevronLeft, PieChart, CreditCard,
  Trash2, Edit3, FileText, ChevronRight, Check, User, Award, LogOut,
  Star, ShieldCheck, Users, Zap, BarChart3, TrendingUp, DollarSign
} from 'lucide-react';

// --- НАЧАЛЬНЫЕ ДАННЫЕ ---
const INITIAL_SUBS = [];

const COLORS = ['bg-red-600', 'bg-blue-600', 'bg-green-500', 'bg-purple-600', 'bg-yellow-500', 'bg-pink-500', 'bg-teal-500', 'bg-orange-500'];
const CATEGORIES = ['Entertainment', 'Work', 'Shopping', 'Productivity', 'Education', 'Health', 'Gaming', 'Utilities', 'News', 'Music', 'Software', 'Storage', 'Lifestyle', 'Personal'];

const CANCELATION_LINKS = {
  'Netflix': 'https://www.netflix.com/cancelplan',
  'Spotify': 'https://www.spotify.com/account/subscription/',
  'YouTube': 'https://www.youtube.com/paid_memberships',
  'Telegram': 'https://telegram.org/faq#telegram-premium',
  'Disney+': 'https://www.disneyplus.com/account/subscription',
  'Hulu': 'https://help.hulu.com/s/article/cancel-hulu-subscription',
  'Prime Video': 'https://www.amazon.com/gp/video/settings/your-ad-preferences',
  'Amazon Prime': 'https://www.amazon.com/mc/manage',
  'Apple Music': 'https://support.apple.com/en-us/HT202039',
  'iCloud': 'https://support.apple.com/en-us/HT202039',
};

// --- MOCK DATA ДЛЯ АДМИНКИ ---
const MOCK_USERS = [
  { id: 1, name: 'Ivan Ivanov', username: '@ivan_dev', status: 'Pro', joined: '2026-02-15', avatar: 'bg-indigo-500' },
  { id: 2, name: 'Alice Smith', username: '@alice_s', status: 'Free', joined: '2026-02-20', avatar: 'bg-pink-500' },
  { id: 3, name: 'Sergey Petrov', username: '@sergep', status: 'Pro', joined: '2026-02-28', avatar: 'bg-green-500' },
  { id: 4, name: 'Elena Kor', username: '@el_kor', status: 'Free', joined: '2026-03-01', avatar: 'bg-yellow-500' },
];

const ADMIN_STATS = {
  totalRevenue: 12450,
  activeUsers: 1420,
  proUsers: 342,
  avgSpend: 42.50,
  predictedRevenue: 15800
};

const INITIAL_AUDIT_LOG = [
  { id: 1, action: 'Ivan Ivanvov joined Pro', time: '2 mins ago', type: 'subscription' },
  { id: 2, action: 'System updated to v2.4', time: '1 hour ago', type: 'system' },
  { id: 3, action: 'New broadcast sent', time: '3 hours ago', type: 'admin' },
];

// --- ВСПОМОГАТЕЛЬНЫЕ КОМПОНЕНТЫ ---
const StarsDisplay = ({ balance }) => (
  <div className="flex items-center gap-1.5 bg-amber-400/10 text-amber-500 px-2 py-0.5 rounded-full border border-amber-500/10">
    <Star size={10} fill="currentColor" />
    <span className="leading-none">{balance}</span>
  </div>
);

const Sparkline = ({ color }) => {
  // Генерация случайных точек для мини-графика
  const points = Array.from({ length: 6 }, (_, i) => `${i * 10},${20 + Math.random() * 20}`).join(' ');
  return (
    <svg className="w-16 h-8 opacity-40" viewBox="0 0 50 50">
      <polyline
        fill="none"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
};


const GrainFilter = () => (
  <svg className="hidden">
    <filter id="grainFilter">
      <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
      <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.4 0" />
      <feComposite operator="in" in2="SourceGraphic" />
    </filter>
  </svg>
);

// --- UTILITIES ---
const API_BASE = 'http://localhost:3001/api/v1';

const cloud = {
  get: async (key) => {
    try {
      // For Demo: Use localStorage if no backend is specified
      // In Production: Always use backend
      const initData = window.Telegram?.WebApp?.initData || '';
      const response = await fetch(`${API_BASE}/user/init`, {
        headers: { 'x-telegram-init-data': initData }
      });
      if (response.ok) {
        const data = await response.json();
        if (key === 'user_subscriptions') return JSON.stringify(data.subscriptions);
        if (key === 'is_pro') return data.isPro.toString();
        if (key === 'stars_balance') return data.starsBalance.toString();
        return null;
      }
    } catch (e) {
      console.warn("Backend not available, falling back to localStorage");
    }
    return localStorage.getItem(key);
  },
  set: async (key, value) => {
    localStorage.setItem(key, value);
    if (key === 'user_subscriptions') {
      try {
        const initData = window.Telegram?.WebApp?.initData || '';
        await fetch(`${API_BASE}/user/subs`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-telegram-init-data': initData
          },
          body: JSON.stringify({ subs: JSON.parse(value) })
        });
      } catch (e) {
        console.warn("Failed to sync with backend");
      }
    }
    return true;
  }
};

export default function App() {
  // --- СОСТОЯНИЯ (STATE) ---
  const [subs, setSubs] = useState(INITIAL_SUBS);
  const [activeScreen, setActiveScreen] = useState('dashboard');
  const [selectedSub, setSelectedSub] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isPro, setIsPro] = useState(false);
  // ВНИМАНИЕ: Замените 'YOUR_TELEGRAM_ID' на ваш реальный ID из Telegram, чтобы только вы видели админку
  const ADMIN_IDS = [123456789, 987654321]; // Сюда можно добавить список ID админов
  const [isAdmin, setIsAdmin] = useState(false);
  const [starsBalance, setStarsBalance] = useState(150);
  const [hasJoinedChannel, setHasJoinedChannel] = useState(false);
  const [proExpiration, setProExpiration] = useState(null);
  const [showLimitModal, setShowLimitModal] = useState(false);

  // Advanced Admin States
  const [auditLog, setAuditLog] = useState(INITIAL_AUDIT_LOG);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [activeBroadcast, setActiveBroadcast] = useState(null);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userFilter, setUserFilter] = useState('All');
  const [promoCodes, setPromoCodes] = useState([]);
  const [promoInput, setPromoInput] = useState('');
  const [promoForm, setPromoForm] = useState({ days: 30, maxUses: 10 });

  const [formData, setFormData] = useState({ name: '', price: '', date: '', cycle: 'Monthly', color: COLORS[0], category: CATEGORIES[0] });

  // --- HELPERS ---
  const bonusDays = 7;
  const getCancelLink = (name) => {
    if (!name) return null;
    const searchName = name.toLowerCase();
    const serviceMatch = Object.keys(CANCELATION_LINKS).find(service =>
      searchName.includes(service.toLowerCase())
    );
    return serviceMatch ? CANCELATION_LINKS[serviceMatch] : null;
  };

  useEffect(() => {
    const loadData = async () => {
      const savedSubs = await cloud.get('user_subscriptions');
      // Если подписок в базе нет или они пустые - оставляем пустой INITIAL_SUBS ([])
      if (savedSubs && savedSubs !== '[]') {
        try {
          setSubs(JSON.parse(savedSubs));
        } catch (e) {
          console.error("Failed to parse subs", e);
        }
      }

      const savedPro = await cloud.get('is_pro');
      if (savedPro === 'true') setIsPro(true);

      const savedStars = await cloud.get('stars_balance');
      if (savedStars) setStarsBalance(parseInt(savedStars));

      const savedJoined = await cloud.get('has_joined_channel');
      if (savedJoined === 'true') setHasJoinedChannel(true);

      const savedExp = await cloud.get('pro_expiration');
      if (savedExp) setProExpiration(savedExp);

      const savedBroadcast = await cloud.get('active_broadcast');
      if (savedBroadcast) setActiveBroadcast(JSON.parse(savedBroadcast));

      const savedPromoCodes = await cloud.get('promo_codes');
      if (savedPromoCodes) setPromoCodes(JSON.parse(savedPromoCodes));

      // Проверка на админа (по TG ID)
      const user = window.Telegram?.WebApp?.initDataUnsafe?.user;
      if (user && ADMIN_IDS.includes(user.id)) {
        setIsAdmin(true);
      }
    };

    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.setHeaderColor(isDarkMode ? '#111827' : '#f9fafb');
      loadData();
    }
  }, [isDarkMode]);

  // Сохранение в облако при изменении
  useEffect(() => {
    cloud.set('user_subscriptions', JSON.stringify(subs));
  }, [subs]);

  useEffect(() => {
    cloud.set('is_pro', isPro.toString());
  }, [isPro]);

  useEffect(() => {
    cloud.set('stars_balance', starsBalance.toString());
  }, [starsBalance]);

  useEffect(() => {
    cloud.set('has_joined_channel', hasJoinedChannel.toString());
  }, [hasJoinedChannel]);

  useEffect(() => {
    if (proExpiration) cloud.set('pro_expiration', proExpiration);
  }, [proExpiration]);

  useEffect(() => {
    cloud.set('promo_codes', JSON.stringify(promoCodes));
  }, [promoCodes]);

  const addAuditLog = (action, type = 'user') => {
    const newEntry = { id: Date.now(), action, time: 'Just now', type };
    setAuditLog([newEntry, ...auditLog.slice(0, 9)]);
  };

  const isActuallyPro = isPro || (proExpiration && new Date(proExpiration) > new Date());

  const totalSpend = subs.reduce((acc, sub) => acc + Number(sub.price), 0).toFixed(2);

  const navigate = (screen, data = null) => {
    if (screen === 'new') {
      setFormData({ name: '', price: '', date: '2026-04-01', cycle: 'Monthly', color: COLORS[0], category: CATEGORIES[0] });
    } else if (screen === 'edit' && data) {
      setFormData(data);
    }
    setSelectedSub(data);
    setActiveScreen(screen);

    // Закрываем главное меню Telegram если оно было открыто
    if (window.Telegram?.WebApp?.MainButton) {
      window.Telegram.WebApp.MainButton.hide();
    }
  };

  const handleStarsPayment = (amount = 50) => {
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.showConfirm(`Confirm payment of ${amount} Stars for Pro access?`, (confirmed) => {
        if (confirmed) {
          setIsPro(true);
          setStarsBalance(prev => prev - amount);
          addAuditLog(`User upgraded to Pro (${amount} Stars)`, 'subscription');
          window.Telegram.WebApp.showAlert("Welcome to Pro 🚀 All features are now unlocked!");
        }
      });
    } else {
      alert("Payment successful! (Simulated)");
      setIsPro(true);
    }
  };

  const handleJoinChannel = () => {
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.showConfirm("Join our channel to get 7 days of PRO status?", (confirmed) => {
        if (confirmed) {
          // Имитируем переход и получение бонуса
          const expDate = new Date();
          expDate.setDate(expDate.getDate() + bonusDays);
          setProExpiration(expDate.toISOString());
          setHasJoinedChannel(true);
          addAuditLog(`User claimed ${bonusDays}-day bonus`, 'promo');
          window.Telegram.WebApp.showAlert(`Bonus activated! You have ${bonusDays} days of Pro status. 🎉`);
          // window.Telegram.WebApp.openTelegramLink("https://t.me/your_channel");
        }
      });
    }
  };

  const handleSaveSub = (e) => {
    e.preventDefault();

    // Лимит для бесплатных пользователей
    if (!isActuallyPro && subs.length >= 3 && activeScreen !== 'edit') {
      setShowLimitModal(true);
      return;
    }

    const newSubData = {
      ...formData,
      price: parseFloat(formData.price) || 0,
      initial: formData.name ? formData.name.charAt(0).toUpperCase() : 'S'
    };

    if (activeScreen === 'edit') {
      setSubs(subs.map(s => s.id === formData.id ? newSubData : s));
      addAuditLog(`Refined subscription: ${newSubData.name}`, 'user');
    } else {
      setSubs([...subs, { ...newSubData, id: Date.now() }]);
      addAuditLog(`Added new subscription: ${newSubData.name}`, 'user');
    }
    navigate('dashboard');
  };

  const handleSendBroadcast = () => {
    if (!broadcastMessage.trim()) return;
    const broadcast = {
      id: Date.now(),
      text: broadcastMessage,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setActiveBroadcast(broadcast);
    cloud.set('active_broadcast', JSON.stringify(broadcast));
    addAuditLog(`Global broadcast sent: ${broadcastMessage.substring(0, 20)}...`, 'admin');
    setBroadcastMessage('');
    window.Telegram.WebApp.showAlert("Broadcast message sent to all users! 📩");
  };

  const filteredUsers = MOCK_USERS.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      user.username.toLowerCase().includes(userSearchQuery.toLowerCase());
    const matchesFilter = userFilter === 'All' || user.status === userFilter;
    return matchesSearch && matchesFilter;
  });

  const handleGeneratePromo = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));

    const newPromo = {
      id: Date.now(),
      code,
      days: promoForm.days,
      maxUses: promoForm.maxUses,
      uses: 0
    };

    setPromoCodes([newPromo, ...promoCodes]);
    addAuditLog(`Generated promo code: ${code} (${promoForm.days} days)`, 'admin');
    window.Telegram.WebApp.showAlert(`Promo code ${code} generated!`);
  };

  const handleRedeemPromo = () => {
    const codeToRedeem = promoInput.trim().toUpperCase();
    const foundCode = promoCodes.find(c => c.code === codeToRedeem);

    if (!foundCode) {
      window.Telegram.WebApp.showAlert("Invalid promo code!");
      return;
    }

    if (foundCode.uses >= foundCode.maxUses) {
      window.Telegram.WebApp.showAlert("This promo code has reached its maximum uses!");
      return;
    }

    // Grant Pro status
    const expDate = new Date();
    expDate.setDate(expDate.getDate() + foundCode.days);
    setProExpiration(expDate.toISOString());
    setIsPro(true);

    // Update usage
    setPromoCodes(promoCodes.map(c =>
      c.code === codeToRedeem ? { ...c, uses: c.uses + 1 } : c
    ));

    setPromoInput('');
    addAuditLog(`User redeemed promo code: ${codeToRedeem}`, 'promo');
    window.Telegram.WebApp.showAlert(`Success! You've received ${foundCode.days} days of Pro status! 🚀`);
  };

  const handleDelete = (id) => {
    setSubs(subs.filter(s => s.id !== id));
    navigate('dashboard');
  };

  // --- АНИМАЦИИ ---
  const pageTransition = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, x: -20, transition: { duration: 0.2 } }
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 font-sans ${isDarkMode ? 'bg-black text-white' : 'bg-white text-black'} overflow-x-hidden max-w-md mx-auto relative`}>
      <GrainFilter />
      <AnimatePresence mode="wait">

        {/* ==================== 1. DASHBOARD ==================== */}
        {activeScreen === 'dashboard' && (
          <motion.div key="dashboard" {...pageTransition} className="p-5 pb-24 h-screen overflow-y-auto">

            {/* Header: Теперь с Аватаркой, Балансом Звезд и Админкой */}
            <header className="flex justify-between items-center mb-6 mt-2 px-1">
              <div className="flex items-center gap-3">
                <button onClick={() => navigate('profile')} className={`w-11 h-11 rounded-full flex items-center justify-center font-bold transition-transform active:scale-95 border ${isDarkMode ? 'bg-black text-white border-white/20' : 'bg-white text-black border-black/10'}`}>
                  {isPro ? <ShieldCheck size={20} className="text-amber-500" /> : <User size={20} />}
                </button>
                <div className="flex flex-col">
                  <h1 className="text-2xl logo-subzero animate-lightning tracking-tighter">SubZero</h1>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${isActuallyPro ? 'text-amber-500' : 'opacity-40'}`}>
                    {isActuallyPro ? 'Pro Level' : 'Free Level'}
                  </span>
                </div>
              </div>
              {/* Dashboard Controls */}
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => navigate('analytics')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold border transition-all active:scale-95 ${isDarkMode ? 'bg-black border-white/20 text-white hover:border-white/40' : 'bg-white border-black/10 text-black shadow-sm'}`}
                >
                  <PieChart size={18} />
                  Analytics
                </button>
                <button
                  onClick={() => navigate('new')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold border transition-all active:scale-95 ${isDarkMode ? 'bg-white text-black border-black' : 'bg-black text-white border-black'}`}
                >
                  <Plus size={18} />
                  Add New
                </button>
              </div>
            </header>

            {/* Глобальное объявление (Broadcast) */}
            {activeBroadcast && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`border rounded-2xl p-4 mb-6 relative overflow-hidden ${isDarkMode ? 'bg-black border-white/20' : 'bg-white border-black/10 shadow-sm'}`}
              >
                <div className="flex items-start gap-3 relative z-10">
                  <div className="p-2 bg-amber-500 text-white rounded-xl shadow-lg shadow-amber-500/20">
                    <Zap size={16} fill="currentColor" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">System Notification</span>
                      <span className="text-[9px] opacity-40 font-bold">{activeBroadcast.time}</span>
                    </div>
                    <p className="text-xs font-bold leading-relaxed">{activeBroadcast.text}</p>
                  </div>
                  <button onClick={() => setActiveBroadcast(null)} className="opacity-40 hover:opacity-100 transition-opacity p-1">
                    <Plus size={14} className="rotate-45" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Карточка суммы */}
            <div className={`rounded-[32px] p-7 mb-8 shadow-sm border shimmer-effect glass-volumetric ${isDarkMode ? 'bg-white/5 border-white/10 shadow-notion-dark' : 'bg-white/40 border-white/60 shadow-notion-light'}`}>
              <div className="flex justify-between items-start mb-4">
                <CreditCard size={24} className="opacity-50" />
                <span className="text-xs font-bold tracking-widest opacity-50">SUBZERO CARD</span>
              </div>
              <p className="text-sm font-medium opacity-60 mb-1">Total Monthly Spend</p>
              <h2 className="text-5xl font-black mb-8">${totalSpend}</h2>
            </div>


            {/* СПИСОК APPLE WALLET */}
            <div className="flex justify-between items-center mb-4 z-10 relative px-1">
              <h3 className="font-bold text-lg">Your Subscriptions</h3>
              <span className="text-xs opacity-50 font-medium bg-gray-500/10 px-3 py-1 rounded-full">{subs.length} active</span>
            </div>

            <div className="relative pb-32">
              {subs.length === 0 && <p className="text-center opacity-50 mt-10">No subscriptions yet.</p>}

              {subs.map((sub, i) => (
                <motion.div
                  key={sub.id}
                  layoutId={`card-${sub.id}`}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate('details', sub)}
                  style={{
                    marginTop: i === 0 ? '0' : '-65px',
                    zIndex: i,
                    position: 'relative'
                  }}
                  className={`${sub.color} bg-opacity-60 backdrop-blur-xl h-44 rounded-[32px] p-6 glass-card relative flex flex-col justify-between cursor-pointer text-white overflow-hidden group active:scale-95 transition-all border border-white/20`}
                >
                  <div className="grain-overlay opacity-[0.08]" />

                  <div className="flex justify-between items-start relative z-10">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center font-bold text-2xl shadow-sm border border-white/20">{sub.initial}</div>
                      <div className="flex flex-col">
                        <span className="font-extrabold text-xl tracking-tight text-shadow-sm">{sub.name}</span>
                        <span className="text-[10px] opacity-60 font-bold uppercase tracking-widest">{sub.category}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="font-black text-2xl text-shadow-sm">${sub.price}</span>
                      <Sparkline color={sub.color} />
                    </div>
                  </div>

                  <div className="flex justify-between items-end relative z-10">
                    <div className="flex flex-col">
                      <p className="text-[10px] opacity-50 font-bold uppercase tracking-widest mb-1">Next Payment</p>
                      <p className="text-sm font-bold text-shadow-sm">{sub.date}</p>
                    </div>
                    <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center border border-white/10 group-hover:bg-white/20 transition-colors">
                      <ChevronRight size={20} />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

          </motion.div>
        )}

        {/* ==================== 2. DETAILS ==================== */}
        {activeScreen === 'details' && selectedSub && (
          <motion.div key="details" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-5 h-screen flex flex-col relative z-20">
            <header className="flex items-center justify-between mb-8 mt-2">
              <button onClick={() => navigate('dashboard')} className="p-2"><ChevronLeft size={28} /></button>
              <h1 className="text-lg font-bold">Details</h1>
              <div className="w-10"></div>
            </header>

            <motion.div layoutId={`card-${selectedSub.id}`} className={`${selectedSub.color} bg-opacity-40 backdrop-blur-2xl rounded-[40px] p-10 glass-card relative flex flex-col items-center mb-8 text-white overflow-hidden shadow-2xl border border-white/30`}>
              <div className="grain-overlay opacity-[0.1]" />
              <div className="w-24 h-24 bg-white/20 backdrop-blur-md rounded-[32px] flex items-center justify-center text-5xl font-black mb-6 shadow-sm border border-white/20 relative z-10">{selectedSub.initial}</div>
              <h2 className="text-4xl font-black mb-2 text-shadow-sm relative z-10">{selectedSub.name}</h2>
              <p className="text-lg font-medium opacity-80 text-shadow-sm relative z-10">${selectedSub.price} / {selectedSub.cycle}</p>
            </motion.div>

            <div className={`p-5 rounded-2xl flex justify-between items-center mb-6 border shadow-premium ${isDarkMode ? 'bg-black border-white/10' : 'bg-white border-black/5'}`}>
              <span className="opacity-60 font-medium">Next Billing</span>
              <span className="font-bold">{selectedSub.date}</span>
            </div>

            {/* MANAGEMENT & CANCELLATION */}
            <div className={`p-6 rounded-[32px] mb-8 border transition-all shadow-premium ${isDarkMode ? 'bg-black border-white/10' : 'bg-white border-black/5'}`}>
              <p className="text-[10px] font-black tracking-widest uppercase opacity-40 mb-4 px-1">Management & Cancellation</p>

              {(() => {
                const cancelLink = getCancelLink(selectedSub.name);
                if (cancelLink) {
                  return (
                    <div className="space-y-4">
                      <p className="text-[11px] font-medium opacity-60 leading-relaxed px-1"> We found a direct link to manage your <b>{selectedSub.name}</b> subscription. </p>
                      <button
                        onClick={() => window.Telegram?.WebApp?.openLink(cancelLink)}
                        className={`w-full font-bold py-3 rounded-xl active:scale-95 transition-all flex items-center justify-center gap-2 border ${isDarkMode ? 'bg-white text-black border-white' : 'bg-black text-white border-black'}`}
                      >
                        Open Cancellation Page
                      </button>
                    </div>
                  );
                }
                return (
                  <div className="space-y-4">
                    <p className="text-[11px] font-medium opacity-60 leading-relaxed px-1"> To cancel this subscription, check the official app settings or website. Common methods: </p>
                    <div className="grid grid-cols-1 gap-2">
                      <div className={`flex items-center gap-3 p-3 rounded-xl border ${isDarkMode ? 'bg-black border-white/10' : 'bg-white border-black/5'}`}>
                        <div className="p-1.5 bg-blue-500/10 text-blue-500 rounded-lg"><User size={14} /></div>
                        <div className="text-[10px] font-bold">App Store / Google Play Subscriptions</div>
                      </div>
                      <div className={`flex items-center gap-3 p-3 rounded-xl border ${isDarkMode ? 'bg-black border-white/10' : 'bg-white border-black/5'}`}>
                        <div className="p-1.5 bg-amber-500/10 text-amber-500 rounded-lg"><CreditCard size={14} /></div>
                        <div className="text-[10px] font-bold">Official Website Billing Portal</div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="space-y-4 mt-auto pb-10">
              <button onClick={() => handleDelete(selectedSub.id)} className="w-full bg-red-500/10 text-red-500 font-bold py-4 rounded-xl flex justify-center items-center gap-2 hover:bg-red-500/20 active:scale-95 transition-all">
                <Trash2 size={20} /> Cancel Subscription
              </button>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => navigate('edit', selectedSub)} className={`font-bold py-4 rounded-xl flex justify-center items-center gap-2 active:scale-95 transition-all border ${isDarkMode ? 'bg-white text-black border-white' : 'bg-black text-white border-black'}`}><Edit3 size={18} /> Edit</button>
                <button onClick={() => handleDelete(selectedSub.id)} className={`font-bold py-4 rounded-xl active:scale-95 transition-all ${isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-200 text-gray-600'}`}>Delete</button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ==================== 3. NEW / EDIT SUBSCRIPTION ==================== */}
        {(activeScreen === 'new' || activeScreen === 'edit') && (
          <motion.div key="form" {...pageTransition} className="p-5 h-screen overflow-y-auto">
            <header className="flex items-center justify-between mb-8 mt-2">
              <button onClick={() => navigate('dashboard')} className="p-2"><ChevronLeft size={28} /></button>
              <h1 className="text-lg font-bold">{activeScreen === 'new' ? 'New Subscription' : 'Edit Subscription'}</h1>
              <div className="w-10"></div>
            </header>

            <form onSubmit={handleSaveSub} className={`rounded-[32px] p-6 space-y-6 border shadow-premium ${isDarkMode ? 'bg-black border-white/10' : 'bg-white border-black/5'}`}>
              <div className="flex items-center gap-6">
                <div className={`w-20 h-20 rounded-[24px] shadow-sm border ${formData.color || 'bg-teal-500'} flex items-center justify-center text-3xl font-black text-white`}>
                  {(formData.name || 'S').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <label className="text-xs opacity-50 mb-1 block uppercase font-bold tracking-wider">Service Name</label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-transparent text-xl font-bold outline-none border-b border-gray-500/30 pb-2 focus:border-teal-500 transition-colors" placeholder="e.g. Spotify" />
                </div>
              </div>

              <div>
                <label className="text-xs opacity-50 mb-2 block">Category</label>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {CATEGORIES.map(cat => (
                    <button type="button" key={cat} onClick={() => setFormData({ ...formData, category: cat })} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors border ${formData.category === cat ? (isDarkMode ? 'bg-white text-black border-white' : 'bg-black text-white border-black') : (isDarkMode ? 'bg-black border-white/10 text-white/60' : 'bg-white border-black/5 text-black/60')}`}>
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs opacity-50 mb-2 block">Card Color</label>
                <div className="flex flex-wrap gap-3">
                  {COLORS.map(color => (
                    <button type="button" key={color} onClick={() => setFormData({ ...formData, color })} className={`w-8 h-8 rounded-full ${color} flex items-center justify-center transition-transform ${formData.color === color ? 'scale-125 ring-2 ring-offset-2 ring-teal-500 dark:ring-offset-gray-800' : ''}`}>
                      {formData.color === color && <Check size={14} className="text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs opacity-50 mb-1 block">Price ($)</label>
                  <input required type="number" step="0.01" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} className="w-full bg-transparent text-xl font-bold outline-none border-b border-gray-500/30 pb-2 focus:border-teal-500" placeholder="0.00" />
                </div>
                <div>
                  <label className="text-xs opacity-50 mb-1 block">Billing Date</label>
                  <input required type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className={`w-full bg-transparent text-lg font-medium outline-none border-b border-gray-500/30 pb-2 focus:border-teal-500 ${isDarkMode ? '[color-scheme:dark]' : ''}`} />
                </div>
              </div>

              <button type="submit" className={`w-full font-bold py-4 rounded-xl mt-6 active:scale-95 transition-transform border ${isDarkMode ? 'bg-white text-black border-white' : 'bg-black text-white border-black'}`}>
                {activeScreen === 'new' ? 'Add Subscription' : 'Save Changes'}
              </button>
            </form>
          </motion.div>
        )}

        {/* ==================== 4. ANALYTICS ==================== */}
        {activeScreen === 'analytics' && (() => {
          const yearlyForecast = totalSpend * 12;
          const monthlyCount = subs.filter(s => s.cycle === 'Monthly').length;
          const yearlyCount = subs.filter(s => s.cycle === 'Yearly').length;

          const sortedByDate = [...subs].sort((a, b) => new Date(a.date) - new Date(b.date));
          const upcoming = sortedByDate.slice(0, 3);

          const topExpense = subs.length > 0 ? [...subs].sort((a, b) => Number(b.price) - Number(a.price))[0] : null;
          const topExpensePercent = topExpense ? ((Number(topExpense.price) / totalSpend) * 100).toFixed(0) : 0;

          return (
            <motion.div key="analytics" {...pageTransition} className="p-5 h-screen overflow-y-auto pb-24 relative">
              <header className="flex items-center justify-between mb-8 mt-2">
                <button onClick={() => navigate('dashboard')} className="p-2"><ChevronLeft size={28} /></button>
                <h1 className="text-lg font-bold">Analytics</h1>
                <div className="w-10"></div>
              </header>

              {!isActuallyPro ? (
                /* PAYWALL VIEW */
                <div className="flex flex-col items-center justify-center pt-8">
                  <div className={`w-full max-w-sm rounded-[40px] p-8 border flex flex-col items-center text-center transition-all ${isDarkMode ? 'bg-black border-white/10' : 'bg-white border-black/5 shadow-sm'}`}>
                    <div className="w-20 h-20 bg-amber-500/20 text-amber-500 rounded-[28px] flex items-center justify-center mb-6 border border-amber-500/20">
                      <ShieldCheck size={40} />
                    </div>
                    <h2 className="text-2xl font-black mb-3">Unlock Premium Analytics</h2>
                    <p className="text-xs font-bold opacity-50 uppercase tracking-widest leading-relaxed mb-8">
                      Track yearly forecasts, detailed spending trends and get smart savings insights with PRO.
                    </p>

                    <div className="w-full space-y-3">
                      <button onClick={() => handleStarsPayment(99)} className="w-full flex items-center justify-center gap-2 gold-premium font-bold py-4 rounded-2xl active:scale-95 transition-all">
                        <Star size={18} fill="currentColor" /> Upgrade to Pro for 99 Stars
                      </button>
                      {!hasJoinedChannel && (
                        <button onClick={handleJoinChannel} className={`w-full flex items-center justify-center gap-2 font-bold py-4 rounded-2xl active:scale-95 transition-all border ${isDarkMode ? 'bg-white text-black border-white' : 'bg-black text-white border-black shadow-lg'}`}>
                          <Zap size={18} fill="currentColor" /> Claim 7-Day Bonus
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Blurry Preview Background */}
                  <div className="absolute top-48 left-0 right-0 p-8 -z-10 opacity-10 pointer-events-none filter blur-md">
                    <div className="h-40 bg-gray-500 rounded-3xl mb-4" />
                    <div className="grid grid-cols-2 gap-4">
                      <div className="h-24 bg-gray-500 rounded-2xl" />
                      <div className="h-24 bg-gray-500 rounded-2xl" />
                    </div>
                  </div>
                </div>
              ) : (
                /* FULL ANALYTICS VIEW */
                <>
                  {/* 1. YEARLY FORECAST CARD */}
                  <div className={`rounded-[32px] p-7 mb-6 border relative overflow-hidden transition-all ${isDarkMode ? 'bg-black border-white/10' : 'bg-white border-black/5 shadow-sm'}`}>
                    <div className="flex items-center justify-between mb-4 relative z-10">
                      <div className={`flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-black'}`}>
                        <TrendingUp size={16} /> <span className="text-[10px] font-black uppercase tracking-widest">Yearly Forecast</span>
                      </div>
                    </div>
                    <h2 className="text-4xl font-black mb-2 relative z-10">${yearlyForecast.toLocaleString()}</h2>
                    <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest relative z-10">Estimated annual spending</p>
                  </div>

                  {/* 2. UPCOMING TIMELINE */}
                  <div className="mb-6">
                    <p className="text-[10px] font-black tracking-widest uppercase opacity-40 mb-3 px-2">Upcoming Timeline</p>
                    <div className="flex gap-3 overflow-x-auto pb-2 px-1 scrollbar-hide">
                      {upcoming.map(item => (
                        <div key={item.id} className={`min-w-[120px] p-4 rounded-2xl border shrink-0 transition-all ${isDarkMode ? 'bg-black border-white/10' : 'bg-white border-black/5 shadow-sm'}`}>
                          <div className={`w-8 h-8 ${item.color} rounded-lg flex items-center justify-center text-white font-black text-xs mb-3`}>{item.initial}</div>
                          <div className="text-[10px] font-black uppercase tracking-tight truncate mb-1">{item.name}</div>
                          <div className="text-[9px] opacity-40 font-bold">{new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 3. CYCLE DISTRIBUTION */}
                  <div className={`rounded-[32px] p-6 mb-6 border transition-all ${isDarkMode ? 'bg-black border-white/10' : 'bg-white border-black/5 shadow-sm'}`}>
                    <p className="text-[10px] font-black tracking-widest uppercase opacity-40 mb-4 px-1">Cycle Distribution</p>
                    <div className="flex flex-col gap-4">
                      <div>
                        <div className="flex justify-between text-[11px] font-bold mb-2">
                          <span>Monthly Payments</span>
                          <span>{monthlyCount} ({((monthlyCount / (subs.length || 1)) * 100).toFixed(0)}%)</span>
                        </div>
                        <div className={`h-1.5 w-full ${isDarkMode ? 'bg-gray-500/10' : 'bg-gray-100'} rounded-full overflow-hidden`}>
                          <motion.div initial={{ width: 0 }} animate={{ width: `${(monthlyCount / (subs.length || 1)) * 100}%` }} className={`h-full ${isDarkMode ? 'bg-white' : 'bg-black'}`} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[11px] font-bold mb-2">
                          <span>Yearly Payments</span>
                          <span>{yearlyCount} ({((yearlyCount / (subs.length || 1)) * 100).toFixed(0)}%)</span>
                        </div>
                        <div className="h-1.5 w-full bg-gray-500/10 rounded-full overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${(yearlyCount / (subs.length || 1)) * 100}%` }} className="h-full bg-amber-500" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 4. TOP EXPENSE HIGHLIGHT */}
                  {topExpense && (
                    <div className={`rounded-[32px] p-6 mb-6 border relative overflow-hidden transition-all ${isDarkMode ? 'bg-black border-white/10' : 'bg-white border-black/5 shadow-sm'}`}>
                      <div className="flex justify-between items-start mb-4">
                        <p className="text-red-500 text-[10px] font-black tracking-widest uppercase px-1">Top Expense</p>
                        <div className="bg-red-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase">{topExpensePercent}% of total</div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 ${topExpense.color} rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-lg`}>{topExpense.initial}</div>
                        <div>
                          <div className="text-xl font-black">{topExpense.name}</div>
                          <div className="text-sm font-bold opacity-40">${topExpense.price} per month</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 5. SMART SAVINGS INSIGHTS */}
                  <div className={`rounded-[32px] p-6 mb-6 border transition-all ${isDarkMode ? 'bg-black border-white/10' : 'bg-white border-black/5 shadow-sm'}`}>
                    <p className="text-[10px] font-black tracking-widest uppercase opacity-40 mb-4 px-1">Smart Savings Insights</p>
                    <div className="space-y-4">
                      <div className="flex gap-3">
                        <div className={`w-8 h-8 rounded-xl ${isDarkMode ? 'bg-white/10 text-white' : 'bg-black/5 text-black'} flex items-center justify-center shrink-0`}>
                          <Star size={14} fill="currentColor" />
                        </div>
                        <div>
                          <div className="text-[11px] font-bold">Annual Optimization</div>
                          <p className="text-[9px] opacity-50 font-medium leading-tight">Switching {topExpense?.name || 'top items'} to annual plans could save you ~15% yearly.</p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                          <Zap size={14} fill="currentColor" />
                        </div>
                        <div>
                          <div className="text-[11px] font-bold">Subscription Saturation</div>
                          <p className="text-[9px] opacity-50 font-medium leading-tight">You have {subs.filter(s => s.category === 'Entertainment').length} Entertainment items. Consider bundling.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ORIGINAL CATEGORY CHART */}
                  <div className={`rounded-[32px] p-6 mb-6 border transition-all ${isDarkMode ? 'bg-black border-white/10' : 'bg-white border-black/5 shadow-sm'}`}>
                    <h3 className="text-center font-bold opacity-40 mb-8 uppercase text-[10px] tracking-widest">Spending by Category</h3>

                    <div className="space-y-4">
                      {CATEGORIES.map(cat => {
                        const catTotal = subs.filter(s => s.category === cat).reduce((sum, s) => sum + Number(s.price), 0);
                        const percentage = totalSpend > 0 ? ((catTotal / totalSpend) * 100).toFixed(1) : 0;
                        if (catTotal === 0) return null;
                        return (
                          <div key={cat} className="mb-4">
                            <div className="flex justify-between items-end mb-2">
                              <span className="font-bold text-sm">{cat}</span>
                              <div className="text-right"><span className="opacity-40 text-[10px] font-bold mr-2 uppercase tracking-tighter">{percentage}%</span><span className="font-black text-sm">${catTotal.toFixed(2)}</span></div>
                            </div>
                            <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDarkMode ? 'bg-gray-500/10' : 'bg-gray-100'}`}>
                              <motion.div initial={{ width: 0 }} animate={{ width: `${percentage}%` }} transition={{ duration: 0.5 }} className={`h-full ${isDarkMode ? 'bg-white' : 'bg-black'} rounded-full`}></motion.div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 6. PRO FEATURE: EXPORT REPORT */}
                  <button
                    onClick={() => {
                      if (isActuallyPro) {
                        window.Telegram.WebApp.showAlert("Generating PDF Report... \nDetailed spend analysis is being prepared! 📂");
                      } else {
                        setShowLimitModal(true);
                      }
                    }}
                    className={`w-full p-5 rounded-[24px] flex items-center justify-between group transition-all border shadow-sm ${isActuallyPro ? (isDarkMode ? 'bg-white text-black border-white' : 'bg-black text-white border-black') : (isDarkMode ? 'bg-black border-white/10 opacity-60 text-white' : 'bg-white border-black/10 opacity-60 text-black')}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${isActuallyPro ? 'bg-white/20' : 'bg-gray-500/10'}`}>
                        <FileText size={18} />
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-black uppercase tracking-tight">Export PDF Report</div>
                        <div className="text-[10px] font-bold opacity-60 uppercase tracking-widest">Full Spend Breakdown</div>
                      </div>
                    </div>
                    {!isActuallyPro ? <ShieldCheck size={18} className="text-amber-500" /> : <ChevronRight size={18} />}
                  </button>
                </>
              )}
            </motion.div>
          );
        })()}

        {/* ==================== 5. PROFILE & SETTINGS ==================== */}
        {activeScreen === 'profile' && (
          <motion.div key="profile" {...pageTransition} className="p-5 h-screen overflow-y-auto">
            <header className="flex items-center justify-between mb-6 mt-2">
              <button onClick={() => navigate('dashboard')} className="p-2"><ChevronLeft size={28} /></button>
              <h1 className="text-xl logo-subzero animate-lightning tracking-tighter">SubZero</h1>
              <div className="w-10"></div>
            </header>

            {/* Карточка Профиля */}
            <div className={`rounded-[32px] p-6 mb-8 flex flex-col items-center border ${isDarkMode ? 'bg-black border-white/10' : 'bg-white border-black/10 shadow-sm'}`}>
              <div className={`w-24 h-24 rounded-[28px] flex items-center justify-center mb-4 shadow-xl rotate-3 transition-transform hover:rotate-0 ${isActuallyPro ? 'gold-premium' : (isDarkMode ? 'bg-white text-black' : 'bg-black text-white')}`}>
                {isActuallyPro ? <Award size={40} /> : <User size={40} />}
              </div>
              <h2 className="text-2xl font-black mb-1">Supersaver Admin</h2>

              <div className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold mt-2 border ${isActuallyPro ? 'text-amber-500 bg-amber-500/10 border-amber-500/20 shadow-sm' : 'opacity-40 border-gray-500/20'}`}>
                {isActuallyPro ? 'Premium Pro Member' : 'Free Account'}
              </div>

              {/* Quick Feature Chips */}
              <div className="flex flex-wrap justify-center gap-2 mt-6 px-2">
                {['Smart Sync', 'Cloud Backup', 'Pro Analysis', 'Ad-Free', 'Priority IP'].map((feat) => (
                  <div key={feat} className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all ${isActuallyPro ? (isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-black/5 border-black/5 text-black') : 'opacity-20 border-gray-500/20'}`}>
                    {feat}
                  </div>
                ))}
              </div>

              <div className={`flex justify-between mt-6 text-[10px] font-bold uppercase tracking-widest px-1 ${isDarkMode ? 'opacity-60 text-white' : 'opacity-60 text-black'}`}>
                <span>Usage: {subs.length} / {isActuallyPro ? '∞' : '3'} items</span>
                {proExpiration && <span>Exp: {new Date(proExpiration).toLocaleDateString()}</span>}
              </div>

              {!isActuallyPro && (
                <div className="space-y-3 mt-6">
                  <button onClick={() => handleStarsPayment(99)} className="w-full flex items-center justify-center gap-2 gold-premium font-bold py-3.5 px-6 rounded-2xl active:scale-95 transition-all">
                    <Star size={18} fill="currentColor" /> Upgrade to Pro for 99 Stars
                  </button>
                  {!hasJoinedChannel && (
                    <button onClick={handleJoinChannel} className={`w-full flex items-center justify-center gap-2 font-bold py-3.5 px-6 rounded-2xl active:scale-95 transition-all border ${isDarkMode ? 'bg-white text-black border-white' : 'bg-black text-white border-black shadow-lg'}`}>
                      <Zap size={18} fill="currentColor" /> Claim 7-Day Bonus
                    </button>
                  )}

                  {/* Redeem Promo Code */}
                  <div className={`mt-4 p-4 rounded-2xl border ${isDarkMode ? 'bg-gray-700/30 border-gray-600' : 'bg-gray-100 border-gray-200'}`}>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="ENTER PROMO CODE"
                        value={promoInput}
                        onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                        className="bg-transparent border-b border-gray-500/30 outline-none text-xs font-black tracking-widest flex-1 py-1 focus:border-black dark:focus:border-white transition-colors"
                      />
                      <button
                        onClick={handleRedeemPromo}
                        className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase active:scale-95 transition-all ${isDarkMode ? 'bg-white text-black' : 'bg-black text-white'}`}
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {/* Настройки */}
            <div className="space-y-6">
              <div>
                <p className="opacity-40 text-xs font-bold tracking-widest mb-3 px-2">APPEARANCE</p>
                <div className={`rounded-2xl p-4 flex justify-between items-center border ${isDarkMode ? 'bg-black border-white/10' : 'bg-white border-black/5 shadow-sm'}`}>
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-white/10 text-white' : 'bg-black/5 text-black'}`}><FileText size={20} /></div>
                    <div><div className="font-bold">Dark Mode</div><div className="text-xs opacity-50">Toggle app theme</div></div>
                  </div>
                  <button onClick={() => setIsDarkMode(!isDarkMode)} className={`w-14 h-8 rounded-full p-1 transition-colors duration-300 ease-in-out ${isDarkMode ? 'bg-white' : 'bg-gray-300'}`}>
                    <motion.div layout className={`w-6 h-6 rounded-full shadow-md ${isDarkMode ? 'ml-6 bg-black' : 'ml-0 bg-white'}`}></motion.div>
                  </button>
                </div>
              </div>

              <div>
                <p className="opacity-40 text-xs font-bold tracking-widest mb-3 px-2">DATA MANAGEMENT</p>
                <div className={`rounded-2xl overflow-hidden border ${isDarkMode ? 'bg-black border-white/10' : 'bg-white border-black/5 shadow-sm'}`}>
                  <button onClick={() => { setSubs(INITIAL_SUBS); navigate('dashboard'); }} className="w-full p-4 flex items-center gap-4 text-left border-b border-gray-500/10 hover:bg-gray-500/5 transition-colors">
                    <div className={`p-2 rounded-lg border ${isDarkMode ? 'bg-black border-red-500/30 text-red-500' : 'bg-white border-red-500/20 text-red-600'}`}><Trash2 size={20} /></div>
                    <div><div className="font-bold text-red-500">Reset Data</div><div className="text-xs opacity-50">Restore default mock data</div></div>
                  </button>
                  <button className="w-full p-4 flex items-center gap-4 text-left hover:bg-gray-500/5 transition-colors">
                    <div className={`p-2 rounded-lg border ${isDarkMode ? 'bg-black border-gray-500/30 text-gray-500' : 'bg-white border-gray-500/20 text-gray-600'}`}><LogOut size={20} /></div>
                    <div><div className="font-bold text-gray-500">Log Out</div><div className="text-xs opacity-50">Disconnect your account</div></div>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ==================== 6. ADMIN PANEL ==================== */}
        {activeScreen === 'admin' && (
          <motion.div key="admin" {...pageTransition} className="p-5 h-screen overflow-y-auto pb-24">
            <header className="flex items-center justify-between mb-8 mt-2 px-1">
              <button onClick={() => navigate('dashboard')} className="p-2 -ml-2"><ChevronLeft size={28} /></button>
              <h1 className="text-lg font-bold">Admin Console</h1>
              <div className={`p-2 rounded-lg border ${isDarkMode ? 'bg-black border-amber-500/40 text-amber-500' : 'bg-white border-amber-500/20 text-amber-600'}`}><ShieldCheck size={20} /></div>
            </header>

            {/* Быстрая Статистика */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className={`p-5 rounded-[32px] relative overflow-hidden border ${isDarkMode ? 'bg-black border-white/10' : 'bg-white border-black/10 shadow-sm'}`}>
                <div className="grain-overlay opacity-[0.05]" />
                <div className="relative z-10">
                  <div className={`flex items-center gap-2 mb-2 ${isDarkMode ? 'text-white' : 'text-black'}`}>
                    <BarChart3 size={16} /> <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Revenue</span>
                  </div>
                  <div className="text-2xl font-black">${ADMIN_STATS.totalRevenue.toLocaleString()}</div>
                  <div className={`text-[10px] font-bold flex items-center gap-0.5 mt-1 ${isDarkMode ? 'text-white/60' : 'text-black/60'}`}>
                    <TrendingUp size={10} /> +12.4%
                  </div>
                </div>
              </div>
              <div className={`p-5 rounded-[32px] glass-card backdrop-blur-2xl relative overflow-hidden border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white/40 border-white/20 shadow-sm'}`}>
                <div className="grain-overlay opacity-[0.05]" />
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2 text-amber-400">
                    <Star size={16} /> <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Predicted</span>
                  </div>
                  <div className="text-2xl font-black">${ADMIN_STATS.predictedRevenue.toLocaleString()}</div>
                  <div className="text-[10px] opacity-40 font-bold mt-1">Forecast +28%</div>
                </div>
              </div>
            </div>

            {/* 1. BROADCAST CONSOLE */}
            <div className={`p-6 rounded-[32px] mb-6 border backdrop-blur-2xl ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white/40 border-white/20 shadow-sm'}`}>
              <p className="opacity-40 text-[10px] font-black tracking-widest mb-4 uppercase">System Broadcast</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  placeholder="Hey, new update is here!"
                  className={`flex-1 bg-transparent border-b outline-none text-sm py-2 focus:border-black dark:focus:border-white transition-colors ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}
                />
                <button onClick={handleSendBroadcast} className={`p-3 rounded-xl shadow-lg active:scale-95 transition-all ${isDarkMode ? 'bg-white text-black shadow-white/10' : 'bg-black text-white shadow-black/20'}`}>
                  <Zap size={20} fill="currentColor" />
                </button>
              </div>
            </div>

            {/* 2. PROMO CODE GENERATOR */}
            <div className={`p-6 rounded-[32px] mb-6 border ${isDarkMode ? 'bg-black border-white/10' : 'bg-white border-black/5 shadow-sm'}`}>
              <p className="text-amber-500 text-[10px] font-black tracking-widest uppercase mb-4">Promo Code Generator</p>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-[9px] opacity-40 font-bold uppercase ml-1">Days of Pro</label>
                  <input
                    type="number"
                    value={promoForm.days}
                    onChange={(e) => setPromoForm({ ...promoForm, days: parseInt(e.target.value) || 0 })}
                    className={`w-full bg-transparent border-b outline-none text-sm py-2 focus:border-amber-500 ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}
                  />
                </div>
                <div>
                  <label className="text-[9px] opacity-40 font-bold uppercase ml-1">Max Uses</label>
                  <input
                    type="number"
                    value={promoForm.maxUses}
                    onChange={(e) => setPromoForm({ ...promoForm, maxUses: parseInt(e.target.value) || 0 })}
                    className={`w-full bg-transparent border-b outline-none text-sm py-2 focus:border-amber-500 ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}
                  />
                </div>
              </div>

              <button
                onClick={handleGeneratePromo}
                className="w-full bg-amber-500 text-white font-bold py-3 rounded-2xl shadow-lg shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Plus size={18} /> Generate New Code
              </button>

              {promoCodes.length > 0 && (
                <div className="mt-6 space-y-3 max-h-40 overflow-y-auto pr-1">
                  {promoCodes.map(pc => (
                    <div key={pc.id} className={`p-3 rounded-xl flex items-center justify-between border ${isDarkMode ? 'bg-black border-white/10' : 'bg-white border-gray-100 shadow-sm'}`}>
                      <div>
                        <div className="text-xs font-black tracking-widest text-amber-500">{pc.code}</div>
                        <div className="text-[9px] opacity-40 font-bold">{pc.days} days • {pc.uses}/{pc.maxUses} used</div>
                      </div>
                      <button
                        onClick={() => {
                          setPromoCodes(promoCodes.filter(c => c.id !== pc.id));
                          addAuditLog(`Deleted promo code: ${pc.code}`, 'admin');
                        }}
                        className="text-red-500 opacity-40 hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 3. AUDIT FEED */}
            <div className={`p-6 rounded-[32px] mb-6 border ${isDarkMode ? 'bg-black border-white/10' : 'bg-white border-black/5 shadow-sm'}`}>
              <p className="text-[10px] font-black tracking-widest uppercase opacity-40 mb-4 px-1">Live Audit Feed</p>
              <div className={`space-y-4 max-h-48 overflow-y-auto pr-2 scrollbar-thin ${isDarkMode ? 'scrollbar-thumb-white/10' : 'scrollbar-thumb-black/5'}`}>
                {auditLog.map(log => (
                  <div key={log.id} className="flex gap-3 items-start">
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${log.type === 'subscription' ? 'bg-amber-400' : log.type === 'admin' ? (isDarkMode ? 'bg-white' : 'bg-black') : 'bg-gray-400'}`} />
                    <div className="flex-1">
                      <div className="text-[11px] font-bold leading-tight">{log.action}</div>
                      <div className="text-[9px] opacity-40 font-medium mt-0.5">{log.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 4 & 5. SEARCH & FILTER USERS */}
            <div className="mb-4 px-1 flex flex-col gap-4">
              <div className="flex justify-between items-end">
                <h3 className="font-bold text-lg">Managing Users</h3>
                <span className="text-[10px] font-bold opacity-50 uppercase tracking-widest bg-gray-500/10 px-2 py-0.5 rounded-full">{filteredUsers.length} total</span>
              </div>

              <div className="flex gap-2">
                <div className={`flex-1 rounded-xl flex items-center px-4 py-2 border backdrop-blur-md ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white/60 border-white/20 shadow-sm'}`}>
                  <Users size={16} className="opacity-30 mr-2" />
                  <input
                    type="text"
                    placeholder="Search by name..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="bg-transparent outline-none text-sm w-full"
                  />
                </div>
                <select
                  value={userFilter}
                  onChange={(e) => setUserFilter(e.target.value)}
                  className={`p-2 rounded-xl text-xs font-bold font-sans outline-none border transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700 focus:border-white' : 'bg-white border-gray-100 shadow-sm focus:border-black'} appearance-none px-4`}
                >
                  <option>All</option>
                  <option>Pro</option>
                  <option>Free</option>
                </select>
              </div>
            </div>

            <div className="space-y-3 mb-8">
              {filteredUsers.map(user => (
                <div key={user.id} className={`p-4 rounded-3xl flex items-center justify-between transition-all border ${isDarkMode ? 'bg-black border-white/10' : 'bg-white border-black/5 shadow-sm'}`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-11 h-11 ${user.avatar} rounded-2xl flex items-center justify-center text-white font-bold shadow-inner`}>
                      {user.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-sm">{user.name}</div>
                      <div className="text-[10px] opacity-50 font-medium">{user.username}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-tighter border ${user.status === 'Pro' ? 'bg-amber-400/10 text-amber-500 border-amber-400/20' : 'bg-gray-500/10 text-gray-400 border-gray-500/10'}`}>
                      {user.status}
                    </span>
                    <div className="text-[9px] opacity-40 mt-1.5 font-medium">{user.joined}</div>
                  </div>
                </div>
              ))}
            </div>

            <button className={`w-full font-bold py-4 rounded-2xl flex justify-center items-center gap-2 border active:scale-95 transition-all shadow-notion-light dark:shadow-notion-dark ${isDarkMode ? 'bg-white text-black border-white' : 'bg-black text-white border-black'}`}>
              <Users size={18} /> View Full User Base
            </button>
          </motion.div>
        )}

        {/* ==================== 7. LIMIT MODAL ==================== */}
        <AnimatePresence>
          {showLimitModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className={`w-full max-w-sm rounded-[40px] p-8 shadow-2xl relative overflow-hidden text-center border ${isDarkMode ? 'bg-black border-white/20' : 'bg-white border-black/10'}`}
              >
                <div className="grain-overlay opacity-[0.05]" />

                <div className="w-20 h-20 bg-amber-400/10 text-amber-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                  <ShieldCheck size={40} />
                </div>

                <h2 className="text-2xl font-black mb-2">Limit Reached!</h2>
                <p className="text-sm opacity-60 mb-8 leading-relaxed">
                  Free users can only track up to 3 subscriptions. Upgrade to <span className="text-amber-500 font-bold text-shadow-sm">Pro Member</span> to unlock unlimited trackers and advanced features.
                </p>

                <div className="space-y-3">
                  <button
                    onClick={() => {
                      handleStarsPayment(99);
                      setShowLimitModal(false);
                    }}
                    className="w-full gold-premium font-bold py-4 rounded-2xl active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <Star size={20} fill="currentColor" /> Upgrade for 99 Stars
                  </button>

                  {!hasJoinedChannel && (
                    <button
                      onClick={() => {
                        handleJoinChannel();
                        setShowLimitModal(false);
                      }}
                      className={`w-full font-bold py-4 rounded-2xl active:scale-95 transition-all border shadow-lg ${isDarkMode ? 'bg-white text-black border-white' : 'bg-black text-white border-black'}`}
                    >
                      <Zap size={20} fill="currentColor" /> Claim 7-Day Bonus
                    </button>
                  )}

                  <button
                    onClick={() => setShowLimitModal(false)}
                    className="w-full py-4 text-xs font-bold opacity-40 uppercase tracking-widest active:scale-95 transition-all"
                  >
                    Maybe Later
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </AnimatePresence>
    </div>
  );
}