import { getEventBus, GameEvents } from '../core/EventBus.js';
import { getStateManager } from '../core/StateManager.js';

/**
 * AudioSystem - Handles all game audio (sound effects, music)
 * Uses Web Audio API for dynamic sound generation
 */
export class AudioSystem {
    constructor() {
        this.eventBus = getEventBus();
        this.stateManager = getStateManager();
        
        // Audio context and state
        this.context = null;
        this.enabled = false;
        this.masterVolume = 0.3;           // SFX master
        this.musicMaster = 0.9;            // Music master (separate from SFX)
        this.sounds = {};
        
        // Music/Radio state
        this.music = {
            enabled: false,
            volume: 0.6,
            trackIndex: 0,
            trackNames: ['Drift', 'Pulse', 'Nebula'],
            interval: null,
            nodes: [],
            mode: 'synth', // legacy hint; actual playback determined per track
            playlist: [],
            audio: null,
            tracker: { player: null, playing: false },
            forceSynth: false,
        };
        
        // Bind event handlers
        this.handleToggleSound = this.handleToggleSound.bind(this);
        this.handlePlaySound = this.handlePlaySound.bind(this);
        this.handleWeaponFire = this.handleWeaponFire.bind(this);
        this.handleExplosion = this.handleExplosion.bind(this);
        this.handleCollision = this.handleCollision.bind(this);
        this.handleThrust = this.handleThrust.bind(this);
        this.handlePickup = this.handlePickup.bind(this);
        this.handleLanding = this.handleLanding.bind(this);
        
        // Bind sound methods to preserve context when called through proxy
        this.playLaser = this.playLaser.bind(this);
        this.playExplosion = this.playExplosion.bind(this);
        this.playThrust = this.playThrust.bind(this);
        this.playShieldHit = this.playShieldHit.bind(this);
        this.playPickup = this.playPickup.bind(this);
        this.playLanding = this.playLanding.bind(this);
        
        console.log('[AudioSystem] Created');
    }
    
    /**
     * Initialize the audio system
     */
    init() {
        try {
            // Create audio context
            this.context = new (window.AudioContext || window.webkitAudioContext)();
            
            // Resume context on first user interaction
            document.addEventListener('click', () => {
                if (this.context && this.context.state === 'suspended') {
                    this.context.resume();
                }
            }, { once: true });
            
            // Subscribe to audio events
            this.subscribeToEvents();
            
            // Sync initial state
            this.syncState();
            // Initialize music volume from state if present
            const audioState = this.stateManager.state.audio || {};
            if (typeof audioState.musicVolume === 'number') {
                this.music.volume = Math.max(0, Math.min(1, audioState.musicVolume));
            }
            // Try to load external playlist (optional)
            this.tryLoadPlaylist();

            // Emit initial UI state for radio
            this.emitMusicState();
            
            console.log('[AudioSystem] Initialized with Web Audio API');
        } catch (e) {
            console.log('[AudioSystem] Web Audio API not supported:', e);
            this.enabled = false;
        }
    }

    async tryLoadPlaylist() {
        try {
            const mod = await import('../data/radioPlaylist.js');
            const list = (mod && mod.radioPlaylist) || [];
            if (Array.isArray(list) && list.length > 0) {
                this.music.playlist = list.slice();
                this.music.trackNames = list.map(t => t.name || 'Track');
                console.log('[AudioSystem] Radio playlist loaded:', this.music.trackNames);
                this.emitMusicState();
            } else {
                console.log('[AudioSystem] No external radio playlist; using synth.');
            }
        } catch (e) {
            console.log('[AudioSystem] Playlist module not found; using synth radio');
        }
    }
    
