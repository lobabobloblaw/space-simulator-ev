// Radio playlist (optional)
// Provide external ambient/tracker/MIDI-like tracks here. Example format:
// export const radioPlaylist = [
//   { name: 'Deep Field Drone', url: 'https://example.com/audio/deep-field-drone.mp3' },
//   { name: 'Cold Vacuum',     url: 'https://example.com/audio/cold-vacuum.ogg' },
//   { name: 'Ghost Nebula',    url: 'https://example.com/audio/ghost-nebula.mp3' }
// ];
// Notes:
// - Prefer MP3/OGG hosted with CORS enabled so the browser can stream.
// - Looping is handled by the player; tracks should be seamless if possible.
// - If this array is empty (default), the game uses the built-in synth radio.

// Example tracker playlist (uncomment and add your own files)
// Local files: put .xm/.mod/.it in docs/assets/music/ and reference with relative URLs
// export const radioPlaylist = [
//   { name: 'Ghost Nebula', type: 'tracker', url: './assets/music/ghost_nebula.xm' },
//   { name: 'Cold Vacuum',  type: 'tracker', url: './assets/music/cold_vacuum.mod' },
// ];

// Streaming fallback examples (MP3/OGG) if needed:
// export const radioPlaylist = [
//   { name: 'Deep Field Drone', type: 'stream', url: 'https://example.com/audio/deep-field-drone.mp3' }
// ];

export const radioPlaylist = [
  { name: 'Midnight Drive',           type: 'tracker', url: '../music/midnight_drive.xm' },
  { name: 'Napping on a Cloud',       type: 'tracker', url: '../music/napping_on_a_cloud.xm' },
  { name: 'A Light Waltz (k_jose)',   type: 'tracker', url: '../music/k_jose_-_a_light_waltz.it' },
  { name: 'Fruity Radioactivity',     type: 'tracker', url: '../music/k_jose_-_fruity_radioactivity.s3m' },
  { name: 'FX Poly 1',                type: 'tracker', url: '../music/fx-poly1.mod' },
  { name: 'Subterrain',               type: 'tracker', url: '../music/subterrain.xm' },
  { name: 'Glitch Abuse',             type: 'tracker', url: '../music/glitch_abuse.xm' },
];
