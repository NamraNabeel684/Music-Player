var songs = [
  { title:'Neon Drive',      artist:'Demo Artist', category:'Electronic', synth:{scale:[0,2,4,7,9,12],       bpm:140, root:220.0, beat:0.25} },
  { title:'Slow Orbit',      artist:'Demo Artist', category:'Chill',      synth:{scale:[0,3,5,7,10,12],      bpm:70,  root:196.0, beat:0.5 } },
  { title:'Glass Cathedral', artist:'Demo Artist', category:'Classical',  synth:{scale:[0,2,4,5,7,9,11,12],  bpm:90,  root:261.6, beat:0.5 } },
  { title:'Night Shift',     artist:'Demo Artist', category:'Electronic', synth:{scale:[0,3,5,6,7,10],       bpm:120, root:174.6, beat:0.25} },
  { title:'Paper Boats',     artist:'Demo Artist', category:'Chill',      synth:{scale:[0,2,4,7,9],          bpm:80,  root:233.1, beat:0.5 } },
  { title:'Iron Sky',        artist:'Demo Artist', category:'Rock',       synth:{scale:[0,3,5,7,10,12],      bpm:150, root:164.8, beat:0.25} },
  { title:'Last Train',      artist:'Demo Artist', category:'Rock',       synth:{scale:[0,2,3,5,7,8,10],     bpm:110, root:196.0, beat:0.25} },
  { title:'Morning Strings', artist:'Demo Artist', category:'Classical',  synth:{scale:[0,2,4,5,7,9,11,12],  bpm:75,  root:293.7, beat:0.5 } }
];

/* ---------- Make a WAV file in memory for the demo songs ---------- */
function makeWav(cfg, seed){
  var SR = 16000, seconds = 24, total = SR * seconds;
  var buf = new Float32Array(total);
  var rnd = seed;
  function random(){ rnd = (rnd * 16807) % 2147483647; return rnd / 2147483647; }

  function addNote(freq, dur, vol, start){
    var n = Math.floor(SR * dur);
    for (var i = 0; i < n && start + i < total; i++){
      var t = i / SR;
      var env = Math.min(1, t * 40) * Math.exp(-3 * t / dur);
      var s = Math.sin(2*Math.PI*freq*t) + 0.4*Math.sin(4*Math.PI*freq*t) + 0.2*Math.sin(6*Math.PI*freq*t);
      buf[start + i] += vol * env * s;
    }
  }

  var spb = 60 / cfg.bpm, d = spb * cfg.beat * 2, pos = 0, step = 0;
  while (pos < total - SR){
    var deg = cfg.scale[Math.floor(random() * cfg.scale.length)];
    addNote(cfg.root * Math.pow(2, deg/12), d * 1.5, 0.3, pos);
    if (step % 4 === 0) addNote(cfg.root / 2, d * 3, 0.25, pos);
    pos += Math.floor(SR * d); step++;
  }

  var max = 0, i;
  for (i = 0; i < total; i++) if (Math.abs(buf[i]) > max) max = Math.abs(buf[i]);
  max = max || 1;

  var bytes = new ArrayBuffer(44 + total * 2), v = new DataView(bytes);
  function str(o, s){ for (var k = 0; k < s.length; k++) v.setUint8(o + k, s.charCodeAt(k)); }
  str(0,'RIFF'); v.setUint32(4, 36 + total*2, true); str(8,'WAVE'); str(12,'fmt ');
  v.setUint32(16,16,true); v.setUint16(20,1,true); v.setUint16(22,1,true);
  v.setUint32(24,SR,true); v.setUint32(28,SR*2,true); v.setUint16(32,2,true); v.setUint16(34,16,true);
  str(36,'data'); v.setUint32(40,total*2,true);
  for (i = 0; i < total; i++) v.setInt16(44 + i*2, Math.round(buf[i] / max * 30000), true);
  return URL.createObjectURL(new Blob([bytes], {type:'audio/wav'}));
}

function getSrc(song, index){
  if (!song.src && song.synth) song.src = makeWav(song.synth, 1000 + index * 77);
  return song.src;
}

/* ---------- Elements and state ---------- */
function $(id){ return document.getElementById(id); }
var audio = $('audio'), playBtn = $('playBtn'), seekBar = $('seekBar'), volumeBar = $('volumeBar');
var listEl = $('playlist'), chipsEl = $('chips'), searchEl = $('search');
var current = -1, category = 'All', query = '', shuffle = false, repeat = false;
audio.volume = 0.7;

function fmt(s){ return isFinite(s) ? Math.floor(s/60) + ':' + ('0' + Math.floor(s%60)).slice(-2) : '0:00'; }

function visible(){
  var out = [];
  songs.forEach(function(s, i){
    var text = (s.title + ' ' + s.artist).toLowerCase();
    if ((category === 'All' || s.category === category) && text.indexOf(query) !== -1) out.push({song:s, i:i});
  });
  return out;
}

