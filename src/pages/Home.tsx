/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import VideoPlayer from '../components/VideoPlayer';
import FocusableBox from '../components/FocusableBox';
import { Search, Tv, Clapperboard, Film, Trophy, VolumeX, Loader2, List, ChevronRight, ChevronLeft, Zap, Maximize, Settings, Star, Info, MessageSquare, ChevronUp, ChevronDown, Menu, ArrowLeft, Lock, User, Plus, Trash2, Save, FileImage, Power, Eye, GripVertical, ArrowUpToLine, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useSpatialNavigation } from '../hooks/useSpatialNavigation';
import { cn } from '../lib/utils';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import axios from 'axios';
import { parseM3U } from '../services/iptvService';
import { IPTVChannel } from '../types';

const WIN_PLUS_OPTION_1 = "https://tv1.strm2234.xyz/winsportmas2/tracks-v1a1/mono.m3u8?token=d32a4e38002b78dc331b41f98ab991ecdcf77295-2b8edd06a9225fcf1b2f96fbf1de983f-1779595117-1779584317";
const WIN_PLUS_OPTION_2 = "https://movil.ejeserver.com/live/canal39.m3u8";
const WIN_PLUS_OPTION_3 = "https://tv1.strm2234.xyz/winsportmas2/tracks-v1a1/mono.m3u8";

const WIN_PLUS_URL = WIN_PLUS_OPTION_1;
const DEFAULT_M3U_URL = "";

const DEFAULT_CHANNEL: IPTVChannel = {
  id: 'win_plus',
  name: 'WIN+',
  url: WIN_PLUS_OPTION_1,
  category: 'General',
  type: 'live',
  logo: 'https://acdn-us.mitiendanube.com/stores/003/933/010/products/portada-1-1-e3758d534bde5254ee17525438076205-480-0.webp'
};

const WIN_SPORT_URL = "https://tv1.strm2234.xyz/WinSport/tracks-v1a1/mono.m3u8";

const DEFAULT_CHANNEL_2: IPTVChannel = {
  id: 'win_sport',
  name: 'WIN SPORTS',
  url: WIN_SPORT_URL,
  category: 'General',
  type: 'live',
  logo: 'https://yt3.googleusercontent.com/74v3sDKiXB-uC-zDRcDoMzf97PfTKlXj_K8UzpuaqilFtiLJw3Ij_eKzP4dnIM3ilLjOmjaB=s900-c-k-c0x00ffffff-no-rj'
};

const ESPN_URL = "https://s2.bufaloweb.com/bufalo3/tracks-v1a1/mono.ts.m3u8";
const ESPN_OPTION_2 = "embed::<iframe frameborder=\"0\" allowfullscreen=\"\" scrolling=\"no\" allow=\"autoplay;fullscreen\" src=\"https://anym3u8player.com/tv/video-player.php?url=https://s2.bufaloweb.com/bufalo10/tracks-v1a1/mono.ts.m3u8\"></iframe>";
const ESPN_OPTION_3 = `embed::<div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width:100%;">
    <iframe style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;" 
        webkitAllowFullScreen mozallowfullscreen allowfullscreen 
        width="640" height="360" frameborder="0" allow="autoplay" 
        src="https://anym3u8player.com/tv/p.php?url=https%3A%2F%2Fs2.bufaloweb.com%2Fbufalo10%2Ftracks-v1a1%2Fmono.ts.m3u8">
    </iframe>
</div>`;

function checkIsEmbed(u: string): boolean {
  let clean = u || "";
  if (clean.startsWith("embed::")) {
    return true;
  }
  const trimmed = clean.trim().toLowerCase();
  return (
    trimmed.startsWith("<iframe") || 
    trimmed.includes("<div") || 
    (trimmed.includes("<script") && trimmed.includes("embed")) || 
    trimmed.includes("iframe") ||
    trimmed.includes("video-player.php") ||
    trimmed.includes("player.php") ||
    trimmed.includes("/embed/") ||
    trimmed.includes("anym3u8player")
  );
}

const DEFAULT_CHANNEL_3: IPTVChannel = {
  id: 'espn',
  name: 'ESPN',
  url: ESPN_URL,
  urls: [ESPN_URL, ESPN_OPTION_2, ESPN_OPTION_3],
  category: 'General',
  type: 'live',
  logo: 'https://yt3.googleusercontent.com/5g_v3PAnRIdv7W57G6c8v3rfe826r4r_Y4UWee9L0I5Lp7X6eFqFh-LhXhPfeA19H5_7UBeE=s900-c-k-c0x00ffffff-no-rj'
};

const MAIN_SECTIONS = [
  { id: 'search', icon: <Search size={40} />, label: 'WIN+' },
  { id: 'live', icon: <Tv size={40} />, label: 'TV EN VIVO' },
  { id: 'movie', icon: <Clapperboard size={40} />, label: 'PELÍCULAS' },
  { id: 'series', icon: <Film size={40} />, label: 'SERIES' },
  { id: 'premium', icon: <Zap size={40} />, label: 'PREMIUM' },
  { id: 'sports', icon: <Trophy size={40} />, label: 'DEPORTES' },
  { id: 'kids', icon: <Star size={40} />, label: 'NIÑOS' },
  { id: 'settings', icon: <Settings size={40} />, label: 'AJUSTES' },
  { id: 'info', icon: <Info size={40} />, label: 'INFO' },
  { id: 'social', icon: <MessageSquare size={40} />, label: 'SOCIAL' },
  { id: 'favs', icon: <List size={40} />, label: 'FAVORITOS' },
];

