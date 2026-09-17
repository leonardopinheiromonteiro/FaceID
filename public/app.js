/* ==========================================================================
   FACEID BIOMETRICS SYSTEM - CLIENT APPLICATION LOGIC
   Face Detection, Descriptor Extraction & API Integration
   ========================================================================== */

// SVG Data URI Avatars (Zero external network dependencies / No broken placeholder icons)
const DEFAULT_USER_AVATAR = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120" fill="none"><rect width="120" height="120" rx="60" fill="%230f172a"/><circle cx="60" cy="45" r="22" fill="%2306b6d4"/><path d="M25 100c0-20 16-35 35-35s35 15 35 35" fill="%2306b6d4"/></svg>';
const ACCESS_DENIED_AVATAR = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120" fill="none"><rect width="120" height="120" rx="60" fill="%231e1b4b"/><circle cx="60" cy="45" r="20" fill="%23f43f5e"/><path d="M25 100c0-20 16-32 35-32s35 12 35 32" fill="%23f43f5e"/><circle cx="60" cy="60" r="48" stroke="%23f43f5e" stroke-width="4"/><line x1="32" y1="32" x2="88" y2="88" stroke="%23f43f5e" stroke-width="6"/></svg>';

function handleAvatarError(imgEl) {
  if (imgEl) {
    imgEl.src = DEFAULT_USER_AVATAR;
    imgEl.onerror = null;
  }
}
window.handleAvatarError = handleAvatarError;

// Global App State
const state = {
  currentTab: 'auth', // 'auth' | 'register' | 'credentials' | 'status' | 'audit' | 'system_users' | 'profiles'
  currentUser: null,
  systemUsers: [],
  profiles: [],
  modelsLoaded: false,
  cameraReady: false,
  facingMode: 'user', // 'user' | 'environment'
  webcamStream: null,
  detectionAnimFrameId: null,
  autoScan: false, // Iniciar em modo Manual por padrão
  showLandmarks: true,
  lastScanTime: 0,
  scanCooldownMs: 2500,
  currentDetection: null,
  capturedRegisterData: null,
  users: [],
  logs: [],
  accessLogsPage: 1,
  accessLogsPageSize: 10,
  filteredAccessLogs: [],
  systemLogs: [],
  dbLogsPage: 1,
  dbLogsPageSize: 10,
  filteredDbLogs: []
};

// ==========================================================================
// FIGMA TAILWIND ALERTS & NOTIFICATION SYSTEM (38+ Tailwind Alerts in Figma)
// ==========================================================================

function showAlertDialog({
  type = 'info',
  title = '',
  message = '',
  buttonText = 'Entendido'
} = {}) {
  return new Promise((resolve) => {
    const modal = document.getElementById('modal-alert-dialog');
    const titleEl = document.getElementById('alert-dialog-title');
    const msgEl = document.getElementById('alert-dialog-message');
    const iconPill = document.getElementById('alert-dialog-icon-pill');
    const icon = document.getElementById('alert-dialog-icon');
    const accentGlow = document.getElementById('alert-dialog-accent-glow');
    const btnOk = document.getElementById('alert-dialog-btn-ok');
    const btnClose = document.getElementById('alert-dialog-btn-close');

    if (!modal) {
      resolve();
      return;
    }

    const typeConfig = {
      success: {
        glowClass: 'absolute top-0 left-0 right-0 h-1.5 bg-cyan-500',
        pillClass: 'w-14 h-14 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center text-2xl shrink-0 shadow-inner',
        iconClass: 'fa-solid fa-circle-check',
        btnClass: 'px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-cyan-600/20 transition-all flex items-center gap-2 cursor-pointer',
        defaultTitle: 'Operação Realizada com Sucesso'
      },
      danger: {
        glowClass: 'absolute top-0 left-0 right-0 h-1.5 bg-rose-500',
        pillClass: 'w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center text-2xl shrink-0 shadow-inner',
        iconClass: 'fa-solid fa-triangle-exclamation',
        btnClass: 'px-6 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-rose-500/20 transition-all flex items-center gap-2 cursor-pointer',
        defaultTitle: 'Atenção / Erro'
      },
      error: {
        glowClass: 'absolute top-0 left-0 right-0 h-1.5 bg-rose-500',
        pillClass: 'w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center text-2xl shrink-0 shadow-inner',
        iconClass: 'fa-solid fa-circle-xmark',
        btnClass: 'px-6 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-rose-500/20 transition-all flex items-center gap-2 cursor-pointer',
        defaultTitle: 'Erro Encontrado'
      },
      warning: {
        glowClass: 'absolute top-0 left-0 right-0 h-1.5 bg-amber-500',
        pillClass: 'w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center text-2xl shrink-0 shadow-inner',
        iconClass: 'fa-solid fa-triangle-exclamation',
        btnClass: 'px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 cursor-pointer',
        defaultTitle: 'Alerta / Aviso'
      },
      info: {
        glowClass: 'absolute top-0 left-0 right-0 h-1.5 bg-cyan-500',
        pillClass: 'w-14 h-14 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center text-2xl shrink-0 shadow-inner',
        iconClass: 'fa-solid fa-circle-info',
        btnClass: 'px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-2 cursor-pointer',
        defaultTitle: 'Notificação do Sistema'
      }
    };

    const config = typeConfig[type] || typeConfig.info;

    if (titleEl) titleEl.textContent = title || config.defaultTitle;
    if (msgEl) msgEl.textContent = message || '';
    if (accentGlow) accentGlow.className = config.glowClass;
    if (iconPill) iconPill.className = config.pillClass;
    if (icon) icon.className = config.iconClass;
    if (btnOk) {
      btnOk.className = config.btnClass;
      btnOk.innerHTML = `<i class="fa-solid fa-check"></i> ${buttonText}`;
    }

    modal.classList.remove('hidden');
    if (btnOk) btnOk.focus();

    function cleanup() {
      modal.classList.add('hidden');
      if (btnOk) btnOk.removeEventListener('click', cleanup);
      if (btnClose) btnClose.removeEventListener('click', cleanup);
      window.removeEventListener('keydown', onKey);
      resolve();
    }

    function onKey(e) {
      if (e.key === 'Escape' || e.key === 'Enter') cleanup();
    }

    if (btnOk) btnOk.addEventListener('click', cleanup);
    if (btnClose) btnClose.addEventListener('click', cleanup);
    window.addEventListener('keydown', onKey);
  });
}
window.showAlertDialog = showAlertDialog;

function showToastAlert({ type = 'info', title = '', message = '', duration = 4000 } = {}) {
  const container = document.getElementById('toast-notification-container');
  if (!container) return;

  const typeConfig = {
    success: { cssClass: 'alert-success', icon: 'fa-circle-check', defaultTitle: 'Operação Realizada com Sucesso' },
    danger: { cssClass: 'alert-danger', icon: 'fa-triangle-exclamation', defaultTitle: 'Atenção / Erro' },
    error: { cssClass: 'alert-danger', icon: 'fa-circle-xmark', defaultTitle: 'Erro Encontrado' },
    warning: { cssClass: 'alert-warning', icon: 'fa-triangle-exclamation', defaultTitle: 'Alerta / Aviso' },
    info: { cssClass: 'alert-info', icon: 'fa-circle-info', defaultTitle: 'Notificação do Sistema' }
  };

  const config = typeConfig[type] || typeConfig.info;
  const finalTitle = title || config.defaultTitle;
  const finalMessage = message || '';

  const toast = document.createElement('div');
  toast.className = `tailwind-alert-toast ${config.cssClass}`;
  toast.setAttribute('role', 'alert');

  toast.innerHTML = `
    <div class="alert-icon-pill w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-base shadow-inner">
      <i class="fa-solid ${config.icon}"></i>
    </div>
    <div class="flex-1 min-w-0 pr-1">
      <div class="text-sm font-bold text-white tracking-tight leading-snug">${finalTitle}</div>
      ${finalMessage ? `<div class="text-xs text-slate-300 font-normal leading-relaxed mt-0.5 break-words">${finalMessage}</div>` : ''}
    </div>
    <button type="button" class="alert-close-btn text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0 -mr-1 -mt-1 cursor-pointer" title="Fechar">
      <i class="fa-solid fa-xmark text-xs"></i>
    </button>
    <div class="alert-progress-track">
      <div class="alert-progress-bar"></div>
    </div>
  `;

  container.appendChild(toast);

  const closeBtn = toast.querySelector('.alert-close-btn');
  const progressBar = toast.querySelector('.alert-progress-bar');

  let timer = null;
  let startTime = Date.now();
  let remaining = duration;

  function dismiss() {
    if (toast.classList.contains('removing')) return;
    toast.classList.add('removing');
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }

  if (closeBtn) closeBtn.addEventListener('click', dismiss);

  if (progressBar) {
    progressBar.style.transition = `transform ${duration}ms linear`;
    progressBar.getBoundingClientRect();
    progressBar.style.transform = 'scaleX(0)';
  }

  timer = setTimeout(dismiss, duration);

  toast.addEventListener('mouseenter', () => {
    clearTimeout(timer);
    if (progressBar) {
      const computed = window.getComputedStyle(progressBar);
      const matrix = new DOMMatrixReadOnly(computed.transform);
      progressBar.style.transition = 'none';
      progressBar.style.transform = `scaleX(${matrix.a})`;
    }
  });

  toast.addEventListener('mouseleave', () => {
    const elapsed = Date.now() - startTime;
    remaining = Math.max(1000, duration - elapsed);
    if (progressBar) {
      progressBar.style.transition = `transform ${remaining}ms linear`;
      progressBar.style.transform = 'scaleX(0)';
    }
    timer = setTimeout(dismiss, remaining);
  });
}
window.showToastAlert = showToastAlert;
window.showToast = showToastAlert;

// Unified showAlert (supports modal dialog and toast notifications)
function showAlert({ type = 'info', title = '', message = '', mode = 'modal', duration = 4000 } = {}) {
  if (mode === 'toast') {
    return showToastAlert({ type, title, message, duration });
  }
  return showAlertDialog({ type, title, message });
}
window.showAlert = showAlert;

function showConfirmDialog({
  title = 'Confirmar Ação',
  message = 'Deseja realmente executar esta operação?',
  type = 'danger',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar'
} = {}) {
  return new Promise((resolve) => {
    const modal = document.getElementById('modal-confirm-dialog');
    const titleEl = document.getElementById('confirm-title');
    const msgEl = document.getElementById('confirm-message');
    const iconPill = document.getElementById('confirm-icon-pill');
    const icon = document.getElementById('confirm-icon');
    const accentGlow = document.getElementById('confirm-accent-glow');
    const btnOk = document.getElementById('confirm-btn-ok');
    const btnCancel = document.getElementById('confirm-btn-cancel');

    if (!modal) {
      resolve(window.confirm(message));
      return;
    }

    if (titleEl) titleEl.textContent = title;
    if (msgEl) msgEl.textContent = message;
    if (btnOk) btnOk.innerHTML = `<i class="fa-solid fa-check"></i> ${confirmText}`;
    if (btnCancel) btnCancel.textContent = cancelText;

    if (type === 'danger' || type === 'error') {
      if (accentGlow) accentGlow.className = 'absolute top-0 left-0 right-0 h-1 bg-rose-500';
      if (iconPill) iconPill.className = 'w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center text-xl shrink-0 shadow-inner';
      if (icon) icon.className = 'fa-solid fa-triangle-exclamation';
      if (btnOk) btnOk.className = 'px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-500/20 transition-all flex items-center gap-1.5 cursor-pointer';
    } else if (type === 'warning') {
      if (accentGlow) accentGlow.className = 'absolute top-0 left-0 right-0 h-1 bg-amber-500';
      if (iconPill) iconPill.className = 'w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center text-xl shrink-0 shadow-inner';
      if (icon) icon.className = 'fa-solid fa-triangle-exclamation';
      if (btnOk) btnOk.className = 'px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-1.5 cursor-pointer';
    } else {
      if (accentGlow) accentGlow.className = 'absolute top-0 left-0 right-0 h-1 bg-cyan-500';
      if (iconPill) iconPill.className = 'w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center text-xl shrink-0 shadow-inner';
      if (icon) icon.className = 'fa-solid fa-shield-halved';
      if (btnOk) btnOk.className = 'px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-cyan-600/20 transition-all flex items-center gap-1.5 cursor-pointer';
    }

    modal.classList.remove('hidden');

    function cleanup(result) {
      modal.classList.add('hidden');
      btnOk.removeEventListener('click', onOk);
      btnCancel.removeEventListener('click', onCancel);
      window.removeEventListener('keydown', onKey);
      resolve(result);
    }

    function onOk() { cleanup(true); }
    function onCancel() { cleanup(false); }
    function onKey(e) {
      if (e.key === 'Escape') cleanup(false);
      if (e.key === 'Enter') cleanup(true);
    }

    btnOk.addEventListener('click', onOk);
    btnCancel.addEventListener('click', onCancel);
    window.addEventListener('keydown', onKey);
  });
}
window.showConfirmDialog = showConfirmDialog;

// Intercept window.alert to automatically render Figma Tailwind alert dialogs
window.alert = function(msg) {
  if (!msg) return;
  const str = String(msg);
  const isError = /erro|falha|inválid|obrigatór|não coincid|bloquead|negad/i.test(str);
  const isSuccess = /sucesso|salv|atualizad|cadastrad|removid/i.test(str);
  const isWarning = /atenção|cuidado|aviso|verifique|limite|centralize/i.test(str);
  let type = 'info';
  let title = 'Notificação do Sistema';
  if (isSuccess) { type = 'success'; title = 'Operação Concluída com Sucesso'; }
  else if (isError) { type = 'danger'; title = 'Atenção / Erro'; }
  else if (isWarning) { type = 'warning'; title = 'Alerta do Sistema'; }
  showAlertDialog({ type, title, message: str });
};

// Audio Synthesizer for Biometric Feedback (No external audio file dependencies)
const soundEffects = {
  playSuccess() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) { console.warn('Audio Context error:', e); }
  },
  playDenied() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime); // A3
      osc.frequency.setValueAtTime(130.81, ctx.currentTime + 0.1); // C3
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) { console.warn('Audio Context error:', e); }
  }
};

// DOM Elements
const elements = {
  video: document.getElementById('video-feed'),
  canvas: document.getElementById('overlay-canvas'),
  modelStatus: document.getElementById('model-status'),
  cameraStatus: document.getElementById('camera-status'),
  usersCount: document.getElementById('users-count'),
  
  imageFeed: document.getElementById('image-feed'),
  cameraErrorBanner: document.getElementById('camera-error-banner'),
  
  faceGuideMask: document.getElementById('face-guide-mask'),
  statusOverlay: document.getElementById('status-overlay'),
  statusMessage: document.getElementById('status-message'),
  alignmentBar: document.getElementById('alignment-bar'),
  toggleLandmarks: document.getElementById('toggle-landmarks'),
  
  tabAuth: document.getElementById('tab-auth'),
  tabRegister: document.getElementById('tab-register'),
  tabCredentials: document.getElementById('tab-credentials'),
  tabStatus: document.getElementById('tab-status'),
  tabAudit: document.getElementById('tab-audit'),
  
  navAuth: document.getElementById('nav-auth'),
  navRegister: document.getElementById('nav-register'),
  navCredentials: document.getElementById('nav-credentials'),
  navStatus: document.getElementById('nav-status'),
  navAudit: document.getElementById('nav-audit'),

  scannerHudCard: document.getElementById('scanner-hud-card'),
  viewAuthCameraSlot: document.getElementById('view-auth-camera-slot'),
  viewRegisterCameraSlot: document.getElementById('view-register-camera-slot'),

  viewAuth: document.getElementById('view-auth'),
  viewRegister: document.getElementById('view-register'),
  viewCredentials: document.getElementById('view-credentials'),
  viewStatus: document.getElementById('view-status'),
  viewAudit: document.getElementById('view-audit'),

  authActions: document.getElementById('auth-actions'),
  registerActions: document.getElementById('register-actions'),
  btnCaptureFace: document.getElementById('btn-capture-face'),
  btnSubmitRegister: document.getElementById('btn-submit-register'),
  
  panelRegister: document.getElementById('panel-register'),
  panelAuthResult: document.getElementById('panel-auth-result'),
  panelCredentials: document.getElementById('panel-credentials'),
  panelStatus: document.getElementById('panel-status'),
  credSearchInput: document.getElementById('cred-search-input'),
  credFilterStatus: document.getElementById('cred-filter-status'),
  credentialsCounterBadge: document.getElementById('credentials-counter-badge'),
  credentialsFullList: document.getElementById('credentials-full-list'),
  
  modalEditCredential: document.getElementById('modal-edit-credential'),
  editCredId: document.getElementById('edit-cred-id'),
  editCredBranch: document.getElementById('edit-cred-branch'),
  editCredRegistration: document.getElementById('edit-cred-registration'),
  editCredName: document.getElementById('edit-cred-name'),
  editCredEmail: document.getElementById('edit-cred-email'),
  editCredDepartment: document.getElementById('edit-cred-department'),
  editCredRole: document.getElementById('edit-cred-role'),
  editCredBlocked: document.getElementById('edit-cred-blocked'),
  editCredBlockedLabel: document.getElementById('edit-cred-blocked-label'),
  
  regPreviewImg: document.getElementById('register-preview-img'),
  previewPlaceholder: document.getElementById('preview-placeholder'),
  previewStatus: document.getElementById('preview-status'),
  previewDescInfo: document.getElementById('preview-desc-info'),
  formRegisterUser: document.getElementById('form-register-user'),
  regBranch: document.getElementById('reg-branch'),
  regRegistration: document.getElementById('reg-registration'),
  regName: document.getElementById('reg-name'),
  regEmail: document.getElementById('reg-email'),
  regDepartment: document.getElementById('reg-department'),
  regRole: document.getElementById('reg-role'),
  regEditingUserId: document.getElementById('reg-editing-user-id'),
  regSearchCredential: document.getElementById('reg-search-credential'),
  regSearchResults: document.getElementById('reg-search-results'),
  regSelectedBanner: document.getElementById('reg-selected-banner'),
  regSelectedName: document.getElementById('reg-selected-name'),
  regSelectedMeta: document.getElementById('reg-selected-meta'),
  btnRegNewMode: document.getElementById('btn-reg-new-mode'),
  btnClearSearchInput: document.getElementById('btn-clear-search-input'),
  btnSwitchCamera: document.getElementById('btn-switch-camera'),
  cameraFacingLabel: document.getElementById('camera-facing-label'),
  cameraMirrorWrapper: document.getElementById('camera-mirror-wrapper'),
  
  resultDisplay: document.getElementById('result-display'),
  resultBadgeIcon: document.getElementById('result-badge-icon'),
  resultUserName: document.getElementById('result-user-name'),
  resultUserRole: document.getElementById('result-user-role'),
  resultMatchPct: document.getElementById('result-match-pct'),
  resultProgressBar: document.getElementById('result-progress-bar'),
  resultDistanceText: document.getElementById('result-distance-text'),
  
  usersListContainer: document.getElementById('users-list-container'),
  logsTableBody: document.getElementById('logs-table-body'),
  autoScanText: document.getElementById('auto-scan-text'),
  autoScanIcon: document.getElementById('auto-scan-icon')
};

// Mode state: 'webcam' | 'image'
state.feedMode = 'webcam';

// ==========================================================================
// THEME MANAGEMENT (Dark / Light - White Mode)
// ==========================================================================
function initTheme() {
  const savedTheme = localStorage.getItem('faceid_theme') || 'dark';
  applyTheme(savedTheme);
}

function applyTheme(theme) {
  const isDark = theme === 'dark';
  document.documentElement.classList.toggle('dark', isDark);
  document.documentElement.classList.toggle('light', !isDark);
  localStorage.setItem('faceid_theme', isDark ? 'dark' : 'light');

  const icons = document.querySelectorAll('.theme-toggle-icon');
  const labels = document.querySelectorAll('.theme-toggle-label');

  icons.forEach(icon => {
    icon.className = isDark ? 'fa-solid fa-sun text-amber-400 theme-toggle-icon' : 'fa-solid fa-moon text-indigo-400 theme-toggle-icon';
  });

  labels.forEach(label => {
    label.textContent = isDark ? 'Modo Claro' : 'Modo Escuro';
  });
}

