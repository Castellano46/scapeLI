/**
 * Escape Room - Logic & Audio Engine
 * Desarrollador Senior especializado en HTML5/CSS3/JS
 */

// Configuración general del juego
const GAME_CONFIG = {
  correctCombination: "4658",
  initialTimeSeconds: 1800, // 30 minutos
  caesarShiftTarget: 3,
  elementsOrderTarget: ["fuego", "agua", "tierra", "aire"],
  alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
};

// Estado del juego
let gameState = {
  timeRemaining: 0,
  isPlaying: false,
  isFinished: false,
  currentRoom: "intro", // intro, riddle, study, caesar, elements, safe, victory
  soundEnabled: false,
  puzzles: {
    riddle: { solved: false, digit: "4", songGuessed: false },
    study: { solved: false, digit: "8" },
    caesar: { solved: false, digit: "6", moves: 0, coins: [2, 7, 8, 12, 13, 14, 17, 18, 19, 20] },
    elements: { solved: false, digit: "5", astrolabe: null }
  },
  hintsUsed: 0,
  finalChallengeSolved: false,
  hintLevelsOpened: {
    riddle: 0,
    study: 0,
    caesar: 0,
    elements: 0
  }
};

// Datos del Sistema de Pistas
const PUZZLE_HINTS = {
  riddle: [
    "Pista 1: Es algo intangible. Cuanto más material sustraes de él, mayor es su tamaño.",
    "Pista 2: Piensa en una prenda de ropa con desgaste, o en lo que haces en el suelo para plantar un árbol. Comienza con 'A'."
  ],
  study: [
    "Pista 1: Revisa los álbumes de fotos de la mesa. Tal vez uno oculte una llave dorada entre sus recuerdos.",
    "Pista 2: Usa la llave que encontraste entre los álbumes para abrir el cajón de los discursos. La nota contiene el dígito."
  ],
  caesar: [
    "Pista 1: Mueve las monedas para invertir la pirámide. El vértice debe apuntar hacia abajo.",
    "Pista 2: Mueve la moneda superior al extremo inferior. Luego mueve las dos esquinas de la base original a los extremos de la segunda fila."
  ],
  elements: [
    "Pista 1: Al pulsar cada anillo, este gira y transmite su movimiento a un anillo vecino. Debes alinear las letras de los 4 anillos en la vertical de arriba (a las 12 en punto) para deletrear la palabra AMOR.",
    "Pista 2: Pulsa el Anillo 1 (interno) tres veces, el Anillo 2 dos veces, y el Anillo 3 tres veces. El Anillo 4 no requiere clics desde el inicio."
  ]
};

// Motor de Audio (Web Audio API)
let audioCtx = null;
let ambientOsc = null;
let ambientGain = null;

function initAudio() {
  if (audioCtx) return;
  // Crear contexto de audio soportado en la mayoría de navegadores
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  audioCtx = new AudioContextClass();
}

function playSound(type) {
  if (!gameState.soundEnabled) return;
  initAudio();
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  const now = audioCtx.currentTime;

  switch (type) {
    case 'click': {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.08);
      
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
      break;
    }
    case 'success': {
      // Arpegio de C mayor ascendente y triunfante
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);
        
        gain.gain.setValueAtTime(0.0, now + idx * 0.1);
        gain.gain.linearRampToValueAtTime(0.12, now + idx * 0.1 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.25);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.3);
      });
      break;
    }
    case 'failure': {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(130, now);
      osc.frequency.linearRampToValueAtTime(80, now + 0.4);
      
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.4);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.4);
      break;
    }
    case 'gear': {
      // Breve chasquido metálico simulando engranaje
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(250, now);
      osc.frequency.setValueAtTime(600, now + 0.02);
      
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.04);
      break;
    }
    case 'unlock': {
      // Serie de clics mecánicos rápidos seguidos de un zumbido de apertura
      for (let i = 0; i < 4; i++) {
        const clickTime = now + (i * 0.12);
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(900 - (i * 100), clickTime);
        gain.gain.setValueAtTime(0.08, clickTime);
        gain.gain.exponentialRampToValueAtTime(0.001, clickTime + 0.05);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(clickTime);
        osc.stop(clickTime + 0.06);
      }
      
      // Sonido de puerta abriéndose
      const doorOsc = audioCtx.createOscillator();
      const doorGain = audioCtx.createGain();
      doorOsc.type = 'sawtooth';
      doorOsc.frequency.setValueAtTime(65, now + 0.5);
      doorOsc.frequency.linearRampToValueAtTime(55, now + 2.0);
      
      doorGain.gain.setValueAtTime(0.0, now + 0.5);
      doorGain.gain.linearRampToValueAtTime(0.12, now + 0.8);
      doorGain.gain.linearRampToValueAtTime(0.08, now + 1.5);
      doorGain.gain.exponentialRampToValueAtTime(0.001, now + 2.2);
      
      // Filtro de paso bajo para suavizar
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(200, now + 0.5);
      
      doorOsc.connect(filter);
      filter.connect(doorGain);
      doorGain.connect(audioCtx.destination);
      doorOsc.start(now + 0.5);
      doorOsc.stop(now + 2.3);
      break;
    }
    case 'victory': {
      // Fanfarria majestuosa
      const chord = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
      chord.forEach((freq) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now);
        
        // Efecto vibrato
        const lfo = audioCtx.createOscillator();
        const lfoGain = audioCtx.createGain();
        lfo.frequency.value = 6; // 6 Hz
        lfoGain.gain.value = 3;  // Modulación
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        
        gain.gain.setValueAtTime(0.0, now);
        gain.gain.linearRampToValueAtTime(0.1, now + 0.2);
        gain.gain.linearRampToValueAtTime(0.08, now + 1.5);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 3.0);
        
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 800;
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtx.destination);
        
        lfo.start(now);
        osc.start(now);
        lfo.stop(now + 3.0);
        osc.stop(now + 3.0);
      });

      // Segunda parte del acorde triunfal poco después
      const chord2 = [329.63 * 1.5, 392.00 * 1.5, 523.25 * 1.5, 659.25 * 1.5]; // G4, B4, D5, G5 ajustado
      chord2.forEach((freq) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + 0.6);
        
        gain.gain.setValueAtTime(0.0, now + 0.6);
        gain.gain.linearRampToValueAtTime(0.12, now + 0.8);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 3.5);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now + 0.6);
        osc.stop(now + 3.5);
      });
      break;
    }
  }
}

// Bucle de sonido ambiental
function startAmbientMusic() {
  if (!gameState.soundEnabled) return;
  initAudio();
  
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  
  if (ambientOsc) return;

  const now = audioCtx.currentTime;
  ambientOsc = audioCtx.createOscillator();
  ambientGain = audioCtx.createGain();
  
  ambientOsc.type = 'sine';
  ambientOsc.frequency.value = 88; // A2 bajo y misterioso
  
  // Modulación lenta de volumen para atmósfera (LFO)
  const lfo = audioCtx.createOscillator();
  const lfoGain = audioCtx.createGain();
  lfo.frequency.value = 0.2; // Muy lento, 5s por ciclo
  lfoGain.gain.value = 0.02; // Variación leve de ganancia
  
  // Mezclar
  ambientGain.gain.value = 0.05; // Bajo volumen base
  
  lfo.connect(lfoGain);
  lfoGain.connect(ambientGain.gain);
  
  ambientOsc.connect(ambientGain);
  ambientGain.connect(audioCtx.destination);
  
  lfo.start(now);
  ambientOsc.start(now);
  
  // Agregar una nota armónica flotante
  const sparkleOsc = audioCtx.createOscillator();
  const sparkleGain = audioCtx.createGain();
  sparkleOsc.type = 'sine';
  sparkleOsc.frequency.value = 220; // A3 suave
  
  sparkleGain.gain.value = 0.01;
  sparkleOsc.connect(sparkleGain);
  sparkleGain.connect(audioCtx.destination);
  sparkleOsc.start(now);
  
  // Guardar referencias para detenerlas
  ambientOsc.sparkleOsc = sparkleOsc;
  ambientOsc.lfo = lfo;
}