    /**
     * Subscribe to game events
     */
    subscribeToEvents() {
        // System events
        this.eventBus.on(GameEvents.AUDIO_TOGGLE, this.handleToggleSound);
        this.eventBus.on(GameEvents.AUDIO_PLAY, this.handlePlaySound);
        
        // Combat events
        this.eventBus.on(GameEvents.WEAPON_FIRED, this.handleWeaponFire);
        this.eventBus.on(GameEvents.ENTITY_DESTROYED, this.handleExplosion);
        this.eventBus.on(GameEvents.PROJECTILE_HIT, this.handleCollision);
        
        // Ship events
        this.eventBus.on(GameEvents.SHIP_THRUST, this.handleThrust);
        this.eventBus.on(GameEvents.SHIP_LANDED, this.handleLanding);
        this.eventBus.on(GameEvents.PICKUP_COLLECTED, this.handlePickup);
        this.eventBus.on(GameEvents.SHIELD_HIT, this.handleShieldHit.bind(this));

        // Music/Radio controls
        this.eventBus.on(GameEvents.AUDIO_MUSIC_TOGGLE, () => {
            if (this.music.enabled) this.pauseMusic(); else this.playMusic();
        });
        this.eventBus.on(GameEvents.AUDIO_MUSIC_PLAY, () => this.playMusic());
        this.eventBus.on(GameEvents.AUDIO_MUSIC_PAUSE, () => this.pauseMusic());
        this.eventBus.on(GameEvents.AUDIO_MUSIC_NEXT, () => this.nextTrack());
        this.eventBus.on(GameEvents.AUDIO_MUSIC_PREV, () => this.prevTrack());
        this.eventBus.on(GameEvents.AUDIO_MUSIC_VOLUME, (d) => this.setMusicVolume((d && d.volume) ?? this.music.volume));
    }
    
    /**
     * Handle toggle sound event
     */
    handleToggleSound() {
        this.enabled = !this.enabled;
        this.syncState();
        
        // Emit state change (SFX only)
        this.eventBus.emit(GameEvents.AUDIO_STATE_CHANGED, { enabled: this.enabled });
        // Do not pause music when SFX are disabled
        
        console.log('[AudioSystem] Sound', this.enabled ? 'enabled' : 'disabled');
    }
    
    /**
     * Handle generic play sound event
     */
    handlePlaySound(data) {
        if (!data || !data.sound) return;
        
        switch(data.sound) {
            case 'laser':
                this.playLaser(data.type || 'laser');
                break;
            case 'explosion':
                this.playExplosion(data.small || false);
                break;
            case 'thrust':
                this.playThrust();
                break;
            case 'shield':
                this.playShieldHit();
                break;
            case 'pickup':
                this.playPickup();
                break;
            case 'landing':
                this.playLanding();
                break;
        }
    }
    
    /**
     * Handle weapon fire event
     */
    handleWeaponFire(data) {
        if (!data || !data.weapon) return;
        this.playLaser(data.weapon.type || 'laser');
    }
    
    /**
     * Handle explosion event
     */
    handleExplosion(data) {
        const small = data && data.size === 'small';
        this.playExplosion(small);
    }
    
    /**
     * Handle collision event
     */
    handleCollision(data) {
        if (data && data.shield) {
            this.playShieldHit();
        } else {
            this.playExplosion(true);
        }
    }
    
    /**
     * Handle thrust event
     */
    handleThrust(data) {
        if (data && data.active) {
            this.playThrust();
        }
    }
    
    /**
     * Handle pickup collection event
     */
    handlePickup(data) {
        this.playPickup();
    }
    
    /**
     * Handle landing event
     */
    handleLanding(data) {
        this.playLanding();
    }
    
    /**
     * Handle shield hit event
     */
    handleShieldHit(data) {
        this.playShieldHit();
    }
    
    /**
     * Play laser sound effect
     */
    playLaser(type = 'laser') {
        if (!this.enabled || !this.context) return;
        
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();
        
        osc.connect(gain);
        gain.connect(this.context.destination);
        
        if (type === 'mining') {
            osc.frequency.setValueAtTime(200, this.context.currentTime);
            osc.frequency.exponentialRampToValueAtTime(100, this.context.currentTime + 0.1);
            gain.gain.setValueAtTime(0.1 * this.masterVolume, this.context.currentTime);
        } else if (type === 'rapid') {
            osc.frequency.setValueAtTime(800, this.context.currentTime);
            osc.frequency.exponentialRampToValueAtTime(400, this.context.currentTime + 0.05);
            gain.gain.setValueAtTime(0.15 * this.masterVolume, this.context.currentTime);
        } else if (type === 'plasma') {
            osc.frequency.setValueAtTime(150, this.context.currentTime);
            osc.frequency.exponentialRampToValueAtTime(50, this.context.currentTime + 0.2);
            gain.gain.setValueAtTime(0.25 * this.masterVolume, this.context.currentTime);
        } else {
            osc.frequency.setValueAtTime(600, this.context.currentTime);
            osc.frequency.exponentialRampToValueAtTime(200, this.context.currentTime + 0.1);
            gain.gain.setValueAtTime(0.15 * this.masterVolume, this.context.currentTime);
        }
        
        gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.2);
        