function toggleTheme() {
  const current = localStorage.getItem('faceid_theme') || 'dark';
  const newTheme = current === 'dark' ? 'light' : 'dark';
  applyTheme(newTheme);
  showAlert({
    type: 'info',
    title: 'Tema Alterado',
    message: `Estilo visual alterado para ${newTheme === 'dark' ? 'Modo Escuro (Dark)' : 'Modo Claro (White)'}.`
  });
}
window.toggleTheme = toggleTheme;
// ==========================================================================
// FULLSCREEN & MOBILE BROWSER BAR HANDLING (Item 3 & Item 2)
// ==========================================================================
function isMobileDevice() {
  const ua = navigator.userAgent || '';
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  const isMobileOS = mobileRegex.test(ua);
  const isDesktopOS = /Windows NT|Macintosh|X11|Linux x86_64/i.test(ua) && !isMobileOS;
  if (isDesktopOS) {
    return false;
  }
  const isSmallScreenTouch = window.innerWidth <= 768 && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
  return isMobileOS || isSmallScreenTouch;
}
window.isMobileDevice = isMobileDevice;

function requestFullScreenSafe() {
  if (!document.fullscreenElement && !document.mozFullScreenElement && !document.webkitFullscreenElement) {
    const elem = document.documentElement;
    const req = elem.requestFullscreen || elem.webkitRequestFullscreen || elem.mozRequestFullScreen || elem.msRequestFullscreen;
    if (req) {
      req.call(elem).catch(() => {});
    }
  }
}
window.requestFullScreenSafe = requestFullScreenSafe;

function toggleFullScreen() {
  if (!document.fullscreenElement && !document.mozFullScreenElement && !document.webkitFullscreenElement) {
    requestFullScreenSafe();
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    }
  }
}
window.toggleFullScreen = toggleFullScreen;

function enableMobileAutoFullscreen() {
  if (!isMobileDevice()) return;

  const tryFullscreen = () => {
    if (isMobileDevice() && !document.fullscreenElement && !document.webkitFullscreenElement) {
      requestFullScreenSafe();
    }
  };

  // Listen to multiple mobile touch gestures to trigger immediate fullscreen
  window.addEventListener('touchstart', tryFullscreen, { passive: true });
  window.addEventListener('pointerdown', tryFullscreen, { passive: true });
  window.addEventListener('click', tryFullscreen, { passive: true });
}
window.enableMobileAutoFullscreen = enableMobileAutoFullscreen;

// PWA Installation Prompt Handler (Item 2)
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const pwaBtn = document.getElementById('btn-pwa-install');
  if (pwaBtn) pwaBtn.classList.remove('hidden');
});

async function triggerPwaInstall() {
  // First, attempt to enter fullscreen immediately
  requestFullScreenSafe();

  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log('[PWA] Escolha do usuário:', outcome);
    deferredPrompt = null;
    const pwaBtn = document.getElementById('btn-pwa-install');
    if (pwaBtn) pwaBtn.classList.add('hidden');
  } else {
    const modal = document.getElementById('modal-pwa-instructions');
    if (modal) {
      modal.classList.remove('hidden');
    } else {
      const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (isIOS) {
        showAlert({
          type: 'info',
          title: 'Instalar no iPhone / iPad',
          message: '1. Toque no botão de Compartilhar (ícone com a seta para cima no rodapé do Safari).\n2. Selecione "Adicionar à Tela de Início".'
        });
      } else {
        showAlert({
          type: 'info',
          title: 'Instalar no Android / Chrome',
          message: '1. Toque nos 3 pontinhos (⋮) no topo direito do navegador.\n2. Selecione "Instalar aplicativo" ou "Adicionar à tela inicial".'
        });
      }
    }
  }
}
window.triggerPwaInstall = triggerPwaInstall;

function closePwaModal() {
  const modal = document.getElementById('modal-pwa-instructions');
  if (modal) modal.classList.add('hidden');
}
window.closePwaModal = closePwaModal;

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('[PWA] Service Worker registration failed:', err);
    });
  });
}

// ==========================================================================
// INITIALIZATION
// ==========================================================================
document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  setupEventListeners();
  enableMobileAutoFullscreen();
  const authenticated = await checkAuthSession();
  if (authenticated) {
    await initApplicationScreens();
  }
});

async function initApplicationScreens() {
  const initialTab = getFirstAllowedTab();
  switchTab(initialTab);
  if (!state.modelsLoaded) {
    await loadModels();
  }
  if (!state.webcamStream && hasMenuPermission('auth')) {
    await startWebcam();
  }
  loadUsersList();
  loadLogsHistory();
  updateAutoScanUI();
  startDetectionLoop();
}

function setupEventListeners() {
  if (elements.toggleLandmarks) {
    elements.toggleLandmarks.addEventListener('change', (e) => {
      state.showLandmarks = e.target.checked;
    });
  }
}

// 1. Load Face-API AI Models
async function loadModels() {
  try {
    elements.modelStatus.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Carregando redes...';
    
    // Model files location
    const MODEL_URL = '/models';
    
    // Load high-accuracy SSD MobileNet V1, TinyFaceDetector fallback, 68 landmarks, and 128D recognition model
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
    ]);

    state.modelsLoaded = true;
    elements.modelStatus.className = 'stat-value success';
    elements.modelStatus.innerHTML = '<i class="fa-solid fa-check-circle"></i> Modelo OK';
    console.log('[FACEID] Modelos neurais carregados com sucesso.');
  } catch (err) {
    console.error('[FACEID] Erro ao carregar modelos neurais:', err);
    elements.modelStatus.className = 'stat-value danger';
    elements.modelStatus.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Erro no Modelo';
  }
}

// 2. Start Camera Feed (Supports Frontal / User & Rear / Environment)
async function startWebcam(facingMode) {
  state.feedMode = 'webcam';
  if (facingMode) {
    state.facingMode = facingMode;
  }
  const mode = state.facingMode || 'user';

  // Mirror effect: only mirror for frontal camera ('user')
  const mirrorWrapper = document.getElementById('camera-mirror-wrapper');
  if (mirrorWrapper) {
    if (mode === 'user') {
      mirrorWrapper.classList.add('-scale-x-100');
    } else {
      mirrorWrapper.classList.remove('-scale-x-100');
    }
  }

  const facingLabel = document.getElementById('camera-facing-label');
  if (facingLabel) {
    facingLabel.textContent = mode === 'user' ? 'Frontal' : 'Traseira';
  }

  elements.imageFeed.classList.add('hidden');
  elements.video.classList.remove('hidden');

  // Check if browser blocks getUserMedia due to insecure HTTP context on mobile
  if (!window.isSecureContext && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
    state.cameraReady = false;
    elements.cameraStatus.className = 'stat-value danger';
    elements.cameraStatus.innerHTML = '<i class="fa-solid fa-lock"></i> Requer HTTPS';
    
    elements.cameraErrorBanner.classList.remove('hidden');
    const httpsUrl = `https://${location.hostname}:3443`;
    elements.cameraErrorBanner.querySelector('.error-banner-content p').innerHTML = 
      `No Chrome do celular, a câmera <strong>exige HTTPS</strong> quando acessada pela rede local.<br><br>` +
      `<a href="${httpsUrl}" class="inline-block mt-2 px-4 py-2 bg-cyan-500 text-slate-950 font-bold rounded-xl shadow-lg hover:bg-cyan-400">` +
      `<i class="fa-solid fa-shield-halved"></i> Abrir via HTTPS (${httpsUrl})</a>`;
    
    updateStatusOverlay('danger', 'fa-lock', 'Câmera no celular requer acesso via HTTPS (porta 3443)');
    return;
  }

  try {
    elements.cameraStatus.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Solicitando permissão...';
    elements.cameraErrorBanner.classList.add('hidden');

    let stream = null;
    
    // Attempt 1: Full HD 1080p / 2K with high framerate & selected facingMode
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
          frameRate: { ideal: 30, min: 24 }
        }
      });
    } catch (err1) {
      console.warn('[FACEID] Tentativa 1 (1080p) falhou. Tentando 720p HD com facingMode...', err1);
      // Attempt 2: HD 720p with facingMode
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: mode },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });
      } catch (err2) {
        console.warn('[FACEID] Tentativa 2 falhou. Tentando facingMode simples...', err2);
        // Attempt 3: Simple facingMode
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: mode }
          });
        } catch (err3) {
          console.warn('[FACEID] Tentativa 3 falhou. Tentando restrição padrão de vídeo...', err3);
          // Attempt 4: Basic video true
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        }
      }
    }

    state.webcamStream = stream;
    elements.video.srcObject = stream;
    
    await new Promise((resolve) => {
      elements.video.onloadedmetadata = () => {
        elements.video.play().catch(() => {});
        resolve();
      };
    });

    state.cameraReady = true;
    elements.cameraStatus.className = 'stat-value success';
    elements.cameraStatus.innerHTML = `<i class="fa-solid fa-circle"></i> Câmera ${mode === 'user' ? 'Frontal' : 'Traseira'} Ativa`;
    console.log(`[FACEID] Câmera (${mode}) inicializada com sucesso.`);
  } catch (err) {
    console.error('[FACEID] Erro ao acessar a câmera:', err);
    state.cameraReady = false;
    elements.cameraStatus.className = 'stat-value danger';
    elements.cameraStatus.innerHTML = '<i class="fa-solid fa-video-slash"></i> Sem Permissão';
    
    // Show user-friendly error banner with troubleshooting steps and file upload fallback
    elements.cameraErrorBanner.classList.remove('hidden');
    updateStatusOverlay('danger', 'fa-video-slash', 'Erro: Câmera não acessível. Conceda permissão ou use envio de fotos.');
  }
}

async function switchCameraFacingMode() {
  const newMode = state.facingMode === 'user' ? 'environment' : 'user';
  stopWebcam();
  await startWebcam(newMode);
  startDetectionLoop();
  showAlert({
    type: 'info',
    title: 'Câmera Alternada',
    message: `Visualização alterada para Câmera ${newMode === 'user' ? 'Frontal' : 'Traseira'}.`
  });
}
window.switchCameraFacingMode = switchCameraFacingMode;

function stopWebcam() {
  state.cameraReady = false;

  if (state.detectionAnimFrameId) {
    cancelAnimationFrame(state.detectionAnimFrameId);
    state.detectionAnimFrameId = null;
  }

  if (state.webcamStream) {
    try {
      state.webcamStream.getTracks().forEach(track => {
        track.stop();
        track.enabled = false;
      });
    } catch (e) {
      console.warn('[FACEID] Erro ao parar tracks do webcamStream:', e);
    }
    state.webcamStream = null;
  }

  if (elements.video) {
    if (elements.video.srcObject) {
      try {
        elements.video.srcObject.getTracks().forEach(track => {
          track.stop();
          track.enabled = false;
        });
      } catch (e) {}
      elements.video.srcObject = null;
    }
    try {
      elements.video.pause();
    } catch (e) {}
  }

  if (elements.canvas) {
    try {
      const ctx = elements.canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, elements.canvas.width, elements.canvas.height);
    } catch (e) {}
  }

  state.currentDetection = null;
  if (elements.faceGuideMask) {
    elements.faceGuideMask.className = 'face-guide-mask';
  }
  if (elements.alignmentBar) {
    elements.alignmentBar.style.width = '0%';
  }
  if (elements.cameraStatus) {
    elements.cameraStatus.className = 'stat-value';
    elements.cameraStatus.innerHTML = '<i class="fa-solid fa-power-off"></i> Câmera Inativa';
  }
}
window.stopWebcam = stopWebcam;

async function retryWebcam() {
  await startWebcam();
}

// 3. Handle File Upload (Simulated Photo Testing Mode)
async function handleFileUpload(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    state.feedMode = 'image';
    
    // Completely stop webcam if active
    stopWebcam();

    elements.video.classList.add('hidden');
    elements.cameraErrorBanner.classList.add('hidden');
    
    elements.imageFeed.src = e.target.result;
    elements.imageFeed.classList.remove('hidden');

    elements.cameraStatus.className = 'stat-value primary';
    elements.cameraStatus.innerHTML = '<i class="fa-solid fa-file-image"></i> Foto de Teste';

    // Process image detection once image finishes loading
    elements.imageFeed.onload = async () => {
      await processImageDetection();
    };
  };
  reader.readAsDataURL(file);
}

// Process detection on uploaded static image
async function processImageDetection() {
  if (!state.modelsLoaded) return;

  const img = elements.imageFeed;
  const canvas = elements.canvas;
  const displaySize = { width: img.clientWidth || 640, height: img.clientHeight || 480 };
  faceapi.matchDimensions(canvas, displaySize);

  updateStatusOverlay('idle', 'fa-spinner fa-spin', 'Analisando imagem enviada...');

  // High accuracy detection with SSD MobileNet V1 (98%+ precision)
  let detection = await faceapi.detectSingleFace(
    img,
    new faceapi.SsdMobilenetv1Options({ minConfidence: 0.35 })
  ).withFaceLandmarks().withFaceDescriptor();

  // Fallback to high-res TinyFaceDetector if SSD doesn't hit threshold
  if (!detection) {
    detection = await faceapi.detectSingleFace(
      img,
      new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.3 })
    ).withFaceLandmarks().withFaceDescriptor();
  }

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (detection) {
    state.currentDetection = detection;
    const resizedDetection = faceapi.resizeResults(detection, displaySize);

    if (state.showLandmarks) {
      drawCustomLandmarks(ctx, resizedDetection.landmarks);
    }

    elements.faceGuideMask.className = 'face-guide-mask aligned';
    updateStatusOverlay('success', 'fa-face-smile', 'Face Detectada na Imagem Carregada!');
    elements.alignmentBar.style.width = '100%';

    // Auto verify if in auth mode
    if (state.currentTab === 'auth') {
      verifyFace(Array.from(detection.descriptor));
    }
  } else {
    state.currentDetection = null;
    elements.faceGuideMask.className = 'face-guide-mask denied';
    updateStatusOverlay('danger', 'fa-user-slash', 'Nenhum rosto encontrado na imagem.');
    elements.alignmentBar.style.width = '0%';
  }
}


// ==========================================================================
// REAL-TIME DETECTION & HUD OVERLAY LOOP
// ==========================================================================
async function startDetectionLoop() {
  if (state.detectionAnimFrameId) {
    cancelAnimationFrame(state.detectionAnimFrameId);
    state.detectionAnimFrameId = null;
  }

  const video = elements.video;
  const canvas = elements.canvas;

  async function onFrame() {
    // If not authenticated or camera is inactive, abort loop completely
    if (!state.currentUser || !state.cameraReady || !video || video.paused || video.ended) {
      if (state.currentUser && state.cameraReady && video && !video.paused && !video.ended) {
        state.detectionAnimFrameId = requestAnimationFrame(onFrame);
      } else {
        state.detectionAnimFrameId = null;
      }
      return;
    }

    if (!state.modelsLoaded) {
      state.detectionAnimFrameId = requestAnimationFrame(onFrame);
      return;
    }

    // Match canvas dimensions to the visible rendered dimensions of the video (critical for mobile portrait orientation)
    const clientW = video.clientWidth || 640;
    const clientH = video.clientHeight || 480;
    const videoW = video.videoWidth || clientW;
    const videoH = video.videoHeight || clientH;

    const displaySize = { width: clientW, height: clientH };
    faceapi.matchDimensions(canvas, displaySize);

    // Primary High-Accuracy Detection: SSD MobileNet V1 (>= 98% accuracy)
    let detection = null;
    try {
      detection = await faceapi.detectSingleFace(
        video,
        new faceapi.SsdMobilenetv1Options({ minConfidence: 0.35 })
      ).withFaceLandmarks().withFaceDescriptor();

      // Resilient Fallback: TinyFaceDetector with higher input resolution (416px instead of 224px)
      if (!detection) {
        detection = await faceapi.detectSingleFace(
          video,
          new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.35 })
        ).withFaceLandmarks().withFaceDescriptor();
      }
    } catch (detectErr) {
      if (!state.currentUser || !state.cameraReady) {
        state.detectionAnimFrameId = null;
        return;
      }
    }

    // Guard against logout while awaiting model detection
    if (!state.currentUser || !state.cameraReady) {
      state.detectionAnimFrameId = null;
      return;
    }

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (detection) {
      state.currentDetection = detection;

      // Calculate scale factors between raw video dimensions and client rendered dimensions (object-cover support)
      const resizedDetection = faceapi.resizeResults(detection, {
        width: videoW,
        height: videoH
      });

      // Scale landmarks to client display size
      const scaleX = clientW / videoW;
      const scaleY = clientH / videoH;

      if (state.showLandmarks && resizedDetection.landmarks) {
        drawCustomLandmarksScaled(ctx, resizedDetection.landmarks, scaleX, scaleY);
      }

      // Check alignment using scaled box
      const scaledBox = {
        x: resizedDetection.detection.box.x * scaleX,
        y: resizedDetection.detection.box.y * scaleY,
        width: resizedDetection.detection.box.width * scaleX,
        height: resizedDetection.detection.box.height * scaleY
      };

      const isAligned = checkFaceAlignment(scaledBox, displaySize);

      if (isAligned) {
        elements.faceGuideMask.className = 'face-guide-mask aligned';
        updateStatusOverlay('success', 'fa-face-smile', 'Face Alinhada & Detectada com Sucesso');
        elements.alignmentBar.style.width = '100%';

        // Mode 1: Auto-Scan in Auth Mode
        if (state.currentTab === 'auth' && state.autoScan) {
          const now = Date.now();
          if (now - state.lastScanTime > state.scanCooldownMs) {
            state.lastScanTime = now;
            verifyFace(Array.from(detection.descriptor));
          }
        }

        // Mode 2: Real-time Precision and Visual Feedback in Register / Capture Mode
        if (state.currentTab === 'register') {
          const scorePct = Math.min(99, Math.round(((detection.detection?.score || 0.95)) * 100));
          if (elements.resultDisplay) {
            elements.resultDisplay.className = 'w-full bg-emerald-500/10 border border-emerald-500/40 rounded-2xl p-2.5 sm:p-3 flex flex-col gap-2 transition-all duration-300 shadow-md shadow-emerald-500/10 max-w-full overflow-hidden box-border';
          }
          if (elements.resultBadgeIcon) {
            elements.resultBadgeIcon.className = 'w-7 h-7 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center text-xs font-bold shrink-0 shadow-inner';
            elements.resultBadgeIcon.innerHTML = '<i class="fa-solid fa-camera"></i>';
          }
          const targetName = elements.regName && elements.regName.value.trim() ? elements.regName.value.trim() : 'Face Pronta para Captura';
          if (elements.resultUserName) elements.resultUserName.textContent = targetName;
          if (elements.resultUserRole) elements.resultUserRole.textContent = 'Enquadramento ideal. Clique em "Capturar Face Atual"';
          if (elements.resultMatchPct) {
            elements.resultMatchPct.className = 'text-xs sm:text-sm font-bold text-emerald-400';
            elements.resultMatchPct.textContent = `${scorePct}%`;
          }
          if (elements.resultProgressBar) {
            elements.resultProgressBar.className = 'h-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-all duration-500';
            elements.resultProgressBar.style.width = `${scorePct}%`;
          }
          if (elements.resultDistanceText) {
            elements.resultDistanceText.textContent = `Precisão Óptica: ${(detection.detection?.score || 0.98).toFixed(2)} (Enquadrado)`;
          }
        }
      } else {
        elements.faceGuideMask.className = 'face-guide-mask';
        updateStatusOverlay('idle', 'fa-arrows-to-eye', 'Centralize o rosto no círculo guia');
        elements.alignmentBar.style.width = '50%';

        if (state.currentTab === 'register') {
          if (elements.resultDisplay) {
            elements.resultDisplay.className = 'w-full bg-[#090d16] border border-slate-800/80 rounded-2xl p-2.5 sm:p-3 flex flex-col gap-2 transition-all duration-300 max-w-full overflow-hidden box-border';
          }
          if (elements.resultBadgeIcon) {
            elements.resultBadgeIcon.className = 'w-7 h-7 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center text-xs shrink-0 shadow-inner';
            elements.resultBadgeIcon.innerHTML = '<i class="fa-solid fa-arrows-to-eye"></i>';
          }
          if (elements.resultUserName) elements.resultUserName.textContent = 'Centralize o Rosto';
          if (elements.resultUserRole) elements.resultUserRole.textContent = 'Posicione o rosto dentro da moldura oval';
          if (elements.resultMatchPct) {
            elements.resultMatchPct.className = 'text-xs sm:text-sm font-bold text-amber-400';
            elements.resultMatchPct.textContent = '50%';
          }
          if (elements.resultProgressBar) {
            elements.resultProgressBar.className = 'h-full bg-amber-400 transition-all duration-500';
            elements.resultProgressBar.style.width = '50%';
          }
          if (elements.resultDistanceText) {
            elements.resultDistanceText.textContent = 'Alinhando vetor biométrico...';
          }
        }
      }

    } else {
      state.currentDetection = null;
      elements.faceGuideMask.className = 'face-guide-mask';
      updateStatusOverlay('idle', 'fa-user-clock', 'Aguardando rosto no campo de visão...');
      elements.alignmentBar.style.width = '0%';

      if (state.currentTab === 'register') {
        if (elements.resultDisplay) {
          elements.resultDisplay.className = 'w-full bg-[#090d16] border border-slate-800/80 rounded-2xl p-2.5 sm:p-3 flex flex-col gap-2 transition-all duration-300 max-w-full overflow-hidden box-border';
        }
        if (elements.resultBadgeIcon) {
          elements.resultBadgeIcon.className = 'w-7 h-7 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center text-xs shrink-0 shadow-inner';
          elements.resultBadgeIcon.innerHTML = '<i class="fa-solid fa-user-clock"></i>';
        }
        if (elements.resultUserName) elements.resultUserName.textContent = 'Aguardando Rosto';
        if (elements.resultUserRole) elements.resultUserRole.textContent = 'Posicione-se em frente à câmera para capturar';
        if (elements.resultMatchPct) {
          elements.resultMatchPct.className = 'text-xs sm:text-sm font-bold text-slate-400';
          elements.resultMatchPct.textContent = '0%';
        }
        if (elements.resultProgressBar) {
          elements.resultProgressBar.className = 'h-full bg-slate-700 transition-all duration-500';
          elements.resultProgressBar.style.width = '0%';
        }
        if (elements.resultDistanceText) {
          elements.resultDistanceText.textContent = 'Aguardando detecção...';
        }
      }
    }

    if (state.currentUser && state.cameraReady) {
      state.detectionAnimFrameId = requestAnimationFrame(onFrame);
    } else {
      state.detectionAnimFrameId = null;
    }
  }

  if (state.currentUser && state.cameraReady) {
    state.detectionAnimFrameId = requestAnimationFrame(onFrame);
  }
}