// Fuentes de muestra para pruebas rápidas
const DEMO_SOURCES = [
  { id: 'demo1', name: 'Canal de Muestra 1', url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8', type: 'live' },
  { id: 'demo2', name: 'Película de Muestra', url: 'https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8', type: 'movie' },
];

export default function Home() {
  const [activeVid, setActiveVid] = useState<string | null>(WIN_PLUS_URL);
  const [hasInteracted, setHasInteracted] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [muted, setMuted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [allChannels, setAllChannels] = useState<IPTVChannel[]>([DEFAULT_CHANNEL, DEFAULT_CHANNEL_2, DEFAULT_CHANNEL_3]);
  const [isUiVisible, setIsUiVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [entryCode, setEntryCode] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState(30);
  const [showAnnouncement, setShowAnnouncement] = useState(false);

  // NEW SESSION AND ADMIN PANEL STATE
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [loginViewOpen, setLoginViewOpen] = useState(false);
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [authErrorMsg, setAuthErrorMsg] = useState("");
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [adminActiveTab, setAdminActiveTab] = useState<'users' | 'channels'>('users');
  
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [adminChannels, setAdminChannels] = useState<any[]>([]);

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [demoMinutes, setDemoMinutes] = useState(15);
  const [lastGeneratedDemo, setLastGeneratedDemo] = useState<{user: string, pass: string, min: number} | null>(null);

  const [displayItems, setDisplayItems] = useState<any[]>([DEFAULT_CHANNEL, DEFAULT_CHANNEL_2, DEFAULT_CHANNEL_3]);
  const [sidebarView, setSidebarView] = useState<'main' | 'categories'>('main');
  const [selectedType, setSelectedType] = useState<'live' | 'movie' | 'series' | null>(null);

  // Series selection state
  const [selectedSeries, setSelectedSeries] = useState<any | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const [isEpisodeMode, setIsEpisodeMode] = useState(false);
  const [episodes, setEpisodes] = useState<any[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [winPlusStreamUrl, setWinPlusStreamUrl] = useState(WIN_PLUS_OPTION_1);
  const [activeSubIndex, setActiveSubIndex] = useState<-1 | number>(-1);
  const [isVideoPlayFocused, setIsVideoPlayFocused] = useState(false);

  useEffect(() => {
    setIsVideoPlayFocused(false);
  }, [activeVid]);

  const { activeIndex, setActiveIndex } = useSpatialNavigation({ 
    topItems: 0, 
    bottomItems: displayItems.length 
  });

  // Sync activeSubIndex reset when activeIndex changes
  useEffect(() => {
    const currentItem = displayItems[activeIndex];
    const hasOptions = currentItem?.id === 'win_plus';
    if (!hasOptions) {
      setActiveSubIndex(-1);
    }
  }, [activeIndex, displayItems]);

  const handleSelectWinPlusStream = (url: string) => {
    setWinPlusStreamUrl(url);
    DEFAULT_CHANNEL.url = url;
    
    setAllChannels(prev => prev.map(ch => {
      if (ch.id === 'win_plus') {
        return { ...ch, url };
      }
      return ch;
    }));
    
    setDisplayItems(prev => prev.map(ch => {
      if (ch.id === 'win_plus') {
        return { ...ch, url };
      }
      return ch;
    }));
    
    // Force active video play if focused on win_plus
    setActiveVid(url);
  };

  const handleSelectAlternativeStream = (channelId: string, url: string) => {
    if (channelId === 'win_plus') {
      setWinPlusStreamUrl(url);
    }
    setAllChannels(prev => prev.map(ch => {
      if (ch.id === channelId) {
        return { ...ch, url };
      }
      return ch;
    }));
    setDisplayItems(prev => prev.map(ch => {
      if (ch.id === channelId) {
        return { ...ch, url };
      }
      return ch;
    }));
    setActiveVid(url);
  };

  // Handle capturing keydown events to navigate option buttons and play button via remote/keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. If currently focusing the video play button
      if (isVideoPlayFocused) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          e.stopImmediatePropagation();
          setIsVideoPlayFocused(false);
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          // Block horizontal or additional vertical navigation when focused on Play button
          e.preventDefault();
          e.stopImmediatePropagation();
        } else if (e.key === 'Enter' || e.key === ' ' || e.keyCode === 13 || e.keyCode === 32) {
          e.preventDefault();
          e.stopImmediatePropagation();
          // Find and click the play overlay to transfer focus/gesture
          const playBtn = document.getElementById('fake-play-overlay');
          if (playBtn) {
            playBtn.click();
          }
        }
        return;
      }

      const currentItem = displayItems[activeIndex];
      const hasOptions = currentItem?.urls && currentItem.urls.length > 1;

      if (hasOptions) {
        if (activeSubIndex === -1) {
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            e.stopImmediatePropagation();
            // Enter the vertical options sub-menu on the left
            let initialSub = 0;
            if (currentItem.urls) {
              const foundIdx = currentItem.urls.findIndex((u: string) => u === currentItem.url);
              if (foundIdx !== -1) initialSub = foundIdx;
            }
            setActiveSubIndex(initialSub as any);
          }
        } else {
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            e.stopImmediatePropagation();
            setActiveSubIndex(prev => Math.max(0, prev - 1) as any);
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            e.stopImmediatePropagation();
            if (activeSubIndex === currentItem.urls.length - 1) {
              // Pressing down at the last option exits focus back to the card carousel
              setActiveSubIndex(-1);
            } else {
              setActiveSubIndex(prev => Math.min(currentItem.urls.length - 1, prev + 1) as any);
            }
          } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            e.preventDefault();
            e.stopImmediatePropagation();
            // Pressing horizontal keys exits left options focus back to horizontal carousel
            setActiveSubIndex(-1);
          } else if (e.key === 'Enter') {
            e.preventDefault();
            e.stopImmediatePropagation();
            const targetUrl = currentItem.urls[activeSubIndex];
            if (targetUrl) {
              handleSelectAlternativeStream(currentItem.id, targetUrl);
            }
          }
        }
      } else {
        // If the channel has NO options, pressing ArrowUp directly highlights the Play button if not embed!
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          e.stopImmediatePropagation();
          if (!checkIsEmbed(currentItem.url)) {
            setIsVideoPlayFocused(true);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [activeIndex, activeSubIndex, displayItems, isVideoPlayFocused]);

  // Check initial authentication, local databases, and subscription day-discounting
  useEffect(() => {
    // 1. Initialise channels in localStorage if not exists
    const savedChannels = localStorage.getItem('iptv_channels_db');
    let channelsToLoad: IPTVChannel[] = [DEFAULT_CHANNEL, DEFAULT_CHANNEL_2, DEFAULT_CHANNEL_3];
    if (!savedChannels) {
      const initialChs: IPTVChannel[] = [
        {
          id: 'win_plus',
          name: 'WIN+',
          logo: DEFAULT_CHANNEL.logo,
          urls: [WIN_PLUS_OPTION_1, WIN_PLUS_OPTION_2, WIN_PLUS_OPTION_3],
          category: 'General',
          type: 'live',
          url: WIN_PLUS_OPTION_1
        },
        {
          id: 'win_sport',
          name: 'WIN SPORTS',
          logo: DEFAULT_CHANNEL_2.logo,
          urls: [WIN_SPORT_URL],
          category: 'General',
          type: 'live',
          url: WIN_SPORT_URL
        },
        {
          id: 'espn',
          name: 'ESPN',
          logo: DEFAULT_CHANNEL_3.logo,
          urls: [ESPN_URL, ESPN_OPTION_2, ESPN_OPTION_3],
          category: 'General',
          type: 'live',
          url: ESPN_URL
        }
      ];
      localStorage.setItem('iptv_channels_db', JSON.stringify(initialChs));
      channelsToLoad = initialChs;
    } else {
      try {
        channelsToLoad = JSON.parse(savedChannels);
        
        // Dynamic upgrade check for ESPN so returning users get Option 2 and Option 3 automatically
        const espnIdx = channelsToLoad.findIndex(ch => ch.id === 'espn');
        if (espnIdx !== -1) {
          const espnCh = channelsToLoad[espnIdx];
          const hasOpt3 = espnCh.urls && espnCh.urls.some(u => u && u.includes('p.php'));
          if (!hasOpt3) {
            espnCh.urls = [ESPN_URL, ESPN_OPTION_2, ESPN_OPTION_3];
            localStorage.setItem('iptv_channels_db', JSON.stringify(channelsToLoad));
          }
        }
      } catch (e) {
        console.error("Error reading saved channels", e);
      }
    }
    setAllChannels(channelsToLoad);
    setDisplayItems(channelsToLoad);
    if (channelsToLoad.length > 0) {
      setActiveVid(channelsToLoad[0].urls?.[0] || channelsToLoad[0].url || "");
    }

    // 2. Initialise users if not exists
    let myToken = localStorage.getItem('iptv_device_token');
    if (!myToken) {
      myToken = "device_" + Math.random().toString(36).substring(2, 9);
      localStorage.setItem('iptv_device_token', myToken);
    }

    const savedUsers = localStorage.getItem('iptv_users_db');
    if (!savedUsers) {
      const initialUsers = [
        {
          username: 'user',
          password: 'user',
          status: 'activo',
          daysRemaining: 30,
          maxDevices: 2,
          activeSessions: [],
          lastUpdateDate: new Date().toISOString().split('T')[0]
        }
      ];
      localStorage.setItem('iptv_users_db', JSON.stringify(initialUsers));
    }

    // 3. Discount subscription days as days pass in real life
    const usersStr = localStorage.getItem('iptv_users_db');
    const lastChecked = localStorage.getItem('iptv_last_date_checked');
    const todayStr = new Date().toISOString().split('T')[0];

    if (usersStr) {
      try {
        let users = JSON.parse(usersStr);
        let updated = false;

        if (lastChecked && lastChecked !== todayStr) {
          const lastDate = new Date(lastChecked);
          const todayDate = new Date(todayStr);
          const diffTime = todayDate.getTime() - lastDate.getTime();
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays >= 1) {
            users = users.map((u: any) => {
              if (u.status === 'activo' && !u.isDemo) {
                const remaining = Math.max(0, u.daysRemaining - diffDays);
                const status = remaining <= 0 ? 'vencido' : u.status;
                return { ...u, daysRemaining: remaining, status };
              }
              return u;
            });
            updated = true;
          }
        }

        if (updated || !lastChecked) {
          localStorage.setItem('iptv_users_db', JSON.stringify(users));
          localStorage.setItem('iptv_last_date_checked', todayStr);
        }
      } catch (err) {
        console.error("Error updating subscription days remaining", err);
      }
    }

    // 4. Load states to UI for Admin Panel synchronisation
    const refreshAdminData = () => {
      const uStr = localStorage.getItem('iptv_users_db');
      const cStr = localStorage.getItem('iptv_channels_db');
      if (uStr) setAdminUsers(JSON.parse(uStr));
      if (cStr) setAdminChannels(JSON.parse(cStr));
    };
    refreshAdminData();

    // 5. Check active session
    const activeSessionStr = localStorage.getItem('iptv_active_session');
    if (activeSessionStr) {
      try {
        const session = JSON.parse(activeSessionStr);
        if (session.username === 'admin') {
          setIsAuthenticated(true);
          setIsAdmin(true);
          setCurrentUser('admin');
        } else {
          // Verify user still active from the DB
          const currentDbUsers = JSON.parse(localStorage.getItem('iptv_users_db') || '[]');
          const userObj = currentDbUsers.find((u: any) => u.username === session.username);
          const token = localStorage.getItem('iptv_device_token');
          
          if (userObj && userObj.status === 'activo' && (!userObj.isDemo || (userObj.expiresAt && Date.now() < userObj.expiresAt))) {
            const activeSess = userObj.activeSessions || [];
            if (token && activeSess.includes(token)) {
              setIsAuthenticated(true);
              setIsAdmin(false);
              setCurrentUser(userObj.username);
              setDaysRemaining(userObj.daysRemaining);
            } else {
              localStorage.removeItem('iptv_active_session');
              setIsAuthenticated(false);
              setIsAdmin(false);
              setCurrentUser(null);
              setAuthErrorMsg("SESIÓN EXPULSADA - EXCESO DE DISPOSITIVOS");
              setAuthError(true);
            }
          } else {
            // Expired or canceled! Force logout and ask for credentials
            localStorage.removeItem('iptv_active_session');
            setIsAuthenticated(false);
            setIsAdmin(false);
            setCurrentUser(null);
          }
        }
      } catch (err) {
        localStorage.removeItem('iptv_active_session');
      }
    }

    setActiveIndex(-1);
  }, []);

  const handleLogout = () => {
    if (currentUser && currentUser !== 'admin') {
      const usersStr = localStorage.getItem('iptv_users_db') || '[]';
      try {
        const users = JSON.parse(usersStr);
        const me = users.find((u: any) => u.username === currentUser);
        const myToken = localStorage.getItem('iptv_device_token');
        if (me && myToken) {
          me.activeSessions = (me.activeSessions || []).filter((s: string) => s !== myToken);
          localStorage.setItem('iptv_users_db', JSON.stringify(users));
        }
      } catch (e) {
        console.error(e);
      }
    }
    localStorage.removeItem('iptv_active_session');
    setIsAuthenticated(false);
    setIsAdmin(false);
    setCurrentUser(null);
    setLoginViewOpen(false);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthErrorMsg("");
    setAuthError(false);

    const checkUser = loginUser.trim();
    const checkPass = loginPass;

    // Check Admin login
    if (checkUser === 'admin' && checkPass === 'Colo1212') {
      const session = { username: 'admin', isAdmin: true };
      localStorage.setItem('iptv_active_session', JSON.stringify(session));
      setIsAuthenticated(true);
      setIsAdmin(true);
      setCurrentUser('admin');
      setShowAdminPanel(true); // Open admin dashboard immediately!
      setLoginViewOpen(false);
      setLoginUser("");
      setLoginPass("");
      return;
    }

    // Check user data list
    const usersStr = localStorage.getItem('iptv_users_db') || '[]';
    try {
      const users = JSON.parse(usersStr);
      const matchedUser = users.find((u: any) => u.username === checkUser && u.password === checkPass);

      if (matchedUser) {
        // Special check for demo accounts expiration
        if (matchedUser.isDemo && matchedUser.expiresAt && Date.now() > matchedUser.expiresAt) {
          matchedUser.status = 'vencido';
          localStorage.setItem('iptv_users_db', JSON.stringify(users));
          setAuthErrorMsg("DEMOSTRACIÓN EXPIRADA O VENCIDA");
          setAuthError(true);
          return;
        }

        if (matchedUser.status !== 'activo' || (matchedUser.daysRemaining <= 0 && !matchedUser.isDemo)) {
          setAuthErrorMsg("SERVICIO SUSPENDIDO, CANCELADO O VENCIDO");
          setAuthError(true);
          return;
        }

        // Manage active sessions for device limit verification
        const token = localStorage.getItem('iptv_device_token') || "";
        let activeSess = matchedUser.activeSessions || [];
        if (!activeSess.includes(token)) {
          const maxAllowed = matchedUser.maxDevices || 1;
          while (activeSess.length >= maxAllowed) {
            activeSess.shift(); // remove oldest session
          }
          activeSess.push(token);
          matchedUser.activeSessions = activeSess;
        }
        
        // Save the updated users back to localStorage
        localStorage.setItem('iptv_users_db', JSON.stringify(users));

        // Correct user credentials and active service!
        const session = { 
          username: matchedUser.username, 
          isAdmin: false,
          isDemo: !!matchedUser.isDemo,
          expiresAt: matchedUser.expiresAt || 0
        };
        localStorage.setItem('iptv_active_session', JSON.stringify(session));
        setIsAuthenticated(true);
        setIsAdmin(false);
        setCurrentUser(matchedUser.username);
        setDaysRemaining(matchedUser.daysRemaining);
        setLoginViewOpen(false);
        
        // Start playback
        setHasInteracted(true);
        const savedChs = JSON.parse(localStorage.getItem('iptv_channels_db') || '[]');
        if (savedChs.length > 0) {
          setActiveVid(savedChs[0].urls?.[0] || savedChs[0].url || "");
        } else {
          setActiveVid(WIN_PLUS_URL);
        }
        setMuted(false);
        
        setLoginUser("");
        setLoginPass("");
        setShowAnnouncement(true);
        setTimeout(() => setShowAnnouncement(false), 5000);
      } else {
        setAuthErrorMsg("USUARIO O CONTRASEÑA INCORRECTOS");
        setAuthError(true);
        setTimeout(() => setAuthError(false), 3000);
      }
    } catch (err) {
      setAuthErrorMsg("ERROR AL ACCEDER A LA BASE DE DATOS LOCAL");
      setAuthError(true);
    }
  };

  const resetIdleTimer = () => {
    if (!isAuthenticated) return;
    setIsUiVisible(true);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      setIsUiVisible(false);
    }, 5000);
  };

  // Periodic background session and demo account expiration checker
  useEffect(() => {
    if (!isAuthenticated || !currentUser || currentUser === 'admin') return;

    const checkActiveSession = () => {
      const usersStr = localStorage.getItem('iptv_users_db') || '[]';
      try {
        const users = JSON.parse(usersStr);
        const me = users.find((u: any) => u.username === currentUser);
        const myToken = localStorage.getItem('iptv_device_token');

        if (!me) {
          localStorage.removeItem('iptv_active_session');
          setIsAuthenticated(false);
          setIsAdmin(false);
          setCurrentUser(null);
          setAuthErrorMsg("CUENTA DE USUARIO ELIMINADA");
          setAuthError(true);
          setLoginViewOpen(true);
          return;
        }

        // Check if demo expired
        if (me.isDemo && me.expiresAt) {
          if (Date.now() > me.expiresAt) {
            me.status = 'vencido';
            localStorage.setItem('iptv_users_db', JSON.stringify(users));
            localStorage.removeItem('iptv_active_session');
            setIsAuthenticated(false);
            setIsAdmin(false);
            setCurrentUser(null);
            setAuthErrorMsg("DEMOSTRACIÓN EXPIRADA O VENCIDA");
            setAuthError(true);
            setLoginViewOpen(true);
            return;
          }
        }

        if (me.status !== 'activo') {
          localStorage.removeItem('iptv_active_session');
          setIsAuthenticated(false);
          setIsAdmin(false);
          setCurrentUser(null);
          setAuthErrorMsg("SERVICIO SUSPENDIDO O DESACTIVADO");
          setAuthError(true);
          setLoginViewOpen(true);
          return;
        }

        // Check activeSessions list
        const sessions = me.activeSessions || [];
        if (myToken && !sessions.includes(myToken)) {
          localStorage.removeItem('iptv_active_session');
          setIsAuthenticated(false);
          setIsAdmin(false);
          setCurrentUser(null);
          setAuthErrorMsg("SESIÓN EXPULSADA - EXCESO DE DISPOSITIVOS DE ACUERDO A TU SUSCRIPCIÓN");
          setAuthError(true);
          setLoginViewOpen(true);
        }
      } catch (e) {
        console.error(e);
      }
    };

    const interval = setInterval(checkActiveSession, 1000);
    return () => clearInterval(interval);
  }, [isAuthenticated, currentUser]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    const handleInteraction = () => {
      resetIdleTimer();
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('mousemove', handleInteraction);
    window.addEventListener('keydown', handleInteraction);
    window.addEventListener('touchstart', handleInteraction);

    resetIdleTimer();

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('mousemove', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [isAuthenticated]);
  
  useEffect(() => {
    const path = 'settings/global';
    const loadChannels = async (url: string) => {
      if (!url || url.includes('jumangis.cloud')) {
        setAllChannels([DEFAULT_CHANNEL, DEFAULT_CHANNEL_2, DEFAULT_CHANNEL_3]);
        setDisplayItems([DEFAULT_CHANNEL, DEFAULT_CHANNEL_2, DEFAULT_CHANNEL_3]);
        setActiveVid(winPlusStreamUrl);
        setActiveIndex(0);
        return;
      }
      setLoadingChannels(true);
      try {
        const response = await axios.get(`/api/proxy?url=${encodeURIComponent(url)}`);
        const text = response.data;
        let parsed = parseM3U(text);
        
        parsed = parsed.filter(c => !c.url.includes('jumangis.cloud'));
        if (parsed.length === 0) {
          setAllChannels([DEFAULT_CHANNEL, DEFAULT_CHANNEL_2, DEFAULT_CHANNEL_3]);
          setDisplayItems([DEFAULT_CHANNEL, DEFAULT_CHANNEL_2, DEFAULT_CHANNEL_3]);
          setActiveVid(winPlusStreamUrl);
          setActiveIndex(0);
          return;
        }

        setAllChannels(parsed);
        
        // Fallback to live channels
        const liveChannels = parsed.filter(c => c.type === 'live');
        if (liveChannels.length > 0) {
          setDisplayItems(liveChannels);
          setActiveVid(liveChannels[0].url);
          setActiveIndex(0);
        } else {
          const validIds = new Set<string>(parsed.map(c => c.type));
          validIds.add('search'); 
          const initialSections = MAIN_SECTIONS.filter(s => validIds.has(s.id));
          setDisplayItems(initialSections);
        }
      } catch (err) {
        console.error("Error cargando fuentes IPTV:", err);
        setAllChannels([DEFAULT_CHANNEL, DEFAULT_CHANNEL_2, DEFAULT_CHANNEL_3]);
        setDisplayItems([DEFAULT_CHANNEL, DEFAULT_CHANNEL_2, DEFAULT_CHANNEL_3]);
        setActiveVid(winPlusStreamUrl);
        setActiveIndex(0);
      } finally {
        setLoadingChannels(false);
      }
    };

    const unsubscribe = onSnapshot(doc(db, path), async (docSnap) => {
      if (docSnap.exists()) {
        const config = docSnap.data();
        const m3uUrl = config.m3uUrl || DEFAULT_M3U_URL;
        loadChannels(m3uUrl);
      } else {
        // Si no hay config en Firestore, usar el default por defecto
        loadChannels(DEFAULT_M3U_URL);
      }
    }, (err) => {
      console.warn("Firestore snapshot error, using default list:", err);
      loadChannels(DEFAULT_M3U_URL);
    });

    return () => unsubscribe();
  }, []);

  const scrollSlider = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -350 : 350;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Handle Search Filtering
  useEffect(() => {
    if (searchQuery.trim() === "") {
      // If search is cleared, we might want to restore original view
      // But for now, let's just let the user re-select from sidebar or we can show main sections
      if (allChannels.length > 0 && displayItems.length === 0) {
        const liveChannels = allChannels.filter(c => c.type === 'live');
        setDisplayItems(liveChannels.length > 0 ? liveChannels : MAIN_SECTIONS);
      }
      return;
    }

    const filtered = allChannels.filter(channel => 
      (channel.name || "").toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    setDisplayItems(filtered);
    setActiveIndex(0);
    if (filtered.length > 0 && filtered[0].url) {
      setActiveVid(filtered[0].url);
    }
  }, [searchQuery, allChannels]);

  const toggleMute = () => {
    const video = document.querySelector('video') as HTMLVideoElement;
    if (video) {
      video.muted = !video.muted;
      setMuted(video.muted);
    }
  };

  const handleBoxClick = (index: number) => {
    if (index < 0) return;
    
    setHasInteracted(true);
    setActiveIndex(index);
    const item = displayItems[index];

    if (!item) return;
    
    // Reset series state when clicking something new in the main grid
    if (selectedSeries?.id !== item.id) {
       setSelectedSeries(null);
       setSelectedSeason(null);
       setIsEpisodeMode(false);
    }

    if (item.id === 'search') {
      setActiveVid(winPlusStreamUrl);
      setMuted(false);
      return;
    }

    // Si es un canal de IPTV
    if (item.url || (item.urls && item.urls.length > 0)) {
      if (item.type === 'series') {
        setSelectedSeries(item);
        setSelectedSeason(null);
        setIsEpisodeMode(false);
        return;
      }
      const defaultUrl = (item.urls && item.urls.length > 0) ? item.urls[0] : item.url;
      if (item.urls && item.urls.length > 1) {
        handleSelectAlternativeStream(item.id, defaultUrl);
      } else {
        setActiveVid(defaultUrl);
      }
      setMuted(false);
      return;
    }
    
    // Si es una sección (live, movie, series) y no tiene URL propia
    const sectionChannels = allChannels.filter(c => c.type === item.id);
    if (sectionChannels.length > 0 && !item.url) {
      setDisplayItems(sectionChannels);
      setActiveIndex(0);
      setActiveVid(sectionChannels[0].url);
      setMuted(false);
      resetIdleTimer();
      return;
    }
    
    // Buscar contenido local o demográfico para secciones estáticas si no hay canales detectados
    if (item.id === 'series' && !item.url) {
      const demo = DEMO_SOURCES.find(d => d.type === 'series') || DEMO_SOURCES[0];
      setSelectedSeries(demo);
      return;
    }

    if (item.id === 'search' && !item.url) {
       setActiveVid(winPlusStreamUrl);
       return;
    }
  };

  // Scroll highlighted item into view
  useEffect(() => {
    if (scrollRef.current && activeIndex >= 0) {
      const container = scrollRef.current;
      const items = container.querySelectorAll('.focusable-item');
      const activeItem = items[activeIndex] as HTMLElement;
      if (activeItem) {
        const containerWidth = container.offsetWidth;
        const itemLeft = activeItem.offsetLeft;
        const itemWidth = activeItem.offsetWidth;
        
        container.scrollTo({
          left: itemLeft - (containerWidth / 2) + (itemWidth / 2),
          behavior: 'smooth'
        });
      }
    }
  }, [activeIndex, displayItems]);

  const selectTypeInSidebar = (type: 'live' | 'movie' | 'series') => {
    setSelectedType(type);
    
    const categories = getCategories(type);
    
    // Si solo hay una categoría o ninguna real, cargar directo
    if (categories.length <= 1) {
      selectCategory(type, categories[0] || 'General');
    } else {
      setSidebarView('categories');
    }
  };

  const getCategories = (type: 'live' | 'movie' | 'series'): string[] => {
    const categories = Array.from(new Set(allChannels.filter(c => c.type === type).map(c => c.category)));
    return (categories.filter(c => c && c !== '') as string[]).sort();
  };

  const selectCategory = (type: 'live' | 'movie' | 'series', category: string) => {
    let filtered = allChannels.filter(c => c.type === type && c.category === category);
    
    // If it's series, we should group them
    if (type === 'series') {
      const groupedMap = new Map();
      filtered.forEach(ch => {
        // Heuristic: Name S01 E01 ...
        const baseName = ch.name.split(/S\d+/i)[0].trim();
        if (!groupedMap.has(baseName)) {
          groupedMap.set(baseName, {
            ...ch,
            name: baseName,
            episodes: []
          });
        }
        groupedMap.get(baseName).episodes.push(ch);
      });
      filtered = Array.from(groupedMap.values());
    }

    if (filtered.length > 0) {
      setDisplayItems(filtered);
      setActiveIndex(0);
      setSidebarOpen(false);
      resetIdleTimer();
      const firstItem = filtered[0];
      if (firstItem.url) {
        setActiveVid(firstItem.url);
        setMuted(false);
        setHasInteracted(true);
      }
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const handleGenerateDemo = () => {
    const charsLetters = 'abcdefghijklmnopqrstuvwxyz';
    const charsAlpha = 'abcdefghijklmnopqrstuvwxyz0123456789';
    
    let generatedUser = '';
    for (let i = 0; i < 5; i++) {
      generatedUser += charsLetters.charAt(Math.floor(Math.random() * charsLetters.length));
    }
    
    let generatedPass = '';
    for (let i = 0; i < 5; i++) {
      generatedPass += charsAlpha.charAt(Math.floor(Math.random() * charsAlpha.length));
    }
    
    const expiresAt = Date.now() + (demoMinutes * 60 * 1000);
    
    const newDemoUser = {
      username: generatedUser,
      password: generatedPass,
      status: 'activo',
      daysRemaining: 1,
      isDemo: true,
      expiresAt: expiresAt,
      durationMinutes: demoMinutes,
      maxDevices: 1,
      activeSessions: [],
      lastUpdateDate: new Date().toISOString().split('T')[0]
    };
    
    const updated = [newDemoUser, ...adminUsers];
    setAdminUsers(updated);
    setLastGeneratedDemo({
      user: generatedUser,
      pass: generatedPass,
      min: demoMinutes
    });
  };

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden select-none font-sans" onClick={() => { setMuted(false); resetIdleTimer(); }}>
      
      {/* Access Barrier / Login Screen */}
      <AnimatePresence>
        {(!isAuthenticated || loginViewOpen) && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-black/95 flex items-center justify-center backdrop-blur-3xl px-6"
          >
            {/* Show Close button only if they are already logged in to let them cancel re-auth */}
            {isAuthenticated && loginViewOpen && (
              <div className="absolute top-8 right-8 flex items-center gap-3 z-50">
                <button 
                  onClick={handleLogout}
                  className="px-5 py-3 rounded-xl bg-red-600 border border-red-500/30 text-white font-black hover:bg-red-700 tracking-widest text-xs uppercase transition-all shadow-lg cursor-pointer"
                >
                  cerrar sesión
                </button>
                <button 
                  onClick={() => setLoginViewOpen(false)}
                  className="px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-black hover:bg-white hover:text-black tracking-widest text-xs uppercase"
                >
                  Volver
                </button>
              </div>
            )}

            <div className="w-full max-w-sm space-y-10">
              <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-red-600 flex items-center justify-center text-white shadow-[0_0_40px_rgba(239,68,68,0.3)]">
                  <Lock size={32} />
                </div>
              </div>

              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-4">
                  <div className="relative">
                    <input 
                      type="text"
                      placeholder="USUARIO"
                      value={loginUser}
                      onChange={(e) => setLoginUser(e.target.value)}
                      className="w-full bg-white/5 border-2 border-white/10 focus:border-red-600 focus:bg-white/10 p-5 rounded-2xl text-center text-lg font-black tracking-[0.2em] outline-none transition-all placeholder:text-white/20 text-white"
                      required
                    />
                  </div>
                  <div className="relative">
                    <input 
                      type="password"
                      placeholder="CONTRASEÑA"
                      value={loginPass}
                      onChange={(e) => setLoginPass(e.target.value)}
                      className="w-full bg-white/5 border-2 border-white/10 focus:border-red-600 focus:bg-white/10 p-5 rounded-2xl text-center text-lg font-black tracking-[0.2em] outline-none transition-all placeholder:text-white/20 text-white"
                      required
                    />
                  </div>
                </div>

                {authError && (
                  <p className="text-red-500 text-[10px] font-black tracking-widest text-center mt-2 animate-pulse">
                    {authErrorMsg || "DATOS INCORRECTOS"}
                  </p>
                )}

                <button 
                  type="submit"
                  className="w-full p-5 rounded-2xl bg-red-600 text-white hover:bg-red-700 font-black tracking-[0.3em] uppercase hover:scale-102 active:scale-98 transition-all shadow-[0_0_30px_rgba(239,68,68,0.3)] cursor-pointer text-xs sm:text-sm"
                >
                  ACCEDER
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Activation Announcement (Service Days Notification Box) */}
      <AnimatePresence>
        {showAnnouncement && isAuthenticated && !isAdmin && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -20 }}
            className="fixed inset-0 z-[140] pointer-events-none flex items-center justify-center p-6"
          >
            <div className="bg-black/90 backdrop-blur-3xl border-2 border-red-600 p-12 rounded-[2.5rem] shadow-[0_0_80px_rgba(239,68,68,0.4)] text-center space-y-4">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center text-white animate-pulse">
                  <Zap size={32} fill="currentColor" />
                </div>
              </div>
              <h2 className="text-white text-3xl font-black tracking-tighter italic uppercase">SERVICIO ACTIVO</h2>
              <div className="bg-white/10 px-6 py-2 rounded-full inline-block">
                <p className="text-red-500 text-xs font-black tracking-[0.2em] uppercase">
                  {(() => {
                    const matched = adminUsers.find(u => u.username === currentUser);
                    if (matched && matched.isDemo) {
                      const mins = Math.max(0, Math.ceil((matched.expiresAt - Date.now()) / 60000));
                      return `DEMOSTRACIÓN ACTIVA • TE QUEDAN ${mins} MINUTOS`;
                    }
                    return `TE QUEDAN ${daysRemaining} DÍAS`;
                  })()}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin Panel Overlay */}
      <AnimatePresence>
        {showAdminPanel && isAdmin && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[130] bg-[#0c0c0c] flex flex-col backdrop-blur-3xl text-white overflow-y-auto p-6 md:p-12 select-text"
          >
            {/* Admin Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-6 mb-8">
              <div>
                <span className="text-red-500 text-xs font-black tracking-[0.3em] uppercase italic bg-red-600/10 px-3 py-1 rounded-full border border-red-500/20 mb-2 inline-block">ADMINISTRADOR</span>
                <h1 className="text-3xl md:text-4xl font-black italic tracking-tighter uppercase">Panel de Configuración</h1>
              </div>
              <div className="flex flex-wrap gap-3">
                <button 
                  onClick={() => setShowAdminPanel(false)}
                  className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white hover:text-black font-black tracking-widest text-xs uppercase flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Eye size={16} />
                  Ver Televisión
                </button>
                <button 
                  onClick={() => {
                    localStorage.removeItem('iptv_active_session');
                    setIsAuthenticated(false);
                    setIsAdmin(false);
                    setCurrentUser(null);
                    setShowAdminPanel(false);
                  }}
                  className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black tracking-widest text-xs uppercase flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-red-600/20"
                >
                  <Power size={16} />
                  Cerrar Sesión
                </button>
              </div>
            </div>

            {/* Admin Navigation Tabs */}
            <div className="flex gap-4 border-b border-white/5 mb-8">
              <button 
                onClick={() => setAdminActiveTab('users')}
                className={cn(
                  "px-6 py-4 font-black tracking-wider text-xs uppercase border-b-2 transition-all",
                  adminActiveTab === 'users' ? "border-red-600 text-red-500" : "border-transparent text-white/40 hover:text-white"
                )}
              >
                Usuarios activos, cancelados y vencidos
              </button>
              <button 
                onClick={() => setAdminActiveTab('channels')}
                className={cn(
                  "px-6 py-4 font-black tracking-wider text-xs uppercase border-b-2 transition-all",
                  adminActiveTab === 'channels' ? "border-red-600 text-red-500" : "border-transparent text-white/40 hover:text-white"
                )}
              >
                Configurar Canales
              </button>
            </div>

            {/* TAB: USERS */}
            {adminActiveTab === 'users' && (
              <div className="space-y-6">
                {/* Demo Accounts Generator Area */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 bg-gradient-to-br from-red-950/20 to-black p-6 rounded-2xl border border-red-500/10 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-red-600/10 text-red-500 rounded-xl border border-red-500/20">
                        <Clock size={20} />
                      </div>
                      <div>
                        <h3 className="font-black text-sm tracking-widest uppercase italic text-red-500">Generar Cuenta Demostrativa Temporizada</h3>
                        <p className="text-white/40 text-[10px] uppercase font-bold">Cree accesos temporales automáticos de 5 letras para pruebas rápidas.</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4 pt-2">
                      <div className="space-y-1">
                        <label className="block text-[9px] font-black tracking-widest text-white/40 uppercase">Duración (Minutos):</label>
                        <input 
                          type="number" 
                          value={demoMinutes}
                          onChange={(e) => setDemoMinutes(Math.max(1, parseInt(e.target.value) || 15))}
                          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 font-mono font-bold outline-none focus:border-red-500 w-28 text-center text-sm"
                          min="1"
                        />
                      </div>
                      
                      <button 
                        onClick={handleGenerateDemo}
                        className="px-6 py-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black tracking-widest text-xs uppercase flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-red-600/10 self-end h-[38px] sm:h-auto"
                      >
                        <Zap size={14} fill="currentColor" />
                        Generar Usuario Demo
                      </button>
                    </div>

                    {lastGeneratedDemo && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 bg-white/5 rounded-xl border border-white/5 space-y-2"
                      >
                        <p className="text-[10px] font-black text-red-500 tracking-widest uppercase">¡Demo Generada con Éxito!</p>
                        <div className="grid grid-cols-3 gap-2 text-xs select-all font-mono font-bold text-white/80">
                          <div>Usuario: <span className="text-white font-black bg-white/10 px-2 py-0.5 rounded">{lastGeneratedDemo.user}</span></div>
                          <div>Contraseña: <span className="text-white font-black bg-white/10 px-2 py-0.5 rounded">{lastGeneratedDemo.pass}</span></div>
                          <div>Validez: <span className="text-red-400 font-black">{lastGeneratedDemo.min} minutos</span></div>
                        </div>
                        <p className="text-[9px] text-white/30 uppercase italic font-bold select-none">*El usuario copia dando doble click sobre el fondo de las letras.</p>
                      </motion.div>
                    )}
                  </div>

                  <div className="bg-white/[0.02] p-6 rounded-2xl border border-white/5 flex flex-col justify-between">
                    <div>
                      <h4 className="font-black text-xs tracking-widest uppercase text-white/60 mb-2">Creación Estándar</h4>
                      <p className="text-white/40 text-[10px] font-black uppercase leading-relaxed">Agregue un cliente regular directamente a su listado para definir sus días personalizados de forma manual.</p>
                    </div>
                    <button 
                      onClick={() => {
                        const newUser = {
                          username: `usuario_${Date.now().toString().slice(-4)}`,
                          password: '123',
                          status: 'activo',
                          daysRemaining: 30,
                          maxDevices: 2,
                          activeSessions: [],
                          lastUpdateDate: new Date().toISOString().split('T')[0]
                        };
                        const updated = [newUser, ...adminUsers];
                        setAdminUsers(updated);
                      }}
                      className="mt-4 px-4 py-3 rounded-xl bg-white text-black hover:bg-white/90 text-xs font-black tracking-wider uppercase flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <Plus size={16} />
                      Crear Usuario Estándar
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-white/5 bg-black/40">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 text-[10px] uppercase tracking-widest text-[#999] font-black">
                        <th className="p-4 bg-white/[0.01]">Usuario</th>
                        <th className="p-4 bg-white/[0.01]">Contraseña</th>
                        <th className="p-4 bg-white/[0.01]">Estado</th>
                        <th className="p-4 bg-white/[0.01] text-center">Disp. Max</th>
                        <th className="p-4 bg-white/[0.01] text-center">Sesiones Activas</th>
                        <th className="p-4 bg-white/[0.01] text-center">Días de Servicio</th>
                        <th className="p-4 bg-white/[0.01] text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-sm">
                      {adminUsers.map((u, index) => (
                        <tr key={index} className={cn("hover:bg-white/[0.01] transition-colors", u.isDemo ? "bg-red-950/5 hover:bg-red-950/10" : "")}>
                          <td className="p-4 space-y-1">
                            <input 
                              type="text" 
                              value={u.username}
                              onChange={(e) => {
                                const val = e.target.value.replace(/\s+/g, '');
                                const updated = [...adminUsers];
                                updated[index].username = val;
                                setAdminUsers(updated);
                              }}
                              className="bg-white/5 border border-white/10 rounded px-2.5 py-1.5 font-bold outline-none focus:border-red-500 w-44"
                            />
                            {u.isDemo ? (
                              <div className="flex items-center gap-1.5 text-[9px] font-black italic tracking-widest text-red-500 uppercase">
                                <Zap size={10} fill="currentColor" />
                                Demo {u.durationMinutes} min ({(() => {
                                  const diff = (u.expiresAt || 0) - Date.now();
                                  if (diff <= 0) return "Vencido";
                                  const m = Math.floor(diff / 60000);
                                  const s = Math.floor((diff % 60000) / 1000);
                                  return `${m}m ${s}s`;
                                })()})
                              </div>
                            ) : (
                              <div className="text-[9px] font-black tracking-widest text-white/20 uppercase">
                                Cuenta Estándar
                              </div>
                            )}
                          </td>
                          <td className="p-4">
                            <input 
                              type="text" 
                              value={u.password || ""}
                              onChange={(e) => {
                                const updated = [...adminUsers];
                                updated[index].password = e.target.value;
                                setAdminUsers(updated);
                              }}
                              className="bg-white/5 border border-white/10 rounded px-2.5 py-1.5 font-bold outline-none focus:border-red-500 w-36"
                            />
                          </td>
                          <td className="p-4">
                            <select 
                              value={u.status}
                              onChange={(e) => {
                                const updated = [...adminUsers];
                                updated[index].status = e.target.value;
                                if (e.target.value === 'vencido') {
                                  updated[index].daysRemaining = 0;
                                }
                                setAdminUsers(updated);
                              }}
                              className="bg-[#121212] border border-white/10 text-white rounded px-2.5 py-1.5 font-bold outline-none focus:border-red-500"
                            >
                              <option value="activo">Activo</option>
                              <option value="cancelado">Cancelado</option>
                              <option value="vencido">Vencido</option>
                            </select>
                          </td>
                          <td className="p-4 text-center">
                            <input 
                              type="number" 
                              value={u.maxDevices || 1}
                              onChange={(e) => {
                                const val = Math.max(1, parseInt(e.target.value) || 1);
                                const updated = [...adminUsers];
                                updated[index].maxDevices = val;
                                setAdminUsers(updated);
                              }}
                              className="bg-white/5 border border-white/10 rounded px-2.5 py-1.5 font-mono font-bold outline-none focus:border-red-500 w-16 text-center text-white"
                              min="1"
                              max="99"
                            />
                          </td>
                          <td className="p-4 text-center space-y-1.5">
                            <div className="inline-flex items-center gap-2 bg-white/5 px-3 py-1 rounded-full border border-white/5 font-mono text-xs font-black">
                              <span className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                (u.activeSessions?.length || 0) > 0 ? "bg-green-500 animate-pulse" : "bg-white/20"
                              )} />
                              {(u.activeSessions?.length || 0)} / {(u.maxDevices || 1)}
                            </div>
                            {(u.activeSessions?.length || 0) > 0 && (
                              <button 
                                onClick={() => {
                                  const updated = [...adminUsers];
                                  updated[index].activeSessions = [];
                                  setAdminUsers(updated);
                                }}
                                className="block mx-auto text-[8px] font-black uppercase text-red-500 hover:underline cursor-pointer"
                              >
                                Limpiar Sesiones
                              </button>
                            )}
                          </td>
                          <td className="p-4">
                            <input 
                              type="number" 
                              value={u.isDemo ? 0 : u.daysRemaining}
                              disabled={!!u.isDemo}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                const updated = [...adminUsers];
                                updated[index].daysRemaining = val;
                                if (val <= 0) {
                                  updated[index].status = 'vencido';
                                } else if (updated[index].status === 'vencido' && val > 0) {
                                  updated[index].status = 'activo';
                                }
                                setAdminUsers(updated);
                              }}
                              className={cn(
                                "border rounded px-2.5 py-1.5 font-mono font-bold outline-none focus:border-red-500 w-24 text-center",
                                u.isDemo ? "bg-black/30 border-white/5 text-white/30 cursor-not-allowed" : "bg-white/5 border-white/10 text-white"
                              )}
                              min="0"
                            />
                          </td>
                          <td className="p-4 text-right">
                            <button 
                              onClick={() => {
                                const updated = adminUsers.filter((_, i) => i !== index);
                                setAdminUsers(updated);
                              }}
                              className="p-2 text-white/40 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                              title="Eliminar usuario"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {adminUsers.length === 0 && (
                    <div className="p-8 text-center text-white/20 uppercase font-black tracking-widest text-xs">No hay usuarios activos</div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button 
                    onClick={() => {
                      localStorage.setItem('iptv_users_db', JSON.stringify(adminUsers));
                      // Sincronizar el estado del usuario activo actual si se modificó
                      if (currentUser && currentUser !== 'admin') {
                        const me = adminUsers.find(u => u.username === currentUser);
                        if (!me || me.status !== 'activo' || me.daysRemaining <= 0) {
                          localStorage.removeItem('iptv_active_session');
                          setIsAuthenticated(false);
                          setCurrentUser(null);
                          setShowAdminPanel(false);
                        } else {
                          setDaysRemaining(me.daysRemaining);
                        }
                      }
                      alert("Usuarios actualizados correctamente");
                    }}
                    className="px-6 py-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black tracking-widest text-xs uppercase flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-red-600/20"
                  >
                    <Save size={16} />
                    Guardar Usuarios
                  </button>
                </div>
              </div>
            )}

            {/* TAB: CHANNELS */}
            {adminActiveTab === 'channels' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center bg-white/[0.02] p-4 rounded-xl border border-white/5">
                  <p className="text-white/40 text-xs font-semibold uppercase">Configure sus cuadrados (canales de inicio), logos y opciones de enlaces multi-espejo.</p>
                  <button 
                    onClick={() => {
                      const newChan = {
                        id: `chan_${Date.now()}`,
                        name: `NUEVO CANAL`,
                        logo: 'https://placehold.co/200x200/1a1a1a/ffffff/png?text=LOGO',
                        urls: ['https://s2.bufaloweb.com/bufalo3/tracks-v1a1/mono.ts.m3u8'],
                        category: 'General',
                        type: 'live',
                        url: 'https://s2.bufaloweb.com/bufalo3/tracks-v1a1/mono.ts.m3u8'
                      };
                      const updated = [newChan, ...adminChannels]; // Agregar al inicio!
                      setAdminChannels(updated);
                    }}
                    className="px-4 py-2.5 rounded-lg bg-white text-black hover:bg-white/90 text-xs font-black tracking-wider uppercase flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Plus size={16} />
                    Agregar cuadrado al inicio
                  </button>
                </div>

                <div className="space-y-6">
                  {adminChannels.map((ch, index) => (
                    <div 
                      key={ch.id || index} 
                      className="p-6 rounded-xl border border-white/5 bg-black/40 space-y-4 relative group transition-all"
                    >
                      <div className="absolute top-6 right-6 flex items-center gap-2 flex-wrap z-30">
                        {/* Position Selector Textbox */}
                        <div className="flex items-center gap-1.5 bg-black/60 p-1.5 px-3 border border-white/10 rounded-xl">
                          <span className="text-[10px] font-black tracking-widest text-white/40 uppercase">Posición:</span>
                          <input 
                            type="number" 
                            value={index + 1}
                            min="1"
                            max={adminChannels.length}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              if (!isNaN(val) && val >= 1 && val <= adminChannels.length) {
                                const targetIndex = val - 1;
                                if (targetIndex !== index) {
                                  const list = [...adminChannels];
                                  const [moved] = list.splice(index, 1);
                                  list.splice(targetIndex, 0, moved);
                                  setAdminChannels(list);
                                }
                              }
                            }}
                            className="bg-white/5 border border-white/10 rounded p-1 font-mono font-bold text-center w-14 outline-none focus:border-red-500 text-xs text-white"
                          />
                        </div>

                        <button 
                          onClick={() => {
                            const updated = adminChannels.filter((_, i) => i !== index);
                            setAdminChannels(updated);
                          }}
                          className="p-2 text-white/40 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                          title="Eliminar Canal"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {/* Logo Upload / preview */}
                        <div className="md:col-span-1 flex flex-col items-center justify-center p-4 rounded-xl border border-white/5 bg-white/[0.01]">
                          <img 
                            src={ch.logo} 
                            alt="Preview" 
                            className="w-24 h-24 object-contain rounded-xl border p-2 bg-black border-white/10"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://placehold.co/100x100/1a1a1a/ffffff/png?text=ERROR';
                            }}
                          />
                          <p className="text-[9px] font-black text-white/30 tracking-wider uppercase mt-3">Subir imagen / archivo local:</p>
                          <label className="mt-2 text-xs text-red-500 hover:text-red-400 font-black cursor-pointer flex items-center gap-1">
                            <FileImage size={14} />
                            Sube PNG / JPG
                            <input 
                              type="file" 
                              accept="image/png, image/jpeg" 
                              className="hidden" 
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = (event) => {
                                    if (event.target?.result) {
                                      const updated = [...adminChannels];
                                      updated[index].logo = event.target.result as string;
                                      setAdminChannels(updated);
                                    }
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>
                        </div>

                        {/* Fields & URL Inputs */}
                        <div className="md:col-span-3 space-y-4">
                          <div>
                            <label className="block text-[10px] font-black text-white/40 tracking-wider uppercase mb-1">Nombre del Canal:</label>
                            <input 
                              type="text" 
                              value={ch.name}
                              onChange={(e) => {
                                const updated = [...adminChannels];
                                updated[index].name = e.target.value;
                                setAdminChannels(updated);
                              }}
                              className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 font-bold outline-none focus:border-red-500 text-sm"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-black text-white/40 tracking-wider uppercase mb-1">URL manual del Logo (opcional):</label>
                            <input 
                              type="text" 
                              value={ch.logo?.startsWith('data:') ? "" : ch.logo}
                              placeholder="https://ejemplo.com/logo.png"
                              onChange={(e) => {
                                const updated = [...adminChannels];
                                updated[index].logo = e.target.value || 'https://placehold.co/200x200/1a1a1a/ffffff/png?text=LOGO';
                                setAdminChannels(updated);
                              }}
                              className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 font-semibold outline-none focus:border-red-500 text-xs text-white/60"
                            />
                          </div>

                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <label className="block text-[10px] font-black text-white/40 tracking-wider uppercase">Casillas de Enlaces de Reproducción:</label>
                              <button 
                                onClick={() => {
                                  const updated = [...adminChannels];
                                  if (!updated[index].urls) updated[index].urls = [updated[index].url || ""];
                                  updated[index].urls.push("");
                                  setAdminChannels(updated);
                                }}
                                className="text-[9px] font-black text-red-500 hover:text-red-400 uppercase flex items-center gap-0.5"
                              >
                                <Plus size={12} />
                                Agregar Enlace (+)
                              </button>
                            </div>
                            
                            <div className="space-y-4">
                              {(ch.urls || [ch.url || ""]).map((urlVal: string, urlIdx: number) => {
                                const isUrlEmbed = urlVal.startsWith("embed::");
                                const displayUrl = isUrlEmbed ? urlVal.substring(7) : urlVal;
                                
                                return (
                                  <div key={urlIdx} className="space-y-1 bg-white/[0.02] p-2.5 rounded border border-white/5">
                                    <div className="flex gap-2 items-center">
                                      <span className="text-[10px] font-black text-white/30 uppercase w-20 shrink-0">
                                        {urlIdx === 0 ? "OP1 PRINCIPAL" : `OP${urlIdx + 1}`}
                                      </span>
                                      <input 
                                        type="text" 
                                        value={displayUrl}
                                        onChange={(e) => {
                                          const updated = [...adminChannels];
                                          if (!updated[index].urls) updated[index].urls = [];
                                          const newVal = isUrlEmbed ? `embed::${e.target.value}` : e.target.value;
                                          updated[index].urls[urlIdx] = newVal;
                                          if (urlIdx === 0) {
                                            updated[index].url = newVal;
                                          }
                                          setAdminChannels(updated);
                                        }}
                                        placeholder="Pegar enlace .m3u8, .ts, .mpd, .mp4, o código <iframe /> / embed"
                                        className="flex-1 bg-white/5 border border-white/10 rounded px-3 py-2 outline-none focus:border-red-500 text-xs font-mono"
                                      />
                                      {urlIdx > 0 && (
                                        <button 
                                          onClick={() => {
                                            const updated = [...adminChannels];
                                            updated[index].urls = updated[index].urls.filter((_: any, i: number) => i !== urlIdx);
                                            setAdminChannels(updated);
                                          }}
                                          className="p-2 text-white/30 hover:text-red-500 transition-colors shrink-0"
                                          title="Quitar enlace"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 pl-20">
                                      <label className="flex items-center gap-1.5 text-[10px] font-black tracking-widest text-white/40 cursor-pointer hover:text-white uppercase select-none">
                                        <input 
                                          type="checkbox"
                                          checked={isUrlEmbed || displayUrl.trim().startsWith("<")}
                                          disabled={displayUrl.trim().startsWith("<")}
                                          onChange={(e) => {
                                            const updated = [...adminChannels];
                                            if (!updated[index].urls) updated[index].urls = [];
                                            const checked = e.target.checked;
                                            const newVal = checked 
                                              ? `embed::${displayUrl}` 
                                              : displayUrl;
                                            
                                            updated[index].urls[urlIdx] = newVal;
                                            if (urlIdx === 0) {
                                              updated[index].url = newVal;
                                            }
                                            setAdminChannels(updated);
                                          }}
                                          className="rounded border-white/10 bg-white/5 text-red-600 focus:ring-0 focus:ring-offset-0 w-3 h-3 accent-red-600 cursor-pointer"
                                        />
                                        Reproducir como iframe EMBED
                                      </label>
                                      <span className="text-[9px] font-medium text-white/20 uppercase">
                                        (marca esto si usas un link embed o pegas un iframe completo)
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {adminChannels.length === 0 && (
                    <div className="p-12 text-center text-white/20 uppercase font-black tracking-widest text-xs border border-dashed border-white/10 rounded-2xl">No hay ningún canal configurado</div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                  <button 
                    onClick={() => {
                      // Guardar en localStorage
                      localStorage.setItem('iptv_channels_db', JSON.stringify(adminChannels));
                      
                      // Actualizar los canales de la interfaz de usuario al instante!
                      setAllChannels(adminChannels);
                      setDisplayItems(adminChannels);
                      if (adminChannels.length > 0) {
                        setActiveVid(adminChannels[0].urls?.[0] || adminChannels[0].url || "");
                        setActiveIndex(0);
                      }
                      
                      alert("Canales de Inicio guardados y actualizados correctamente");
                    }}
                    className="px-6 py-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black tracking-widest text-xs uppercase flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-red-600/20"
                  >
                    <Save size={16} />
                    Guardar Canales
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} /> */}

      {/* Background Content */}
      <div className="absolute inset-0 z-0 h-full w-full">
        <AnimatePresence mode="wait">
          {!hasInteracted || !isAuthenticated ? (
            <motion.div 
              key="bg-placeholder"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1 }}
              className="absolute inset-0"
            >
              <img 
                src="https://images.unsplash.com/photo-1542204112-97376d307ce7?auto=format&fit=crop&q=80&w=1920&h=1080" 
                className="w-full h-full object-cover"
                alt="Background" 
              />
              <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
            </motion.div>
          ) : (
            <motion.div
              key="video-player"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1 }}
              className="absolute inset-0"
            >
              {activeVid && (
                <VideoPlayer 
                  url={activeVid} 
                  className="w-full h-full object-cover"
                  autoPlay={true}
                  muted={muted}
                  onMuteChange={(m) => setMuted(m)}
                  isPlayFocused={isVideoPlayFocused}
                  onPlayTriggered={() => setIsVideoPlayFocused(false)}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90 pointer-events-none" />
      </div>

      {/* Header Bar */}
      <AnimatePresence>
        {isUiVisible && isAuthenticated && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-0 left-0 w-full p-4 sm:p-8 z-50 flex justify-between items-center"
          >
            {/* Action button on the left to activate volume */}
            <div className="flex items-center gap-4">
              {muted && (
                <button 
                  onClick={(e) => { e.stopPropagation(); setMuted(false); resetIdleTimer(); }}
                  className="px-6 py-4 rounded-xl sm:rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-xs sm:text-sm lg:text-base tracking-widest uppercase transition-all shadow-2xl animate-pulse cursor-pointer flex items-center gap-3 border border-red-500/50 select-none"
                >
                  <Zap size={20} fill="currentColor" />
                  activa volumen da clic
                </button>
              )}
            </div>

            {/* Header Right Buttons */}
            <div className="flex gap-4">
              <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  if (isAdmin) {
                    setShowAdminPanel(true);
                  } else {
                    setLoginViewOpen(true);
                  }
                  resetIdleTimer();
                }}
                className={cn(
                  "p-4 rounded-full backdrop-blur-md border hover:scale-110 active:scale-90 transition-all shadow-xl flex items-center justify-center cursor-pointer",
                  isAdmin 
                    ? "bg-red-600/90 border-red-500/50 text-white hover:bg-red-600 shadow-[0_0_20px_rgba(239,68,68,0.4)]" 
                    : "bg-black/40 border-white/10 text-white hover:bg-white hover:text-black"
                )}
                title={isAdmin ? "Configuración de Administrador" : "Iniciar Sesión"}
              >
                <Lock size={24} />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); setMuted(!muted); resetIdleTimer(); }}
                className="p-4 rounded-full bg-black/40 backdrop-blur-md border border-white/10 hover:bg-white hover:text-black transition-all shadow-xl"
              >
                {muted ? <VolumeX size={24} /> : <VolumeX className="opacity-40" size={24} />}
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); toggleFullscreen(); resetIdleTimer(); }}
                className="p-4 rounded-full bg-black/40 backdrop-blur-md border border-white/10 hover:bg-white hover:text-black transition-all shadow-xl"
              >
                <Maximize size={24} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mute Indicator - REMOVED AS PER REQUEST */}

      {/* Slider de Cuadros Inferiores */}
      <AnimatePresence>
        {!isFullscreen && isAuthenticated && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="absolute -bottom-4 left-0 w-full p-2 lg:p-4 pb-0 lg:pb-0 z-10 flex flex-col items-center"
          >
            
            {/* Opciones de Canal en el panel izquierdo flotante, según lo solicitado */}
            {(() => {
              const currentItem = displayItems[activeIndex];
              if (!currentItem || !currentItem.urls || currentItem.urls.length <= 1) return null;
              return (
                <div 
                  className="fixed bottom-[180px] left-4 md:left-6 z-50 flex flex-col items-start gap-2 bg-black/85 backdrop-blur-3xl border border-white/10 rounded-2xl p-4 shadow-[0_0_50px_rgba(0,0,0,0.8)] w-60 max-h-[300px] overflow-y-auto"
                >
                  <div className="flex items-center gap-1.5 text-white/50 mb-0.5">
                    <List size={14} className="text-red-500 animate-pulse" />
                    <span className="text-[9px] font-black tracking-[0.2em] uppercase">Opciones Disponibles</span>
                  </div>
                  <h3 className="text-white text-xs font-black tracking-wide truncate max-w-full uppercase italic mb-1">
                    {currentItem.name}
                  </h3>
                  
                  <div className="flex flex-col gap-1.5 w-full">
                    {currentItem.urls.map((choiceUrl: string, oIdx: number) => {
                      if (!choiceUrl) return null;
                      const isSelected = currentItem.url === choiceUrl || (!currentItem.url && oIdx === 0);
                      
                      return (
                        <button
                          key={`left-opt-${currentItem.id}-${oIdx}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectAlternativeStream(currentItem.id, choiceUrl);
                            setActiveSubIndex(oIdx);
                            resetIdleTimer();
                          }}
                          onMouseEnter={() => {
                            setActiveSubIndex(oIdx);
                          }}
                          className={cn(
                            "w-full py-2 px-3 rounded-xl text-left font-bold text-[10px] uppercase tracking-wider transition-all border flex items-center justify-between cursor-pointer",
                            isSelected
                              ? "bg-red-600 border-red-500 text-white shadow-[0_0_12px_rgba(239,68,68,0.3)]"
                              : "bg-white/5 border-white/5 text-white/60 hover:bg-white/10 hover:text-white",
                            activeSubIndex === oIdx
                              ? "ring-2 ring-white border-white scale-[1.03] bg-red-600/95 text-white shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                              : ""
                          )}
                        >
                          <span>Opción {oIdx + 1}</span>
                          {isSelected && <span className="w-1 h-1 rounded-full bg-white animate-pulse" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Series Navigation (Seasons/Episodes) */}
            <AnimatePresence>
              {selectedSeries && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.5, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.5, y: 20 }}
                  className="mb-8 flex gap-3 overflow-x-auto no-scrollbar max-w-full px-10 pb-2"
                >
                  {/* Temporadas as circles */}
                  {Array.from(new Set(selectedSeries.episodes?.map((ep: any) => {
                    const match = ep.name.match(/S(\d+)/i);
                    return match ? parseInt(match[1]) : 1;
                  }) || [1])).sort((a: any, b: any) => a - b).map((season: any) => (
                    <button
                      key={`season-${season}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSeason(season);
                        // Filter episodes for this season and update bottom grid
                        const seasonEpisodes = selectedSeries.episodes.filter((ep: any) => {
                          const m = ep.name.match(/S(\d+)/i);
                          return (m ? parseInt(m[1]) : 1) === season;
                        });
                        setDisplayItems(seasonEpisodes);
                        setActiveIndex(0);
                        setActiveVid(seasonEpisodes[0]?.url || "");
                        resetIdleTimer();
                      }}
                      className={cn(
                        "flex-none w-16 h-16 rounded-full border flex items-center justify-center text-xs font-black tracking-widest transition-all shadow-xl",
                        selectedSeason === season ? "bg-red-600 border-red-600 text-white scale-110" : "glass-premium border-white/10 text-white/60 hover:bg-white/10"
                      )}
                    >
                      T{season}
                    </button>
                  ))}
                  
                  {selectedSeason && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Go back to series folders
                        const seriesType = selectedSeries.type || 'series';
                        const cats = getCategories(seriesType);
                        selectCategory(seriesType, selectedSeries.category);
                        setSelectedSeries(null);
                        setSelectedSeason(null);
                      }}
                      className="flex-none w-16 h-16 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white ml-4"
                    >
                      <ArrowLeft size={20} />
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {loadingChannels && (
              <div className="mb-2 flex flex-col items-center gap-3 text-white/40 bg-black/60 backdrop-blur-3xl px-8 py-6 rounded-[2rem] border border-white/10 shadow-2xl animate-pulse">
                 <Loader2 className="animate-spin text-red-600" size={32} />
                 <span className="text-[12px] font-black tracking-[0.3em] text-center max-w-xs leading-relaxed uppercase italic">
                   CARGANDO ESTAMOS SUBIENDO TODA LA LISTA TOMARA UN MOMENTO
                 </span>
              </div>
            )}

            <div className="relative w-full max-w-[100vw] flex items-center group overflow-hidden">
              {/* Flechas de Navegación - Hidden on Mobile */}
              <button 
                onClick={(e) => { e.stopPropagation(); scrollSlider('left'); resetIdleTimer(); }}
                className="absolute left-4 z-20 w-12 h-12 rounded-full border border-white/10 hidden sm:flex items-center justify-center bg-black/60 backdrop-blur-xl hover:bg-white hover:text-black transition-all opacity-0 group-hover:opacity-100 shadow-2xl"
              >
                <ChevronLeft size={24} />
              </button>

              <div 
                ref={scrollRef}
                className="flex gap-4 lg:gap-6 overflow-x-auto no-scrollbar py-6 px-10 sm:px-16 w-full scroll-smooth snap-x snap-mandatory"
              >
                {displayItems.map((item, idx) => (
                  <div key={item.id || idx} className="flex-none flex flex-col items-center gap-3 focusable-item snap-center">
                    {/* Placeholder div to keep aligning identical across all items in the slider */}
                    <div className="h-8 w-1 mb-1 opacity-0 pointer-events-none" />
                    <FocusableBox
                      focused={activeIndex === idx}
                      onClick={(e: any) => { 
                        e.stopPropagation();
                        handleBoxClick(idx);
                        resetIdleTimer();
                      }}
                      className={cn(
                        "w-[26vw] h-[26vw] sm:w-28 sm:h-28 lg:w-36 lg:h-36 flex items-center justify-center rounded-[1.2rem] sm:rounded-[1.8rem] overflow-hidden",
                        "glass-premium transition-all duration-300 border-2",
                        activeIndex === idx 
                          ? (activeSubIndex >= 0 
                              ? "bg-white/10 scale-105 border-red-600/50 shadow-[0_0_30px_rgba(239,68,68,0.3)]"
                              : "bg-white/15 scale-110 border-red-600 shadow-[0_0_60px_rgba(239,68,68,0.6)]")
                          : "opacity-60 border-white/5 shadow-lg hover:opacity-100"
                      )}
                    >
                      {item.logo ? (
                        <div className={cn(
                          "w-full h-full flex items-center justify-center transition-all duration-500 rounded-[1.2rem] sm:rounded-[1.8rem] overflow-hidden",
                          activeIndex === idx ? "scale-110" : ""
                        )}>
                          <img 
                            src={item.logo} 
                            className="w-full h-full object-cover rounded-[1.2rem] sm:rounded-[1.8rem]" 
                            referrerPolicy="no-referrer"
                            alt="" 
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://placehold.co/200x200/1a1a1a/ffffff/png?text=${encodeURIComponent((item.name || item.label || "?").substring(0, 3))}`;
                            }}
                          />
                        </div>
                      ) : item.icon ? (
                        <div className={cn(
                          "w-full h-full flex items-center justify-center",
                          activeIndex === idx ? "text-red-500" : "text-white/60"
                        )}>
                          {item.icon}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-white/5 to-white/10 w-full h-full">
                          <Tv className={cn("mb-2 transition-colors", activeIndex === idx ? "text-red-600" : "text-white/20")} size={32} />
                          <div className={cn(
                             "text-[10px] sm:text-xs tracking-wider leading-tight uppercase line-clamp-2 font-black italic",
                             activeIndex === idx ? "text-white" : "text-white/40"
                          )}>
                            {selectedSeason ? `C${idx + 1} - ${item.name}` : (item.name || item.label)}
                          </div>
                        </div>
                      )}
                    </FocusableBox>
                    {/* Titles removed per user request */}
                  </div>
                ))}
              </div>

              <button 
                onClick={(e) => { e.stopPropagation(); scrollSlider('right'); resetIdleTimer(); }}
                className="absolute right-4 z-20 w-12 h-12 rounded-full border border-white/10 hidden sm:flex items-center justify-center bg-black/60 backdrop-blur-xl hover:bg-white hover:text-black transition-all opacity-0 group-hover:opacity-100 shadow-2xl"
              >
                <ChevronRight size={24} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar / Explorador */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="absolute inset-0 z-40 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="absolute top-0 right-0 w-[450px] h-full z-50 bg-[#060606] border-l border-white/5 p-12 flex flex-col shadow-[-100px_0_200px_rgba(0,0,0,1)]"
            >
              <div className="flex justify-between items-center mb-16 border-b border-white/5 pb-10">
                <div className="flex items-center gap-4">
                  {sidebarView === 'categories' && (
                    <button 
                      onClick={() => setSidebarView('main')}
                      className="p-3 bg-white/5 rounded-xl hover:bg-red-600 transition-all"
                    >
                      <ArrowLeft size={20} />
                    </button>
                  )}
                  <h3 className="text-3xl font-black italic tracking-tighter text-red-600 uppercase">
                    {sidebarView === 'main' ? 'BIBLIOTECA' : selectedType}
                  </h3>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="p-4 hover:bg-white/5 rounded-2xl transition-colors">
                  <ChevronRight size={32} />
                </button>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto no-scrollbar">
                {sidebarView === 'main' ? (
                  <>
                    {[
                      { id: 'live', label: 'TV EN VIVO', icon: <Tv size={24} /> },
                      { id: 'movie', label: 'PELÍCULAS', icon: <Clapperboard size={24} /> },
                      { id: 'series', label: 'SERIES', icon: <Film size={24} /> },
                    ].filter(item => allChannels.some(c => c.type === item.id)).map((item) => (
                      <button 
                        key={item.id}
                        onClick={() => selectTypeInSidebar(item.id as any)}
                        className="w-full p-8 bg-white/[0.02] border border-white/[0.03] rounded-2xl text-left font-black tracking-[0.3em] text-[12px] hover:bg-red-600 hover:text-white transition-all flex justify-between items-center group uppercase shadow-xl"
                      >
                        <span className="flex items-center gap-6">
                           {item.icon}
                           {item.label}
                        </span>
                        <ChevronRight size={20} className="opacity-20 group-hover:opacity-100" />
                      </button>
                    ))}
                  </>
                ) : (
                  <>
                    {(getCategories(selectedType!) as string[]).map((cat: string) => (
                      <button 
                        key={cat} 
                        onClick={() => selectCategory(selectedType!, cat)}
                        className="w-full p-6 bg-white/[0.02] border border-white/[0.03] rounded-2xl text-left font-black tracking-[0.2em] text-[10px] hover:bg-red-600 hover:text-white transition-all flex justify-between items-center group uppercase"
                      >
                        {cat}
                        <div className="w-2 h-2 bg-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </>
                )}
              </div>

              <div className="mt-auto pt-10 border-t border-white/5 flex flex-col gap-6">
                <div className="flex items-center gap-4 text-[8px] font-black tracking-[0.3em] text-white/10 uppercase italic">
                  PRO PLAYER v2.0
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Fullscreen Interaction "Salir Ahora" Button Overlay */}
      <AnimatePresence>
        {isFullscreen && isUiVisible && (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            className="fixed right-8 top-1/2 -translate-y-1/2 z-[130]"
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFullscreen();
              }}
              className="px-6 py-6 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black tracking-widest text-sm uppercase transition-all shadow-[0_0_50px_rgba(239,68,68,0.4)] border border-red-500 flex items-center justify-center gap-3 cursor-pointer select-none"
            >
              <Power size={18} />
              <span>Salir Ahora</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