        osc.start();
        osc.stop(this.context.currentTime + 0.2);
    }
    
    /**
     * Play explosion sound effect
     */
    playExplosion(small = false) {
        if (!this.enabled || !this.context) return;
        
        const noise = this.context.createBufferSource();
        const buffer = this.context.createBuffer(1, this.context.sampleRate * 0.3, this.context.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < buffer.length; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / buffer.length, 2);
        }
        
        noise.buffer = buffer;
        
        const gain = this.context.createGain();
        const filter = this.context.createBiquadFilter();
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(small ? 800 : 400, this.context.currentTime);
        
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.context.destination);
        
        gain.gain.setValueAtTime(small ? 0.2 : 0.4 * this.masterVolume, this.context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.3);
        
        noise.start();
    }
    
    /**
     * Play thrust sound effect
     */
    playThrust() {
        if (!this.enabled || !this.context) return;
        if (this.sounds.thrustTimeout) return;
        
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();
        const filter = this.context.createBiquadFilter();
        
        osc.type = 'triangle';
        filter.type = 'lowpass';
        filter.frequency.value = 400;
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.context.destination);
        
        osc.frequency.setValueAtTime(60, this.context.currentTime);
        osc.frequency.exponentialRampToValueAtTime(80, this.context.currentTime + 0.1);
        
        gain.gain.setValueAtTime(0, this.context.currentTime);
        gain.gain.linearRampToValueAtTime(0.05 * this.masterVolume, this.context.currentTime + 0.05);
        gain.gain.linearRampToValueAtTime(0.03 * this.masterVolume, this.context.currentTime + 0.15);
        gain.gain.linearRampToValueAtTime(0, this.context.currentTime + 0.2);
        
        osc.start();
        osc.stop(this.context.currentTime + 0.2);
        
        this.sounds.thrustTimeout = setTimeout(() => {
            this.sounds.thrustTimeout = null;
        }, 150);
    }
    
    /**
     * Play shield hit sound effect
     */
    playShieldHit() {
        if (!this.enabled || !this.context) return;
        
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();
        
        osc.connect(gain);
        gain.connect(this.context.destination);
        
        osc.frequency.setValueAtTime(2000, this.context.currentTime);
        osc.frequency.exponentialRampToValueAtTime(500, this.context.currentTime + 0.1);
        
        gain.gain.setValueAtTime(0.1 * this.masterVolume, this.context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.1);
        
        osc.start();
        osc.stop(this.context.currentTime + 0.1);
    }
    
    /**
     * Play pickup sound effect
     */
    playPickup() {
        if (!this.enabled || !this.context) return;
        
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();
        
        osc.connect(gain);
        gain.connect(this.context.destination);
        
        osc.frequency.setValueAtTime(400, this.context.currentTime);
        osc.frequency.setValueAtTime(600, this.context.currentTime + 0.05);
        osc.frequency.setValueAtTime(800, this.context.currentTime + 0.1);
        
        gain.gain.setValueAtTime(0.15 * this.masterVolume, this.context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.15);
        
        osc.start();
        osc.stop(this.context.currentTime + 0.15);
    }
    
    /**
     * Play landing sound effect
     */
    playLanding() {
        if (!this.enabled || !this.context) return;
        
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();
        
        osc.connect(gain);
        gain.connect(this.context.destination);
        
        osc.frequency.setValueAtTime(200, this.context.currentTime);
        osc.frequency.linearRampToValueAtTime(100, this.context.currentTime + 0.5);
        
        gain.gain.setValueAtTime(0.2 * this.masterVolume, this.context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.5);
        
        osc.start();
        osc.stop(this.context.currentTime + 0.5);
    }
    
    /**
     * Update audio system (called each frame)
     */
    update(state, deltaTime) {
        // Audio system doesn't need per-frame updates
        // All sounds are triggered by events
    }
    
    /**
     * Sync audio state to StateManager
     */
    syncState() {
        const audioState = this.stateManager.state.audio;
        audioState.enabled = this.enabled;
        audioState.masterVolume = this.masterVolume;
    }
    
    /**
     * Set master volume
     */
    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        this.syncState();
    }

    // ===== Music/Radio =====
    emitMusicState() {
        const playing = this.music.enabled && (
            !!this.music.interval ||
            !!(this.music.audio && !this.music.audio.paused) ||
            !!(this.music.tracker && this.music.tracker.playing)
        );
        this.eventBus.emit(GameEvents.AUDIO_MUSIC_STATE, {
            playing,
            track: this.music.trackNames[this.music.trackIndex] || 'RADIO',
            volume: this.music.volume
        });
    }

    setMusicVolume(v) {
        this.music.volume = Math.max(0, Math.min(1, v));
        // Persist to state
        const audioState = this.stateManager.state.audio || {};
        audioState.musicVolume = this.music.volume;
        this.stateManager.state.audio = audioState;
        if (this.music.audio) {
            try { this.music.audio.volume = this.music.volume * this.musicMaster; } catch(_) {}
        }
        if (this.music.tracker && this.music.tracker.player && this.music.tracker.player.setVolume) {
            try { this.music.tracker.player.setVolume(this.music.volume * this.musicMaster); } catch(_) {}
        }
        if (this.music.nodes) {
            for (const n of this.music.nodes) {
                if (n && n.gain) n.gain.gain.setValueAtTime(this.music.volume * this.musicMaster, this.context.currentTime);
            }
        }
        this.emitMusicState();
    }

    // Short tuning noise between tracks
    playRadioTuningCue(durationMs = 200) {
        try {
            if (!this.context) return;
            const ctx = this.context;
            const length = Math.max(1, Math.floor(ctx.sampleRate * (durationMs / 1000)));
            const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < length; i++) {
                // white noise with slight tilt
                data[i] = (Math.random() * 2 - 1) * (1 - i / length);
            }
            const src = ctx.createBufferSource();
            src.buffer = buffer;
            const bp = ctx.createBiquadFilter();
            bp.type = 'bandpass';
            bp.frequency.value = 1400;
            bp.Q.value = 0.7;
            const gn = ctx.createGain();
            gn.gain.setValueAtTime(0.0, ctx.currentTime);
            gn.gain.linearRampToValueAtTime(0.18 * this.music.volume * this.musicMaster, ctx.currentTime + 0.02);
            gn.gain.linearRampToValueAtTime(0.0, ctx.currentTime + durationMs / 1000);
            src.connect(bp); bp.connect(gn); gn.connect(ctx.destination);
            src.start();
            src.stop(ctx.currentTime + durationMs / 1000);
        } catch (_) {}
    }

    playStream(itemParam = null) {
        try {
            const list = this.music.playlist;
            const item = itemParam || ((list && list.length) ? list[(this.music.trackIndex % list.length + list.length) % list.length] : null);
            if (!item) { this.playMusic(); return; }
            if (this.music.audio) { try { this.music.audio.pause(); } catch(_) {} }
            const audio = new Audio(item.url);
            audio.crossOrigin = 'anonymous';
            audio.loop = true;
            audio.volume = this.music.volume * this.musicMaster;
            audio.addEventListener('canplay', () => {
                try { audio.play(); } catch(_) {}
            });
            this.music.audio = audio;
            this.emitMusicState();
        } catch (e) {
            console.warn('[AudioSystem] Stream failed, falling back to synth', e);
            this.playMusic();
        }
    }

    async ensureChiptune() {
        if (window.ChiptuneJsPlayer) return true;

        const tryLoadScript = (src, wasmBase = null) => new Promise((resolve) => {
            try {
                if (wasmBase) {
                    // Hint to Emscripten where to fetch the wasm from
                    window.Module = { locateFile: (path) => `${wasmBase}/${path}` };
                }
                const s = document.createElement('script');
                s.src = src;
                s.async = true;
                s.onload = () => resolve(!!window.ChiptuneJsPlayer);
                s.onerror = () => resolve(false);
                document.head.appendChild(s);
            } catch (_) { resolve(false); }
        });
        const tryImportModule = async (src) => {
            try {
                const mod = await import(src);
                const Player = mod?.ChiptuneJsPlayer || mod?.default?.ChiptuneJsPlayer || mod?.default;
                if (Player) {
                    window.ChiptuneJsPlayer = Player;
                    return true;
                }
            } catch (_) {}
            return false;
        };

        // Try a series of sources: local vendor, then multiple CDNs (chiptune2 then chiptune3)
        // 1) Local ESM chiptune3 via dynamic import (absolute from site root)
        if (await tryImportModule('/chiptune-3/chiptune3.min.js')) return true;
        if (await tryImportModule('/chiptune-3/chiptune3.js')) return true;
        // 2) Local vendor UMD chiptune2/chiptune3 via script tag
        if (await tryLoadScript('./js/vendor/chiptune2.js', './js/vendor')) return true;
        if (await tryLoadScript('./js/vendor/chiptune3.js', './js/vendor')) return true;
        // 3) CDN fallbacks
        if (await tryLoadScript('https://cdn.jsdelivr.net/npm/chiptune2@2.4.1/dist/chiptune2.js', 'https://cdn.jsdelivr.net/npm/chiptune2@2.4.1/dist')) return true;
        if (await tryLoadScript('https://unpkg.com/chiptune2@2.4.1/dist/chiptune2.js', 'https://unpkg.com/chiptune2@2.4.1/dist')) return true;
        if (await tryImportModule('https://cdn.jsdelivr.net/gh/DrSnuggles/chiptune/dist/chiptune.min.js')) return true;
        if (await tryImportModule('https://unpkg.com/chiptune@latest/dist/chiptune.min.js')) return true;
        return false;
    }

    async playTracker(item) {
        try {
            const ok = await this.ensureChiptune();
            if (!ok || !window.ChiptuneJsPlayer) {
                console.warn('[AudioSystem] Tracker lib unavailable; falling back to synth');
                this.music.forceSynth = true;
                return this.playMusic();
            }
            const t = this.music.tracker || (this.music.tracker = { player: null, playing: false });
            if (!t.player) {
                t.player = new window.ChiptuneJsPlayer({ repeatCount: 0 });
                try { t.player.onEnded(() => { if (this.music.enabled) this.playTracker(item); }); } catch(_) {}
            }
            try { t.player.stop(); } catch(_) {}
            // Set volume using either setVol (chiptune3) or setVolume (chiptune2)
            const vol = this.music.volume * this.musicMaster;
            try {
                if (typeof t.player.setVol === 'function') t.player.setVol(vol);
                else if (typeof t.player.setVolume === 'function') t.player.setVolume(vol);
            } catch(_) {}
            // Load and play from URL (chiptune3 supports load(url) which fetches and plays)
            if (typeof t.player.load === 'function') {
                t.player.load(item.url);
                t.playing = true;
                this.emitMusicState();
            } else {
                console.warn('[AudioSystem] Tracker player lacks load(); falling back to synth');
                this.music.forceSynth = true;
                this.playMusic();
            }
        } catch (e) {
            console.warn('[AudioSystem] Tracker play failed; falling back to synth', e);
            this.music.forceSynth = true;
            this.playMusic();
        }
    }

    playMusic() {
        if (!this.context) return;
        if (this.music.interval || this.music.audio || (this.music.tracker && this.music.tracker.playing)) return;
        this.music.enabled = true;

        // Playlist selection
        const list = this.music.playlist || [];
        if (!this.music.forceSynth && list.length > 0) {
            const idx = (this.music.trackIndex % list.length + list.length) % list.length;
            const item = list[idx];
            const type = (item && item.type) || 'stream';
            if (type === 'tracker') { this.playTracker(item); return; }
            if (type === 'stream')  { this.playStream(item);  return; }
        }
        // Fallback: Create simple synth nodes for a pad + lead
        const padOsc = this.context.createOscillator();
        const padGain = this.context.createGain();
        const padFilter = this.context.createBiquadFilter();
        padOsc.type = 'sine';
        padFilter.type = 'lowpass';
        padFilter.frequency.value = 600;
        padOsc.connect(padFilter); padFilter.connect(padGain); padGain.connect(this.context.destination);
        padGain.gain.setValueAtTime(0.0, this.context.currentTime);
        padGain.gain.linearRampToValueAtTime(0.20 * this.music.volume * this.musicMaster, this.context.currentTime + 0.2);
        padOsc.start();

        const leadOsc = this.context.createOscillator();
        const leadGain = this.context.createGain();
        leadOsc.type = 'triangle';
        leadOsc.connect(leadGain); leadGain.connect(this.context.destination);
        leadGain.gain.setValueAtTime(0.0, this.context.currentTime);
        leadGain.gain.linearRampToValueAtTime(0.16 * this.music.volume * this.musicMaster, this.context.currentTime + 0.2);
        leadOsc.start();

        this.music.nodes = [ { osc: padOsc, gain: padGain }, { osc: leadOsc, gain: leadGain } ];

        // Note patterns per track (ethereal/tracker-like arps)
        const tracks = [
            { name: 'Drift',  notes: [220, 277.2, 329.6, 415.3, 329.6, 277.2] },
            { name: 'Pulse',  notes: [246.9, 293.7, 370.0, 440.0, 370.0, 293.7] },
            { name: 'Nebula', notes: [207.7, 261.6, 311.1, 392.0, 311.1, 261.6] }
        ];
        const current = tracks[this.music.trackIndex % tracks.length];
        this.music.trackNames = tracks.map(t => t.name);

        let step = 0;
        // Lightweight interval sequencer with slight jitter
        this.music.interval = setInterval(() => {
            if (!this.music.enabled) return; // paused
            const note = current.notes[step % current.notes.length];
            // Pad slowly glides with subtle randomization
            const padNote = (note / 2) * (1 + (Math.random()-0.5)*0.02);
            padOsc.frequency.exponentialRampToValueAtTime(padNote, this.context.currentTime + 0.2);
            // Lead steps with tiny vibrato
            leadOsc.frequency.setValueAtTime(note, this.context.currentTime);
            try {
                leadOsc.frequency.linearRampToValueAtTime(note * 1.01, this.context.currentTime + 0.1);
                leadOsc.frequency.linearRampToValueAtTime(note, this.context.currentTime + 0.2);
            } catch(_) {}
            step++;
        }, 520);

        this.emitMusicState();
    }

    pauseMusic() {
        this.music.enabled = false;
        if (this.music.interval) {
            clearInterval(this.music.interval);
            this.music.interval = null;
        }
        if (this.music.audio) {
            try { this.music.audio.pause(); } catch(_) {}
            this.music.audio = null;
        }
        if (this.music.tracker && this.music.tracker.player) {
            try { this.music.tracker.player.stop(); } catch(_) {}
            this.music.tracker.playing = false;
        }
        for (const n of this.music.nodes) {
            try { n.gain.gain.exponentialRampToValueAtTime(0.0001, this.context.currentTime + 0.2); } catch(_) {}
            try { n.osc.stop(this.context.currentTime + 0.25); } catch(_) {}
        }
        this.music.nodes = [];
        this.emitMusicState();
    }

    nextTrack() {
        const len = this.music.trackNames.length || 1;
        this.music.trackIndex = (this.music.trackIndex + 1) % len;
        if (this.music.enabled) {
            this.pauseMusic();
            this.playRadioTuningCue(660);
            setTimeout(() => this.playMusic(), 660);
        }
    }

    prevTrack() {
        const len = this.music.trackNames.length || 1;
        this.music.trackIndex = (this.music.trackIndex - 1 + len) % len;
        if (this.music.enabled) {
            this.pauseMusic();
            this.playRadioTuningCue(660);
            setTimeout(() => this.playMusic(), 660);
        }
    }
    
    /**
     * Check if audio is enabled
     */
    isEnabled() {
        return this.enabled && this.context !== null;
    }
    
    /**
     * Clean up audio system
     */
    destroy() {
        // Clear any timeouts
        if (this.sounds.thrustTimeout) {
            clearTimeout(this.sounds.thrustTimeout);
        }
        
        // Close audio context
        if (this.context) {
            this.context.close();
            this.context = null;
        }
        
        // Unsubscribe from events
        this.eventBus.off(GameEvents.AUDIO_TOGGLE, this.handleToggleSound);
        this.eventBus.off(GameEvents.AUDIO_PLAY, this.handlePlaySound);
        this.eventBus.off(GameEvents.WEAPON_FIRED, this.handleWeaponFire);
        this.eventBus.off(GameEvents.ENTITY_DESTROYED, this.handleExplosion);
        this.eventBus.off(GameEvents.PROJECTILE_HIT, this.handleCollision);
        this.eventBus.off(GameEvents.SHIP_THRUST, this.handleThrust);
        this.eventBus.off(GameEvents.SHIP_LANDED, this.handleLanding);
        this.eventBus.off(GameEvents.PICKUP_COLLECTED, this.handlePickup);
        this.eventBus.off(GameEvents.SHIELD_HIT, this.handleShieldHit);
        
        console.log('[AudioSystem] Destroyed');
    }
}

export default AudioSystem;