// Custom 68-Point Landmark Stylized Mesh Renderer with Scale Factors
function drawCustomLandmarksScaled(ctx, landmarks, scaleX, scaleY) {
  const rawPoints = landmarks.positions;
  const points = rawPoints.map(p => ({ x: p.x * scaleX, y: p.y * scaleY }));

  // Draw connecting landmark lines
  ctx.strokeStyle = 'rgba(0, 242, 254, 0.4)';
  ctx.lineWidth = 1;

  ctx.beginPath();
  // Jaw line
  for (let i = 0; i < 16; i++) {
    ctx.moveTo(points[i].x, points[i].y);
    ctx.lineTo(points[i + 1].x, points[i + 1].y);
  }
  // Eyebrows
  for (let i = 17; i < 21; i++) { ctx.moveTo(points[i].x, points[i].y); ctx.lineTo(points[i+1].x, points[i+1].y); }
  for (let i = 22; i < 26; i++) { ctx.moveTo(points[i].x, points[i].y); ctx.lineTo(points[i+1].x, points[i+1].y); }
  // Nose
  for (let i = 27; i < 30; i++) { ctx.moveTo(points[i].x, points[i].y); ctx.lineTo(points[i+1].x, points[i+1].y); }
  // Eyes
  for (let i = 36; i < 41; i++) { ctx.moveTo(points[i].x, points[i].y); ctx.lineTo(points[i+1].x, points[i+1].y); }
  ctx.moveTo(points[41].x, points[41].y); ctx.lineTo(points[36].x, points[36].y);
  
  for (let i = 42; i < 47; i++) { ctx.moveTo(points[i].x, points[i].y); ctx.lineTo(points[i+1].x, points[i+1].y); }
  ctx.moveTo(points[47].x, points[47].y); ctx.lineTo(points[42].x, points[42].y);
  ctx.stroke();

  // Draw landmark points
  ctx.fillStyle = '#00f2fe';
  for (let i = 0; i < points.length; i++) {
    ctx.beginPath();
    ctx.arc(points[i].x, points[i].y, 2, 0, 2 * Math.PI);
    ctx.fill();
  }
}

// Helper to check if face bounding box is reasonably centered
function checkFaceAlignment(box, displaySize) {
  const centerX = box.x + (box.width / 2);
  const centerY = box.y + (box.height / 2);

  const targetX = displaySize.width / 2;
  const targetY = displaySize.height / 2;

  const diffX = Math.abs(centerX - targetX);
  const diffY = Math.abs(centerY - targetY);

  // Scaled tolerance for all mobile screen sizes & orientations
  const maxDiffX = Math.max(70, displaySize.width * 0.28);
  const maxDiffY = Math.max(70, displaySize.height * 0.25);

  return diffX < maxDiffX && diffY < maxDiffY && box.width > (displaySize.width * 0.15);
}

// Update Status Overlay Banner
function updateStatusOverlay(type, iconClass, text) {
  elements.statusOverlay.className = `status-overlay ${type}`;
  elements.statusMessage.textContent = text;
  elements.statusOverlay.querySelector('.status-icon i').className = `fa-solid ${iconClass}`;
}

// ==========================================================================
// ACCORDION DRILL-DOWN & SIDEBAR COMPACT TOGGLES & FULLSCREEN
// ==========================================================================
function toggleSubmenu(id, triggerBtn) {
  const submenu = document.getElementById(id);
  if (!submenu) return;
  const isOpen = submenu.classList.contains('open');
  submenu.classList.toggle('open', !isOpen);

  if (triggerBtn) {
    const arrow = triggerBtn.querySelector('.submenu-arrow');
    if (arrow) arrow.classList.toggle('rotate-180', !isOpen);
  }
}
window.toggleSubmenu = toggleSubmenu;

function toggleSidebarCompact() {
  const sidebar = document.getElementById('app-sidebar');
  const mainWrapper = document.getElementById('main-content-wrapper');
  if (!sidebar) return;
  
  const isCompact = sidebar.classList.toggle('sidebar-compact');
  if (mainWrapper) {
    mainWrapper.classList.toggle('main-content-compact', isCompact);
  }
  
  const icon = document.getElementById('sidebar-toggle-icon');
  if (icon) {
    icon.className = isCompact ? 'fa-solid fa-indent transition-transform' : 'fa-solid fa-bars transition-transform';
  }
}
window.toggleSidebarCompact = toggleSidebarCompact;

function searchSidebarMenu(query) {
  const q = (query || '').toLowerCase().trim();
  const menuButtons = document.querySelectorAll('.sidebar-subitem-btn, .sidebar-parent-btn');
  
  menuButtons.forEach(btn => {
    const text = btn.textContent.toLowerCase();
    if (!q || text.includes(q)) {
      btn.style.display = '';
    } else {
      btn.style.display = 'none';
    }
  });
}
window.searchSidebarMenu = searchSidebarMenu;

// ==========================================================================
// SYSTEM OPERATOR AUTHENTICATION & ACCESS PERMISSIONS
// ==========================================================================
async function checkAuthSession() {
  const saved = localStorage.getItem('faceid_operator');
  const overlay = document.getElementById('system-login-overlay');

  if (saved) {
    try {
      const parsedUser = JSON.parse(saved);
      state.currentUser = parsedUser;
      document.body.classList.remove('unauthenticated');
      if (overlay) overlay.classList.add('hidden');
      updateOperatorUI();
      applyMenuPermissions();

      // Sincronizar dados mais recentes com o backend para refletir alterações em tempo real no perfil
      if (parsedUser.id) {
        fetch('/api/auth/me', {
          headers: { 'x-user-id': parsedUser.id }
        }).then(res => res.json()).then(data => {
          if (data.success && data.user) {
            state.currentUser = data.user;
            localStorage.setItem('faceid_operator', JSON.stringify(data.user));
            updateOperatorUI();
            applyMenuPermissions();
          }
        }).catch(err => {
          console.warn('[AUTH SESSION SYNC WARN]', err);
        });
      }

      return true;
    } catch (e) {
      localStorage.removeItem('faceid_operator');
    }
  }

  state.currentUser = null;
  document.body.classList.add('unauthenticated');
  if (overlay) overlay.classList.remove('hidden');
  applyMenuPermissions();
  return false;
}

async function handleSystemLogin(event) {
  event.preventDefault();
  const usernameInput = document.getElementById('login-username');
  const passwordInput = document.getElementById('login-password');
  const errorMsg = document.getElementById('login-error-msg');
  const submitBtn = document.getElementById('btn-login-submit');

  if (!usernameInput || !passwordInput) return;

  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  try {
    if (submitBtn) submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Entrando...';
    if (errorMsg) errorMsg.classList.add('hidden');

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();
    if (data.success && data.user) {
      state.currentUser = data.user;
      localStorage.setItem('faceid_operator', JSON.stringify(data.user));
      
      const overlay = document.getElementById('system-login-overlay');
      if (overlay) overlay.classList.add('hidden');
      document.body.classList.remove('unauthenticated');

      updateOperatorUI();
      applyMenuPermissions();

      // Only request fullscreen on genuine mobile devices, NEVER on notebooks/desktops
      if (isMobileDevice()) {
        requestFullScreenSafe();
      }

      await initApplicationScreens();

      usernameInput.value = '';
      passwordInput.value = '';
    } else {
      if (errorMsg) {
        errorMsg.textContent = data.message || 'Falha ao efetuar login.';
        errorMsg.classList.remove('hidden');
      }
    }
  } catch (err) {
    console.error('[LOGIN ERROR]', err);
    if (errorMsg) {
      errorMsg.textContent = 'Erro de conexão ao comunicar com o servidor.';
      errorMsg.classList.remove('hidden');
    }
  } finally {
    if (submitBtn) submitBtn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Entrar no Sistema';
  }
}
window.handleSystemLogin = handleSystemLogin;

function resetAuthResultDisplay() {
  if (elements.resultDisplay) {
    elements.resultDisplay.className = 'w-full bg-[#131b2e] border border-slate-800 rounded-2xl p-2.5 sm:p-3 flex flex-col gap-2 transition-all duration-300 max-w-full overflow-hidden box-border';
  }
  if (elements.resultBadgeIcon) {
    elements.resultBadgeIcon.className = 'w-7 h-7 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center text-xs font-bold shrink-0';
    elements.resultBadgeIcon.innerHTML = '<i class="fa-solid fa-user-clock"></i>';
  }
  if (elements.resultUserName) elements.resultUserName.textContent = 'Aguardando Leitura';
  if (elements.resultUserRole) elements.resultUserRole.textContent = 'Posicione o rosto em frente à câmera';
  if (elements.resultMatchPct) {
    elements.resultMatchPct.className = 'text-xs sm:text-sm font-bold text-slate-400';
    elements.resultMatchPct.textContent = '0%';
  }
  if (elements.resultProgressBar) {
    elements.resultProgressBar.className = 'h-full bg-slate-700 transition-all duration-500';
    elements.resultProgressBar.style.width = '0%';
  }
  if (elements.resultDistanceText) {
    elements.resultDistanceText.textContent = 'Aguardando detecção...';
  }
  if (elements.faceGuideMask) {
    elements.faceGuideMask.className = 'face-guide-mask';
  }
  if (elements.alignmentBar) {
    elements.alignmentBar.style.width = '0%';
  }
}
window.resetAuthResultDisplay = resetAuthResultDisplay;

function resetRegistrationForm() {
  if (elements.formRegisterUser) {
    elements.formRegisterUser.reset();
  }
  if (elements.regBranch) elements.regBranch.value = '0101';
  state.capturedRegisterData = null;
  if (elements.regPreviewImg) {
    elements.regPreviewImg.src = '';
    elements.regPreviewImg.classList.add('hidden');
  }
  if (elements.previewPlaceholder) elements.previewPlaceholder.classList.remove('hidden');
  if (elements.previewStatus) {
    elements.previewStatus.className = 'badge warning';
    elements.previewStatus.textContent = 'Aguardando Captura';
  }
  if (elements.previewDescInfo) {
    elements.previewDescInfo.textContent = 'Posicione o rosto e clique em "Capturar Face".';
  }
}
window.resetRegistrationForm = resetRegistrationForm;

function handleSystemLogout() {
  state.currentUser = null;
  localStorage.removeItem('faceid_operator');
  document.body.classList.add('unauthenticated');

  // 1. Immediately terminate camera stream & detection loop
  stopWebcam();

  // 2. Hide and reset all active modals
  const modals = [
    'modal-log-details',
    'modal-edit-credential',
    'modal-profile',
    'modal-system-user',
    'modal-branch'
  ];
  modals.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });

  // 3. Reset forms and result displays
  resetRegistrationForm();
  resetAuthResultDisplay();

  // 4. Return to default auth tab & update operator UI
  switchTab('auth');
  updateOperatorUI();

  // 5. Present the login overlay cleanly
  const overlay = document.getElementById('system-login-overlay');
  if (overlay) {
    overlay.classList.remove('hidden');
    const pwd = document.getElementById('login-password');
    if (pwd) pwd.value = '';
    const err = document.getElementById('login-error-msg');
    if (err) err.classList.add('hidden');
  }
}
window.handleSystemLogout = handleSystemLogout;

function updateOperatorUI() {
  const nameEl = document.getElementById('operator-display-name');
  const userEl = document.getElementById('operator-display-username');
  const avatarEl = document.getElementById('operator-avatar');

  if (!state.currentUser) {
    if (nameEl) nameEl.textContent = 'Leitura Biométrica';
    if (userEl) userEl.textContent = 'Sem operador ativo';
    if (avatarEl) avatarEl.textContent = 'ID';
    return;
  }

  if (nameEl) nameEl.textContent = state.currentUser.name;
  if (userEl) userEl.textContent = `@${state.currentUser.username}`;
  if (avatarEl) {
    const initials = state.currentUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    avatarEl.textContent = initials || 'OP';
  }
}

function hasMenuPermission(tab) {
  if (!state.currentUser) return true;
  if (state.currentUser.role === 'admin') return true;
  return Array.isArray(state.currentUser.permissions) && state.currentUser.permissions.includes(tab);
}

function getFirstAllowedTab() {
  const tabs = ['auth', 'register', 'credentials', 'status', 'audit', 'system_users', 'profiles', 'branches'];
  for (const t of tabs) {
    if (hasMenuPermission(t)) return t;
  }
  return 'auth';
}

function getUserAllowedBranches() {
  if (!state.currentUser) return ['*'];
  if (state.currentUser.role === 'admin') return ['*'];
  if (Array.isArray(state.currentUser.allowedBranches) && state.currentUser.allowedBranches.length > 0) {
    return state.currentUser.allowedBranches;
  }
  return state.currentUser.branchCode ? [state.currentUser.branchCode] : ['*'];
}

function hasBranchAccess(branchCode) {
  const allowed = getUserAllowedBranches();
  if (allowed.includes('*')) return true;
  return allowed.includes(branchCode);
}

function applyMenuPermissions() {
  const show = (el, allowed) => { if (el) el.classList.toggle('hidden', !allowed); };

  const tabAuth = document.getElementById('tab-auth');
  const tabRegister = document.getElementById('tab-register');
  const tabCredentials = document.getElementById('tab-credentials');
  const tabStatus = document.getElementById('tab-status');
  const tabAudit = document.getElementById('tab-audit');
  const tabSystemUsers = document.getElementById('tab-system_users');
  const tabProfiles = document.getElementById('tab-profiles');
  const tabBranches = document.getElementById('tab-branches');

  const pAuth = hasMenuPermission('auth');
  const pRegister = hasMenuPermission('register');
  const pCredentials = hasMenuPermission('credentials');
  const pStatus = hasMenuPermission('status');
  const pAudit = hasMenuPermission('audit');
  const pSystemUsers = hasMenuPermission('system_users');
  const pProfiles = hasMenuPermission('profiles');
  const pBranches = hasMenuPermission('branches');

  // Sidebar Menu Items
  show(tabAuth, pAuth);
  show(tabRegister, pRegister);
  show(tabCredentials, pCredentials);
  show(tabStatus, pStatus);
  show(tabAudit, pAudit);
  show(tabSystemUsers, pSystemUsers);
  show(tabProfiles, pProfiles);
  show(tabBranches, pBranches);

  // Sidebar Groups (Hide group if all its items are hidden)
  show(document.getElementById('group-biometrics'), pRegister);
  show(document.getElementById('group-gestao'), pCredentials || pAudit);
  show(document.getElementById('group-acessos'), pSystemUsers || pProfiles || pBranches);
  show(document.getElementById('group-infra'), pStatus);

  // Mobile Bottom Navigation: mantém visíveis, mas desabilita e estiliza como inativos os botões sem privilégio
  updateBottomNav(state.currentTab || 'auth');

  // Update Branch Selects & Filters according to permissions
  updateCredentialBranchSelects();
  populateAuditBranchFilter();

  // If current tab is not allowed, switch to the first allowed tab
  if (state.currentTab && !hasMenuPermission(state.currentTab)) {
    const nextTab = getFirstAllowedTab();
    switchTab(nextTab);
  }
}
window.applyMenuPermissions = applyMenuPermissions;

// ==========================================================================
// TAB NAVIGATION & LAYER SWITCHING
// ==========================================================================
function switchTab(tab) {
  if (!hasMenuPermission(tab)) {
    showAlert({
      type: 'warning',
      title: 'Acesso Restrito',
      message: 'Seu perfil de acesso não possui privilégios para acessar esta rotina do sistema.'
    });
    const fallbackTab = getFirstAllowedTab();
    if (tab !== fallbackTab) {
      switchTab(fallbackTab);
    }
    return;
  }

  state.currentTab = tab;
  
  const activeClass = 'sidebar-subitem-btn py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-start gap-3 transition-all bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 w-full shadow-sm';
  const inactiveClass = 'sidebar-subitem-btn py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-start gap-2.5 transition-all text-slate-400 hover:text-white hover:bg-slate-800/50 border border-transparent w-full';

  const tabSystemUsers = document.getElementById('tab-system_users');
  const tabProfiles = document.getElementById('tab-profiles');
  const tabBranches = document.getElementById('tab-branches');

  if (elements.tabAuth) elements.tabAuth.className = tab === 'auth' ? activeClass : inactiveClass;
  if (elements.tabRegister) elements.tabRegister.className = tab === 'register' ? activeClass : inactiveClass;
  if (elements.tabCredentials) elements.tabCredentials.className = tab === 'credentials' ? activeClass : inactiveClass;
  if (elements.tabStatus) elements.tabStatus.className = tab === 'status' ? activeClass : inactiveClass;
  if (elements.tabAudit) elements.tabAudit.className = tab === 'audit' ? activeClass : inactiveClass;
  if (tabSystemUsers) tabSystemUsers.className = tab === 'system_users' ? activeClass : inactiveClass;
  if (tabProfiles) tabProfiles.className = tab === 'profiles' ? activeClass : inactiveClass;
  if (tabBranches) tabBranches.className = tab === 'branches' ? activeClass : inactiveClass;

  // Auto open parent submenu
  if (tab === 'auth' || tab === 'register') {
    const subBio = document.getElementById('sub-biometrics');
    if (subBio && !subBio.classList.contains('open')) subBio.classList.add('open');
  } else if (tab === 'credentials' || tab === 'audit') {
    const subGes = document.getElementById('sub-gestao');
    if (subGes && !subGes.classList.contains('open')) subGes.classList.add('open');
  } else if (tab === 'system_users' || tab === 'profiles' || tab === 'branches') {
    const subAce = document.getElementById('sub-acessos');
    if (subAce && !subAce.classList.contains('open')) subAce.classList.add('open');
  } else if (tab === 'status') {
    const subInfra = document.getElementById('sub-infra');
    if (subInfra && !subInfra.classList.contains('open')) subInfra.classList.add('open');
  }

  updateBottomNav(tab);

  const viewAuth = document.getElementById('view-auth');
  const viewRegister = document.getElementById('view-register');
  const viewCredentials = document.getElementById('view-credentials');
  const viewStatus = document.getElementById('view-status');
  const viewAudit = document.getElementById('view-audit');
  const viewSystemUsers = document.getElementById('view-system-users');
  const viewProfiles = document.getElementById('view-profiles');

  if (viewAuth && viewRegister) {
    const cameraSlotAuth = document.getElementById('view-auth-camera-slot');
    const cameraSlotRegister = document.getElementById('view-register-camera-slot');
    
    if (tab === 'auth' && cameraSlotAuth) {
      cameraSlotAuth.appendChild(elements.scannerHudCard);
      elements.authActions.classList.remove('hidden');
      elements.registerActions.classList.add('hidden');
    } else if (tab === 'register' && cameraSlotRegister) {
      cameraSlotRegister.appendChild(elements.scannerHudCard);
      elements.authActions.classList.add('hidden');
      elements.registerActions.classList.remove('hidden');
    }
  }

  if (viewAuth) viewAuth.classList.toggle('hidden', tab !== 'auth');
  if (viewRegister) viewRegister.classList.toggle('hidden', tab !== 'register');
  if (viewCredentials) {
    viewCredentials.classList.toggle('hidden', tab !== 'credentials');
    if (tab === 'credentials') loadUsersList();
  }
  if (viewStatus) {
    viewStatus.classList.toggle('hidden', tab !== 'status');
    if (tab === 'status') loadUsersList();
  }
  if (viewAudit) {
    viewAudit.classList.toggle('hidden', tab !== 'audit');
    if (tab === 'audit') loadLogsHistory();
  }
  if (viewSystemUsers) {
    viewSystemUsers.classList.toggle('hidden', tab !== 'system_users');
    if (tab === 'system_users') loadSystemUsersList();
  }
  if (viewProfiles) {
    viewProfiles.classList.toggle('hidden', tab !== 'profiles');
    if (tab === 'profiles') loadProfilesList();
  }
  const viewBranches = document.getElementById('view-branches');
  if (viewBranches) {
    viewBranches.classList.toggle('hidden', tab !== 'branches');
    if (tab === 'branches') loadBranchesList();
  }
}
window.switchTab = switchTab;