function stopAmbientMusic() {
  if (ambientOsc) {
    try {
      ambientOsc.stop();
      ambientOsc.sparkleOsc.stop();
      ambientOsc.lfo.stop();
    } catch(e) {}
    ambientOsc = null;
    ambientGain = null;
  }
}

// Temporizador
let timerInterval = null;

function startTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (gameState.isPlaying && !gameState.isFinished) {
      gameState.timeRemaining++;
      updateTimerDisplay();
    }
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function updateTimerDisplay() {
  const minutes = Math.floor(Math.abs(gameState.timeRemaining) / 60);
  const seconds = Math.abs(gameState.timeRemaining) % 60;
  const sign = gameState.timeRemaining < 0 ? "-" : "";
  const displayString = `${sign}${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  
  const timerBox = document.getElementById("timer-display");
  if (timerBox) {
    timerBox.textContent = displayString;
    // Si queda poco tiempo (menos de 3 min) se pone rojo
    if (gameState.timeRemaining < 180) {
      timerBox.style.color = "var(--red-alert)";
      timerBox.style.borderColor = "var(--red-alert)";
    } else {
      timerBox.style.color = "var(--cyan)";
      timerBox.style.borderColor = "rgba(69, 243, 255, 0.3)";
    }
  }
}

// Guarda estado en LocalStorage
function saveGame() {
  localStorage.setItem("escape_room_state", JSON.stringify(gameState));
}

// Carga estado de LocalStorage
function loadGame() {
  const saved = localStorage.getItem("escape_room_state");
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      // Validar integridad de campos
      if (parsed && typeof parsed.timeRemaining === 'number') {
        gameState = parsed;
        return true;
      }
    } catch (e) {
      console.error("Error cargando partida guardada", e);
    }
  }
  return false;
}

// Reiniciar partida
function resetGameData() {
  gameState = {
    timeRemaining: 0,
    isPlaying: false,
    isFinished: false,
    currentRoom: "intro", // intro, riddle, study, caesar, elements, safe, victory
    soundEnabled: false,
    puzzles: {
      riddle: { solved: false, digit: "4", songGuessed: false },
      study: { solved: false, digit: "8" },
      caesar: { solved: false, digit: "6", moves: 0, coins: [2, 7, 8, 12, 13, 14, 17, 18, 19, 20] },
      elements: { solved: false, digit: "5", astrolabe: null }
    },
    hintsUsed: 0,
    finalChallengeSolved: false,
    hintLevelsOpened: {
      riddle: 0,
      study: 0,
      caesar: 0,
      elements: 0
    }
  };
  
  // Resetear buffers y estados globales
  safeInputBuffer = "";
  stopTimer();
  stopAmbientMusic();

  // Limpiar inputs en la interfaz y resetear estado bloqueado
  const inputSong = document.getElementById("riddle-input-song");
  const inputNum = document.getElementById("riddle-input-number");
  const inputStudy = document.getElementById("study-input-number");
  const btnStudy = document.getElementById("btn-check-study");
  const studyStatus = document.getElementById("study-game-status");
  const final1 = document.getElementById("final-input-1");
  const final2 = document.getElementById("final-input-2");
  const finalChallenge = document.getElementById("final-challenge-container");
  const finalVictory = document.getElementById("final-victory-message");

  if (inputSong) inputSong.value = "";
  if (inputNum) inputNum.value = "";
  if (inputStudy) {
    inputStudy.value = "";
    inputStudy.setAttribute("disabled", "true");
    inputStudy.placeholder = "EL CASILLERO ESTÁ BLOQUEADO...";
  }
  if (btnStudy) {
    btnStudy.setAttribute("disabled", "true");
  }
  if (studyStatus) {
    studyStatus.innerHTML = "El casillero está bloqueado. Esperando puntuación de 100 puntos...";
    studyStatus.style.color = "";
  }
  if (final1) final1.value = "";
  if (final2) final2.value = "";
  if (finalChallenge) finalChallenge.style.display = "flex";
  if (finalVictory) finalVictory.style.display = "none";

  // Guardar partida vacía en LocalStorage
  saveGame();

  // Resetear puntuaciones en el servidor
  fetch('http://localhost:8082/reset-scores', { method: 'POST' }).catch(err => {
    console.warn("No se pudo resetear las puntuaciones en el servidor.", err);
  });

  // Resetear reproductor
  const audio = document.getElementById("audio-cannon");
  if (audio) {
    audio.pause();
    audio.currentTime = 0;
    const playBtn = document.getElementById("btn-play-audio");
    if (playBtn) playBtn.classList.remove("playing");
  }
}

// Inicialización de la interfaz según el estado
function renderState() {
  // Ajustar visualización del sonido
  const soundIcon = document.querySelector("#sound-toggle i");
  if (soundIcon) {
    if (gameState.soundEnabled) {
      soundIcon.className = "fas fa-volume-up";
      startAmbientMusic();
    } else {
      soundIcon.className = "fas fa-volume-mute";
      stopAmbientMusic();
    }
  }

  // Mostrar el progreso en el header
  for (let i = 1; i <= 4; i++) {
    const slot = document.getElementById(`slot-${i}`);
    if (slot) {
      let isSolved = false;
      let digit = "?";
      if (i === 1 && gameState.puzzles.riddle.solved) { isSolved = true; digit = gameState.puzzles.riddle.digit; }
      if (i === 2 && gameState.puzzles.study.solved) { isSolved = true; digit = gameState.puzzles.study.digit; }
      if (i === 3 && gameState.puzzles.caesar.solved) { isSolved = true; digit = gameState.puzzles.caesar.digit; }
      if (i === 4 && gameState.puzzles.elements.solved) { isSolved = true; digit = gameState.puzzles.elements.digit; }

      if (isSolved) {
        slot.classList.add("solved");
        slot.textContent = digit;
      } else {
        slot.classList.remove("solved");
        slot.textContent = "?";
      }
    }
  }

  // Actualizar indicadores de la barra lateral de navegación
  updateNavButtonState("nav-riddle", gameState.puzzles.riddle.solved, gameState.puzzles.riddle.digit);
  updateNavButtonState("nav-study", gameState.puzzles.study.solved, gameState.puzzles.study.digit);
  updateNavButtonState("nav-caesar", gameState.puzzles.caesar.solved, gameState.puzzles.caesar.digit);
  updateNavButtonState("nav-elements", gameState.puzzles.elements.solved, gameState.puzzles.elements.digit);
  updateNavButtonState("nav-safe", gameState.finalChallengeSolved, "");

  // Ocultar / Mostrar overlays según estado
  const introOverlay = document.getElementById("intro-overlay");
  const victoryOverlay = document.getElementById("victory-overlay");
  
  if (!gameState.isPlaying && !gameState.isFinished) {
    introOverlay.classList.remove("hidden");
  } else {
    introOverlay.classList.add("hidden");
  }

  if (gameState.isFinished) {
    victoryOverlay.classList.remove("hidden");
    
    // Controlar visibilidad del último reto o mensaje final según si ya fue resuelto
    const finalChallenge = document.getElementById("final-challenge-container");
    const finalVictory = document.getElementById("final-victory-message");
    if (gameState.finalChallengeSolved) {
      if (finalChallenge) finalChallenge.style.display = "none";
      if (finalVictory) finalVictory.style.display = "flex";
    } else {
      if (finalChallenge) finalChallenge.style.display = "flex";
      if (finalVictory) finalVictory.style.display = "none";
    }
  } else {
    victoryOverlay.classList.add("hidden");
  }

  // Cambiar de pantalla activa
  switchRoom(gameState.currentRoom);
  updateTimerDisplay();

  // Renderizar puzzles según su estado individual
  renderRiddlePuzzle();
  renderStudyPuzzle();
  renderCaesarPuzzle();
  renderElementsPuzzle();
  renderSafeKeyboard();
}

function updateNavButtonState(id, solved, digit) {
  const btn = document.getElementById(id);
  if (btn) {
    const statusSpan = btn.querySelector(".nav-status");
    const roomName = id.replace("nav-", "");
    const locked = isRoomLocked(roomName);
    
    if (locked) {
      btn.classList.add("locked-nav");
      btn.classList.remove("solved-state");
      if (statusSpan) {
        statusSpan.innerHTML = `<i class="fas fa-lock" style="color: var(--text-dim);"></i>`;
        statusSpan.style.borderColor = "var(--text-dim)";
      }
      
      let desc = "Sala bloqueada";
      if (roomName === "safe") desc = "Cofre sellado";
      btn.querySelector(".nav-btn-desc").textContent = desc;
    } else {
      btn.classList.remove("locked-nav");
      
      if (solved) {
        btn.classList.add("solved-state");
        if (statusSpan) {
          statusSpan.innerHTML = `<i class="fas fa-check-circle" style="color: var(--green-success);"></i>`;
          statusSpan.style.borderColor = "";
        }
        
        let desc = `Dígito obtenido: ${digit}`;
        if (roomName === "safe") desc = "¡Cofre abierto!";
        btn.querySelector(".nav-btn-desc").textContent = desc;
      } else {
        btn.classList.remove("solved-state");
        if (statusSpan) {
          if (roomName === "safe") {
            statusSpan.innerHTML = `<i class="fas fa-envelope-open-text" style="color: var(--gold);"></i>`;
            statusSpan.style.borderColor = "var(--gold)";
          } else {
            statusSpan.innerHTML = `<i class="fas fa-lock-open" style="color: var(--gold);"></i>`;
            statusSpan.style.borderColor = "var(--gold)";
          }
        }
        
        let desc = "Sin resolver";
        if (id === "nav-riddle") desc = "Acertijo de los novios";
        if (id === "nav-study") desc = "Reto Maya Invaders";
        if (id === "nav-caesar") desc = "Descifrar el mensaje";
        if (id === "nav-elements") desc = "Alineación de pilares";
        if (id === "nav-safe") desc = "Listo para abrir";
        btn.querySelector(".nav-btn-desc").textContent = desc;
      }
    }
  }
}

// Verificar si una sala está bloqueada
function isRoomLocked(roomName) {
  if (!gameState || !gameState.puzzles) return false;
  if (roomName === "intro" || roomName === "riddle") return false;
  
  if (roomName === "study") {
    return !gameState.puzzles.riddle.solved;
  }
  if (roomName === "caesar") {
    return !gameState.puzzles.riddle.solved || !gameState.puzzles.study.solved;
  }
  if (roomName === "elements") {
    return !gameState.puzzles.riddle.solved || !gameState.puzzles.study.solved || !gameState.puzzles.caesar.solved;
  }
  if (roomName === "safe") {
    return !gameState.puzzles.riddle.solved || 
           !gameState.puzzles.study.solved || 
           !gameState.puzzles.caesar.solved || 
           !gameState.puzzles.elements.solved;
  }
  return false;
}

// Sistema de Notificaciones flotantes (Toast)
function showToast(message, type = "error") {
  // Asegurar que existe el contenedor en el DOM
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.className = "toast-container";
    document.body.appendChild(container);
  }

  // Crear el elemento toast
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  
  // Icono según el tipo
  let iconClass = "fa-exclamation-circle";
  if (type === "success") iconClass = "fa-check-circle";
  if (type === "info") iconClass = "fa-info-circle";
  
  toast.innerHTML = `
    <i class="fas ${iconClass}"></i>
    <span>${message}</span>
  `;
  
  container.appendChild(toast);
  
  // Pequeño timeout para permitir que la animación CSS se ejecute tras insertar en el DOM
  setTimeout(() => {
    toast.classList.add("show");
  }, 10);
  
  // Auto-eliminar después de 3.5 segundos
  setTimeout(() => {
    toast.classList.remove("show");
    // Esperar a que termine la animación de salida para eliminar del DOM
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 400);
  }, 3500);
}

// Navegación entre salas
function switchRoom(roomName) {
  gameState.currentRoom = roomName;
  saveGame();

  // Ocultar todas las secciones
  const panes = document.querySelectorAll(".puzzle-pane");
  panes.forEach(pane => pane.classList.remove("active"));

  // Mostrar la sección correcta
  const activePane = document.getElementById(`pane-${roomName}`);
  if (activePane) {
    activePane.classList.add("active");
  }

  // Actualizar botones de navegación lateral
  const navBtns = document.querySelectorAll(".nav-btn");
  navBtns.forEach(btn => btn.classList.remove("active"));
  
  const activeBtn = document.getElementById(`nav-${roomName}`);
  if (activeBtn) {
    activeBtn.classList.add("active");
  }

  // Pausar audio de la melodía al salir del acertijo
  if (roomName !== 'riddle') {
    const audio = document.getElementById("audio-cannon");
    if (audio) {
      audio.pause();
      const playBtn = document.getElementById("btn-play-audio");
      if (playBtn) playBtn.classList.remove("playing");
    }
  }

  // Iniciar o detener sondeo de puntuación para sala 2
  if (roomName === 'study') {
    startScorePolling();
  } else {
    if (scorePollInterval) {
      clearInterval(scorePollInterval);
      scorePollInterval = null;
    }
  }
}

// Acciones de las pruebas individuales

// ==========================================
// PRUEBA 1: Acertijo Lógico
// ==========================================
function renderRiddlePuzzle() {
  const solvedSection = document.getElementById("riddle-solved-ui");
  const activeSection = document.getElementById("riddle-active-ui");
  const hintBtn = document.getElementById("hint-btn-riddle");
  const step1Box = document.getElementById("riddle-step1-container");
  const step2Box = document.getElementById("riddle-step2-container");

  if (gameState.puzzles.riddle.solved) {
    solvedSection.style.display = "flex";
    activeSection.style.display = "none";
    if (hintBtn) hintBtn.style.display = "none";
  } else {
    solvedSection.style.display = "none";
    activeSection.style.display = "flex";
    if (hintBtn) hintBtn.style.display = "flex";

    // Mostrar/ocultar pasos según si adivinaron la canción
    if (gameState.puzzles.riddle.songGuessed) {
      if (step1Box) step1Box.style.display = "none";
      if (step2Box) step2Box.style.display = "flex";
    } else {
      if (step1Box) step1Box.style.display = "flex";
      if (step2Box) step2Box.style.display = "none";
    }
  }
}

function checkRiddleSong() {
  const input = document.getElementById("riddle-input-song");
  if (!input) return;
  const answer = input.value.trim().toUpperCase();
  
  // Respuestas válidas en inglés (mayúsculas)
  const validAnswers = ["CANON IN D", "CANNON IN D", "CANON EN D", "CANON", "CANNON"];
  
  if (validAnswers.includes(answer)) {
    playSound("success");
    gameState.puzzles.riddle.songGuessed = true;
    saveGame();
    renderRiddlePuzzle();
  } else {
    playSound("failure");
    input.classList.add("shaking");
    setTimeout(() => input.classList.remove("shaking"), 500);
  }
}

function checkRiddleNumber() {
  const input = document.getElementById("riddle-input-number");
  if (!input) return;
  const answer = input.value.trim();
  
  if (answer === "4" || answer.toUpperCase() === "CUATRO") {
    playSound("success");
    gameState.puzzles.riddle.solved = true;
    saveGame();
    renderState();
    triggerSuccessAnimation("pane-riddle");

    // Detener reproducción al resolver
    const audio = document.getElementById("audio-cannon");
    if (audio) {
      audio.pause();
    }
  } else {
    playSound("failure");
    input.classList.add("shaking");
    setTimeout(() => input.classList.remove("shaking"), 500);
  }
}

// ==========================================
// PRUEBA 2: Despacho / Habitación Interactiva
// ==========================================
// ==========================================
// PRUEBA 2: Despacho / Habitación Interactiva (Maya Invaders)
// ==========================================
let scorePollInterval = null;

let failedAttempts = 0;

function checkRemoteScores() {
  if (gameState.puzzles.study.solved) {
    if (scorePollInterval) clearInterval(scorePollInterval);
    return;
  }

  fetch('http://localhost:8082/check-score')
    .then(response => {
      if (!response.ok) throw new Error("Server error");
      return response.json();
    })
    .then(data => {
      const scores = data.high_scores || [];
      // Buscar si algún jugador consiguió >= 100 puntos
      const hasPassed = scores.some(s => s.score >= 100);
      if (hasPassed) {
        unlockStudyInput();
        if (scorePollInterval) clearInterval(scorePollInterval);
      }
    })
    .catch(err => {
      failedAttempts++;
      console.warn("No se pudo conectar con el servidor de puntuaciones.", err);
      // Si falla más de 3 veces, mostramos el bypass opcional
      if (failedAttempts >= 3) {
        const statusEl = document.getElementById("study-game-status");
        if (statusEl && !statusEl.innerHTML.includes("bypass")) {
          statusEl.innerHTML = `Esperando puntuación... <br><span style="font-size:0.75rem; opacity:0.8; cursor:pointer; text-decoration:underline;" onclick="window.unlockStudyInput()">[Desbloquear casillero manualmente]</span>`;
        }
      }
    });
}

function startScorePolling() {
  if (gameState.puzzles.study.solved) return;
  if (scorePollInterval) clearInterval(scorePollInterval);

  failedAttempts = 0;
  // Comprobación inmediata
  checkRemoteScores();
  // Sondeo cada 1 segundo
  scorePollInterval = setInterval(checkRemoteScores, 1000);
}

function unlockStudyInput() {
  const input = document.getElementById("study-input-number");
  const btn = document.getElementById("btn-check-study");
  const statusEl = document.getElementById("study-game-status");

  if (input && btn) {
    input.removeAttribute("disabled");
    btn.removeAttribute("disabled");
    input.placeholder = "ESCRIBE EL NÚMERO SAGRADO...";
    if (statusEl) {
      statusEl.textContent = "¡CÓDIGO DESBLOQUEADO! Ya podéis introducir el número sagrado.";
      statusEl.style.color = "#4ade80"; // Verde
    }
  }
}

// Hacerlo accesible globalmente para el bypass
window.unlockStudyInput = unlockStudyInput;

function renderStudyPuzzle() {
  const solvedSection = document.getElementById("study-solved-ui");
  const activeSection = document.getElementById("study-active-ui");
  const hintBtn = document.getElementById("hint-btn-study");

  if (gameState.puzzles.study.solved) {
    solvedSection.style.display = "flex";
    activeSection.style.display = "none";
    if (hintBtn) hintBtn.style.display = "none";
  } else {
    solvedSection.style.display = "none";
    activeSection.style.display = "flex";
    if (hintBtn) hintBtn.style.display = "flex";
    // Si ya está resuelto el record en esta sesión, autodesbloquear al renderizar
    fetch('http://localhost:8082/check-score')
      .then(r => r.json())
      .then(data => {
        const scores = data.high_scores || [];
        if (scores.some(s => s.score >= 100)) {
          unlockStudyInput();
        }
      }).catch(() => {});
  }
}

function checkStudyNumber() {
  const input = document.getElementById("study-input-number");
  if (!input) return;
  const answer = input.value.trim();
  
  if (answer === "8" || answer.toUpperCase() === "OCHO") {
    playSound("success");
    gameState.puzzles.study.solved = true;
    saveGame();
    renderState();
    triggerSuccessAnimation("pane-study");
  } else {
    playSound("failure");
    input.classList.add("shaking");
    setTimeout(() => input.classList.remove("shaking"), 500);
  }
}

// ==========================================
// PRUEBA 3: La Pirámide de Monedas
// ==========================================
let selectedPyramidSpot = null;

function renderCaesarPuzzle() {
  const solvedSection = document.getElementById("caesar-solved-ui");
  const activeSection = document.getElementById("caesar-active-ui");
  const hintBtn = document.getElementById("hint-btn-caesar");

  if (gameState.puzzles.caesar.solved) {
    if (solvedSection) solvedSection.style.display = "flex";
    if (activeSection) activeSection.style.display = "none";
    if (hintBtn) hintBtn.style.display = "none";
    return;
  }

  if (solvedSection) solvedSection.style.display = "none";
  if (activeSection) activeSection.style.display = "flex";
  if (hintBtn) hintBtn.style.display = "flex";

  // Inicializar estado de monedas si no existe
  if (!gameState.puzzles.caesar.coins) {
    gameState.puzzles.caesar.coins = [2, 7, 8, 12, 13, 14, 17, 18, 19, 20];
    gameState.puzzles.caesar.moves = 0;
  }

  const movesText = document.getElementById("pyramid-moves");
  if (movesText) {
    movesText.textContent = `${gameState.puzzles.caesar.moves} / 3`;
    if (gameState.puzzles.caesar.moves > 3) {
      movesText.style.color = "var(--red-alert)";
    } else {
      movesText.style.color = "var(--cyan)";
    }
  }

  const board = document.getElementById("pyramid-board");
  if (!board) return;

  board.innerHTML = "";

  const PYRAMID_SPOTS = [
    { y: 0, x: 0.0, top: 25, left: 80 },
    { y: 0, x: 1.0, top: 25, left: 160 },
    { y: 0, x: 2.0, top: 25, left: 240 },
    { y: 0, x: 3.0, top: 25, left: 320 },
    { y: 0, x: 4.0, top: 25, left: 400 },
    { y: 1, x: 0.5, top: 100, left: 40 },
    { y: 1, x: 1.5, top: 100, left: 120 },
    { y: 1, x: 2.5, top: 100, left: 200 },
    { y: 1, x: 3.5, top: 100, left: 280 },
    { y: 1, x: 4.5, top: 100, left: 360 },
    { y: 1, x: 5.5, top: 100, left: 440 },
    { y: 2, x: 0.0, top: 175, left: 80 },
    { y: 2, x: 1.0, top: 175, left: 160 },
    { y: 2, x: 2.0, top: 175, left: 240 },
    { y: 2, x: 3.0, top: 175, left: 320 },
    { y: 2, x: 4.0, top: 175, left: 400 },
    { y: 3, x: 0.5, top: 250, left: 40 },
    { y: 3, x: 1.5, top: 250, left: 120 },
    { y: 3, x: 2.5, top: 250, left: 200 },
    { y: 3, x: 3.5, top: 250, left: 280 },
    { y: 3, x: 4.5, top: 250, left: 360 },
    { y: 3, x: 5.5, top: 250, left: 440 },
    { y: 4, x: 0.0, top: 325, left: 80 },
    { y: 4, x: 1.0, top: 325, left: 160 },
    { y: 4, x: 2.0, top: 325, left: 240 },
    { y: 4, x: 3.0, top: 325, left: 320 },
    { y: 4, x: 4.0, top: 325, left: 400 }
  ];

  PYRAMID_SPOTS.forEach((spot, idx) => {
    const hasCoin = gameState.puzzles.caesar.coins.includes(idx);
    
    // Crear el slot
    const slotEl = document.createElement("div");
    slotEl.className = "pyramid-spot";
    if (hasCoin) slotEl.classList.add("has-coin");
    slotEl.style.top = `${spot.top}px`;
    slotEl.style.left = `${spot.left}px`;
    
    slotEl.addEventListener("click", () => {
      handlePyramidSpotClick(idx);
    });
    
    board.appendChild(slotEl);

    // Si tiene moneda, crear el elemento moneda
    if (hasCoin) {
      const coinEl = document.createElement("div");
      coinEl.className = "coin";
      if (selectedPyramidSpot === idx) {
        coinEl.classList.add("selected");
      }
      coinEl.style.top = `${spot.top}px`;
      coinEl.style.left = `${spot.left}px`;
      
      coinEl.addEventListener("click", (e) => {
        e.stopPropagation();
        handlePyramidSpotClick(idx);
      });
      
      board.appendChild(coinEl);
    }
  });
}

function handlePyramidSpotClick(idx) {
  if (gameState.puzzles.caesar.solved) return;

  const hasCoin = gameState.puzzles.caesar.coins.includes(idx);

  if (selectedPyramidSpot === null) {
    if (hasCoin) {
      selectedPyramidSpot = idx;
      playSound("click");
      renderCaesarPuzzle();
    }
  } else {
    if (idx === selectedPyramidSpot) {
      selectedPyramidSpot = null;
      playSound("click");
      renderCaesarPuzzle();
    } else if (hasCoin) {
      selectedPyramidSpot = idx;
      playSound("click");
      renderCaesarPuzzle();
    } else {
      const coinArr = gameState.puzzles.caesar.coins;
      const coinIndexInArr = coinArr.indexOf(selectedPyramidSpot);
      
      if (coinIndexInArr !== -1) {
        coinArr[coinIndexInArr] = idx;
        gameState.puzzles.caesar.moves++;
        selectedPyramidSpot = null;
        playSound("click");
        
        checkPyramidSolution();
        saveGame();
        renderCaesarPuzzle();
      }
    }
  }
}

function checkPyramidSolution() {
  const target = [6, 7, 8, 9, 12, 13, 14, 18, 19, 24];
  const current = gameState.puzzles.caesar.coins;
  
  const isSolved = target.every(pos => current.includes(pos));
  
  if (isSolved) {
    if (gameState.puzzles.caesar.moves <= 3) {
      playSound("success");
      gameState.puzzles.caesar.solved = true;
      saveGame();
      renderState();
      triggerSuccessAnimation("pane-caesar");
    }
  } else {
    // Si llegamos a 3 o más movimientos y no se ha resuelto
    if (gameState.puzzles.caesar.moves >= 3) {
      playSound("failure");
      showToast("¡Límite de 3 movimientos alcanzado! Reiniciando tablero...", "error");
      
      const board = document.getElementById("pyramid-board");
      if (board) board.style.pointerEvents = "none";
      
      setTimeout(() => {
        resetPyramidGameWithoutAlert();
        if (board) board.style.pointerEvents = "";
      }, 1000);
    }
  }
}

function resetPyramidGameWithoutAlert() {
  gameState.puzzles.caesar.coins = [2, 7, 8, 12, 13, 14, 17, 18, 19, 20];
  gameState.puzzles.caesar.moves = 0;
  selectedPyramidSpot = null;
  saveGame();
  renderCaesarPuzzle();
}

function resetPyramidGame() {
  playSound("click");
  resetPyramidGameWithoutAlert();
}

// ==========================================
// PRUEBA 4: El Astrolabio del Destino
// ==========================================
function renderElementsPuzzle() {
  const solvedSection = document.getElementById("elements-solved-ui");
  const activeSection = document.getElementById("elements-active-ui");
  const hintBtn = document.getElementById("hint-btn-elements");

  if (gameState.puzzles.elements.solved) {
    if (solvedSection) solvedSection.style.display = "flex";
    if (activeSection) activeSection.style.display = "none";
    if (hintBtn) hintBtn.style.display = "none";
    return;
  }

  if (solvedSection) solvedSection.style.display = "none";
  if (activeSection) activeSection.style.display = "flex";
  if (hintBtn) hintBtn.style.display = "flex";

  // Inicializar estado del astrolabio si no existe o tiene formato antiguo
  if (!gameState.puzzles.elements.astrolabe || gameState.puzzles.elements.astrolabe.length !== 4) {
    gameState.puzzles.elements.astrolabe = [1, 2, 1, 2];
    saveGame();
  }

  const board = document.getElementById("astrolabe-board");
  if (!board) return;
  board.innerHTML = "";

  // Configuración de los anillos concéntricos
  const ringsConfig = [
    { id: 1, size: 120, zIndex: 4, letters: ["A", "C", "T", "N"] },
    { id: 2, size: 200, zIndex: 3, letters: ["U", "M", "E", "P"] },
    { id: 3, size: 280, zIndex: 2, letters: ["H", "D", "O", "X"] },
    { id: 4, size: 360, zIndex: 1, letters: ["K", "Q", "J", "R"] }
  ];

  const rotations = gameState.puzzles.elements.astrolabe;

  ringsConfig.forEach((cfg, idx) => {
    const ringEl = document.createElement("div");
    ringEl.className = "astrolabe-ring";
    ringEl.style.width = `${cfg.size}px`;
    ringEl.style.height = `${cfg.size}px`;
    ringEl.style.zIndex = cfg.zIndex;
    
    // Aplicar la rotación correspondiente
    const rIndex = rotations[idx];
    ringEl.style.transform = `translate(-50%, -50%) rotate(${rIndex * 90}deg)`;

    // Crear las 4 letras distribuidas a 90 grados
    cfg.letters.forEach((char, letterIdx) => {
      const span = document.createElement("span");
      span.className = "astrolabe-ring-span";
      span.innerText = char;
      
      if (letterIdx === 0) { // Arriba
        span.style.top = "8px";
        span.style.left = "50%";
        span.style.transform = "translateX(-50%)";
      } else if (letterIdx === 1) { // Derecha
        span.style.right = "8px";
        span.style.top = "50%";
        span.style.transform = "translateY(-50%) rotate(90deg)";
      } else if (letterIdx === 2) { // Abajo
        span.style.bottom = "8px";
        span.style.left = "50%";
        span.style.transform = "translateX(-50%) rotate(180deg)";
      } else if (letterIdx === 3) { // Izquierda
        span.style.left = "8px";
        span.style.top = "50%";
        span.style.transform = "translateY(-50%) rotate(270deg)";
      }
      
      ringEl.appendChild(span);
    });

    // Event listener para rotar al hacer clic en el anillo
    ringEl.addEventListener("click", (e) => {
      e.stopPropagation();
      rotateRing(idx);
    });

    board.appendChild(ringEl);
  });

  // Núcleo central estético
  const core = document.createElement("div");
  core.style.position = "absolute";
  core.style.top = "50%";
  core.style.left = "50%";
  core.style.transform = "translate(-50%, -50%)";
  core.style.width = "40px";
  core.style.height = "40px";
  core.style.background = "radial-gradient(circle, var(--gold-bright) 0%, var(--gold-dark) 100%)";
  core.style.borderRadius = "50%";
  core.style.zIndex = "5";
  core.style.boxShadow = "0 0 15px var(--gold-bright)";
  board.appendChild(core);
}

function rotateRing(idx) {
  playSound("gear");
  const rotations = gameState.puzzles.elements.astrolabe || [1, 2, 1, 2];

  // Aplicar fricción (interlocking) entre los anillos concéntricos
  if (idx === 0) { // Anillo 1 gira a sí mismo y al Anillo 2
    rotations[0] = (rotations[0] + 1) % 4;
    rotations[1] = (rotations[1] + 1) % 4;
  }
  else if (idx === 1) { // Anillo 2 gira a sí mismo y al Anillo 3 en sentido antihorario
    rotations[1] = (rotations[1] + 1) % 4;
    rotations[2] = (rotations[2] - 1 + 4) % 4;
  }
  else if (idx === 2) { // Anillo 3 gira a sí mismo y al Anillo 4
    rotations[2] = (rotations[2] + 1) % 4;
    rotations[3] = (rotations[3] + 1) % 4;
  }
  else if (idx === 3) { // Anillo 4 gira a sí mismo y al Anillo 1 en sentido antihorario
    rotations[3] = (rotations[3] + 1) % 4;
    rotations[0] = (rotations[0] - 1 + 4) % 4;
  }

  gameState.puzzles.elements.astrolabe = rotations;
  saveGame();
  renderElementsPuzzle();
  checkAstrolabeSolution();
}

function checkAstrolabeSolution() {
  const rotations = gameState.puzzles.elements.astrolabe || [1, 2, 1, 2];
  
  // Lista de letras correspondientes
  const letters = [
    ["A", "C", "T", "N"],
    ["U", "M", "E", "P"],
    ["H", "D", "O", "X"],
    ["K", "Q", "J", "R"]
  ];

  // La letra en el tope vertical (a las 12 en punto) es la de índice (4 - R_i) % 4
  const word = [
    letters[0][(4 - rotations[0]) % 4],
    letters[1][(4 - rotations[1]) % 4],
    letters[2][(4 - rotations[2]) % 4],
    letters[3][(4 - rotations[3]) % 4]
  ].join("");

  if (word === "AMOR") {
    // Bloquear clics temporales
    const board = document.getElementById("astrolabe-board");
    if (board) board.style.pointerEvents = "none";
    
    playSound("success");
    
    // Esperar 2 segundos antes de revelar la combinación y el éxito de la sala
    setTimeout(() => {
      gameState.puzzles.elements.solved = true;
      saveGame();
      renderState();
      triggerSuccessAnimation("pane-elements");
      if (board) board.style.pointerEvents = "";
    }, 2000);
  }
}

// ==========================================
// CAJA FUERTE Y TECLADO NUMÉRICO
// ==========================================
let safeInputBuffer = "";

function renderSafeKeyboard() {
  const screen = document.getElementById("safe-screen");
  if (!screen) return;

  const door = document.getElementById("safe-door");
  const wheel = document.getElementById("safe-wheel");
  const ledRed = document.getElementById("led-red");
  const ledGreen = document.getElementById("led-green");
  const scroll = document.getElementById("victory-scroll");

  if (gameState.isFinished) {
    screen.textContent = "ABIERTO";
    screen.classList.add("success");

    if (door) door.classList.add("open");
    if (wheel) wheel.classList.add("spinning");
    if (ledRed) ledRed.classList.remove("red");
    if (ledGreen) ledGreen.classList.add("green");
    if (scroll) scroll.classList.add("unfolded");
  } else {
    // Rellenar con guiones
    screen.textContent = safeInputBuffer.padEnd(4, "-");
    screen.classList.remove("success");
    
    if (door) door.classList.remove("open");
    if (wheel) wheel.classList.remove("spinning");
    if (ledRed) ledRed.classList.remove("red");
    if (ledGreen) ledGreen.classList.remove("green");
    if (scroll) scroll.classList.remove("unfolded");
  }
}

function pressSafeKey(key) {
  if (gameState.isFinished) return;
  playSound("click");

  const ledRed = document.getElementById("led-red");
  if (ledRed) ledRed.classList.remove("red");

  if (key === 'clear') {
    safeInputBuffer = "";
    renderSafeKeyboard();
    return;
  }

  if (key === 'enter') {
    if (safeInputBuffer.length === 4) {
      verifySafeCode();
    } else {
      playSound("failure");
      triggerKeypadError();
    }
    return;
  }

  if (safeInputBuffer.length < 4) {
    safeInputBuffer += key;
    renderSafeKeyboard();
  }
}

function verifySafeCode() {
  if (safeInputBuffer === GAME_CONFIG.correctCombination) {
    // ¡VICTORIA!
    stopTimer();
    gameState.isFinished = true;
    gameState.isPlaying = false;
    saveGame();
    
    // Iniciar secuencia de sonido
    playSound("unlock");
    
    // Efectos de luces LED
    const ledGreen = document.getElementById("led-green");
    const ledRed = document.getElementById("led-red");
    if (ledGreen) ledGreen.classList.add("green");
    if (ledRed) ledRed.classList.remove("red");
    
    // Rotar rueda e iniciar 3D door swing
    const wheel = document.getElementById("safe-wheel");
    const door = document.getElementById("safe-door");
    if (wheel) wheel.classList.add("spinning");
    
    setTimeout(() => {
      if (door) door.classList.add("open");
      
      // Lanzar fuegos artificiales
      startCelebrationFireworks();
      playSound("victory");
      
      // Desplegar el pergamino
      setTimeout(() => {
        const scroll = document.getElementById("victory-scroll");
        if (scroll) scroll.classList.add("unfolded");
        
        // Rellenar estadísticas de victoria
        const timeElapsedSec = gameState.timeRemaining;
        const minutes = Math.floor(timeElapsedSec / 60);
        const seconds = timeElapsedSec % 60;
        
        document.getElementById("victory-time").textContent = `${minutes}m ${seconds}s`;
        document.getElementById("victory-hints").textContent = gameState.hintsUsed;
      }, 1500);
    }, 1500);

    renderSafeKeyboard();
  } else {
    // Código incorrecto
    playSound("failure");
    triggerKeypadError();
    safeInputBuffer = "";
    setTimeout(renderSafeKeyboard, 800);
  }
}

function verifyFinalChallenge() {
  const input1 = document.getElementById("final-input-1");
  const input2 = document.getElementById("final-input-2");
  if (!input1 || !input2) return;

  const val1 = input1.value.trim().toLowerCase();
  const val2 = input2.value.trim().toLowerCase();

  // Las respuestas correctas deben ser "rossi" y "simoncelli" en cualquier orden
  const isMatch1 = (val1 === "rossi" && val2 === "simoncelli");
  const isMatch2 = (val1 === "simoncelli" && val2 === "rossi");

  if (isMatch1 || isMatch2) {
    playSound("success");
    startCelebrationFireworks();
    
    gameState.finalChallengeSolved = true;
    saveGame();
    renderState();
  } else {
    playSound("failure");
    input1.classList.add("shaking");
    input2.classList.add("shaking");
    setTimeout(() => {
      input1.classList.remove("shaking");
      input2.classList.remove("shaking");
    }, 500);
  }
}

function triggerKeypadError() {
  const keypad = document.getElementById("keypad-box");
  const screen = document.getElementById("safe-screen");
  const ledRed = document.getElementById("led-red");
  
  if (keypad) {
    keypad.classList.add("shaking");
    setTimeout(() => keypad.classList.remove("shaking"), 500);
  }
  
  if (screen) {
    screen.style.color = "var(--red-alert)";
    screen.style.textShadow = "0 0 10px var(--red-alert)";
    setTimeout(() => {
      screen.style.color = "";
      screen.style.textShadow = "";
    }, 1000);
  }

  if (ledRed) {
    ledRed.classList.add("red");
  }
}

// Fin del juego por tiempo
function gameOver() {
  stopTimer();
  gameState.isFinished = true;
  gameState.isPlaying = false;
  saveGame();
  
  // Mostrar modal especial de tiempo agotado o adaptar el de victoria
  const title = document.querySelector(".victory-title");
  const text = document.getElementById("victory-desc-text");
  
  if (title) title.textContent = "¡Tiempo Agotado!";
  if (text) text.textContent = "¡Vaya! La música ha terminado y los invitados se han comido toda la tarta de bodas. El cofre se ha sellado para siempre...";
  
  document.getElementById("victory-time").textContent = "Límite superado";
  document.getElementById("victory-hints").textContent = gameState.hintsUsed;
  
  document.getElementById("victory-overlay").classList.remove("hidden");
}


// ==========================================
// ANIMACIONES DE ÉXITO DE LAS PRUEBAS
// ==========================================
function triggerSuccessAnimation(paneId) {
  const pane = document.getElementById(paneId);
  if (!pane) return;

  // Crear destellos de partículas temporales sobre el área del puzzle
  const rect = pane.getBoundingClientRect();
  const canvas = document.createElement("canvas");
  canvas.style.position = "absolute";
  canvas.style.top = "0";
  canvas.style.left = "0";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.pointerEvents = "none";
  canvas.style.zIndex = "100";
  pane.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  canvas.width = rect.width;
  canvas.height = rect.height;

  const particles = [];
  for (let i = 0; i < 50; i++) {
    particles.push({
      x: rect.width / 2,
      y: rect.height / 2,
      vx: (Math.random() - 0.5) * 8,
      vy: (Math.random() - 0.5) * 8 - 2,
      color: `hsl(${Math.random() * 60 + 35}, 100%, 60%)`, // Tonos dorados
      radius: Math.random() * 4 + 2,
      alpha: 1,
      decay: Math.random() * 0.02 + 0.015
    });
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let active = false;
    particles.forEach(p => {
      if (p.alpha > 0) {
        active = true;
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
        ctx.fill();
        ctx.restore();
        
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;
      }
    });

    if (active) {
      requestAnimationFrame(draw);
    } else {
      canvas.remove();
    }
  }

  draw();
}

// ==========================================
// SISTEMA DE FUEGOS ARTIFICIALES (CANVAS)
// ==========================================
let fireworksActive = false;
const fwCanvas = document.getElementById("celebration-canvas");
let fwCtx = null;
let fwParticles = [];
let fwInterval = null;

function startCelebrationFireworks() {
  if (!fwCanvas) return;
  fwCtx = fwCanvas.getContext("2d");
  fwCanvas.style.display = "block";
  fireworksActive = true;

  // Ajustar tamaño del canvas
  resizeFwCanvas();
  window.addEventListener("resize", resizeFwCanvas);

  // Bucle de renderizado
  requestAnimationFrame(drawFireworks);

  // Lanzar un cohete periódicamente
  fwInterval = setInterval(() => {
    if (fireworksActive) {
      launchRocket();
    }
  }, 800);
}

function resizeFwCanvas() {
  if (fwCanvas) {
    fwCanvas.width = window.innerWidth;
    fwCanvas.height = window.innerHeight;
  }
}

function launchRocket() {
  const startX = Math.random() * fwCanvas.width;
  const startY = fwCanvas.height;
  const targetX = Math.random() * fwCanvas.width * 0.8 + fwCanvas.width * 0.1;
  const targetY = Math.random() * fwCanvas.height * 0.5 + fwCanvas.height * 0.1;
  const speed = Math.random() * 3 + 4;
  const angle = Math.atan2(targetY - startY, targetX - startX);

  fwParticles.push({
    x: startX,
    y: startY,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    targetY: targetY,
    color: `hsl(${Math.random() * 360}, 100%, 65%)`,
    exploded: false,
    radius: 3
  });
}

function createExplosion(x, y, color) {
  const count = 80;
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 / count) * i + (Math.random() - 0.5) * 0.2;
    const speed = Math.random() * 5 + 2;
    fwParticles.push({
      x: x,
      y: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed + 0.5, // Leve gravedad
      color: color,
      radius: Math.random() * 2 + 1,
      alpha: 1,
      decay: Math.random() * 0.015 + 0.01,
      exploded: true
    });
  }
}

function drawFireworks() {
  if (!fireworksActive) return;
  requestAnimationFrame(drawFireworks);

  fwCtx.clearRect(0, 0, fwCanvas.width, fwCanvas.height);

  for (let i = fwParticles.length - 1; i >= 0; i--) {
    const p = fwParticles[i];

    if (!p.exploded) {
      // Cohete subiendo
      fwCtx.beginPath();
      fwCtx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      fwCtx.fillStyle = "#fff";
      fwCtx.shadowBlur = 10;
      fwCtx.shadowColor = p.color;
      fwCtx.fill();

      p.x += p.vx;
      p.y += p.vy;

      if (p.vy >= 0 || p.y <= p.targetY) {
        // Explotar
        p.exploded = true;
        createExplosion(p.x, p.y, p.color);
        // Pequeño sonido amortiguado de petardo
        if (gameState.soundEnabled && audioCtx) {
          const now = audioCtx.currentTime;
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(100 + Math.random() * 100, now);
          gain.gain.setValueAtTime(0.04, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(now);
          osc.stop(now + 0.16);
        }
      }
    } else {
      // Chispas de la explosión
      if (p.alpha > 0) {
        fwCtx.save();
        fwCtx.globalAlpha = p.alpha;
        fwCtx.beginPath();
        fwCtx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        fwCtx.fillStyle = p.color;
        fwCtx.shadowBlur = 5;
        fwCtx.shadowColor = p.color;
        fwCtx.fill();
        fwCtx.restore();

        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.04; // Gravedad
        p.alpha -= p.decay;
      } else {
        fwParticles.splice(i, 1);
      }
    }
  }
}

function stopFireworks() {
  fireworksActive = false;
  if (fwInterval) clearInterval(fwInterval);
  if (fwCanvas) fwCanvas.style.display = "none";
  fwParticles = [];
  window.removeEventListener("resize", resizeFwCanvas);
}


// ==========================================
// INTERFAZ DE HINTS (MODALES)
// ==========================================
let currentHintRoom = "";

function openHintsModal(room) {
  playSound("failure"); // Sonido de sorpresa
  const monoOverlay = document.getElementById("mono-overlay");
  if (monoOverlay) {
    monoOverlay.classList.remove("hidden");
  }
}

function setupHintBox(level, room) {
  const button = document.getElementById(`hint-btn-lv${level}`);
  const text = document.getElementById(`hint-text-lv${level}`);
  const openedLevel = gameState.hintLevelsOpened[room];

  if (openedLevel >= level) {
    // Ya revelada anteriormente
    button.style.display = "none";
    text.textContent = PUZZLE_HINTS[room][level - 1];
    text.style.display = "block";
  } else {
    // Por revelar
    button.style.display = "block";
    text.style.display = "none";
    button.textContent = `Revelar Pista ${level}`;
  }
}

function revealHint(level) {
  playSound("click");
  const room = currentHintRoom;
  
  // Guardar en el estado que se abrió esta pista
  gameState.hintLevelsOpened[room] = level;
  gameState.hintsUsed++;
  saveGame();

  const button = document.getElementById(`hint-btn-lv${level}`);
  const text = document.getElementById(`hint-text-lv${level}`);

  button.style.display = "none";
  text.textContent = PUZZLE_HINTS[room][level - 1];
  text.style.display = "block";
}

function closeHintsModal() {
  playSound("click");
  document.getElementById("hints-modal").classList.remove("active");
}


// ==========================================
// CONTROLES DE LA PARTIDA Y EVENTOS BASE
// ==========================================


function startAdventure() {
  initAudio();
  gameState.isPlaying = true;
  gameState.currentRoom = "riddle";
  saveGame();
  
  renderState();
  startTimer();
  
  // Activar música por defecto en el primer clic
  gameState.soundEnabled = true;
  saveGame();
  renderState();
}

function toggleSound() {
  gameState.soundEnabled = !gameState.soundEnabled;
  saveGame();
  renderState();
  playSound("click");
}

function restartAdventure() {
  if (confirm("¿Estás seguro de que deseas reiniciar toda la aventura? Se perderá tu progreso actual.")) {
    stopFireworks();
    resetGameData();
    location.reload();
  }
}

// Inicialización global cuando el DOM está listo
document.addEventListener("DOMContentLoaded", () => {
  const loaded = loadGame();
  if (loaded) {
    if (gameState.isPlaying) {
      startTimer();
    }
  }

  // Vincular eventos
  document.getElementById("btn-start-adventure").addEventListener("click", startAdventure);
  document.getElementById("sound-toggle").addEventListener("click", toggleSound);
  document.getElementById("reset-btn").addEventListener("click", restartAdventure);
  
  // Navegación lateral
  const roomButtons = [
    { id: "nav-riddle", room: "riddle" },
    { id: "nav-study", room: "study" },
    { id: "nav-caesar", room: "caesar" },
    { id: "nav-elements", room: "elements" },
    { id: "nav-safe", room: "safe" }
  ];

  roomButtons.forEach(btnInfo => {
    const btn = document.getElementById(btnInfo.id);
    if (btn) {
      btn.addEventListener("click", () => {
        if (isRoomLocked(btnInfo.room)) {
          playSound("failure");
          
          let message = "";
          if (btnInfo.room === "safe") {
            message = "¡Objetivo bloqueado! Debes resolver todas las salas anteriores.";
          } else {
            let prevRoomName = "";
            if (btnInfo.room === "study") prevRoomName = "la Sala I (El Acertijo)";
            if (btnInfo.room === "caesar") prevRoomName = "la Sala II (Marcianitos)";
            if (btnInfo.room === "elements") prevRoomName = "la Sala III (La Pirámide)";
            message = `¡Sala bloqueada! Resuelve primero ${prevRoomName}.`;
          }
          
          showToast(message, "error");
          
          // Efecto de vibración
          btn.classList.add("shake-nav");
          setTimeout(() => {
            btn.classList.remove("shake-nav");
          }, 400);
        } else {
          switchRoom(btnInfo.room);
        }
      });
    }
  });

  // Prueba 1
  const checkSongBtn = document.getElementById("btn-check-song");
  if (checkSongBtn) {
    checkSongBtn.addEventListener("click", checkRiddleSong);
  }
  const inputSong = document.getElementById("riddle-input-song");
  if (inputSong) {
    inputSong.addEventListener("keypress", (e) => {
      if (e.key === 'Enter') checkRiddleSong();
    });
  }

  const checkNumBtn = document.getElementById("btn-check-number");
  if (checkNumBtn) {
    checkNumBtn.addEventListener("click", checkRiddleNumber);
  }
  const inputNum = document.getElementById("riddle-input-number");
  if (inputNum) {
    inputNum.addEventListener("keypress", (e) => {
      if (e.key === 'Enter') checkRiddleNumber();
    });
  }

  // Pistas modales
  document.getElementById("hint-btn-riddle").addEventListener("click", () => openHintsModal("riddle"));
  document.getElementById("hint-btn-study").addEventListener("click", () => openHintsModal("study"));
  document.getElementById("hint-btn-caesar").addEventListener("click", () => openHintsModal("caesar"));
  document.getElementById("hint-btn-elements").addEventListener("click", () => openHintsModal("elements"));
  
  document.getElementById("hint-btn-lv1").addEventListener("click", () => revealHint(1));
  document.getElementById("hint-btn-lv2").addEventListener("click", () => revealHint(2));
  document.getElementById("hints-modal-close").addEventListener("click", closeHintsModal);

  // Prueba 2 (Lanzador y validación de Maya Invaders)
  const playBtnGame = document.getElementById("btn-play-game");
  if (playBtnGame) {
    playBtnGame.addEventListener("click", () => {
      playSound("click");
      // Cargar como imagen para saltarse las restricciones CORS de file:/// en navegadores modernos
      const img = new Image();
      img.onload = () => {
        // En cuanto el juego se cierre, forzar una comprobación de puntuación inmediata
        checkRemoteScores();
      };
      img.src = 'http://localhost:8082/launch-game?nocache=' + Date.now();
    });
  }

  const checkStudyBtn = document.getElementById("btn-check-study");
  if (checkStudyBtn) {
    checkStudyBtn.addEventListener("click", checkStudyNumber);
  }
  const inputStudy = document.getElementById("study-input-number");
  if (inputStudy) {
    inputStudy.addEventListener("keypress", (e) => {
      if (e.key === 'Enter') checkStudyNumber();
    });
  }

  // Pirámide de Monedas
  const resetPyramidBtn = document.getElementById("btn-reset-pyramid");
  if (resetPyramidBtn) {
    resetPyramidBtn.addEventListener("click", resetPyramidGame);
  }

  // Astrolabio
  const resetAstrolabeBtn = document.getElementById("btn-reset-astrolabe");
  if (resetAstrolabeBtn) {
    resetAstrolabeBtn.addEventListener("click", () => {
      playSound("click");
      gameState.puzzles.elements.astrolabe = [1, 2, 1, 2];
      saveGame();
      renderElementsPuzzle();
    });
  }

  // Caja fuerte teclado
  const keys = document.querySelectorAll(".key-btn");
  keys.forEach(key => {
    const keyValue = key.getAttribute("data-key");
    key.addEventListener("click", () => pressSafeKey(keyValue));
  });

  // Botón reiniciar en overlay de victoria
  document.getElementById("victory-reset-btn").addEventListener("click", () => {
    document.getElementById("victory-overlay").classList.add("hidden");
    stopFireworks();
    resetGameData();
    renderState();
  });

  // Botón para finalizar aventura en el pergamino
  const showVictoryBtn = document.getElementById("btn-show-victory");
  if (showVictoryBtn) {
    showVictoryBtn.addEventListener("click", () => {
      document.getElementById("victory-overlay").classList.remove("hidden");
    });
  }

  // Último Reto: Rossi y Simoncelli
  const verifyFinalBtn = document.getElementById("btn-verify-final");
  if (verifyFinalBtn) {
    verifyFinalBtn.addEventListener("click", verifyFinalChallenge);
  }
  const finalInput1 = document.getElementById("final-input-1");
  const finalInput2 = document.getElementById("final-input-2");
  if (finalInput1) {
    finalInput1.addEventListener("keypress", (e) => {
      if (e.key === 'Enter') verifyFinalChallenge();
    });
  }
  if (finalInput2) {
    finalInput2.addEventListener("keypress", (e) => {
      if (e.key === 'Enter') verifyFinalChallenge();
    });
  }

  // Soporte para entrada física de teclado en la caja fuerte
  document.addEventListener("keydown", (e) => {
    // Solo actuar si están en la sala de la caja fuerte y no está ya abierta
    if (gameState.currentRoom !== "safe" || gameState.isFinished) return;
    
    // Evitar interceptar si se está escribiendo en algún input activo (por si acaso)
    if (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA") return;

    const key = e.key;
    if (key >= '0' && key <= '9') {
      pressSafeKey(key);
    } else if (key === 'Backspace' || key === 'Delete') {
      pressSafeKey('clear');
    } else if (key === 'Enter') {
      pressSafeKey('enter');
    }
  });

  // Easter egg del mono - Cerrar al hacer clic en cualquier parte de la pantalla
  const monoOverlay = document.getElementById("mono-overlay");
  if (monoOverlay) {
    monoOverlay.addEventListener("click", () => {
      monoOverlay.classList.add("hidden");
    });
  }

  // === CONTROLADOR DEL REPRODUCTOR DE AUDIO DE AMOR ===
  const audioCannon = document.getElementById("audio-cannon");
  const playAudioBtn = document.getElementById("btn-play-audio");
  const progressBar = document.getElementById("player-progress-bar");
  const progressContainer = document.getElementById("player-progress-container");
  const timeDisplay = document.getElementById("player-time");

  if (audioCannon && playAudioBtn) {
    playAudioBtn.addEventListener("click", () => {
      if (audioCannon.paused) {
        audioCannon.play();
        playAudioBtn.classList.add("playing");
      } else {
        audioCannon.pause();
        playAudioBtn.classList.remove("playing");
      }
    });

    audioCannon.addEventListener("timeupdate", () => {
      if (audioCannon.duration) {
        const pct = (audioCannon.currentTime / audioCannon.duration) * 100;
        progressBar.style.width = `${pct}%`;
        
        const curMins = Math.floor(audioCannon.currentTime / 60).toString().padStart(2, '0');
        const curSecs = Math.floor(audioCannon.currentTime % 60).toString().padStart(2, '0');
        const durMins = Math.floor(audioCannon.duration / 60).toString().padStart(2, '0');
        const durSecs = Math.floor(audioCannon.duration % 60).toString().padStart(2, '0');
        timeDisplay.textContent = `${curMins}:${curSecs} / ${durMins}:${durSecs}`;
      }
    });

    audioCannon.addEventListener("loadedmetadata", () => {
      const durMins = Math.floor(audioCannon.duration / 60).toString().padStart(2, '0');
      const durSecs = Math.floor(audioCannon.duration % 60).toString().padStart(2, '0');
      timeDisplay.textContent = `00:00 / ${durMins}:${durSecs}`;
    });

    if (progressContainer) {
      progressContainer.addEventListener("click", (e) => {
        const rect = progressContainer.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const width = rect.width;
        const pct = clickX / width;
        audioCannon.currentTime = pct * audioCannon.duration;
      });
    }

    audioCannon.addEventListener("ended", () => {
      playAudioBtn.classList.remove("playing");
      progressBar.style.width = "0%";
    });
  }

  // Renderizar estado inicial
  renderState();
});
