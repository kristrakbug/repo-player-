/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Lock, Save, Globe, Shield, RefreshCw, LogOut } from 'lucide-react';
import { auth, db, googleProvider, signInWithPopup, handleFirestoreError, OperationType } from '../lib/firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

export default function Admin() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [masterPassword, setMasterPassword] = useState('');
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);
  const [error, setError] = useState('');
  
  const [m3uUrl, setM3uUrl] = useState('');
  const [xtreamUrl, setXtreamUrl] = useState('');
  const [username, setUsername] = useState('');
  const [xtreamPass, setXtreamPass] = useState('');

  const ADMIN_EMAIL = 'christianandresrodriguezsierra@gmail.com';

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      if (u && u.email === ADMIN_EMAIL && u.emailVerified) {
        loadSettings();
      }
    });
    return () => unsubscribe();
  }, []);

  const loadSettings = async () => {
    const path = 'settings/global';
    try {
      const docSnap = await getDoc(doc(db, path));
      if (docSnap.exists()) {
        const data = docSnap.data();
        setM3uUrl(data.m3uUrl || '');
        setXtreamUrl(data.xtreamUrl || '');
        setUsername(data.username || '');
        setXtreamPass(data.password || '');
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, path);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (masterPassword === '1073254064') {
      setIsPasswordVerified(true);
      setError('');
    } else {
      setError('Contraseña incorrecta');
    }
  };

  const signIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error('Sign in error:', err);
    }
  };

  const handleSave = async () => {
    if (!user || user.email !== ADMIN_EMAIL) {
      alert('No tienes permisos de administrador para guardar cambios.');
      return;
    }

    const path = 'settings/global';
    try {
      await setDoc(doc(db, path), {
        m3uUrl,
        xtreamUrl,
        username,
        password: xtreamPass,
        updatedAt: serverTimestamp()
      });
      alert('Configuración guardada exitosamente en la nube');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <RefreshCw className="animate-spin text-red-600" size={40} />
    </div>
  );

  if (!user || user.email !== ADMIN_EMAIL) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black p-6">
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="w-full max-w-md bg-zinc-900/50 p-10 rounded-3xl border border-zinc-800 shadow-2xl backdrop-blur-md text-center"
        >
          <Shield className="mx-auto text-red-500 mb-6" size={60} />
          <h2 className="text-3xl font-bold mb-4">Acceso Reservado</h2>
          <p className="text-zinc-500 mb-8">Debes iniciar sesión con tu cuenta de administrador de Google.</p>
          <button 
            onClick={signIn}
            className="w-full py-4 bg-white text-black font-bold rounded-2xl hover:bg-zinc-200 transition-all flex items-center justify-center gap-3"
          >
            <Globe size={20} />
            CONTINUAR CON GOOGLE
          </button>
          <button 
            onClick={() => window.location.href = '/'}
            className="mt-6 text-zinc-500 hover:text-white transition-colors block mx-auto text-sm"
          >
            Volver al Player
          </button>
        </motion.div>
      </div>
    );
  }

  if (!isPasswordVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black p-6">
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="w-full max-w-md bg-zinc-900/50 p-10 rounded-3xl border border-zinc-800 shadow-2xl backdrop-blur-md"
        >
          <div className="flex justify-center mb-8">
            <div className="p-4 bg-red-600/10 rounded-2xl">
              <Lock className="text-red-500" size={40} />
            </div>
          </div>
          
          <h2 className="text-3xl font-bold text-center mb-2">Segunda Capa</h2>
          <p className="text-zinc-500 text-center mb-8">Ingresa la clave maestra para confirmar el acceso.</p>
          
          <form onSubmit={handleLogin} className="space-y-6">
            <input 
              type="password" 
              value={masterPassword}
              onChange={(e) => setMasterPassword(e.target.value)}
              className="w-full bg-black/50 border border-zinc-800 rounded-2xl p-4 text-center text-2xl tracking-[0.5em] outline-none focus:border-red-600 transition-all"
              autoFocus
            />
            {error && <p className="text-red-500 text-sm text-center font-medium">{error}</p>}
            <button 
              type="submit"
              className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-red-600/20"
            >
              VERIFICAR ACCESO
            </button>
          </form>
          <button 
            onClick={() => signOut(auth)}
            className="mt-6 text-zinc-500 hover:text-white transition-colors block mx-auto text-sm"
          >
            Cerrar Sesión Google
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] p-8 lg:p-12">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-start mb-12">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-white mb-2">Nexo Global IPTV</h1>
            <p className="text-zinc-500">Mapeo de fuentes maestros para la plataforma streaming.</p>
          </div>
          <div className="flex flex-col items-end gap-3 text-right">
            <div className="flex items-center gap-2 px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-full text-xs text-zinc-400 font-bold uppercase tracking-wider">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              {user.email}
            </div>
            <button 
              onClick={() => signOut(auth)}
              className="flex items-center gap-2 text-zinc-600 hover:text-red-500 transition-colors text-sm font-bold"
            >
              <LogOut size={16} />
              CERRAR PANEL
            </button>
          </div>
        </div>

        <div className="grid gap-8">
          <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-8 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-8">
              <Globe className="text-blue-500" />
              <h2 className="text-xl font-semibold">Fuente M3U Principal</h2>
            </div>
            <div className="space-y-4">
              <label className="block text-xs text-zinc-500 font-black uppercase tracking-wider">URL de Lista M3U / M3U8</label>
              <input 
                type="text" 
                value={m3uUrl}
                onChange={(e) => setM3uUrl(e.target.value)}
                placeholder="https://servidor.com/lista.m3u8"
                className="w-full bg-black/50 border border-zinc-800 rounded-xl p-4 text-white focus:border-blue-500 outline-none transition-all placeholder:text-zinc-800"
              />
            </div>
          </div>

          <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-8 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-8">
              <Shield className="text-purple-500" />
              <h2 className="text-xl font-semibold">API Xtream Codes (Respaldo/Dual)</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs text-zinc-500 font-black uppercase tracking-wider">URL del Servidor</label>
                <input 
                  type="text" 
                  value={xtreamUrl}
                  onChange={(e) => setXtreamUrl(e.target.value)}
                  placeholder="http://server.com:8080"
                  className="w-full bg-black/50 border border-zinc-800 rounded-xl p-4 text-white outline-none focus:border-purple-500 placeholder:text-zinc-800"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-zinc-500 font-black uppercase tracking-wider">Usuario</label>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-black/50 border border-zinc-800 rounded-xl p-4 text-white outline-none focus:border-purple-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-zinc-500 font-black uppercase tracking-wider">Contraseña</label>
                <input 
                  type="password" 
                  value={xtreamPass}
                  onChange={(e) => setXtreamPass(e.target.value)}
                  className="w-full bg-black/50 border border-zinc-800 rounded-xl p-4 text-white outline-none focus:border-purple-500"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4 mt-4">
            <button 
              onClick={() => window.location.href = '/'}
              className="px-8 py-4 bg-zinc-900 text-zinc-400 font-bold rounded-xl hover:bg-zinc-800 transition-all active:scale-95 border border-zinc-800"
            >
              VOLVER AL PLAYER
            </button>
            <button 
              onClick={handleSave}
              className="flex items-center gap-2 px-12 py-4 bg-white text-black font-bold rounded-xl hover:bg-white/90 transition-all active:scale-95 shadow-xl shadow-white/5"
            >
              <Save size={20} />
              <span>GUARDAR CONFIGURACIÓN</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