// Safety function aliases for tab data loading
function loadUsersCredentials() { loadUsersList(); }
function loadSystemStatusData() { loadUsersList(); }
window.loadUsersCredentials = loadUsersCredentials;
window.loadSystemStatusData = loadSystemStatusData;

function updateBottomNav(tab) {
  const items = [
    { el: elements.navRegister || document.getElementById('nav-register'), perm: 'register', isCenter: false },
    { el: elements.navAudit || document.getElementById('nav-audit'), perm: 'audit', isCenter: false },
    { el: elements.navStatus || document.getElementById('nav-status'), perm: 'status', isCenter: false },
    { el: elements.navAuth || document.getElementById('nav-auth'), perm: 'auth', isCenter: true },
    { el: elements.navCredentials || document.getElementById('nav-credentials'), perm: 'credentials', isCenter: false },
    { el: document.getElementById('nav-system_users'), perm: 'system_users', isCenter: false }
  ];

  items.forEach(({ el, perm, isCenter }) => {
    if (!el) return;

    const hasPerm = hasMenuPermission(perm);
    const isActive = (tab === perm);

    // Garantir que não está escondido para manter o grid estrutural no mobile
    el.classList.remove('hidden');

    if (!hasPerm) {
      // INATIVO / SEM PRIVILÉGIO (DESABILITADO)
      el.disabled = true;
      el.setAttribute('title', 'Acesso Restrito: Seu perfil não possui permissão para esta rotina');
      if (isCenter) {
        el.className = 'flex flex-col items-center justify-center -mt-4 bg-slate-800/30 text-slate-600/40 opacity-20 cursor-not-allowed select-none w-12 h-12 rounded-full border-2 border-slate-800/40 shadow-none pointer-events-none';
      } else {
        el.className = 'flex flex-col items-center justify-center gap-0.5 text-slate-600/40 opacity-20 cursor-not-allowed select-none px-1.5 py-1 pointer-events-none';
      }
    } else {
      // HABILITADO / COM PRIVILÉGIO
      el.disabled = false;
      el.removeAttribute('title');
      if (isCenter) {
        if (isActive) {
          el.className = 'flex flex-col items-center justify-center -mt-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold w-12 h-12 rounded-full shadow-lg shadow-cyan-600/30 transition-all active:scale-95 shrink-0 border-2 border-[#090d16] cursor-pointer';
        } else {
          el.className = 'flex flex-col items-center justify-center -mt-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold w-12 h-12 rounded-full shadow-md transition-all active:scale-95 shrink-0 border-2 border-[#090d16] cursor-pointer';
        }
      } else {
        if (isActive) {
          el.className = 'flex flex-col items-center justify-center gap-0.5 text-cyan-400 font-bold transition-all px-1.5 py-1 cursor-pointer';
        } else {
          el.className = 'flex flex-col items-center justify-center gap-0.5 text-slate-400 hover:text-white transition-all px-1.5 py-1 cursor-pointer';
        }
      }
    }
  });
}

function scrollToAudit() {
  const auditSection = document.getElementById('section-audit');
  if (auditSection) {
    auditSection.scrollIntoView({ behavior: 'smooth' });
    if (elements.navAudit) {
      elements.navAudit.classList.add('text-emerald-400');
      setTimeout(() => elements.navAudit.classList.remove('text-emerald-400'), 2500);
    }
  }
}
window.scrollToAudit = scrollToAudit;

function updateAutoScanUI() {
  const text = elements.autoScanText || document.getElementById('auto-scan-text');
  const icon = elements.autoScanIcon || document.getElementById('auto-scan-icon');
  if (text) {
    text.textContent = state.autoScan ? 'Automático' : 'Manual';
    text.className = state.autoScan ? 'text-emerald-400 font-bold' : 'text-cyan-400 font-bold';
  }
  if (icon) {
    icon.className = state.autoScan ? 'fa-solid fa-rotate' : 'fa-solid fa-hand';
  }
}
window.updateAutoScanUI = updateAutoScanUI;

function toggleAutoScan() {
  state.autoScan = !state.autoScan;
  updateAutoScanUI();
  showAlert({
    type: 'info',
    title: 'Modo de Varredura',
    message: state.autoScan
      ? 'Varredura Automática ativada. O sistema verificará rostos alinhados automaticamente.'
      : 'Modo Manual ativado. Clique em "Validar Identidade Agora" para verificar.'
  });
}
window.toggleAutoScan = toggleAutoScan;

// ==========================================================================
// VERIFICATION / AUTHENTICATION FLOW
// ==========================================================================
function triggerManualVerification() {
  if (!state.currentDetection) {
    showAlert({
      type: 'warning',
      title: 'Rosto Não Detectado',
      message: 'Posicione o rosto de forma centralizada diante da câmera antes de verificar.'
    });
    return;
  }
  verifyFace(Array.from(state.currentDetection.descriptor));
}

async function verifyFace(descriptorArray) {
  try {
    elements.resultUserName.textContent = 'Verificando...';
    elements.resultUserRole.textContent = 'Consultando base biométrica';
    
    // Generate high-definition snapshot image with date & time watermark
    let snapshotBase64 = null;
    try {
      const sourceElement = state.feedMode === 'image' ? elements.imageFeed : elements.video;
      if (sourceElement && (sourceElement.videoWidth || sourceElement.clientWidth)) {
        const snapCanvas = document.createElement('canvas');
        snapCanvas.width = 600;
        snapCanvas.height = 600;
        const sCtx = snapCanvas.getContext('2d');
        sCtx.imageSmoothingEnabled = true;
        sCtx.imageSmoothingQuality = 'high';
        
        // Draw full video frame scaled into 600x600 HD canvas
        sCtx.drawImage(sourceElement, 0, 0, 600, 600);
        
        const now = new Date();
        const stampText = `${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR')}`;
        
        sCtx.fillStyle = 'rgba(9, 13, 22, 0.88)';
        sCtx.fillRect(0, 530, 600, 70);
        
        const grad = sCtx.createLinearGradient(0, 529, 600, 529);
        grad.addColorStop(0, '#06b6d4');
        grad.addColorStop(0.5, '#10b981');
        grad.addColorStop(1, '#06b6d4');
        sCtx.fillStyle = grad;
        sCtx.fillRect(0, 528, 600, 2);

        sCtx.fillStyle = '#38bdf8';
        sCtx.font = 'bold 20px monospace';
        sCtx.textAlign = 'center';
        sCtx.fillText(`VERIFICAÇÃO HD: ${stampText}`, 300, 572);
        
        snapshotBase64 = snapCanvas.toDataURL('image/jpeg', 0.95);
      }
    } catch (e) { console.warn('Snapshot generation error:', e); }

    const response = await fetch('/api/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ descriptor: descriptorArray, image: snapshotBase64 })
    });

    const data = await response.json();
    displayVerificationResult(data);
    loadLogsHistory(); // Refresh logs table
  } catch (err) {
    console.error('[FACEID API VERIFY ERROR]', err);
    elements.resultUserName.textContent = 'Erro de Conexão';
    elements.resultUserRole.textContent = 'Falha ao se comunicar com o servidor';
  }
}

function displayVerificationResult(data) {
  const { success, message, user, matchDistance, matchPercentage } = data;

  if (success && user) {
    soundEffects.playSuccess();
    
    if (elements.resultDisplay) {
      elements.resultDisplay.className = 'w-full bg-emerald-500/10 border border-emerald-500/40 rounded-2xl p-2.5 sm:p-3 flex flex-col gap-2 transition-all duration-300 shadow-md shadow-emerald-500/10 max-w-full overflow-hidden box-border';
    }

    if (elements.resultBadgeIcon) {
      elements.resultBadgeIcon.className = 'w-7 h-7 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center text-xs font-bold shrink-0 shadow-inner';
      elements.resultBadgeIcon.innerHTML = '<i class="fa-solid fa-check"></i>';
    }
    
    if (elements.resultUserName) elements.resultUserName.textContent = user.name;
    if (elements.resultUserRole) elements.resultUserRole.textContent = message;
    
    if (elements.resultMatchPct) {
      elements.resultMatchPct.className = 'text-xs sm:text-sm font-bold text-emerald-400';
      elements.resultMatchPct.textContent = `${matchPercentage}%`;
    }
    if (elements.resultProgressBar) {
      elements.resultProgressBar.className = 'h-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-all duration-500';
      elements.resultProgressBar.style.width = `${matchPercentage}%`;
    }
    if (elements.resultDistanceText) {
      elements.resultDistanceText.textContent = `Distância: ${matchDistance} (Limite: 0.55)`;
    }

    if (elements.faceGuideMask) elements.faceGuideMask.className = 'face-guide-mask aligned';

  } else {
    soundEffects.playDenied();

    if (elements.resultDisplay) {
      elements.resultDisplay.className = 'w-full bg-rose-500/10 border border-rose-500/40 rounded-2xl p-2.5 sm:p-3 flex flex-col gap-2 transition-all duration-300 shadow-md shadow-rose-500/10 max-w-full overflow-hidden box-border';
    }

    if (elements.resultBadgeIcon) {
      elements.resultBadgeIcon.className = 'w-7 h-7 rounded-full bg-rose-500 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-inner';
      elements.resultBadgeIcon.innerHTML = '<i class="fa-solid fa-xmark"></i>';
    }
    
    if (elements.resultUserName) elements.resultUserName.textContent = 'Acesso Negado';
    if (elements.resultUserRole) elements.resultUserRole.textContent = message;
    
    const pct = matchPercentage || 0;
    if (elements.resultMatchPct) {
      elements.resultMatchPct.className = 'text-xs sm:text-sm font-bold text-rose-400';
      elements.resultMatchPct.textContent = `${pct}%`;
    }
    if (elements.resultProgressBar) {
      elements.resultProgressBar.className = 'h-full bg-rose-500 transition-all duration-500';
      elements.resultProgressBar.style.width = `${pct}%`;
    }
    if (elements.resultDistanceText) {
      elements.resultDistanceText.textContent = matchDistance !== undefined ? `Distância: ${matchDistance}` : 'Sem correspondência';
    }

    if (elements.faceGuideMask) elements.faceGuideMask.className = 'face-guide-mask denied';
  }
}

// ==========================================================================
// REGISTRATION FLOW (HD BIOMETRIC FACE CAPTURE & CREDENTIAL LOOKUP)
// ==========================================================================

// Search & Autocomplete in Register View
function handleRegisterCredentialSearch(query) {
  const q = (query || '').toLowerCase().trim();
  const resultsContainer = document.getElementById('reg-search-results');
  const clearBtn = document.getElementById('btn-clear-search-input');
  
  if (clearBtn) {
    clearBtn.classList.toggle('hidden', !q);
  }

  if (!resultsContainer) return;

  if (!q) {
    resultsContainer.innerHTML = '';
    resultsContainer.classList.add('hidden');
    return;
  }

  const users = state.users || [];
  const matches = users.filter(u => 
    (u.name && u.name.toLowerCase().includes(q)) ||
    (u.registration && u.registration.toLowerCase().includes(q)) ||
    (u.email && u.email.toLowerCase().includes(q)) ||
    (u.department && u.department.toLowerCase().includes(q)) ||
    (u.role && u.role.toLowerCase().includes(q))
  );

  if (matches.length === 0) {
    resultsContainer.innerHTML = `
      <div class="p-3 text-center text-xs text-slate-400">
        Nenhum colaborador encontrado para "${escapeHtml(q)}".
      </div>`;
    resultsContainer.classList.remove('hidden');
    return;
  }

  resultsContainer.innerHTML = matches.map(u => {
    const avatar = u.image || DEFAULT_USER_AVATAR;
    const branch = u.branch_code || u.branch || '0101';
    return `
      <div onclick="selectCredentialForRegister('${escapeHtml(u.id)}')" class="flex items-center justify-between p-2.5 hover:bg-slate-800/80 cursor-pointer transition-colors group">
        <div class="flex items-center gap-2.5 min-w-0">
          <img src="${avatar}" alt="Avatar" class="w-8 h-8 rounded-full object-cover bg-slate-800 border border-slate-700 shrink-0" onerror="handleAvatarError(this)">
          <div class="flex flex-col min-w-0">
            <span class="text-xs font-bold text-white group-hover:text-emerald-400 truncate transition-colors">${escapeHtml(u.name)}</span>
            <span class="text-[10px] text-slate-400 font-mono">Matrícula: <strong class="text-emerald-400">${escapeHtml(u.registration || 'N/A')}</strong> • Filial: ${escapeHtml(branch)} • ${escapeHtml(u.role || '')}</span>
          </div>
        </div>
        <button type="button" class="px-2 py-1 bg-cyan-500/15 group-hover:bg-cyan-500 text-cyan-400 group-hover:text-slate-950 text-[10px] font-bold rounded-lg border border-cyan-500/30 transition-all shrink-0">
          Selecionar
        </button>
      </div>`;
  }).join('');

  resultsContainer.classList.remove('hidden');
}
window.handleRegisterCredentialSearch = handleRegisterCredentialSearch;

function clearRegisterSearchInput() {
  const input = document.getElementById('reg-search-credential');
  if (input) {
    input.value = '';
    handleRegisterCredentialSearch('');
  }
}
window.clearRegisterSearchInput = clearRegisterSearchInput;

function selectCredentialForRegister(userId) {
  const user = (state.users || []).find(u => String(u.id) === String(userId));
  if (!user) return;

  const editingIdEl = document.getElementById('reg-editing-user-id');
  if (editingIdEl) editingIdEl.value = user.id;

  if (elements.regBranch) elements.regBranch.value = user.branch_code || user.branch || '0101';
  if (elements.regRegistration) elements.regRegistration.value = user.registration || '';
  if (elements.regName) elements.regName.value = user.name || '';
  if (elements.regEmail) elements.regEmail.value = user.email || '';
  if (elements.regDepartment) elements.regDepartment.value = user.department || '';
  if (elements.regRole) elements.regRole.value = user.role || '';

  // Show existing user photo in preview
  if (user.image) {
    if (elements.regPreviewImg) {
      elements.regPreviewImg.src = user.image;
      elements.regPreviewImg.classList.remove('hidden');
    }
    if (elements.previewPlaceholder) elements.previewPlaceholder.classList.add('hidden');
    if (elements.previewStatus) {
      elements.previewStatus.className = 'badge success';
      elements.previewStatus.textContent = 'Biometria Cadastrada';
    }
    if (elements.previewDescInfo) {
      elements.previewDescInfo.textContent = 'Foto atual carregada. Capture novamente se desejar atualizar a face.';
    }
  }

  // Update banners & UI buttons
  const banner = document.getElementById('reg-selected-banner');
  const nameLabel = document.getElementById('reg-selected-name');
  const metaLabel = document.getElementById('reg-selected-meta');
  const btnNew = document.getElementById('btn-reg-new-mode');

  if (banner) banner.classList.remove('hidden');
  if (nameLabel) nameLabel.textContent = `Editando: ${user.name}`;
  if (metaLabel) metaLabel.textContent = `Matrícula: ${user.registration} • Filial: ${user.branch_code || user.branch || '0101'} • ${user.role || ''}`;
  if (btnNew) btnNew.classList.remove('hidden');

  if (elements.btnSubmitRegister) {
    elements.btnSubmitRegister.disabled = false;
    elements.btnSubmitRegister.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i> Atualizar Credencial Biométrica';
  }

  // Hide search dropdown
  const resultsContainer = document.getElementById('reg-search-results');
  if (resultsContainer) resultsContainer.classList.add('hidden');
  const searchInput = document.getElementById('reg-search-credential');
  if (searchInput) searchInput.value = '';
  const clearBtn = document.getElementById('btn-clear-search-input');
  if (clearBtn) clearBtn.classList.add('hidden');

  showAlert({
    type: 'info',
    title: 'Credencial Selecionada',
    message: `Dados de "${user.name}" carregados. Você pode alterar campos e/ou capturar nova biometria facial.`
  });
}
window.selectCredentialForRegister = selectCredentialForRegister;

function clearRegistrationSelection() {
  const editingIdEl = document.getElementById('reg-editing-user-id');
  if (editingIdEl) editingIdEl.value = '';

  const banner = document.getElementById('reg-selected-banner');
  const btnNew = document.getElementById('btn-reg-new-mode');
  if (banner) banner.classList.add('hidden');
  if (btnNew) btnNew.classList.add('hidden');

  resetRegistrationForm();
  clearRegisterSearchInput();

  if (elements.btnSubmitRegister) {
    elements.btnSubmitRegister.disabled = true;
    elements.btnSubmitRegister.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Salvar Registro Biométrico';
  }
}
window.clearRegistrationSelection = clearRegistrationSelection;

function captureFaceForRegister() {
  if (!state.currentDetection) {
    showAlert({
      type: 'warning',
      title: 'Face Não Encontrada',
      message: 'Posicione o rosto de forma centralizada diante da câmera ou envie uma foto de teste antes de capturar.'
    });
    return;
  }

  const sourceElement = state.feedMode === 'image' ? elements.imageFeed : elements.video;
  
  // High-Resolution 600x600 HD Output Canvas
  const outCanvas = document.createElement('canvas');
  outCanvas.width = 600;
  outCanvas.height = 600;
  const ctx = outCanvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  
  const box = state.currentDetection.detection.box;
  const sourceWidth = sourceElement.naturalWidth || sourceElement.videoWidth || sourceElement.clientWidth || 640;
  const sourceHeight = sourceElement.naturalHeight || sourceElement.videoHeight || sourceElement.clientHeight || 480;

  // 35% margin padding for balanced, high-resolution portrait capture
  const padX = box.width * 0.35;
  const padY = box.height * 0.45;
  
  const cropX = Math.max(0, box.x - padX);
  const cropY = Math.max(0, box.y - padY);
  const cropW = Math.min(sourceWidth - cropX, box.width + (padX * 2));
  const cropH = Math.min(sourceHeight - cropY, box.height + (padY * 2));

  ctx.drawImage(
    sourceElement,
    cropX, cropY, cropW, cropH,
    0, 0, 600, 600
  );

  // High-Definition Polished Date/Time Watermark Bar
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR');
  const timeStr = now.toLocaleTimeString('pt-BR');
  const stampText = `${dateStr} ${timeStr}`;

  ctx.fillStyle = 'rgba(9, 13, 22, 0.88)';
  ctx.fillRect(0, 530, 600, 70);

  const grad = ctx.createLinearGradient(0, 529, 600, 529);
  grad.addColorStop(0, '#06b6d4');
  grad.addColorStop(0.5, '#10b981');
  grad.addColorStop(1, '#06b6d4');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 528, 600, 2);

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 20px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`CAPTURA HD: ${stampText}`, 300, 572);

  const imageBase64 = outCanvas.toDataURL('image/jpeg', 0.95);

  state.capturedRegisterData = {
    descriptor: Array.from(state.currentDetection.descriptor),
    image: imageBase64
  };

  elements.regPreviewImg.src = imageBase64;
  elements.regPreviewImg.classList.remove('hidden');
  elements.previewPlaceholder.classList.add('hidden');
  
  elements.previewStatus.className = 'badge success';
  elements.previewStatus.textContent = 'Face Capturada HD!';
  elements.previewDescInfo.textContent = 'Vetor biométrico de 128 dimensões extraído em alta definição.';
  
  elements.btnSubmitRegister.disabled = false;
  soundEffects.playSuccess();
  showAlert({
    type: 'success',
    title: 'Face Capturada em HD',
    message: 'Biometria facial extraída com alta qualidade e nitidez. Preencha os dados e salve a credencial.'
  });
}

