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
            // Emit initial UI state for radio
            this.emitMusicState();
            
            console.log('[AudioSystem] Initialized with Web Audio API');
        } catch (e) {
            console.log('[AudioSystem] Web Audio API not supported:', e);
            this.enabled = false;
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
        this.eventBus.emit(GameEvents.AUDIO_MUSIC_STATE, {
            playing: this.music.enabled && !!this.music.interval,
            track: this.music.trackNames[this.music.trackIndex],
            volume: this.music.volume
        });
    }

    setMusicVolume(v) {
        this.music.volume = Math.max(0, Math.min(1, v));
        // Persist to state
        const audioState = this.stateManager.state.audio || {};
        audioState.musicVolume = this.music.volume;
        this.stateManager.state.audio = audioState;
        if (this.music.nodes) {
            for (const n of this.music.nodes) {
                if (n && n.gain) n.gain.gain.setValueAtTime(this.music.volume * this.musicMaster, this.context.currentTime);
            }
        }
        this.emitMusicState();
    }

    playMusic() {
        if (!this.context) return;
        if (this.music.interval) return; // already playing
        this.music.enabled = true;
        // Create simple synth nodes for a pad + lead
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

        // Note patterns per track
        const tracks = [
            { name: 'Drift', notes: [220, 246.9, 261.6, 196, 174.6, 196] },
            { name: 'Pulse', notes: [329.6, 293.7, 261.6, 220, 246.9, 261.6] },
            { name: 'Nebula', notes: [261.6, 233.1, 207.7, 233.1, 261.6, 311.1] }
        ];
        const current = tracks[this.music.trackIndex % tracks.length];
        this.music.trackNames = tracks.map(t => t.name);

        let step = 0;
        // Lightweight interval sequencer
        this.music.interval = setInterval(() => {
            if (!this.music.enabled) return; // paused
            const note = current.notes[step % current.notes.length];
            // Pad slowly glides
            padOsc.frequency.exponentialRampToValueAtTime(note / 2, this.context.currentTime + 0.15);
            // Lead steps
            leadOsc.frequency.setValueAtTime(note, this.context.currentTime);
            step++;
        }, 450);

        this.emitMusicState();
    }

    pauseMusic() {
        this.music.enabled = false;
        if (this.music.interval) {
            clearInterval(this.music.interval);
            this.music.interval = null;
        }
        for (const n of this.music.nodes) {
            try { n.gain.gain.exponentialRampToValueAtTime(0.0001, this.context.currentTime + 0.2); } catch(_) {}
            try { n.osc.stop(this.context.currentTime + 0.25); } catch(_) {}
        }
        this.music.nodes = [];
        this.emitMusicState();
    }

    nextTrack() {
        this.music.trackIndex = (this.music.trackIndex + 1) % this.music.trackNames.length;
        if (this.music.interval) { this.pauseMusic(); this.playMusic(); }
    }

    prevTrack() {
        this.music.trackIndex = (this.music.trackIndex - 1 + this.music.trackNames.length) % this.music.trackNames.length;
        if (this.music.interval) { this.pauseMusic(); this.playMusic(); }
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