/* ---------- Render ---------- */
function renderChips(){
  var cats = ['All'];
  songs.forEach(function(s){ if (cats.indexOf(s.category) === -1) cats.push(s.category); });
  chipsEl.innerHTML = '';
  cats.forEach(function(c){
    var b = document.createElement('button');
    b.className = 'chip' + (c === category ? ' active' : '');
    b.textContent = c;
    b.onclick = function(){ category = c; renderChips(); renderList(); };
    chipsEl.appendChild(b);
  });
}

function renderList(){
  var items = visible();
  listEl.innerHTML = '';
  if (!items.length){
    listEl.innerHTML = '<li class="empty">No songs match. Try another search or category.</li>';
    return;
  }
  items.forEach(function(it){
    var li = document.createElement('li');
    if (it.i === current) li.className = 'current';
    li.innerHTML = '<div class="meta"><b></b><small></small></div><span class="tag"></span>';
    li.querySelector('b').textContent = it.song.title;
    li.querySelector('small').textContent = it.song.artist;
    li.querySelector('.tag').textContent = it.song.category;
    li.onclick = function(){ loadSong(it.i, true); };
    listEl.appendChild(li);
  });
}

/* ---------- Playback ---------- */
function loadSong(i, autoplay){
  current = i;
  var s = songs[i];
  audio.src = getSrc(s, i);
  $('title').textContent = s.title;
  $('artist').textContent = s.artist + ' \u00B7 ' + s.category;
  $('labelArt').textContent = s.title.charAt(0).toUpperCase();
  renderList();
  if (autoplay){
    var p = audio.play();
    if (p && p.catch) p.catch(function(){ $('artist').textContent = 'Press play to start'; });
  }
}

function togglePlay(){
  if (current < 0){ var v = visible(); if (v.length) loadSong(v[0].i, true); return; }
  if (audio.paused) audio.play(); else audio.pause();
}

function step(dir){
  var v = visible();
  if (!v.length) return;
  var pos = -1;
  v.forEach(function(it, k){ if (it.i === current) pos = k; });
  if (shuffle) pos = Math.floor(Math.random() * v.length);
  else pos = (pos + dir + v.length) % v.length;
  loadSong(v[pos].i, true);
}

/* ---------- Events ---------- */
playBtn.onclick = togglePlay;
$('nextBtn').onclick = function(){ step(1); };
$('prevBtn').onclick = function(){ if (audio.currentTime > 3) audio.currentTime = 0; else step(-1); };

audio.onplay  = function(){ playBtn.innerHTML = '&#9208;'; playBtn.setAttribute('aria-label','Pause'); $('vinyl').classList.add('playing'); };
audio.onpause = function(){ playBtn.innerHTML = '&#9654;'; playBtn.setAttribute('aria-label','Play');  $('vinyl').classList.remove('playing'); };
audio.onended = function(){ if (repeat){ audio.currentTime = 0; audio.play(); } else step(1); };
audio.onerror = function(){ if (current >= 0) $('artist').textContent = "Couldn't load this song. Check the file path in the playlist."; };
audio.onloadedmetadata = function(){ $('duration').textContent = fmt(audio.duration); };
audio.ontimeupdate = function(){
  if (!audio.duration) return;
  seekBar.value = (audio.currentTime / audio.duration) * 100;
  $('current').textContent = fmt(audio.currentTime);
};
seekBar.oninput = function(){ if (audio.duration) audio.currentTime = (seekBar.value / 100) * audio.duration; };

volumeBar.oninput = function(){
  audio.volume = volumeBar.value; audio.muted = false;
  $('muteBtn').innerHTML = audio.volume === 0 ? '&#128263;' : '&#128266;';
};
$('muteBtn').onclick = function(){
  audio.muted = !audio.muted;
  $('muteBtn').innerHTML = audio.muted ? '&#128263;' : '&#128266;';
};

$('shuffleBtn').onclick = function(e){ shuffle = !shuffle; e.currentTarget.setAttribute('aria-pressed', shuffle); };
$('repeatBtn').onclick  = function(e){ repeat  = !repeat;  e.currentTarget.setAttribute('aria-pressed', repeat); };
searchEl.oninput = function(){ query = searchEl.value.trim().toLowerCase(); renderList(); };

$('addBtn').onclick = function(){ $('fileInput').click(); };
$('fileInput').onchange = function(e){
  Array.prototype.forEach.call(e.target.files, function(f){
    songs.push({ title:f.name.replace(/\.[^.]+$/, ''), artist:'My upload', category:'My Music', src:URL.createObjectURL(f) });
  });
  renderChips(); renderList();
};

document.addEventListener('keydown', function(e){
  if (e.target.tagName === 'INPUT') return;
  if (e.code === 'Space'){ e.preventDefault(); togglePlay(); }
  if (e.code === 'ArrowRight') step(1);
  if (e.code === 'ArrowLeft') step(-1);
});

renderChips();
renderList();