async function handleRegisterSubmit(event) {
  event.preventDefault();

  const editingIdEl = document.getElementById('reg-editing-user-id');
  const editingUserId = editingIdEl ? editingIdEl.value : '';

  if (!editingUserId && !state.capturedRegisterData) {
    showAlert({ type: 'warning', title: 'Captura Necessária', message: 'Capture a foto do rosto antes de enviar um novo cadastro.' });
    return;
  }

  const branch = elements.regBranch ? elements.regBranch.value.trim().substring(0, 4) : '0101';
  const registration = elements.regRegistration ? elements.regRegistration.value.trim() : '';
  const name = elements.regName.value.trim();
  const email = elements.regEmail ? elements.regEmail.value.trim() : '';
  const department = elements.regDepartment ? elements.regDepartment.value.trim() : 'Geral';
  const role = elements.regRole.value.trim();

  if (!registration) {
    showAlert({ type: 'warning', title: 'Matrícula Obrigatória', message: 'O número de matrícula é obrigatório.' });
    return;
  }

  if (!name || !role) {
    showAlert({ type: 'warning', title: 'Campos Incompletos', message: 'Preencha todos os campos obrigatórios do formulário.' });
    return;
  }

  try {
    elements.btnSubmitRegister.disabled = true;
    elements.btnSubmitRegister.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processando...';

    let response, data;

    if (editingUserId) {
      // UPDATE EXISTING CREDENTIAL
      const payload = {
        branch,
        branch_code: branch,
        registration,
        name,
        email,
        department,
        role
      };
      if (state.capturedRegisterData) {
        payload.descriptor = state.capturedRegisterData.descriptor;
        payload.image = state.capturedRegisterData.image;
      }

      response = await fetch(`/api/users/${encodeURIComponent(editingUserId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      data = await response.json();

      if (data.success) {
        showAlert({
          type: 'success',
          title: 'Credencial Atualizada',
          message: `Credencial de "${name}" (Matrícula: ${registration}) atualizada com sucesso!`
        });
        clearRegistrationSelection();
        loadUsersList();
      } else {
        showAlert({
          type: 'danger',
          title: 'Falha na Atualização',
          message: data.message || 'Erro ao atualizar credencial.'
        });
      }
    } else {
      // CREATE NEW CREDENTIAL
      response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branch,
          branch_code: branch,
          registration,
          name,
          email,
          department,
          role,
          descriptor: state.capturedRegisterData.descriptor,
          image: state.capturedRegisterData.image
        })
      });
      data = await response.json();

      if (data.success) {
        showAlert({
          type: 'success',
          title: 'Credencial Registrada',
          message: `Credencial biométrica de "${name}" (Matrícula: ${registration}) cadastrada com sucesso!`
        });
        clearRegistrationSelection();
        loadUsersList();
      } else {
        showAlert({
          type: 'danger',
          title: 'Falha no Cadastro',
          message: data.message || 'Erro ao cadastrar credencial.'
        });
      }
    }
  } catch (err) {
    console.error('[FACEID API REGISTER/UPDATE ERROR]', err);
    showAlert({
      type: 'danger',
      title: 'Erro de Comunicação',
      message: 'Falha ao se comunicar com o servidor.'
    });
  } finally {
    if (elements.btnSubmitRegister) {
      elements.btnSubmitRegister.disabled = false;
      const isEditing = Boolean(document.getElementById('reg-editing-user-id')?.value);
      elements.btnSubmitRegister.innerHTML = isEditing
        ? '<i class="fa-solid fa-arrows-rotate"></i> Atualizar Credencial Biométrica'
        : '<i class="fa-solid fa-floppy-disk"></i> Salvar Registro Biométrico';
    }
  }
}

// ==========================================================================
// USER & LOGS DATA FETCHING
// ==========================================================================
async function loadUsersList() {
  try {
    const response = await fetch('/api/users');
    const data = await response.json();

    if (data.success) {
      state.users = data.users;
      elements.usersCount.textContent = `${data.users.length} Usuário(s)`;
      renderUsersList(data.users);
    }
  } catch (err) {
    console.error('[FACEID GET USERS ERROR]', err);
  }
}

function renderUsersList(users) {
  const allowed = getUserAllowedBranches();
  const visibleUsers = (users || []).filter(u => {
    if (allowed.includes('*')) return true;
    const uBranch = u.branch || u.branch_code || '0101';
    return allowed.includes(uBranch);
  });

  if (elements.usersListContainer) {
    if (!visibleUsers || visibleUsers.length === 0) {
      elements.usersListContainer.innerHTML = `
        <div class="flex flex-col items-center justify-center p-6 text-slate-500 gap-1">
          <i class="fa-solid fa-user-slash text-xl"></i>
          <p class="text-xs">Nenhum usuário cadastrado ainda.</p>
        </div>`;
    } else {
      elements.usersListContainer.innerHTML = visibleUsers.map(user => `
        <div class="flex items-center justify-between bg-slate-950/70 border border-slate-800 hover:border-cyan-500/40 rounded-xl p-2.5 transition-colors">
          <div class="flex items-center gap-2.5 min-w-0">
            <img class="w-9 h-9 rounded-full object-cover border border-cyan-400 shrink-0" src="${user.image || DEFAULT_USER_AVATAR}" onerror="handleAvatarError(this)" alt="${escapeHtml(user.name)}">
            <div class="flex flex-col min-w-0">
              <h4 class="text-xs font-bold text-slate-200 truncate">${escapeHtml(user.name)}</h4>
              <p class="text-[10px] text-slate-400 truncate">${escapeHtml(user.role)}</p>
            </div>
          </div>
          <div class="flex items-center gap-1 shrink-0">
            <button class="text-slate-400 hover:text-cyan-400 transition-colors p-1" onclick="openEditModal('${user.id}')" title="Editar Credencial">
              <i class="fa-solid fa-pen-to-square text-xs"></i>
            </button>
            <button class="text-slate-500 hover:text-rose-400 transition-colors p-1" onclick="deleteUser('${user.id}')" title="Excluir Usuário">
              <i class="fa-solid fa-trash-can text-xs"></i>
            </button>
          </div>
        </div>
      `).join('');
    }
  }

  if (state.currentTab === 'credentials') {
    renderFullCredentialsList(users);
  }
}

// ==========================================================================
// CREDENTIAL MANAGEMENT ROUTINES (FULL-WIDTH DATA GRID)
// ==========================================================================
function renderFullCredentialsList(usersList) {
  if (!elements.credentialsFullList) return;
  const list = usersList || state.users;

  const allowed = getUserAllowedBranches();
  const branchScopedList = (list || []).filter(u => {
    if (allowed.includes('*')) return true;
    const uBranch = u.branch || u.branch_code || '0101';
    return allowed.includes(uBranch);
  });

  const q = (elements.credSearchInput?.value || '').trim().toLowerCase();
  const statusFilter = elements.credFilterStatus?.value || 'all';

  let filtered = branchScopedList || [];

  if (statusFilter === 'active') {
    filtered = filtered.filter(u => !u.isBlocked);
  } else if (statusFilter === 'blocked') {
    filtered = filtered.filter(u => u.isBlocked);
  }

  if (q) {
    filtered = filtered.filter(u =>
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.registration && u.registration.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.branch && u.branch.toLowerCase().includes(q)) ||
      (u.department && u.department.toLowerCase().includes(q)) ||
      (u.role && u.role.toLowerCase().includes(q))
    );
  }

  if (elements.credentialsCounterBadge) {
    elements.credentialsCounterBadge.textContent = `${filtered.length} Credencia${filtered.length === 1 ? 'l' : 'is'}`;
  }

  if (!filtered || filtered.length === 0) {
    elements.credentialsFullList.innerHTML = `
      <div class="col-span-full flex flex-col items-center justify-center p-12 text-slate-500 gap-2">
        <i class="fa-solid fa-id-badge text-4xl mb-1 text-slate-600"></i>
        <p class="text-sm font-medium">Nenhuma credencial biométrica encontrada.</p>
      </div>`;
    return;
  }

  elements.credentialsFullList.innerHTML = filtered.map(u => {
    const isBlocked = Boolean(u.isBlocked);
    const avatarSrc = u.image || DEFAULT_USER_AVATAR;
    const branch = u.branch || '0101';
    const registration = u.registration || 'N/A';
    const email = u.email || '';
    const department = u.department || 'Geral';
    const role = u.role || 'Colaborador';
    const formattedDate = u.createdAt ? new Date(u.createdAt).toLocaleDateString('pt-BR') : '-';

    return `
      <div class="bg-[#090d16] border ${isBlocked ? 'border-rose-500/40 shadow-rose-950/20' : 'border-slate-800/80 hover:border-emerald-500/40'} rounded-2xl p-4 flex flex-col justify-between gap-3.5 transition-all shadow-lg group">
        
        <!-- Top Row: Avatar + Info + Status Badge -->
        <div class="flex items-start justify-between gap-2.5">
          <div class="flex items-center gap-3 min-w-0 flex-1">
            <div class="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center overflow-hidden shrink-0 border border-slate-700/80 shadow-inner">
              <img src="${avatarSrc}" alt="${escapeHtml(u.name)}" class="w-full h-full object-cover" onerror="handleAvatarError(this)">
            </div>
            <div class="flex flex-col min-w-0 flex-1">
              <h3 class="text-xs sm:text-sm font-bold text-white truncate group-hover:text-emerald-400 transition-colors" title="${escapeHtml(u.name)}">${escapeHtml(u.name)}</h3>
              <span class="text-xs text-emerald-400 font-medium truncate">${escapeHtml(role)}</span>
              <span class="text-[10px] text-slate-400 truncate">${escapeHtml(department)}</span>
            </div>
          </div>

          <div class="shrink-0">
            ${isBlocked ? `
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                <span class="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse"></span> Bloqueado
              </span>
            ` : `
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Ativo
              </span>
            `}
          </div>
        </div>

        <!-- Badges Row: Filial & Matrícula -->
        <div class="grid grid-cols-2 gap-2 bg-[#0d1320] p-2.5 rounded-xl border border-slate-800/60 text-xs">
          <div class="flex flex-col">
            <span class="text-[9px] text-slate-500 uppercase font-semibold">Filial</span>
            <span class="text-xs font-mono font-bold text-slate-200 truncate">${escapeHtml(branch)}</span>
          </div>
          <div class="flex flex-col">
            <span class="text-[9px] text-slate-500 uppercase font-semibold">Matrícula</span>
            <span class="text-xs font-mono font-bold text-emerald-400 truncate">${escapeHtml(registration)}</span>
          </div>
        </div>

        <!-- Email Badge Row if available -->
        ${email ? `
        <div class="flex items-center gap-2 px-2.5 py-1.5 bg-[#0d1320] rounded-xl border border-slate-800/60 text-[11px] text-slate-400 truncate">
          <i class="fa-solid fa-envelope text-slate-500 text-[10px] shrink-0"></i>
          <span class="truncate" title="${escapeHtml(email)}">${escapeHtml(email)}</span>
        </div>
        ` : ''}

        <!-- Actions & Footer -->
        <div class="flex items-center justify-between gap-2 border-t border-slate-800/60 pt-3">
          <span class="text-[10px] text-slate-500 truncate" title="Cadastrado em ${formattedDate}">
            <i class="fa-solid fa-calendar-day text-[9px]"></i> ${formattedDate}
          </span>

          <div class="flex items-center gap-1.5 shrink-0">
            <button onclick="toggleBlockUser('${u.id}', ${!isBlocked})" class="px-2.5 py-1.5 ${isBlocked ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border-amber-500/30'} border rounded-xl text-[11px] font-semibold transition-all flex items-center gap-1" title="${isBlocked ? 'Desbloquear Acesso' : 'Bloquear Acesso'}">
              <i class="fa-solid ${isBlocked ? 'fa-lock-open' : 'fa-user-lock'}"></i> ${isBlocked ? 'Desbloquear' : 'Bloquear'}
            </button>

            <button onclick="openEditModal('${u.id}')" class="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-[11px] font-semibold transition-all flex items-center gap-1" title="Editar Credencial">
              <i class="fa-solid fa-pen-to-square text-emerald-400"></i>
            </button>

            <button onclick="deleteUser('${u.id}')" class="px-2.5 py-1.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 rounded-xl text-[11px] font-semibold transition-all flex items-center gap-1" title="Revogar Credencial">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </div>

      </div>
    `;
  }).join('');
}

function filterCredentials() {
  renderFullCredentialsList(state.users);
}

async function toggleBlockUser(id, isBlocked) {
  try {
    const user = state.users.find(u => u.id === id);
    if (!user) return;
    const actionText = isBlocked ? 'bloquear' : 'desbloquear';
    const confirmed = await showConfirmDialog({
      title: isBlocked ? 'Bloquear Credencial' : 'Desbloquear Credencial',
      message: `Deseja realmente ${actionText} o acesso biométrico de "${user.name}"?`,
      type: isBlocked ? 'danger' : 'warning',
      confirmText: isBlocked ? 'Bloquear Acesso' : 'Desbloquear Acesso'
    });
    if (!confirmed) return;

    const res = await fetch(`/api/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isBlocked })
    });

    const data = await res.json();
    if (data.success) {
      await loadUsersList();
      showAlert({
        type: 'success',
        title: 'Status Atualizado',
        message: `Credencial de "${user.name}" ${isBlocked ? 'bloqueada' : 'desbloqueada'} com sucesso.`
      });
    } else {
      showAlert({ type: 'danger', title: 'Falha na Operação', message: data.message || 'Erro ao alterar status do usuário.' });
    }
  } catch (err) {
    console.error('[TOGGLE BLOCK ERROR]', err);
    showAlert({ type: 'danger', title: 'Erro de Conexão', message: 'Falha ao conectar com o servidor.' });
  }
}
window.toggleBlockUser = toggleBlockUser;

function updateEditBlockedLabel(isBlocked) {
  if (elements.editCredBlockedLabel) {
    elements.editCredBlockedLabel.textContent = isBlocked ? 'Bloqueado' : 'Ativo';
    elements.editCredBlockedLabel.className = isBlocked ? 'ml-2 text-xs font-bold text-rose-400' : 'ml-2 text-xs font-bold text-emerald-400';
  }
}
window.updateEditBlockedLabel = updateEditBlockedLabel;

function openEditModal(id) {
  const user = state.users.find(u => u.id === id);
  if (!user || !elements.modalEditCredential) return;

  if (typeof updateCredentialBranchSelects === 'function') {
    updateCredentialBranchSelects();
  }

  elements.editCredId.value = user.id;
  if (elements.editCredBranch) elements.editCredBranch.value = user.branch || '0101';
  if (elements.editCredRegistration) elements.editCredRegistration.value = user.registration || '';
  elements.editCredName.value = user.name || '';
  if (elements.editCredEmail) elements.editCredEmail.value = user.email || '';
  if (elements.editCredDepartment) elements.editCredDepartment.value = user.department || 'Geral';
  elements.editCredRole.value = user.role || '';
  if (elements.editCredBlocked) {
    elements.editCredBlocked.checked = Boolean(user.isBlocked);
    updateEditBlockedLabel(Boolean(user.isBlocked));
  }

  elements.modalEditCredential.classList.remove('hidden');
}

function closeEditModal() {
  if (!elements.modalEditCredential) return;
  elements.modalEditCredential.classList.add('hidden');
}

