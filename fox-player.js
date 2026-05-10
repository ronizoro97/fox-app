/* ═══════════════════════════════════════════
   FOX PLAYER — Shared JS (movie + game)
   ═══════════════════════════════════════════ */

(function () {
  'use strict';

  // ── State ──────────────────────────────────
  let isPlaying  = false;
  let hideTimer  = null;
  let tickTimer  = null;
  let fakeTime   = 0;
  let fakeDur    = 150;
  let isSeeking  = false;
  let touchStartX = 0;

  // ── Helpers ────────────────────────────────
  function $(id) { return document.getElementById(id); }

  function fmt(s) {
    s = Math.floor(s);
    const m = Math.floor(s / 60);
    return `${m}:${(s % 60).toString().padStart(2, '0')}`;
  }

  function postCmd(fn, args) {
    const f = $('ytIframe');
    if (f && f.src) {
      f.contentWindow.postMessage(JSON.stringify({ event: 'command', func: fn, args }), '*');
    }
  }

  // ── UI Visibility ───────────────────────────
  function showUI() {
    const modal = $('foxPlayerModal');
    if (modal) modal.classList.remove('fp-hide-ui');
    clearTimeout(hideTimer);
    if (isPlaying) {
      hideTimer = setTimeout(() => {
        const m = $('foxPlayerModal');
        if (m && !m.querySelector('.fp-popup.open')) {
          m.classList.add('fp-hide-ui');
        }
      }, 3500);
    }
  }

  // ── Play / Pause ────────────────────────────
  function togglePlay() {
    const iframe = $('ytIframe');
    if (!iframe || !iframe.src) return;
    if (isPlaying) {
      postCmd('pauseVideo', []);
      isPlaying = false;
      clearInterval(tickTimer);
    } else {
      postCmd('playVideo', []);
      isPlaying = true;
      startTick();
    }
    updatePlayUI();
    showUI();
  }

  function updatePlayUI() {
    ['playIcon', 'playIcon2'].forEach(id => {
      const el = $(id);
      if (el) el.style.display = isPlaying ? 'none' : 'block';
    });
    ['pauseIcon', 'pauseIcon2'].forEach(id => {
      const el = $(id);
      if (el) el.style.display = isPlaying ? 'block' : 'none';
    });
  }

  // ── Tick ───────────────────────────────────
  function startTick() {
    clearInterval(tickTimer);
    tickTimer = setInterval(() => {
      if (!isPlaying || isSeeking) return;
      fakeTime = Math.min(fakeTime + 0.5, fakeDur);
      updateProgress();
    }, 500);
  }

  function updateProgress() {
    const pct = fakeDur > 0 ? (fakeTime / fakeDur) * 100 : 0;
    const fill = $('seekFill');
    const el   = $('timeElapsed');
    const dur  = $('timeDuration');
    if (fill) fill.style.width = pct + '%';
    if (el)  el.textContent  = fmt(fakeTime);
    if (dur) dur.textContent = fmt(fakeDur);
  }

  // ── Skip ───────────────────────────────────
  function skipBack() {
    fakeTime = Math.max(0, fakeTime - 10);
    postCmd('seekTo', [Math.round(fakeTime), true]);
    updateProgress();
    showUI();
  }

  function skipForward() {
    fakeTime = Math.min(fakeDur, fakeTime + 10);
    postCmd('seekTo', [Math.round(fakeTime), true]);
    updateProgress();
    showUI();
  }

  // ── Seek bar ───────────────────────────────
  function seekTo(pct) {
    fakeTime = pct * fakeDur;
    postCmd('seekTo', [Math.round(fakeTime), true]);
    updateProgress();
    showUI();
  }

  function initSeekBar() {
    const bar = $('seekBar');
    if (!bar) return;

    function getPct(clientX) {
      const rect = bar.getBoundingClientRect();
      return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    }

    // Mouse
    bar.addEventListener('mousedown', e => {
      isSeeking = true;
      seekTo(getPct(e.clientX));
      bar.classList.add('seeking');
    });
    document.addEventListener('mousemove', e => {
      if (!isSeeking) return;
      seekTo(getPct(e.clientX));
    });
    document.addEventListener('mouseup', () => {
      if (!isSeeking) return;
      isSeeking = false;
      bar.classList.remove('seeking');
    });

    // Touch
    bar.addEventListener('touchstart', e => {
      isSeeking = true;
      seekTo(getPct(e.touches[0].clientX));
      e.preventDefault();
    }, { passive: false });
    bar.addEventListener('touchmove', e => {
      if (!isSeeking) return;
      seekTo(getPct(e.touches[0].clientX));
      e.preventDefault();
    }, { passive: false });
    bar.addEventListener('touchend', () => { isSeeking = false; });
  }

  // ── Fullscreen ─────────────────────────────
  function toggleFullscreen() {
    const el = $('foxPlayerModal');
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen();
    }
  }

  // ── Menus ──────────────────────────────────
  function closeAllMenus() {
    document.querySelectorAll('.fp-popup').forEach(m => m.classList.remove('open'));
  }

  function toggleMenu(id, e) {
    if (e) e.stopPropagation();
    const el = document.getElementById(id);
    if (!el) return;
    const wasOpen = el.classList.contains('open');
    closeAllMenus();
    if (!wasOpen) el.classList.add('open');
    showUI();
  }

  function selectSpeed(btn, val) {
    document.querySelectorAll('#speedMenu button').forEach(b => {
      b.classList.remove('active');
      b.textContent = b.textContent.replace('✓ ', '');
    });
    btn.classList.add('active');
    btn.textContent = '✓ ' + val;
    const lbl = $('speedLabel');
    if (lbl) lbl.textContent = val;

    // Actually set playback rate on YT iframe
    const rates = { '0.5x': 0.5, '0.75x': 0.75, '1x': 1, '1.25x': 1.25, '1.5x': 1.5, '2x': 2 };
    const rate = rates[val] || 1;
    postCmd('setPlaybackRate', [rate]);
    closeAllMenus();
  }

  function selectLang(btn, val) {
    document.querySelectorAll('#langMenu button').forEach(b => {
      b.classList.remove('active');
      b.textContent = b.textContent.replace('✓ ', '');
    });
    btn.classList.add('active');
    btn.textContent = '✓ ' + val;
    closeAllMenus();
  }

  // ── Open Player ────────────────────────────
  window.foxPlayerOpen = function(videoId, title, duration) {
    const modal  = $('foxPlayerModal');
    const noScr  = $('noTrailerScreen');
    const iframe = $('ytIframe');
    const ttl    = $('playerTitle');

    if (!modal) return;
    if (ttl) ttl.textContent = title || '';
    fakeDur  = duration || 150;
    fakeTime = 0;
    isPlaying = false;
    clearInterval(tickTimer);
    updateProgress();
    updatePlayUI();
    closeAllMenus();

    modal.classList.remove('fp-hide-ui');
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';

    if (!videoId) {
      if (noScr) noScr.classList.add('open');
      if (iframe) iframe.src = '';
      return;
    }

    if (noScr) noScr.classList.remove('open');

    // vq=hd1080 forces 1080p where available
    const src = `https://www.youtube-nocookie.com/embed/${videoId}`
      + `?autoplay=1&controls=0&rel=0&modestbranding=1`
      + `&playsinline=1&disablekb=1&fs=0&iv_load_policy=3`
      + `&showinfo=0&vq=hd1080&hd=1&color=white&origin=${encodeURIComponent(window.location.origin)}`;

    if (iframe) iframe.src = src;
    isPlaying = true;
    updatePlayUI();
    startTick();
    showUI();
  };

  // ── Close Player ───────────────────────────
  window.foxPlayerClose = function() {
    const modal  = $('foxPlayerModal');
    const iframe = $('ytIframe');
    const noScr  = $('noTrailerScreen');

    if (iframe) iframe.src = '';
    if (modal)  modal.classList.remove('open', 'fp-hide-ui');
    if (noScr)  noScr.classList.remove('open');

    clearInterval(tickTimer);
    clearTimeout(hideTimer);
    isPlaying = false;
    fakeTime  = 0;
    updateProgress();
    updatePlayUI();
    closeAllMenus();
    document.body.style.overflow = '';
  };

  // ── My List toggle ─────────────────────────
  window.toggleMyList = function(btn) {
    const icon = btn.querySelector('.mylist-icon');
    if (!icon) return;
    const added = icon.textContent === '✓';
    icon.textContent = added ? '＋' : '✓';
    btn.style.borderColor = added ? 'rgba(255,255,255,.3)' : '#E50914';
    btn.style.color       = added ? 'white'               : '#E50914';
  };

  // ── Expose controls ────────────────────────
  window.fpTogglePlay    = togglePlay;
  window.fpSkipBack      = skipBack;
  window.fpSkipForward   = skipForward;
  window.fpFullscreen    = toggleFullscreen;
  window.fpCloseAllMenus = closeAllMenus;
  window.fpToggleMenu    = toggleMenu;
  window.fpSelectSpeed   = selectSpeed;
  window.fpSelectLang    = selectLang;

  // ── Init on DOM ready ──────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    initSeekBar();

    const modal = $('foxPlayerModal');
    if (!modal) return;

    // Show UI on any interaction
    modal.addEventListener('mousemove', showUI);
    modal.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
      showUI();
    }, { passive: true });

    // Double-tap left/right to seek on mobile
    let lastTap = 0;
    modal.addEventListener('touchend', (e) => {
      if (e.target.closest('.fp-popup') || e.target.closest('button')) return;
      const now = Date.now();
      const dx  = e.changedTouches[0].clientX - touchStartX;
      if (now - lastTap < 300 && Math.abs(dx) < 20) {
        // double tap center = play/pause
        togglePlay();
      } else if (now - lastTap < 300 && dx < -40) {
        skipBack();
      } else if (now - lastTap < 300 && dx > 40) {
        skipForward();
      }
      lastTap = now;
    });

    // Close menus on outside tap
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.fp-pill') && !e.target.closest('.fp-fullbtn')) {
        closeAllMenus();
      }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (!modal.classList.contains('open')) return;
      switch (e.key) {
        case 'Escape':      window.foxPlayerClose(); break;
        case ' ':           e.preventDefault(); togglePlay(); break;
        case 'ArrowLeft':   e.preventDefault(); skipBack(); break;
        case 'ArrowRight':  e.preventDefault(); skipForward(); break;
        case 'f': case 'F': toggleFullscreen(); break;
      }
    });
  });

})();
