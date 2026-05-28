/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import Hls from 'hls.js';
// @ts-ignore
import dashjs from 'dashjs';
// @ts-ignore
import mpegts from 'mpegts.js';
import { useEffect, useRef, memo, useState } from 'react';
import { Play, Loader2 } from 'lucide-react';

interface VideoPlayerProps {
  url: string;
  className?: string;
  autoPlay?: boolean;
  muted?: boolean;
  onMuteChange?: (muted: boolean) => void;
  isPlayFocused?: boolean;
  onPlayTriggered?: () => void;
}

function extractStreamUrl(input: string): string {
  let text = input.trim();
  
  if (text.startsWith("<iframe") || text.includes("<")) {
    const srcMatch = text.match(/src=["']([^"']+)["']/i);
    if (srcMatch && srcMatch[1]) {
      text = srcMatch[1];
    }
  }

  if (text.includes("?url=") || text.includes("&url=")) {
    const urlParamMatch = text.match(/[?&]url=([^&]+)/i);
    if (urlParamMatch && urlParamMatch[1]) {
      return decodeURIComponent(urlParamMatch[1]);
    }
  }

  return text;
}

const VideoPlayer = memo(function VideoPlayer({ url, className, autoPlay = true, muted = false, onMuteChange, isPlayFocused = false, onPlayTriggered }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [interacted, setInteracted] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [playbackState, setPlaybackState] = useState<'loading' | 'playing' | 'error'>('loading');

  let isEmbed = false;
  let cleanUrl = url || "";

  if (cleanUrl.startsWith("embed::")) {
    isEmbed = true;
    cleanUrl = cleanUrl.substring(7);
  } else {
    const trimmed = cleanUrl.trim().toLowerCase();
    if (
      trimmed.startsWith("<iframe") || 
      trimmed.includes("<div") || 
      (trimmed.includes("<script") && trimmed.includes("embed")) || 
      trimmed.includes("iframe") ||
      trimmed.includes("video-player.php") ||
      trimmed.includes("player.php") ||
      trimmed.includes("/embed/") ||
      trimmed.includes("anym3u8player")
    ) {
      isEmbed = true;
    }
  }

  useEffect(() => {
    setInteracted(false);
  }, [url]);

  useEffect(() => {
    setPlaybackState('loading');

    // Timeout of 12 seconds for the channel to play
    const errorTimer = setTimeout(() => {
      setPlaybackState(current => {
        if (current === 'loading') {
          return 'error';
        }
        return current;
      });
    }, 12000);

    // If it is an embed, transition loading overlay after 4 seconds to show the feed
    let embedTimer: NodeJS.Timeout | null = null;
    if (isEmbed) {
      embedTimer = setTimeout(() => {
        setPlaybackState(current => current === 'error' ? 'error' : 'playing');
      }, 4000);
    }

    return () => {
      clearTimeout(errorTimer);
      if (embedTimer) clearTimeout(embedTimer);
    };
  }, [url, isEmbed]);

  useEffect(() => {
    if (!isEmbed) return;
    
    // Give a short timeout for the DOM / IFrame to be fully mounted
    const timer = setTimeout(() => {
      const container = containerRef.current;
      if (!container) return;

      const iframes = container.getElementsByTagName('iframe');
      for (let i = 0; i < iframes.length; i++) {
        const iframe = iframes[i];
        
        // Ensure strict auto-play credentials is set in the attribute level
        iframe.setAttribute('allow', 'autoplay; fullscreen; encrypted-media; picture-in-picture');
        
        const src = iframe.getAttribute('src') || '';
        if (src) {
          let updatedSrc = src;
          // Make sure autoplay parameters are present in the query string
          if (!src.includes('autoplay=')) {
            const separator = src.includes('?') ? '&' : '?';
            updatedSrc += `${separator}autoplay=1`;
          }
          if (!src.includes('play=')) {
            const separator = updatedSrc.includes('?') ? '&' : '?';
            updatedSrc += `${separator}play=1`;
          }
          if (src !== updatedSrc) {
            iframe.setAttribute('src', updatedSrc);
          }
        }

        // Programmatic gesture trigger & focus force for strict autoplay initialization
        try {
          iframe.focus();
          const rect = iframe.getBoundingClientRect();
          const evt = new MouseEvent('click', {
            clientX: rect.left + rect.width / 2,
            clientY: rect.top + rect.height / 2,
            bubbles: true,
            cancelable: true,
          });
          iframe.dispatchEvent(evt);
        } catch (e) {
          console.warn("Could not focus or click iframe:", e);
        }
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [url, isEmbed]);

  useEffect(() => {
    const handleWindowBlur = () => {
      setTimeout(() => {
        if (document.activeElement === iframeRef.current) {
          setInteracted(true);
        }
      }, 150);
    };

    window.addEventListener('blur', handleWindowBlur);
    return () => {
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isEmbed || interacted) return;
      // Only trigger if specifically focused on the Play button via remote/keyboard keys
      if (!isPlayFocused) return;

      if (e.key === 'Enter' || e.key === ' ' || e.keyCode === 13 || e.keyCode === 32) {
        e.preventDefault();
        if (overlayRef.current) {
          overlayRef.current.click();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isEmbed, interacted, isPlayFocused]);

  useEffect(() => {
    if (isEmbed) return;
    if (videoRef.current) {
      videoRef.current.muted = muted;
    }
  }, [muted, isEmbed]);

  useEffect(() => {
    if (isEmbed) return;
    const video = videoRef.current;
    if (!video || !cleanUrl) return;

    let hls: Hls | null = null;
    let dashPlayer: any = null;
    let mpegtsPlayer: any = null;

    const proxiedUrl = cleanUrl.startsWith('http') ? `/api/proxy?url=${encodeURIComponent(cleanUrl)}` : cleanUrl;

    const handlePlaying = () => {
      setPlaybackState('playing');
    };

    const handleWaiting = () => {
      setPlaybackState(current => current === 'error' ? 'error' : 'loading');
    };

    const handleError = () => {
      setPlaybackState('error');
    };

    if (video) {
      video.addEventListener('playing', handlePlaying);
      video.addEventListener('waiting', handleWaiting);
      video.addEventListener('error', handleError);
      video.addEventListener('stalled', handleWaiting);
    }

    const startVideo = () => {
      if (!video) return;
      video.volume = 1.0;
      video.muted = muted;
      if (autoPlay) {
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise.catch(err => {
            if (err.name === 'AbortError' || err.message?.includes('interrupted')) {
              return;
            }
            console.warn("Autoplay blocked, waiting for user interaction:", err);
            if (!video.muted) {
              video.muted = true;
              if (onMuteChange) onMuteChange(true);
              video.play().catch(e => {
                if (e.name !== 'AbortError') console.error("Muted autoplay also blocked:", e);
              });
            }
          });
        }
      }
    };

    const lowerUrl = url.toLowerCase();
    
    // 1. DASH PLAYER STATE (.mpd)
    if (lowerUrl.includes('.mpd')) {
      try {
        dashPlayer = dashjs.MediaPlayer().create();
        dashPlayer.initialize(video, proxiedUrl, autoPlay);
        dashPlayer.setMute(muted);
        dashPlayer.setVolume(1.0);
        
        dashPlayer.on('canPlay', () => {
          startVideo();
        });
        
        dashPlayer.on('error', (err: any) => {
          console.error("DASH Error:", err);
          setPlaybackState('error');
        });
      } catch (err) {
        console.error("Failed to initialize DASH player:", err);
        // Fallback to direct src
        video.src = proxiedUrl;
        video.addEventListener('loadedmetadata', startVideo);
      }
    }
    // 2. MPEG-TS PLAYER STATE (.ts tracks)
    else if (
      lowerUrl.endsWith('.ts') || 
      lowerUrl.includes('.ts?') || 
      lowerUrl.includes('/ts/') ||
      lowerUrl.includes('output=ts')
    ) {
      try {
        if (mpegts.getFeatureList().mseLivePlayback) {
          mpegtsPlayer = mpegts.createPlayer({
            type: 'mpegts',
            isLive: true,
            url: proxiedUrl,
            cors: true
          }, {
            enableStashBuffer: false, // low latency
            liveBufferLatencyChasing: true
          });
          mpegtsPlayer.attachMediaElement(video);
          mpegtsPlayer.load();
          
          mpegtsPlayer.on(mpegts.Events.ERROR, (type: any, detail: any, info: any) => {
            console.error("mpegts.js error:", type, detail, info);
            setPlaybackState('error');
          });
          
          startVideo();
        } else {
          // MSE not supported, fallback direct src
          video.src = proxiedUrl;
          video.addEventListener('loadedmetadata', startVideo);
        }
      } catch (err) {
        console.error("mpegts initialization failed:", err);
        video.src = proxiedUrl;
        video.addEventListener('loadedmetadata', startVideo);
      }
    }
    // 3. HLS PLAYER STATE (.m3u8, .m3u)
    else if (lowerUrl.includes('.m3u8') || lowerUrl.includes('.m3u')) {
      if (Hls.isSupported()) {
        hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
        });
        hls.loadSource(proxiedUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, startVideo);

        hls.on(Hls.Events.ERROR, (_, data) => {
          console.error("HLS Error:", data);
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.error("Network error fetching manifest or segment - likely CORS or 404. Details:", data.response);
                hls?.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.warn("Media error, trying to recover...");
                hls?.recoverMediaError();
                break;
              default:
                console.error("Fatal unrecoverable error, destroying HLS instance");
                setPlaybackState('error');
                hls?.destroy();
                break;
            }
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = proxiedUrl;
        video.addEventListener('loadedmetadata', startVideo);
      } else {
        // Fallback for direct src
        video.src = proxiedUrl;
        video.addEventListener('loadedmetadata', startVideo);
      }
    }
    // 4. DIRECT FALLBACK (mp4, webm, mkv, etc.)
    else {
      video.src = proxiedUrl;
      video.addEventListener('loadedmetadata', startVideo);
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
      if (dashPlayer) {
        dashPlayer.destroy();
      }
      if (mpegtsPlayer) {
        mpegtsPlayer.unload();
        mpegtsPlayer.detachMediaElement();
        mpegtsPlayer.destroy();
      }
      if (video) {
        video.removeEventListener('loadedmetadata', startVideo);
        video.removeEventListener('playing', handlePlaying);
        video.removeEventListener('waiting', handleWaiting);
        video.removeEventListener('error', handleError);
        video.removeEventListener('stalled', handleWaiting);
      }
    };
  }, [url, autoPlay]);

  const renderOverlays = () => {
    return (
      <>
        {playbackState === 'loading' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-20 pointer-events-none">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="animate-spin text-red-600 w-16 h-16" />
              <p className="text-white text-xs font-black tracking-[0.3em] uppercase italic animate-pulse">Cargando canal...</p>
            </div>
          </div>
        )}
        {playbackState === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/95 z-25">
            <div className="bg-red-950/40 border border-red-500/20 rounded-3xl p-8 text-center max-w-sm flex flex-col items-center gap-4 shadow-[0_0_50px_rgba(239,68,68,0.2)] animate-in fade-in zoom-in duration-300">
              <span className="text-4xl">⚠️</span>
              <p className="text-white text-xl font-black tracking-widest uppercase italic">Elige otra opción.</p>
            </div>
          </div>
        )}
      </>
    );
  };

  if (isEmbed) {
    const trimmedUrl = cleanUrl.trim();
    if (trimmedUrl.startsWith("<")) {
      return (
        <div className="absolute inset-0 w-full h-full bg-black">
          {renderOverlays()}
          <div 
            ref={containerRef}
            className="absolute inset-0 w-full h-full bg-black z-10 flex items-center justify-center overflow-hidden [&>div]:w-full [&>div]:h-full [&>div]:!pb-0 [&>div]:!h-full"
            dangerouslySetInnerHTML={{ __html: cleanUrl }}
          />
        </div>
      );
    } else {
      const streamUrl = extractStreamUrl(cleanUrl);
      const finalEmbedUrl = `https://anym3u8player.com/tv/video-player.php?url=${encodeURIComponent(streamUrl)}&autoplay=1&play=1`;
      
      return (
        <div className="absolute inset-0 w-full h-full bg-black">
          {renderOverlays()}
          <div ref={containerRef} className="absolute inset-0 w-full h-full bg-black z-10">
            <iframe 
              ref={iframeRef}
              src={finalEmbedUrl}
              className="absolute inset-0 w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
              allowFullScreen
              scrolling="no"
            />
          </div>
        </div>
      );
    }
  }

  return (
    <div className="absolute inset-0 w-full h-full bg-black">
      {renderOverlays()}
      <video
        id="main-video-player"
        ref={videoRef}
        className={className}
        playsInline
        autoPlay={autoPlay}
        muted={muted}
        controls={false}
      />
    </div>
  );
}, (prevProps, nextProps) => {
  const checkEmbed = (u: string) => {
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
  };

  const isEmbedPrev = checkEmbed(prevProps.url);
  const isEmbedNext = checkEmbed(nextProps.url);

  if (isEmbedPrev && isEmbedNext) {
    // If both are embeds, we re-render if the URL changes OR if play button focus changes!
    return prevProps.url === nextProps.url && prevProps.isPlayFocused === nextProps.isPlayFocused;
  }

  // Otherwise, standard props check
  return (
    prevProps.url === nextProps.url &&
    prevProps.className === nextProps.className &&
    prevProps.autoPlay === nextProps.autoPlay &&
    prevProps.muted === nextProps.muted &&
    prevProps.isPlayFocused === nextProps.isPlayFocused
  );
});

export default VideoPlayer;