async function saveEditedCredential(event) {
  event.preventDefault();
  const id = elements.editCredId.value;
  const branch = elements.editCredBranch ? elements.editCredBranch.value.trim().substring(0, 4) : '0101';
  const registration = elements.editCredRegistration ? elements.editCredRegistration.value.trim() : '';
  const name = elements.editCredName.value.trim();
  const email = elements.editCredEmail ? elements.editCredEmail.value.trim() : '';
  const department = elements.editCredDepartment ? elements.editCredDepartment.value.trim() : 'Geral';
  const role = elements.editCredRole.value.trim();
  const isBlocked = elements.editCredBlocked ? elements.editCredBlocked.checked : false;

  if (!id || !registration || !name || !role) {
    showAlert({ type: 'warning', title: 'Campos Obrigatórios', message: 'Preencha todos os campos obrigatórios.' });
    return;
  }

  try {
    const response = await fetch(`/api/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ branch, registration, name, email, department, role, isBlocked })
    });
    const data = await response.json();
    if (data.success) {
      closeEditModal();
      await loadUsersList();
      showAlert({ type: 'success', title: 'Credencial Atualizada', message: `Dados biométricos de "${name}" salvos com sucesso!` });
    } else {
      showAlert({ type: 'danger', title: 'Erro na Atualização', message: data.message || 'Erro ao atualizar credencial.' });
    }
  } catch (err) {
    console.error('[EDIT CREDENTIAL ERROR]', err);
    showAlert({ type: 'danger', title: 'Erro de Conexão', message: 'Erro ao salvar alterações no servidor.' });
  }
}

async function deleteUser(userId) {
  const user = state.users.find(u => u.id === userId);
  const userName = user ? user.name : 'este registro';
  const confirmed = await showConfirmDialog({
    title: 'Remover Registro Biométrico',
    message: `Tem certeza que deseja remover permanentemente a credencial de "${userName}"?`,
    type: 'danger',
    confirmText: 'Remover Definitivamente'
  });
  if (!confirmed) return;

  try {
    const response = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
    const data = await response.json();
    if (data.success) {
      loadUsersList();
      showAlert({ type: 'success', title: 'Registro Removido', message: 'Credencial biométrica excluída com sucesso.' });
    } else {
      showAlert({ type: 'danger', title: 'Falha ao Remover', message: data.message || 'Erro ao excluir usuário.' });
    }
  } catch (err) {
    console.error('[FACEID DELETE USER ERROR]', err);
    showAlert({ type: 'danger', title: 'Erro de Conexão', message: 'Falha ao comunicar com o servidor.' });
  }
}

// ==========================================================================
// AUDIT LOGS & SYSTEM ALTERATION TRAIL ROUTINES
// ==========================================================================
function switchAuditSubTab(tab) {
  const containerAccess = document.getElementById('container-audit-access');
  const containerDb = document.getElementById('container-audit-db');
  const btnAccess = document.getElementById('btn-subtab-access');
  const btnDb = document.getElementById('btn-subtab-db');

  const activeClass = 'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 flex items-center gap-2';
  const inactiveClass = 'px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all text-slate-400 hover:text-white flex items-center gap-2';

  if (tab === 'access') {
    if (containerAccess) containerAccess.classList.remove('hidden');
    if (containerDb) containerDb.classList.add('hidden');
    if (btnAccess) btnAccess.className = activeClass;
    if (btnDb) btnDb.className = inactiveClass;
    loadLogsHistory();
  } else {
    if (containerAccess) containerAccess.classList.add('hidden');
    if (containerDb) containerDb.classList.remove('hidden');
    if (btnAccess) btnAccess.className = inactiveClass;
    if (btnDb) btnDb.className = activeClass;
    loadSystemAuditLogs();
  }
}
window.switchAuditSubTab = switchAuditSubTab;

async function loadLogsHistory() {
  try {
    const response = await fetch('/api/logs');
    const data = await response.json();

    if (data.success) {
      state.logs = data.logs;
      populateAuditBranchFilter();
      filterAccessLogs();
    }
  } catch (err) {
    console.error('[FACEID GET LOGS ERROR]', err);
  }
}

function populateAuditBranchFilter() {
  const branchFilterEl = document.getElementById('audit-filter-branch');
  if (!branchFilterEl) return;
  
  const currentVal = branchFilterEl.value || 'all';
  const allowed = getUserAllowedBranches();
  const branchMap = new Map();

  (state.branches || []).forEach(b => {
    if (b && b.code) {
      if (allowed.includes('*') || allowed.includes(b.code)) {
        branchMap.set(b.code, `${b.code} - ${b.name || 'Filial'}`);
      }
    }
  });

  (state.logs || []).forEach(l => {
    const lBranch = l.branch_code || l.branch;
    if (lBranch && !branchMap.has(lBranch)) {
      if (allowed.includes('*') || allowed.includes(lBranch)) {
        branchMap.set(lBranch, lBranch);
      }
    }
  });

  let optionsHtml = allowed.includes('*') ? '<option value="all">Todas as Filiais</option>' : '';
  branchMap.forEach((label, code) => {
    optionsHtml += `<option value="${escapeHtml(code)}">${escapeHtml(label)}</option>`;
  });

  branchFilterEl.innerHTML = optionsHtml || '<option value="all">Todas as Filiais</option>';
  if (currentVal && (currentVal === 'all' || branchMap.has(currentVal))) {
    branchFilterEl.value = currentVal;
  } else if (!allowed.includes('*') && branchMap.size > 0) {
    branchFilterEl.value = branchMap.keys().next().value;
  }
}
window.populateAuditBranchFilter = populateAuditBranchFilter;

function exportToCsv(filename, headers, rows) {
  const processRow = (row) => {
    return row.map(val => {
      if (val === null || val === undefined) return '""';
      let str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    }).join(';');
  };

  const csvContent = '\uFEFF' + [headers.map(h => `"${h}"`).join(';'), ...rows.map(processRow)].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : filename.replace(/\.[^/.]+$/, '') + '.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
window.exportToCsv = exportToCsv;

function exportToExcelXml(filename, sheetName, headers, rows) {
  const sanitize = (val) => {
    if (val === null || val === undefined) return '';
    return String(val)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<?mso-application progid="Excel.Sheet"?>\n`;
  xml += `<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\n`;
  xml += ` xmlns:o="urn:schemas-microsoft-com:office:office"\n`;
  xml += ` xmlns:x="urn:schemas-microsoft-com:office:excel"\n`;
  xml += ` xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"\n`;
  xml += ` xmlns:html="http://www.w3.org/TR/REC-html40">\n`;
  xml += ` <Styles>\n`;
  xml += `  <Style ss:ID="Header">\n`;
  xml += `   <Font ss:Bold="1" ss:Color="#FFFFFF" ss:Size="11" ss:FontName="Calibri"/>\n`;
  xml += `   <Interior ss:Color="#047857" ss:Pattern="Solid"/>\n`;
  xml += `   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>\n`;
  xml += `   <Borders>\n`;
  xml += `    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#064E3B"/>\n`;
  xml += `   </Borders>\n`;
  xml += `  </Style>\n`;
  xml += `  <Style ss:ID="Cell">\n`;
  xml += `   <Font ss:Color="#1E293B" ss:Size="10" ss:FontName="Calibri"/>\n`;
  xml += `   <Alignment ss:Vertical="Center"/>\n`;
  xml += `  </Style>\n`;
  xml += `  <Style ss:ID="CellCenter">\n`;
  xml += `   <Font ss:Color="#1E293B" ss:Size="10" ss:FontName="Calibri"/>\n`;
  xml += `   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>\n`;
  xml += `  </Style>\n`;
  xml += `  <Style ss:ID="Success">\n`;
  xml += `   <Font ss:Color="#065F46" ss:Bold="1" ss:Size="10" ss:FontName="Calibri"/>\n`;
  xml += `   <Interior ss:Color="#D1FAE5" ss:Pattern="Solid"/>\n`;
  xml += `   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>\n`;
  xml += `  </Style>\n`;
  xml += `  <Style ss:ID="Denied">\n`;
  xml += `   <Font ss:Color="#991B1B" ss:Bold="1" ss:Size="10" ss:FontName="Calibri"/>\n`;
  xml += `   <Interior ss:Color="#FEE2E2" ss:Pattern="Solid"/>\n`;
  xml += `   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>\n`;
  xml += `  </Style>\n`;
  xml += ` </Styles>\n`;
  xml += ` <Worksheet ss:Name="${sanitize(sheetName)}">\n`;
  xml += `  <Table>\n`;

  // Header Row
  xml += `   <Row ss:Height="26" ss:StyleID="Header">\n`;
  headers.forEach(h => {
    xml += `    <Cell><Data ss:Type="String">${sanitize(h)}</Data></Cell>\n`;
  });
  xml += `   </Row>\n`;

  // Data Rows
  rows.forEach(row => {
    xml += `   <Row ss:Height="20">\n`;
    row.forEach(cell => {
      let val = cell;
      let style = 'Cell';
      let type = 'String';

      if (val === 'Concedido') {
        style = 'Success';
      } else if (val === 'Negado') {
        style = 'Denied';
      }

      if (typeof val === 'number') {
        type = 'Number';
      }

      xml += `    <Cell ss:StyleID="${style}"><Data ss:Type="${type}">${sanitize(val)}</Data></Cell>\n`;
    });
    xml += `   </Row>\n`;
  });

  xml += `  </Table>\n`;
  xml += ` </Worksheet>\n`;
  xml += `</Workbook>`;

  const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.xls') ? filename : filename.replace(/\.[^/.]+$/, '') + '.xls');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
window.exportToExcelXml = exportToExcelXml;

function exportToExcelOrCsv(filename, sheetName, headers, rows) {
  // 1. Try SheetJS (Native .xlsx)
  if (typeof window.XLSX !== 'undefined' && window.XLSX.utils) {
    try {
      const worksheetData = [headers, ...rows];
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

      // Column widths formatting
      const colWidths = headers.map((h, i) => {
        let maxLen = String(h || '').length;
        rows.forEach(r => {
          const cellStr = r[i] !== null && r[i] !== undefined ? String(r[i]) : '';
          if (cellStr.length > maxLen) maxLen = cellStr.length;
        });
        return { wch: Math.min(Math.max(maxLen + 3, 12), 50) };
      });
      worksheet['!cols'] = colWidths;

      const workbook = XLSX.utils.book_new();
      const cleanSheetName = (sheetName || 'Planilha').replace(/[\\/*?[\]:]/g, '').substring(0, 31);
      XLSX.utils.book_append_sheet(workbook, worksheet, cleanSheetName);

      const realFilename = filename.replace(/\.(xls|xlsx|csv)$/i, '') + '.xlsx';
      XLSX.writeFile(workbook, realFilename);
      return realFilename;
    } catch (xlsxErr) {
      console.warn('[XLSX GENERATE WARN] Fallback to CSV / XML:', xlsxErr);
    }
  }

  // 2. Fallback to XML Spreadsheet (.xls)
  const realFilename = filename.replace(/\.(xls|xlsx|csv)$/i, '') + '.xls';
  exportToExcelXml(realFilename, sheetName, headers, rows);
  return realFilename;
}
window.exportToExcelOrCsv = exportToExcelOrCsv;

function getFilteredAccessLogs() {
  const statusFilter = document.getElementById('audit-filter-status')?.value || 'all';
  const startDtFilter = document.getElementById('audit-filter-start-datetime')?.value || '';
  const endDtFilter = document.getElementById('audit-filter-end-datetime')?.value || '';
  const regFilter = (document.getElementById('audit-filter-reg')?.value || '').toLowerCase().trim();
  const branchFilter = document.getElementById('audit-filter-branch')?.value || 'all';

  const allowed = getUserAllowedBranches();
  const allLogs = state.logs || [];

  const startTime = startDtFilter ? new Date(startDtFilter).getTime() : null;
  const endTime = endDtFilter ? new Date(endDtFilter).getTime() : null;

  return allLogs.filter(log => {
    // 0. Allowed Branches Security Filter
    const logBranch = String(log.branch_code || log.branch || '0101').trim();
    if (!allowed.includes('*') && !allowed.includes(logBranch)) {
      return false;
    }

    // 1. Status Filter
    if (statusFilter === 'success' && !log.success) return false;
    if (statusFilter === 'denied' && log.success) return false;

    // 2. Date & Time Range Filter (supports start/end datetime-local)
    if (log.timestamp) {
      const logTime = new Date(log.timestamp).getTime();
      if (!isNaN(logTime)) {
        if (startTime !== null && !isNaN(startTime) && logTime < startTime) return false;
        if (endTime !== null && !isNaN(endTime) && logTime > endTime) return false;
      }
    } else if (startTime !== null || endTime !== null) {
      return false;
    }

    // 3. Registration / User Name Filter
    if (regFilter) {
      const reg = String(log.registration || '').toLowerCase();
      const userName = String(log.matchedUserName || '').toLowerCase();
      if (!reg.includes(regFilter) && !userName.includes(regFilter)) return false;
    }

    // 4. Branch Filter
    if (branchFilter !== 'all') {
      if (logBranch !== branchFilter.trim()) return false;
    }

    return true;
  });
}
window.getFilteredAccessLogs = getFilteredAccessLogs;

function exportAccessLogsToExcel() {
  // Always get 100% of the matching records across all pages
  const logsToExport = getFilteredAccessLogs();

  if (!logsToExport || logsToExport.length === 0) {
    showAlert({
      type: 'warning',
      title: 'Nenhum Registro para Exportar',
      message: 'Não há registros de histórico de acesso correspondentes aos filtros selecionados para exportação.'
    });
    return;
  }

  const now = new Date();
  const dateSuffix = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`;
  const filename = `historico_acessos_faceid_${dateSuffix}.xlsx`;

  const headers = [
    'ID Log',
    'Data e Hora',
    'Filial',
    'Matrícula',
    'Nome do Usuário',
    'Precisão (%)',
    'Distância Euclidiana',
    'Status do Acesso',
    'Mensagem / Detalhes'
  ];

  const rows = logsToExport.map(log => [
    log.id,
    new Date(log.timestamp).toLocaleString('pt-BR'),
    log.branch_code || log.branch || '0101',
    log.registration || 'N/A',
    log.matchedUserName || 'Desconhecido',
    log.matchPercentage !== undefined ? `${log.matchPercentage}%` : '0%',
    log.matchDistance !== null && log.matchDistance !== undefined ? log.matchDistance : 'N/A',
    log.success ? 'Concedido' : 'Negado',
    log.statusText || (log.success ? 'Acesso Concedido' : 'Acesso Negado')
  ]);

  const generatedFile = exportToExcelOrCsv(filename, 'Histórico de Acessos', headers, rows);

  showAlert({
    type: 'success',
    title: 'Exportação Concluída com Sucesso',
    message: `Planilha Excel (${generatedFile}) gerada com sucesso contendo 100% dos registros filtrados (${logsToExport.length} registros exportados de todas as páginas).`
  });
}
window.exportAccessLogsToExcel = exportAccessLogsToExcel;

function getFilteredDbLogs() {
  const actionFilter = document.getElementById('db-filter-action')?.value || 'all';
  const startDtFilter = document.getElementById('db-filter-start-datetime')?.value || '';
  const endDtFilter = document.getElementById('db-filter-end-datetime')?.value || '';
  const branchFilter = document.getElementById('db-filter-branch')?.value || 'all';
  const searchFilter = (document.getElementById('db-filter-search')?.value || '').toLowerCase().trim();

  const allLogs = state.systemLogs || [];

  const startTime = startDtFilter ? new Date(startDtFilter).getTime() : null;
  const endTime = endDtFilter ? new Date(endDtFilter).getTime() : null;

  return allLogs.filter(log => {
    // 1. Action Filter
    if (actionFilter !== 'all' && log.action !== actionFilter) return false;

    // 2. Date & Time Range Filter
    if (log.timestamp) {
      const logTime = new Date(log.timestamp).getTime();
      if (!isNaN(logTime)) {
        if (startTime !== null && !isNaN(startTime) && logTime < startTime) return false;
        if (endTime !== null && !isNaN(endTime) && logTime > endTime) return false;
      }
    } else if (startTime !== null || endTime !== null) {
      return false;
    }

    // 3. Branch Filter
    let meta = {};
    if (typeof log.metadata === 'string') {
      try { meta = JSON.parse(log.metadata); } catch(e) { meta = {}; }
    } else if (log.metadata) {
      meta = log.metadata;
    }
    const branchCode = String(log.branch_code || meta.branch_code || meta.branch || '0101').trim();
    if (branchFilter !== 'all' && branchCode !== branchFilter.trim()) return false;

    // 4. Search text
    if (searchFilter) {
      const msg = String(log.message || '').toLowerCase();
      const regOrId = String(meta.registration || meta.userId || '').toLowerCase();
      const ip = String(log.ip || '').toLowerCase();
      if (!msg.includes(searchFilter) && !regOrId.includes(searchFilter) && !ip.includes(searchFilter)) {
        return false;
      }
    }

    return true;
  });
}
window.getFilteredDbLogs = getFilteredDbLogs;

function exportDbLogsToExcel() {
  // Always get 100% of the matching records across all pages
  const logsToExport = getFilteredDbLogs();

  if (!logsToExport || logsToExport.length === 0) {
    showAlert({
      type: 'warning',
      title: 'Nenhum Registro para Exportar',
      message: 'Não há registros de auditoria correspondentes aos filtros selecionados para exportação.'
    });
    return;
  }

  const now = new Date();
  const dateSuffix = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`;
  const filename = `auditoria_sistema_faceid_${dateSuffix}.xlsx`;

  const headers = [
    'ID',
    'Data e Hora',
    'Filial',
    'Ação',
    'Mensagem / Alteração',
    'Matrícula / ID',
    'IP Cliente'
  ];

  const rows = logsToExport.map(log => {
    let meta = {};
    if (typeof log.metadata === 'string') {
      try { meta = JSON.parse(log.metadata); } catch(e) { meta = {}; }
    } else if (log.metadata) {
      meta = log.metadata;
    }
    const branchCode = log.branch_code || meta.branch_code || meta.branch || '0101';
    const regOrId = meta.registration || meta.userId || '-';

    return [
      log.id,
      new Date(log.timestamp).toLocaleString('pt-BR'),
      branchCode,
      log.action,
      log.message,
      regOrId,
      log.ip || '127.0.0.1'
    ];
  });

  const generatedFile = exportToExcelOrCsv(filename, 'Auditoria do Sistema', headers, rows);

  showAlert({
    type: 'success',
    title: 'Exportação Concluída com Sucesso',
    message: `Planilha Excel (${generatedFile}) gerada com sucesso contendo 100% dos registros de auditoria filtrados (${logsToExport.length} registros exportados de todas as páginas).`
  });
}
window.exportDbLogsToExcel = exportDbLogsToExcel;

function renderPaginationButtons(containerId, currentPage, totalPages, goToPageFnName) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (totalPages <= 1) {
    container.innerHTML = `
      <button disabled class="px-2.5 py-1 rounded-lg bg-slate-800/40 text-slate-500 cursor-not-allowed text-xs font-semibold">1</button>
    `;
    return;
  }

  let html = '';

  // First page button
  html += `
    <button onclick="${goToPageFnName}(1)" ${currentPage === 1 ? 'disabled' : ''} class="px-2.5 py-1 rounded-lg ${currentPage === 1 ? 'bg-slate-800/40 text-slate-600 cursor-not-allowed' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer'} text-xs font-semibold transition-all" title="Primeira Página">
      <i class="fa-solid fa-angles-left text-[10px]"></i>
    </button>
  `;

  // Previous page button
  html += `
    <button onclick="${goToPageFnName}(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''} class="px-2.5 py-1 rounded-lg ${currentPage === 1 ? 'bg-slate-800/40 text-slate-600 cursor-not-allowed' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer'} text-xs font-semibold transition-all" title="Página Anterior">
      <i class="fa-solid fa-chevron-left text-[10px]"></i>
    </button>
  `;

  // Window of page numbers
  const maxButtons = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
  let endPage = Math.min(totalPages, startPage + maxButtons - 1);
  if (endPage - startPage + 1 < maxButtons) {
    startPage = Math.max(1, endPage - maxButtons + 1);
  }

  if (startPage > 1) {
    html += `<span class="px-1 text-slate-500 text-xs">...</span>`;
  }

  for (let p = startPage; p <= endPage; p++) {
    const isActive = p === currentPage;
    html += `
      <button onclick="${goToPageFnName}(${p})" class="px-3 py-1 rounded-lg ${isActive ? 'bg-cyan-600 text-white font-bold shadow-md shadow-cyan-600/25' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium'} text-xs transition-all cursor-pointer">
        ${p}
      </button>
    `;
  }

  if (endPage < totalPages) {
    html += `<span class="px-1 text-slate-500 text-xs">...</span>`;
  }

  // Next page button
  html += `
    <button onclick="${goToPageFnName}(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''} class="px-2.5 py-1 rounded-lg ${currentPage === totalPages ? 'bg-slate-800/40 text-slate-600 cursor-not-allowed' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer'} text-xs font-semibold transition-all" title="Próxima Página">
      <i class="fa-solid fa-chevron-right text-[10px]"></i>
    </button>
  `;

  // Last page button
  html += `
    <button onclick="${goToPageFnName}(${totalPages})" ${currentPage === totalPages ? 'disabled' : ''} class="px-2.5 py-1 rounded-lg ${currentPage === totalPages ? 'bg-slate-800/40 text-slate-600 cursor-not-allowed' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer'} text-xs font-semibold transition-all" title="Última Página">
      <i class="fa-solid fa-angles-right text-[10px]"></i>
    </button>
  `;

  container.innerHTML = html;
}

function changeAccessLogsPageSize(size) {
  state.accessLogsPageSize = parseInt(size, 10) || 10;
  state.accessLogsPage = 1;
  renderPaginatedAccessLogs();
}
window.changeAccessLogsPageSize = changeAccessLogsPageSize;

function goToAccessLogsPage(page) {
  state.accessLogsPage = page;
  renderPaginatedAccessLogs();
}
window.goToAccessLogsPage = goToAccessLogsPage;

function openLogDetailsModal(logId) {
  const modal = document.getElementById('modal-log-details');
  if (!modal) return;

  const log = (state.logs || []).find(l => String(l.id) === String(logId));
  if (!log) return;

  const imgEl = document.getElementById('detail-log-image');
  const badgeEl = document.getElementById('detail-log-status-badge');
  const tsEl = document.getElementById('detail-log-timestamp');
  const statusTxtEl = document.getElementById('detail-log-statustext');
  const branchEl = document.getElementById('detail-log-branch');
  const regEl = document.getElementById('detail-log-registration');
  const nameEl = document.getElementById('detail-log-username');
  const matchPctEl = document.getElementById('detail-log-matchpct');
  const distEl = document.getElementById('detail-log-distance');
  const idEl = document.getElementById('detail-log-id');

  if (imgEl) {
    imgEl.src = log.image || DEFAULT_USER_AVATAR;
    imgEl.onerror = function() { this.src = DEFAULT_USER_AVATAR; };
  }

  if (badgeEl) {
    badgeEl.className = `absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold border shadow-lg backdrop-blur-md ${
      log.success ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'bg-rose-500/20 text-rose-400 border-rose-500/40'
    }`;
    badgeEl.innerHTML = `<i class="fa-solid ${log.success ? 'fa-check-circle' : 'fa-times-circle'} mr-1"></i> ${escapeHtml(log.statusText)}`;
  }

  if (tsEl) tsEl.textContent = new Date(log.timestamp).toLocaleString('pt-BR');
  if (statusTxtEl) statusTxtEl.textContent = log.statusText || (log.success ? 'Acesso Concedido' : 'Acesso Negado');
  if (branchEl) branchEl.textContent = log.branch || '0101';
  if (regEl) regEl.textContent = log.registration || 'N/A';
  if (nameEl) nameEl.textContent = log.matchedUserName || 'Desconhecido';
  if (matchPctEl) matchPctEl.textContent = `${log.matchPercentage || 0}%`;
  if (distEl) distEl.textContent = log.matchDistance !== null && log.matchDistance !== undefined ? log.matchDistance : 'N/A';
  if (idEl) idEl.textContent = log.id;

  modal.classList.remove('hidden');
}
window.openLogDetailsModal = openLogDetailsModal;

function closeLogDetailsModal() {
  const modal = document.getElementById('modal-log-details');
  if (modal) modal.classList.add('hidden');
}
window.closeLogDetailsModal = closeLogDetailsModal;

function renderLogsTable(logs) {
  if (!elements.logsTableBody) return;
  if (!logs || logs.length === 0) {
    elements.logsTableBody.innerHTML = `
      <tr>
        <td colspan="9" class="text-center py-6 text-slate-500">Nenhum log de acesso gravado.</td>
      </tr>`;
    return;
  }

  elements.logsTableBody.innerHTML = logs.map(log => {
    const dateStr = new Date(log.timestamp).toLocaleString('pt-BR');
    const statusBg = log.success ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/15 text-rose-400 border-rose-500/30';
    const statusIcon = log.success ? 'fa-circle-check' : 'fa-circle-xmark';
    const branch = log.branch || '0101';
    const registration = log.registration || 'N/A';
    const imageSrc = log.image || DEFAULT_USER_AVATAR;

    return `
      <tr class="hover:bg-slate-800/30 transition-colors">
        <td class="p-2.5">
          <button onclick="openLogDetailsModal('${log.id}')" class="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700/80 overflow-hidden shrink-0 flex items-center justify-center hover:ring-2 hover:ring-emerald-400 transition-all cursor-pointer" title="Clique para ver detalhes">
            <img src="${imageSrc}" alt="Captura" class="w-full h-full object-cover" onerror="handleAvatarError(this)">
          </button>
        </td>
        <td class="p-3 text-slate-400 font-mono text-[11px]">${dateStr}</td>
        <td class="p-3 font-mono font-bold text-slate-300 text-xs">${escapeHtml(branch)}</td>
        <td class="p-3 font-mono font-bold text-emerald-400 text-xs">${escapeHtml(registration)}</td>
        <td class="p-3 font-semibold text-slate-200">${escapeHtml(log.matchedUserName)}</td>
        <td class="p-3 text-cyan-400 font-bold">${log.matchPercentage}%</td>
        <td class="p-3 text-slate-400">${log.matchDistance !== null ? log.matchDistance : '-'}</td>
        <td class="p-3">
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${statusBg}">
            <i class="fa-solid ${statusIcon}"></i> ${escapeHtml(log.statusText)}
          </span>
        </td>
        <td class="p-3 text-right">
          <button onclick="openLogDetailsModal('${log.id}')" class="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-[11px] font-semibold transition-all flex items-center gap-1.5 ml-auto" title="Ver Detalhes Coleta">
            <i class="fa-solid fa-eye text-emerald-400"></i> Ver Coleta
          </button>
        </td>
      </tr>`;
  }).join('');
}

function renderPaginatedAccessLogs() {
  const allFiltered = state.filteredAccessLogs || [];
  const pageSize = state.accessLogsPageSize || 10;
  const totalRecords = allFiltered.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));

  if (state.accessLogsPage > totalPages) state.accessLogsPage = totalPages;
  if (state.accessLogsPage < 1) state.accessLogsPage = 1;

  const startIdx = (state.accessLogsPage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, totalRecords);
  const pageItems = allFiltered.slice(startIdx, endIdx);

  renderLogsTable(pageItems);

  // Update Page Info
  const pageInfoEl = document.getElementById('access-page-info');
  if (pageInfoEl) {
    if (totalRecords === 0) {
      pageInfoEl.textContent = 'Mostrando 0 de 0 registros';
    } else {
      pageInfoEl.textContent = `Mostrando ${startIdx + 1} a ${endIdx} de ${totalRecords} registros (Pág. ${state.accessLogsPage}/${totalPages})`;
    }
  }

  // Update Pagination Controls
  renderPaginationButtons(
    'access-pagination-controls',
    state.accessLogsPage,
    totalPages,
    'goToAccessLogsPage'
  );
}

function filterAccessLogs() {
  state.filteredAccessLogs = getFilteredAccessLogs();
  const countBadge = document.getElementById('audit-filter-count-badge');
  const allLogs = state.logs || [];

  if (countBadge) {
    if (state.filteredAccessLogs.length === allLogs.length) {
      countBadge.textContent = `${allLogs.length} acessos`;
    } else {
      countBadge.textContent = `${state.filteredAccessLogs.length} de ${allLogs.length} acessos`;
    }
  }

  state.accessLogsPage = 1;
  renderPaginatedAccessLogs();
}
window.filterAccessLogs = filterAccessLogs;

async function searchAccessLogs() {
  await loadLogsHistory();
  const count = state.filteredAccessLogs?.length || 0;
  showAlert({
    type: 'info',
    title: 'Pesquisa Concluída',
    message: `${count} registro(s) de acesso encontrado(s) com os filtros aplicados.`
  });
}
window.searchAccessLogs = searchAccessLogs;

function clearAuditAccessFilters() {
  const statusEl = document.getElementById('audit-filter-status');
  const startDtEl = document.getElementById('audit-filter-start-datetime');
  const endDtEl = document.getElementById('audit-filter-end-datetime');
  const regEl = document.getElementById('audit-filter-reg');
  const branchEl = document.getElementById('audit-filter-branch');

  if (statusEl) statusEl.value = 'all';
  if (startDtEl) startDtEl.value = '';
  if (endDtEl) endDtEl.value = '';
  if (regEl) regEl.value = '';
  if (branchEl) branchEl.value = 'all';

  filterAccessLogs();
}
window.clearAuditAccessFilters = clearAuditAccessFilters;

function populateDbBranchFilter() {
  const branchFilterEl = document.getElementById('db-filter-branch');
  if (!branchFilterEl) return;
  
  const currentVal = branchFilterEl.value || 'all';
  const branchMap = new Map();

  (state.branches || []).forEach(b => {
    if (b && b.code) {
      branchMap.set(b.code, `${b.code} - ${b.name || 'Filial'}`);
    }
  });

  (state.systemLogs || []).forEach(l => {
    const meta = typeof l.metadata === 'string' ? JSON.parse(l.metadata) : (l.metadata || {});
    const bCode = l.branch_code || meta.branch_code || meta.branch;
    if (bCode && !branchMap.has(bCode)) {
      branchMap.set(bCode, bCode);
    }
  });

  let optionsHtml = '<option value="all">Todas as Filiais</option>';
  branchMap.forEach((label, code) => {
    optionsHtml += `<option value="${escapeHtml(code)}">${escapeHtml(label)}</option>`;
  });

  branchFilterEl.innerHTML = optionsHtml;
  if (currentVal && (currentVal === 'all' || branchMap.has(currentVal))) {
    branchFilterEl.value = currentVal;
  }
}
window.populateDbBranchFilter = populateDbBranchFilter;

function filterDbLogs() {
  state.filteredDbLogs = getFilteredDbLogs();
  const countBadge = document.getElementById('db-filter-count-badge');
  const allLogs = state.systemLogs || [];

  if (countBadge) {
    if (state.filteredDbLogs.length === allLogs.length) {
      countBadge.textContent = `${allLogs.length} registros`;
    } else {
      countBadge.textContent = `${state.filteredDbLogs.length} de ${allLogs.length} registros`;
    }
  }

  state.dbLogsPage = 1;
  renderPaginatedDbLogs();
}
window.filterDbLogs = filterDbLogs;

async function searchDbLogs() {
  await loadSystemAuditLogs();
  const count = state.filteredDbLogs?.length || 0;
  showAlert({
    type: 'info',
    title: 'Pesquisa Concluída',
    message: `${count} registro(s) de auditoria encontrado(s) com os filtros aplicados.`
  });
}
window.searchDbLogs = searchDbLogs;

function clearDbLogsFilters() {
  const actionEl = document.getElementById('db-filter-action');
  const startDtEl = document.getElementById('db-filter-start-datetime');
  const endDtEl = document.getElementById('db-filter-end-datetime');
  const branchEl = document.getElementById('db-filter-branch');
  const searchEl = document.getElementById('db-filter-search');

  if (actionEl) actionEl.value = 'all';
  if (startDtEl) startDtEl.value = '';
  if (endDtEl) endDtEl.value = '';
  if (branchEl) branchEl.value = 'all';
  if (searchEl) searchEl.value = '';

  filterDbLogs();
}
window.clearDbLogsFilters = clearDbLogsFilters;

function changeDbLogsPageSize(size) {
  state.dbLogsPageSize = parseInt(size, 10) || 10;
  state.dbLogsPage = 1;
  renderPaginatedDbLogs();
}
window.changeDbLogsPageSize = changeDbLogsPageSize;

function goToDbLogsPage(page) {
  state.dbLogsPage = page;
  renderPaginatedDbLogs();
}
window.goToDbLogsPage = goToDbLogsPage;

function renderPaginatedDbLogs() {
  const allFiltered = state.filteredDbLogs || [];
  const pageSize = state.dbLogsPageSize || 10;
  const totalRecords = allFiltered.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));

  if (state.dbLogsPage > totalPages) state.dbLogsPage = totalPages;
  if (state.dbLogsPage < 1) state.dbLogsPage = 1;

  const startIdx = (state.dbLogsPage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, totalRecords);
  const pageItems = allFiltered.slice(startIdx, endIdx);

  renderSystemLogsTable(pageItems);

  // Update Page Info
  const pageInfoEl = document.getElementById('db-page-info');
  if (pageInfoEl) {
    if (totalRecords === 0) {
      pageInfoEl.textContent = 'Mostrando 0 de 0 registros';
    } else {
      pageInfoEl.textContent = `Mostrando ${startIdx + 1} a ${endIdx} de ${totalRecords} registros (Pág. ${state.dbLogsPage}/${totalPages})`;
    }
  }

  // Update Pagination Controls
  renderPaginationButtons(
    'db-pagination-controls',
    state.dbLogsPage,
    totalPages,
    'goToDbLogsPage'
  );
}

async function loadSystemAuditLogs() {
  try {
    const res = await fetch('/api/system-logs');
    const data = await res.json();
    if (data.success) {
      state.systemLogs = data.logs;
      populateDbBranchFilter();
      filterDbLogs();
    }
  } catch (err) {
    console.error('[LOAD SYSTEM LOGS ERROR]', err);
  }
}

function renderSystemLogsTable(systemLogs) {
  const tbody = document.getElementById('system-logs-table-body');
  if (!tbody) return;

  if (!systemLogs || systemLogs.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-6 text-slate-500 text-xs">Nenhum registro de alteração de banco encontrado.</td>
      </tr>`;
    return;
  }

  tbody.innerHTML = systemLogs.map(log => {
    const dateStr = new Date(log.timestamp).toLocaleString('pt-BR');
    let actionBg = 'bg-slate-800 text-slate-300 border-slate-700';
    if (log.action === 'USER_CREATE') actionBg = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    else if (log.action === 'USER_UPDATE') actionBg = 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30';
    else if (log.action === 'USER_BLOCK' || log.action === 'USER_BLOCKED_ACCESS') actionBg = 'bg-rose-500/15 text-rose-400 border-rose-500/30';
    else if (log.action === 'USER_UNBLOCK') actionBg = 'bg-blue-500/15 text-blue-400 border-blue-500/30';
    else if (log.action === 'USER_DELETE') actionBg = 'bg-rose-500/15 text-rose-400 border-rose-500/30';

    const meta = typeof log.metadata === 'string' ? JSON.parse(log.metadata) : (log.metadata || {});
    const branchCode = log.branch_code || meta.branch_code || meta.branch || '0101';
    const regOrId = meta.registration || meta.userId || '-';

    return `
      <tr class="hover:bg-slate-800/30 transition-colors">
        <td class="p-3 text-slate-400 font-mono text-[11px]">${dateStr}</td>
        <td class="p-3">
          <span class="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            ${escapeHtml(branchCode)}
          </span>
        </td>
        <td class="p-3">
          <span class="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold border ${actionBg}">
            ${escapeHtml(log.action)}
          </span>
        </td>
        <td class="p-3 font-medium text-slate-200">${escapeHtml(log.message)}</td>
        <td class="p-3 font-mono font-bold text-emerald-400 text-xs">${escapeHtml(regOrId)}</td>
        <td class="p-3 text-slate-400 font-mono text-[11px]">${escapeHtml(log.ip || '127.0.0.1')}</td>
      </tr>`;
  }).join('');
}

async function clearLogsHistory() {
  const confirmed = await showConfirmDialog({
    title: 'Limpar Auditoria do Sistema',
    message: 'Tem certeza que deseja apagar todo o histórico de logs de auditoria?',
    type: 'danger',
    confirmText: 'Limpar Todos os Logs'
  });
  if (!confirmed) return;

  try {
    const response = await fetch('/api/logs', { method: 'DELETE' });
    const data = await response.json();
    if (data.success) {
      loadLogsHistory();
      showAlert({ type: 'success', title: 'Auditoria Limpa', message: 'Histórico de eventos de acesso apagado com sucesso.' });
    } else {
      showAlert({ type: 'danger', title: 'Falha na Operação', message: data.message || 'Erro ao limpar logs.' });
    }
  } catch (err) {
    console.error('[FACEID CLEAR LOGS ERROR]', err);
    showAlert({ type: 'danger', title: 'Erro de Conexão', message: 'Falha ao conectar com o servidor.' });
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, function(m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
  });
}

// ==========================================================================
// SYSTEM OPERATOR MANAGEMENT ROUTINES
// ==========================================================================
async function loadSystemUsersList() {
  try {
    const headers = {};
    if (state.currentUser) {
      headers['x-user-id'] = state.currentUser.id;
      headers['x-user-name'] = encodeURIComponent(state.currentUser.name);
    }
    const res = await fetch('/api/system-users', { headers });
    const data = await res.json();
    if (data.success) {
      state.systemUsers = data.users;
      renderSystemUsersTable(data.users);
    }
  } catch (err) {
    console.error('[LOAD SYSTEM USERS ERROR]', err);
  }
}
window.loadSystemUsersList = loadSystemUsersList;

function renderSystemUsersTable(users) {
  const tbody = document.getElementById('system-users-table-body');
  if (!tbody) return;

  if (!users || users.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-6 text-slate-500 text-xs">Nenhum operador cadastrado.</td>
      </tr>`;
    return;
  }

  const permsMap = {
    auth: 'Autenticação',
    register: 'Cadastrar',
    credentials: 'Credenciais',
    status: 'Status',
    audit: 'Auditoria',
    system_users: 'Operadores'
  };

  tbody.innerHTML = users.map(u => {
    const isMasterAdmin = u.username === 'admin';
    const roleBadge = u.role === 'admin'
      ? '<span class="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">Administrador</span>'
      : '<span class="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">Operador</span>';

    const permsBadges = (u.permissions || []).map(p => `<span class="inline-block px-1.5 py-0.5 text-[9px] rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono">${permsMap[p] || p}</span>`).join(' ');

    const dateStr = new Date(u.createdAt).toLocaleDateString('pt-BR');

    return `
      <tr class="hover:bg-slate-800/30 transition-colors">
        <td class="p-3 font-semibold text-white text-xs">${escapeHtml(u.name)}</td>
        <td class="p-3 font-mono text-emerald-400 text-xs font-bold">@${escapeHtml(u.username)}</td>
        <td class="p-3">${roleBadge}</td>
        <td class="p-3"><div class="flex flex-wrap gap-1 max-w-xs">${permsBadges || '<span class="text-slate-500 text-[10px]">Sem permissões</span>'}</div></td>
        <td class="p-3 text-slate-400 font-mono text-[11px]">${dateStr}</td>
        <td class="p-3 text-right">
          <div class="flex items-center justify-end gap-1.5">
            <button onclick="openSystemUserModal('${u.id}')" class="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-[11px] font-semibold transition-all flex items-center gap-1" title="Editar Operador">
              <i class="fa-solid fa-pen-to-square text-emerald-400"></i> Editar
            </button>
            ${!isMasterAdmin ? `
              <button onclick="deleteSystemUser('${u.id}')" class="px-2.5 py-1.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 rounded-xl text-[11px] font-semibold transition-all flex items-center gap-1" title="Remover Operador">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            ` : ''}
          </div>
        </td>
      </tr>`;
  }).join('');
}

async function openSystemUserModal(id = null) {
  const modal = document.getElementById('modal-system-user');
  if (!modal) return;

  // Load profiles and branches first if not loaded
  if (!state.profiles || state.profiles.length === 0) {
    await loadProfilesList();
  }
  if (!state.branches || state.branches.length === 0) {
    await loadBranchesList();
  }

  const titleEl = document.getElementById('modal-system-user-title');
  const idEl = document.getElementById('sysuser-id');
  const userEl = document.getElementById('sysuser-username');
  const profileSelectEl = document.getElementById('sysuser-profileId');
  const branchSelectEl = document.getElementById('sysuser-branch');
  const nameEl = document.getElementById('sysuser-name');
  const emailEl = document.getElementById('sysuser-email');
  const passEl = document.getElementById('sysuser-password');
  const confirmPassEl = document.getElementById('sysuser-confirm-password');
  const passReqEl = document.getElementById('sysuser-password-req');
  const confirmPassReqEl = document.getElementById('sysuser-confirm-password-req');

  // Populate profiles select dropdown
  if (profileSelectEl) {
    profileSelectEl.innerHTML = (state.profiles || []).map(p => 
      `<option value="${p.id}">${escapeHtml(p.code || 'GRP')} - ${escapeHtml(p.name)} ${p.isSystem ? '(Sistema)' : ''}</option>`
    ).join('');
  }

  // Populate branches select dropdown
  if (branchSelectEl) {
    const activeBranches = (state.branches || []).filter(b => b.active !== false);
    branchSelectEl.innerHTML = activeBranches.length > 0
      ? activeBranches.map(b => `<option value="${b.code}">${escapeHtml(b.code)} - ${escapeHtml(b.name)}</option>`).join('')
      : '<option value="0101">0101 - Matriz</option><option value="0102">0102 - Adoro</option>';
  }

  if (id) {
    const u = (state.systemUsers || []).find(user => user.id === id);
    if (!u) return;
    if (titleEl) titleEl.innerHTML = '<i class="fa-solid fa-user-pen text-emerald-400"></i> Editar Usuário do Sistema';
    if (idEl) idEl.value = u.id;
    if (userEl) { userEl.value = u.username; userEl.disabled = true; }
    if (profileSelectEl) profileSelectEl.value = u.profileId || (state.profiles[0] ? state.profiles[0].id : '');
    if (branchSelectEl) branchSelectEl.value = u.branchCode || u.branch_code || '0101';
    if (nameEl) nameEl.value = u.name || '';
    if (emailEl) emailEl.value = u.email || '';
    if (passEl) passEl.value = '';
    if (confirmPassEl) confirmPassEl.value = '';
    if (passReqEl) passReqEl.classList.add('hidden');
    if (confirmPassReqEl) confirmPassReqEl.classList.add('hidden');
  } else {
    if (titleEl) titleEl.innerHTML = '<i class="fa-solid fa-user-plus text-emerald-400"></i> Cadastrar Usuário do Sistema';
    if (idEl) idEl.value = '';
    if (userEl) { userEl.value = ''; userEl.disabled = false; }
    if (profileSelectEl) profileSelectEl.value = state.profiles[0] ? state.profiles[0].id : '';
    if (branchSelectEl) branchSelectEl.value = (state.branches && state.branches[0]) ? state.branches[0].code : '0101';
    if (nameEl) nameEl.value = '';
    if (emailEl) emailEl.value = '';
    if (passEl) passEl.value = '';
    if (confirmPassEl) confirmPassEl.value = '';
    if (passReqEl) passReqEl.classList.remove('hidden');
    if (confirmPassReqEl) confirmPassReqEl.classList.remove('hidden');
  }

  modal.classList.remove('hidden');
}
window.openSystemUserModal = openSystemUserModal;

function closeSystemUserModal() {
  const modal = document.getElementById('modal-system-user');
  if (modal) modal.classList.add('hidden');
}
window.closeSystemUserModal = closeSystemUserModal;

async function saveSystemUser(event) {
  event.preventDefault();
  const id = document.getElementById('sysuser-id').value;
  const username = document.getElementById('sysuser-username').value.trim();
  const profileId = document.getElementById('sysuser-profileId').value;
  const branchCode = document.getElementById('sysuser-branch') ? document.getElementById('sysuser-branch').value : '0101';
  const name = document.getElementById('sysuser-name').value.trim();
  const email = document.getElementById('sysuser-email') ? document.getElementById('sysuser-email').value.trim() : '';
  const password = document.getElementById('sysuser-password').value;
  const confirmPassword = document.getElementById('sysuser-confirm-password') ? document.getElementById('sysuser-confirm-password').value : '';

  if (!username || !name || (!id && !password)) {
    showAlert({ type: 'warning', title: 'Campos Obrigatórios', message: 'Preencha todos os campos obrigatórios.' });
    return;
  }

  if (password || confirmPassword) {
    if (password !== confirmPassword) {
      showAlert({ type: 'danger', title: 'Senha Não Confere', message: 'A Senha de Acesso e a Confirmação de Senha não coincidem! Verifique os dados digitados.' });
      return;
    }
  }

  const payload = { username, profileId, branchCode, name, email };
  if (password && password.trim()) payload.password = password.trim();

  const headers = { 'Content-Type': 'application/json' };
  if (state.currentUser) {
    headers['x-user-id'] = state.currentUser.id;
    headers['x-user-name'] = encodeURIComponent(state.currentUser.name);
  }

  try {
    const url = id ? `/api/system-users/${id}` : '/api/system-users';
    const method = id ? 'PUT' : 'POST';

    const res = await fetch(url, { method, headers, body: JSON.stringify(payload) });
    const data = await res.json();

    if (data.success) {
      closeSystemUserModal();
      await loadSystemUsersList();
      showAlert({ type: 'success', title: 'Operador Salvo', message: data.message || 'Usuário salvo com sucesso!' });
    } else {
      showAlert({ type: 'danger', title: 'Erro ao Salvar', message: data.message || 'Erro ao salvar usuário.' });
    }
  } catch (err) {
    console.error('[SAVE SYSTEM USER ERROR]', err);
    showAlert({ type: 'danger', title: 'Erro de Conexão', message: 'Falha ao comunicar com o servidor.' });
  }
}
window.saveSystemUser = saveSystemUser;

async function deleteSystemUser(id) {
  const user = (state.systemUsers || []).find(u => u.id === id);
  if (!user) return;
  const confirmed = await showConfirmDialog({
    title: 'Remover Usuário do Sistema',
    message: `Deseja realmente excluir o operador "${user.name}" (@${user.username})?`,
    type: 'danger',
    confirmText: 'Remover Usuário'
  });
  if (!confirmed) return;

  try {
    const headers = {};
    if (state.currentUser) {
      headers['x-user-id'] = state.currentUser.id;
      headers['x-user-name'] = encodeURIComponent(state.currentUser.name);
    }
    const res = await fetch(`/api/system-users/${id}`, { method: 'DELETE', headers });
    const data = await res.json();
    if (data.success) {
      await loadSystemUsersList();
      showAlert({ type: 'success', title: 'Operador Excluído', message: 'Usuário do sistema removido com sucesso.' });
    } else {
      showAlert({ type: 'danger', title: 'Falha na Exclusão', message: data.message || 'Erro ao remover usuário.' });
    }
  } catch (err) {
    console.error('[DELETE SYSTEM USER ERROR]', err);
    showAlert({ type: 'danger', title: 'Erro de Conexão', message: 'Falha ao comunicar com o servidor.' });
  }
}
window.deleteSystemUser = deleteSystemUser;

// ==========================================================================
// PROFILES & GROUPS MANAGEMENT ROUTINES
// ==========================================================================
async function loadProfilesList() {
  try {
    const headers = {};
    if (state.currentUser) {
      headers['x-user-id'] = state.currentUser.id;
      headers['x-user-name'] = encodeURIComponent(state.currentUser.name);
    }
    const res = await fetch('/api/profiles', { headers });
    const data = await res.json();
    if (data.success) {
      state.profiles = data.profiles;
      renderProfilesTable(data.profiles);
    }
  } catch (err) {
    console.error('[LOAD PROFILES ERROR]', err);
  }
}
window.loadProfilesList = loadProfilesList;

function renderProfilesTable(profiles) {
  const tbody = document.getElementById('profiles-table-body');
  if (!tbody) return;

  if (!profiles || profiles.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center py-6 text-slate-500 text-xs">Nenhum perfil/grupo cadastrado.</td>
      </tr>`;
    return;
  }

  const permsMap = {
    auth: 'Autenticação',
    register: 'Cadastrar',
    credentials: 'Credenciais',
    status: 'Status',
    audit: 'Auditoria',
    system_users: 'Usuários',
    profiles: 'Perfis'
  };

  tbody.innerHTML = profiles.map(p => {
    const typeBadge = p.isSystem
      ? '<span class="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">Sistema (Mestre)</span>'
      : '<span class="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">Customizado</span>';

    const permsBadges = (p.permissions || []).map(perm => `<span class="inline-block px-1.5 py-0.5 text-[9px] rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono">${permsMap[perm] || perm}</span>`).join(' ');

    return `
      <tr class="hover:bg-slate-800/30 transition-colors">
        <td class="p-3 font-mono font-bold text-emerald-400 text-xs">${escapeHtml(p.code || 'GRP')}</td>
        <td class="p-3 font-bold text-white text-xs flex items-center gap-2">
          <i class="fa-solid fa-users-gear text-emerald-400 text-xs"></i> ${escapeHtml(p.name)}
        </td>
        <td class="p-3 text-slate-400 text-xs max-w-xs truncate">${escapeHtml(p.description || '-')}</td>
        <td class="p-3"><div class="flex flex-wrap gap-1 max-w-xs">${permsBadges || '<span class="text-slate-500 text-[10px]">Sem privilégios</span>'}</div></td>
        <td class="p-3">${typeBadge}</td>
        <td class="p-3 text-right">
          <div class="flex items-center justify-end gap-1.5">
            <button onclick="openProfileModal('${p.id}')" class="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-[11px] font-semibold transition-all flex items-center gap-1" title="Editar Perfil">
              <i class="fa-solid fa-pen-to-square text-emerald-400"></i> Editar
            </button>
            ${!p.isSystem ? `
              <button onclick="deleteProfile('${p.id}')" class="px-2.5 py-1.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 rounded-xl text-[11px] font-semibold transition-all flex items-center gap-1" title="Remover Perfil">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            ` : ''}
          </div>
        </td>
      </tr>`;
  }).join('');
}

function toggleAllProfileBranches(allCb) {
  const branchCbs = document.querySelectorAll('.prf-branch-checkbox');
  branchCbs.forEach(cb => {
    if (cb !== allCb) cb.checked = allCb.checked;
  });
}
window.toggleAllProfileBranches = toggleAllProfileBranches;

function checkIndividualProfileBranch(cb) {
  const allCb = document.getElementById('prf-branch-all');
  if (!allCb) return;
  if (!cb.checked) {
    allCb.checked = false;
  } else {
    const individualCbs = Array.from(document.querySelectorAll('.prf-branch-checkbox')).filter(c => c !== allCb);
    if (individualCbs.length > 0 && individualCbs.every(c => c.checked)) {
      allCb.checked = true;
    }
  }
}
window.checkIndividualProfileBranch = checkIndividualProfileBranch;

async function openProfileModal(id = null) {
  const modal = document.getElementById('modal-profile');
  if (!modal) return;

  if (!state.branches || state.branches.length === 0) {
    await loadBranchesList();
  }

  const titleEl = document.getElementById('modal-profile-title');
  const idEl = document.getElementById('profile-id');
  const codeEl = document.getElementById('profile-code');
  const nameEl = document.getElementById('profile-name');
  const descEl = document.getElementById('profile-description');
  const branchesListEl = document.getElementById('prf-branches-list');

  // Render branches checkboxes
  if (branchesListEl) {
    const branches = (state.branches && state.branches.length > 0)
      ? state.branches
      : [{ code: '0101', name: 'Matriz' }, { code: '0102', name: 'Adoro' }];

    branchesListEl.innerHTML = `
      <label class="flex items-center gap-2.5 p-2 rounded-xl bg-slate-900/60 border border-slate-800/60 cursor-pointer hover:border-amber-500/40 hover:text-white transition-all">
        <input type="checkbox" value="*" id="prf-branch-all" onchange="toggleAllProfileBranches(this)" class="prf-branch-checkbox accent-emerald-500 rounded"> Todas as Filiais (*)
      </label>
      ${branches.map(b => `
        <label class="flex items-center gap-2.5 p-2 rounded-xl bg-slate-900/60 border border-slate-800/60 cursor-pointer hover:border-amber-500/40 hover:text-white transition-all">
          <input type="checkbox" value="${b.code}" onchange="checkIndividualProfileBranch(this)" class="prf-branch-checkbox accent-emerald-500 rounded"> ${escapeHtml(b.code)} - ${escapeHtml(b.name)}
        </label>
      `).join('')}
    `;
  }

  const permCheckboxes = ['auth', 'register', 'credentials', 'status', 'audit', 'system_users', 'profiles', 'branches'];

  if (id) {
    const p = (state.profiles || []).find(prf => prf.id === id);
    if (!p) return;
    if (titleEl) titleEl.innerHTML = '<i class="fa-solid fa-pen-to-square text-emerald-400"></i> Editar Perfil / Grupo de Acesso';
    if (idEl) idEl.value = p.id;
    if (codeEl) { codeEl.value = p.code || ''; codeEl.disabled = p.isSystem; }
    if (nameEl) nameEl.value = p.name || '';
    if (descEl) descEl.value = p.description || '';

    permCheckboxes.forEach(perm => {
      const cb = document.getElementById(`prf-perm-${perm}`);
      if (cb) cb.checked = Array.isArray(p.permissions) && p.permissions.includes(perm);
    });

    const allowed = Array.isArray(p.allowedBranches) && p.allowedBranches.length > 0 ? p.allowedBranches : ['*'];
    const hasAll = allowed.includes('*');

    const allCb = document.getElementById('prf-branch-all');
    if (allCb) allCb.checked = hasAll;

    const branchCbs = document.querySelectorAll('.prf-branch-checkbox');
    branchCbs.forEach(cb => {
      if (cb.value === '*') {
        cb.checked = hasAll;
      } else {
        cb.checked = hasAll || allowed.includes(cb.value);
      }
    });
  } else {
    if (titleEl) titleEl.innerHTML = '<i class="fa-solid fa-plus text-emerald-400"></i> Cadastrar Perfil / Grupo de Acesso';
    if (idEl) idEl.value = '';
    if (codeEl) { codeEl.value = ''; codeEl.disabled = false; }
    if (nameEl) nameEl.value = '';
    if (descEl) descEl.value = '';

    permCheckboxes.forEach(perm => {
      const cb = document.getElementById(`prf-perm-${perm}`);
      if (cb) cb.checked = perm === 'auth' || perm === 'register';
    });

    const branchCbs = document.querySelectorAll('.prf-branch-checkbox');
    branchCbs.forEach(cb => {
      cb.checked = true;
    });
  }

  modal.classList.remove('hidden');
}
window.openProfileModal = openProfileModal;

function closeProfileModal() {
  const modal = document.getElementById('modal-profile');
  if (modal) modal.classList.add('hidden');
}
window.closeProfileModal = closeProfileModal;

async function saveProfile(event) {
  event.preventDefault();
  const id = document.getElementById('profile-id').value;
  const code = document.getElementById('profile-code').value.trim().toUpperCase();
  const name = document.getElementById('profile-name').value.trim();
  const description = document.getElementById('profile-description').value.trim();

  const permCheckboxes = ['auth', 'register', 'credentials', 'status', 'audit', 'system_users', 'profiles', 'branches'];
  const permissions = permCheckboxes.filter(p => {
    const cb = document.getElementById(`prf-perm-${p}`);
    return cb && cb.checked;
  });

  const branchCbs = document.querySelectorAll('.prf-branch-checkbox');
  const allowedBranches = [];
  branchCbs.forEach(cb => {
    if (cb.checked) allowedBranches.push(cb.value);
  });

  if (!code || !name) {
    showAlert({ type: 'warning', title: 'Campos Obrigatórios', message: 'O código e o nome do perfil/grupo são obrigatórios.' });
    return;
  }

  const finalAllowedBranches = allowedBranches.includes('*') ? ['*'] : (allowedBranches.length > 0 ? allowedBranches : ['*']);

  const payload = { code, name, description, permissions, allowedBranches: finalAllowedBranches };
  const headers = { 'Content-Type': 'application/json' };
  if (state.currentUser) {
    headers['x-user-id'] = state.currentUser.id;
    headers['x-user-name'] = encodeURIComponent(state.currentUser.name);
  }

  try {
    const url = id ? `/api/profiles/${id}` : '/api/profiles';
    const method = id ? 'PUT' : 'POST';

    const res = await fetch(url, { method, headers, body: JSON.stringify(payload) });
    const data = await res.json();

    if (data.success) {
      closeProfileModal();
      await loadProfilesList();
      showAlert({ type: 'success', title: 'Perfil Salvo', message: data.message || 'Perfil/Grupo salvo com sucesso!' });
      
      // If current user is modified or inherits this profile, refresh permissions
      if (state.currentUser && state.currentUser.profileId === id) {
        state.currentUser.permissions = permissions;
        state.currentUser.allowedBranches = finalAllowedBranches;
        applyMenuPermissions();
      }
    } else {
      showAlert({ type: 'danger', title: 'Erro ao Salvar', message: data.message || 'Erro ao salvar perfil.' });
    }
  } catch (err) {
    console.error('[SAVE PROFILE ERROR]', err);
    showAlert({ type: 'danger', title: 'Erro de Conexão', message: 'Falha ao comunicar com o servidor.' });
  }
}
window.saveProfile = saveProfile;

async function deleteProfile(id) {
  const p = (state.profiles || []).find(prf => prf.id === id);
  if (!p) return;
  const confirmed = await showConfirmDialog({
    title: 'Remover Perfil de Acesso',
    message: `Deseja realmente excluir o perfil/grupo "${p.name}"?`,
    type: 'danger',
    confirmText: 'Remover Perfil'
  });
  if (!confirmed) return;

  try {
    const headers = {};
    if (state.currentUser) {
      headers['x-user-id'] = state.currentUser.id;
      headers['x-user-name'] = encodeURIComponent(state.currentUser.name);
    }
    const res = await fetch(`/api/profiles/${id}`, { method: 'DELETE', headers });
    const data = await res.json();
    if (data.success) {
      await loadProfilesList();
      showAlert({ type: 'success', title: 'Perfil Excluído', message: 'Perfil de acesso removido com sucesso.' });
    } else {
      showAlert({ type: 'danger', title: 'Falha na Exclusão', message: data.message || 'Erro ao remover perfil.' });
    }
  } catch (err) {
    console.error('[DELETE PROFILE ERROR]', err);
    showAlert({ type: 'danger', title: 'Erro de Conexão', message: 'Falha ao comunicar com o servidor.' });
  }
}
window.deleteProfile = deleteProfile;

// ==========================================================================
// BRANCHES (EMPRESAS / FILIAIS) MANAGEMENT ROUTINES
// ==========================================================================
async function loadBranchesList() {
  try {
    const headers = {};
    if (state.currentUser) {
      headers['x-user-id'] = state.currentUser.id;
      headers['x-user-name'] = encodeURIComponent(state.currentUser.name);
    }
    const res = await fetch('/api/branches', { headers });
    const branches = await res.json();
    if (Array.isArray(branches)) {
      state.branches = branches;
      renderBranchesTable(branches);
      updateCredentialBranchSelects();
      populateAuditBranchFilter();
    }
  } catch (err) {
    console.error('[LOAD BRANCHES ERROR]', err);
  }
}
window.loadBranchesList = loadBranchesList;

function updateCredentialBranchSelects() {
  const regBranchEl = document.getElementById('reg-branch');
  const editCredBranchEl = document.getElementById('edit-cred-branch');

  const activeBranches = (state.branches || []).filter(b => b.active !== false);
  const optionsHtml = activeBranches.length > 0
    ? activeBranches.map(b => `<option value="${b.code}">${escapeHtml(b.code)} - ${escapeHtml(b.name)}</option>`).join('')
    : '<option value="0101">0101 - Matriz</option><option value="0102">0102 - Adoro</option>';

  if (regBranchEl) {
    const currentVal = regBranchEl.value;
    regBranchEl.innerHTML = optionsHtml;
    if (currentVal && activeBranches.some(b => b.code === currentVal)) {
      regBranchEl.value = currentVal;
    }
  }

  if (editCredBranchEl) {
    const currentVal = editCredBranchEl.value;
    editCredBranchEl.innerHTML = optionsHtml;
    if (currentVal && activeBranches.some(b => b.code === currentVal)) {
      editCredBranchEl.value = currentVal;
    }
  }
}
window.updateCredentialBranchSelects = updateCredentialBranchSelects;

function formatCnpj(value) {
  if (!value) return '';
  const digits = String(value).replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}
window.formatCnpj = formatCnpj;

function maskCnpjInput(input) {
  if (!input) return;
  input.value = formatCnpj(input.value);
}
window.maskCnpjInput = maskCnpjInput;

function renderBranchesTable(branches) {
  const tbody = document.getElementById('branches-table-body');
  if (!tbody) return;

  if (!branches || branches.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center py-6 text-slate-500 text-xs">Nenhuma filial cadastrada.</td>
      </tr>`;
    return;
  }

  tbody.innerHTML = branches.map(b => {
    const isMatriz = b.code === '0001';
    const statusBadge = b.active
      ? '<span class="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">Ativa</span>'
      : '<span class="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">Inativa</span>';

    return `
      <tr class="hover:bg-slate-800/30 transition-colors">
        <td class="p-3 font-mono font-bold text-emerald-400 text-xs flex items-center gap-2">
          <i class="fa-solid fa-building text-xs text-slate-400"></i> ${escapeHtml(b.code)}
        </td>
        <td class="p-3 font-semibold text-white text-xs">${escapeHtml(b.name)}</td>
        <td class="p-3 text-slate-400 font-mono text-xs">${escapeHtml(formatCnpj(b.cnpj) || '-')}</td>
        <td class="p-3">${statusBadge}</td>
        <td class="p-3 text-right">
          <div class="flex items-center justify-end gap-1.5">
            <button onclick="openBranchModal('${b.code}')" class="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-[11px] font-semibold transition-all flex items-center gap-1" title="Editar Filial">
              <i class="fa-solid fa-pen-to-square text-emerald-400"></i> Editar
            </button>
            ${!isMatriz ? `
              <button onclick="deleteBranch('${b.code}')" class="px-2.5 py-1.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 rounded-xl text-[11px] font-semibold transition-all flex items-center gap-1" title="Remover Filial">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            ` : ''}
          </div>
        </td>
      </tr>`;
  }).join('');
}

function openBranchModal(code = null) {
  const modal = document.getElementById('modal-branch');
  if (!modal) return;

  const titleEl = document.getElementById('modal-branch-title');
  const codeEl = document.getElementById('branch-code');
  const nameEl = document.getElementById('branch-name');
  const cnpjEl = document.getElementById('branch-cnpj');
  const activeEl = document.getElementById('branch-active');

  if (code) {
    const b = (state.branches || []).find(branch => branch.code === code);
    if (!b) return;
    if (titleEl) titleEl.innerHTML = '<i class="fa-solid fa-pen-to-square text-emerald-400"></i> Editar Empresa / Filial';
    if (codeEl) { codeEl.value = b.code; codeEl.disabled = true; }
    if (nameEl) nameEl.value = b.name || '';
    if (cnpjEl) cnpjEl.value = formatCnpj(b.cnpj || '');
    if (activeEl) activeEl.checked = b.active !== false;
  } else {
    if (titleEl) titleEl.innerHTML = '<i class="fa-solid fa-plus text-emerald-400"></i> Cadastrar Empresa / Filial';
    if (codeEl) { codeEl.value = ''; codeEl.disabled = false; }
    if (nameEl) nameEl.value = '';
    if (cnpjEl) cnpjEl.value = '';
    if (activeEl) activeEl.checked = true;
  }

  modal.classList.remove('hidden');
}
window.openBranchModal = openBranchModal;

function closeBranchModal() {
  const modal = document.getElementById('modal-branch');
  if (modal) modal.classList.add('hidden');
}
window.closeBranchModal = closeBranchModal;

async function saveBranch(event) {
  event.preventDefault();
  const codeEl = document.getElementById('branch-code');
  const code = codeEl.value.trim().toUpperCase();
  const name = document.getElementById('branch-name').value.trim();
  const cnpj = document.getElementById('branch-cnpj').value.trim();
  const active = document.getElementById('branch-active').checked;

  if (!code || !name) {
    showAlert({ type: 'warning', title: 'Campos Obrigatórios', message: 'Preencha o código e o nome da filial.' });
    return;
  }

  const payload = { code, name, cnpj, active };
  const headers = { 'Content-Type': 'application/json' };
  if (state.currentUser) {
    headers['x-user-id'] = state.currentUser.id;
    headers['x-user-name'] = encodeURIComponent(state.currentUser.name);
  }

  const isEditing = codeEl.disabled;

  try {
    const url = isEditing ? `/api/branches/${code}` : '/api/branches';
    const method = isEditing ? 'PUT' : 'POST';

    const res = await fetch(url, { method, headers, body: JSON.stringify(payload) });
    const data = await res.json();

    if (res.ok) {
      closeBranchModal();
      await loadBranchesList();
      showAlert({ type: 'success', title: 'Filial Salva', message: isEditing ? 'Dados da filial atualizados com sucesso.' : 'Nova filial cadastrada com sucesso.' });
    } else {
      showAlert({ type: 'danger', title: 'Erro ao Salvar', message: data.error || 'Erro ao salvar filial.' });
    }
  } catch (err) {
    console.error('[SAVE BRANCH ERROR]', err);
    showAlert({ type: 'danger', title: 'Erro de Conexão', message: 'Falha ao comunicar com o servidor.' });
  }
}
window.saveBranch = saveBranch;

async function deleteBranch(code) {
  if (code === '0001') {
    showAlert({ type: 'warning', title: 'Ação Não Permitida', message: 'A filial matriz "0001" é protegida e não pode ser removida.' });
    return;
  }
  const confirmed = await showConfirmDialog({
    title: 'Remover Filial',
    message: `Deseja realmente excluir permanentemente a filial código "${code}"?`,
    type: 'danger',
    confirmText: 'Remover Filial'
  });
  if (!confirmed) return;

  try {
    const headers = {};
    if (state.currentUser) {
      headers['x-user-id'] = state.currentUser.id;
      headers['x-user-name'] = encodeURIComponent(state.currentUser.name);
    }
    const res = await fetch(`/api/branches/${code}`, { method: 'DELETE', headers });
    const data = await res.json();
    if (res.ok) {
      await loadBranchesList();
      showAlert({ type: 'success', title: 'Filial Excluída', message: `Filial ${code} removida com sucesso.` });
    } else {
      showAlert({ type: 'danger', title: 'Falha na Exclusão', message: data.error || 'Erro ao remover filial.' });
    }
  } catch (err) {
    console.error('[DELETE BRANCH ERROR]', err);
    showAlert({ type: 'danger', title: 'Erro de Conexão', message: 'Falha ao comunicar com o servidor.' });
  }
}
window.deleteBranch = deleteBranch;
