/* reaction.shareyourgroup.com: reaction, aim, tap and memory tests. Written for this site. Scores stay in this browser (localStorage). */
(function () {
  'use strict';
  var d = document, LS = window.localStorage, SYG = window.SYG || {};
  function el(tag, cls, html) { var e = d.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function load(k, def) { try { var v = JSON.parse(LS.getItem(k)); return v == null ? def : v; } catch (e) { return def; } }
  function save(k, v) { try { LS.setItem(k, JSON.stringify(v)); } catch (e) { } }
  function now() { return window.performance && performance.now ? performance.now() : Date.now(); }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(n) { return Math.floor(Math.random() * n); }
  var INFO = {
    reaction: { name: 'Reaction time', unit: 'ms', low: true, path: '/reaction-time/' }, sound: { name: 'Sound reaction', unit: 'ms', low: true, path: '/sound-reaction/' },
    gonogo: { name: 'Go / no-go', unit: 'ms', low: true, path: '/go-no-go/' }, aim: { name: 'Aim', unit: 'ms per target', low: true, path: '/aim/' },
    tap: { name: 'Tap speed', unit: 'taps per second', low: false, path: '/tap-speed/' }, sequence: { name: 'Sequence memory', unit: 'steps', low: false, path: '/sequence-memory/' },
    number: { name: 'Number memory', unit: 'digits', low: false, path: '/number-memory/' }, tiles: { name: 'Tile memory', unit: 'tiles', low: false, path: '/tile-memory/' }
  };
  function record(test, value) {
    var s = load('rx-' + test, { best: null, hist: [] }), inf = INFO[test], isBest = s.best == null || (inf.low ? value < s.best : value > s.best);
    if (isBest) s.best = value;
    s.hist.push([Date.now(), value]); if (s.hist.length > 30) s.hist.shift();
    save('rx-' + test, s); return { best: s.best, isBest: isBest, n: s.hist.length };
  }
  function result(stage, test, value, extra, again) {
    var inf = INFO[test], r = record(test, value), txt = 'My ' + inf.name.toLowerCase() + ' score: ' + value + ' ' + inf.unit + '. Try to beat it:';
    stage.className = 'rx-stage res';
    stage.innerHTML = '<p class="rx-big">' + value + ' <small>' + (value === 1 ? inf.unit.replace(/s$/, '') : inf.unit) + '</small></p><p>' + (extra || '') + '</p><p class="hint">' + (r.isBest ? 'That is your best on this device.' : 'Your best on this device: ' + r.best + ' ' + inf.unit + '.') +
      '</p><p class="acts" style="display:flex;justify-content:center"><button class="btn" type="button" data-again>Try again</button><button class="btn ghost" type="button" data-share="' + txt + '">Share</button></p>';
    stage.querySelector('[data-again]').addEventListener('click', function (e) { e.stopPropagation(); again(); });
    stage.querySelector('[data-share]').addEventListener('pointerdown', function (e) { e.stopPropagation(); });
    scores();
  }
  var actx = null;
  function beep(freq, dur) { try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); var o = actx.createOscillator(), g = actx.createGain(); o.frequency.value = freq; o.connect(g); g.connect(actx.destination); g.gain.setValueAtTime(0.35, actx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + dur); o.start(); o.stop(actx.currentTime + dur); } catch (e) { } }

  /* ---- reaction time (light or sound), five tries ---- */
  function reaction(root, mode) {
    var stage = root.querySelector('.rx-stage'), times = [], state = 'idle', t0 = 0, timer = null, test = mode === 'sound' ? 'sound' : 'reaction', TRIES = 5;
    function idle(msg) { state = 'idle'; stage.className = 'rx-stage idle'; stage.innerHTML = '<p class="rx-big">' + (msg || 'Tap to start') + '</p><p>' + (times.length ? 'Try ' + (times.length + 1) + ' of ' + TRIES + '. Tap when ready.' : mode === 'sound' ? 'Turn the sound on. When you hear the beep, tap as fast as you can.' : 'When the box turns green, tap as fast as you can.') + '</p>'; }
    function arm() { state = 'wait'; stage.className = 'rx-stage wait'; stage.innerHTML = '<p class="rx-big">Wait...</p><p>' + (mode === 'sound' ? 'Listen for the beep.' : 'Wait for green.') + '</p>'; if (mode === 'sound') beep(1, 0.01); timer = setTimeout(go, rnd(1500, 4500)); }
    function go() { state = 'go'; if (mode === 'sound') beep(880, 0.25); else { stage.className = 'rx-stage go'; stage.innerHTML = '<p class="rx-big">Tap!</p>'; } t0 = now(); }
    stage.addEventListener('pointerdown', function (e) {
      if (e.target.closest('button')) return; e.preventDefault();
      if (state === 'idle') arm();
      else if (state === 'wait') { clearTimeout(timer); idle('Too soon!'); }
      else if (state === 'go') {
        var ms = Math.round(now() - t0); times.push(ms);
        if (times.length >= TRIES) { var avg = Math.round(times.reduce(function (a, b) { return a + b; }, 0) / TRIES), list = times.join(', '); times = []; state = 'done'; result(stage, test, avg, 'Average of ' + TRIES + ' tries (' + list + ' ms).', function () { idle(); }); }
        else idle(ms + ' ms');
      }
    });
    idle();
  }

  /* ---- go / no-go: tap for green, hold back for orange ---- */
  function gonogo(root) {
    var stage = root.querySelector('.rx-stage'), N = 14, i, rts, wrong, state = 'idle', t0, timer, isGo;
    function idle() { state = 'idle'; stage.className = 'rx-stage idle'; stage.innerHTML = '<p class="rx-big">Tap to start</p><p>Tap when the box turns <b>green</b>. Do nothing when it turns <b>orange</b>. ' + N + ' rounds.</p>'; }
    function next() { if (i >= N) return finish(); state = 'wait'; stage.className = 'rx-stage wait'; stage.innerHTML = '<p class="rx-big">Wait...</p><p>Round ' + (i + 1) + ' of ' + N + '</p>'; timer = setTimeout(show, rnd(1200, 3200)); }
    function show() { isGo = Math.random() < 0.68; i++; state = 'go'; stage.className = 'rx-stage ' + (isGo ? 'go' : 'nogo'); stage.innerHTML = '<p class="rx-big">' + (isGo ? 'Tap!' : 'Do not tap') + '</p>'; t0 = now(); timer = setTimeout(function () { if (isGo) wrong++; next(); }, isGo ? 1500 : 1100); }
    function finish() { state = 'done'; var avg = rts.length ? Math.round(rts.reduce(function (a, b) { return a + b; }, 0) / rts.length) : 0; if (!rts.length) { idle(); return; } result(stage, 'gonogo', avg, 'Average of your ' + rts.length + ' correct taps. Mistakes (tapped on orange, tapped too soon or missed green): ' + wrong + '.', idle); }
    stage.addEventListener('pointerdown', function (e) {
      if (e.target.closest('button')) return; e.preventDefault();
      if (state === 'idle') { i = 0; rts = []; wrong = 0; next(); }
      else if (state === 'wait') { clearTimeout(timer); wrong++; next(); }
      else if (state === 'go') { clearTimeout(timer); if (isGo) rts.push(Math.round(now() - t0)); else wrong++; next(); }
    });
    idle();
  }

  /* ---- aim: tap 20 targets ---- */
  function aim(root) {
    var stage = root.querySelector('.rx-stage'), N = 20, n, t0, miss, on = false;
    function idle() { on = false; stage.className = 'rx-stage idle'; stage.innerHTML = '<p class="rx-big">Tap to start</p><p>Tap each of the ' + N + ' targets as quickly as you can.</p>'; }
    function target() { var w = stage.clientWidth, h = stage.clientHeight, s = 56, b = el('button', 'rx-target'); b.type = 'button'; b.setAttribute('aria-label', 'Target'); b.style.left = Math.round(rnd(6, w - s - 6)) + 'px'; b.style.top = Math.round(rnd(34, h - s - 6)) + 'px'; stage.innerHTML = '<p class="rx-count">' + (N - n) + ' left</p>'; stage.appendChild(b); }
    stage.addEventListener('pointerdown', function (e) {
      if (e.target.closest('[data-again],[data-share]')) return; e.preventDefault();
      if (!on) { if (stage.classList.contains('res')) return; on = true; n = 0; miss = 0; stage.className = 'rx-stage play'; t0 = now(); target(); return; }
      if (e.target.classList.contains('rx-target')) { n++; if (n >= N) { on = false; var ms = Math.round((now() - t0) / N); result(stage, 'aim', ms, N + ' targets in ' + ((now() - t0) / 1000).toFixed(1) + ' seconds, with ' + miss + (miss === 1 ? ' miss.' : ' misses.'), idle); } else target(); }
      else miss++;
    });
    idle();
  }

  /* ---- tap speed: 10 seconds ---- */
  function tap(root) {
    var stage = root.querySelector('.rx-stage'), SEC = 10, n = 0, t0 = 0, on = false, tick = null, lock = 0;
    function idle() { on = false; stage.className = 'rx-stage idle'; stage.innerHTML = '<p class="rx-big">Tap to start</p><p>Tap this box as many times as you can in ' + SEC + ' seconds. The clock starts on your first tap.</p>'; }
    function paint() { var left = Math.max(0, SEC - (now() - t0) / 1000); stage.innerHTML = '<p class="rx-big">' + n + '</p><p>' + left.toFixed(1) + ' seconds left</p>'; if (left <= 0) { clearInterval(tick); on = false; lock = now() + 800; result(stage, 'tap', Math.round(n / SEC * 10) / 10, n + ' taps in ' + SEC + ' seconds.', idle); } }
    stage.addEventListener('pointerdown', function (e) {
      if (e.target.closest('button')) return; e.preventDefault();
      if (now() < lock || stage.classList.contains('res')) return;
      if (!on) { on = true; n = 1; t0 = now(); stage.className = 'rx-stage play'; tick = setInterval(paint, 100); paint(); } else { n++; stage.firstChild.textContent = n; }
    });
    idle();
  }

  /* ---- sequence memory: 3 by 3 pads ---- */
  function sequence(root) {
    var stage = root.querySelector('.rx-stage'), seq, pos, busy;
    function idle() { stage.className = 'rx-stage idle'; stage.innerHTML = '<p class="rx-big">Tap to start</p><p>Watch the squares light up, then tap them in the same order. The pattern grows by one each round.</p>'; stage.onclick = start; }
    function start() { stage.onclick = null; seq = []; stage.className = 'rx-stage grid'; stage.innerHTML = '<p class="rx-count"></p><div class="rx-pads g3">' + new Array(10).join('<button type="button"></button>') + '</div>'; [].forEach.call(stage.querySelectorAll('.rx-pads button'), function (b, i) { b.addEventListener('pointerdown', function (e) { e.preventDefault(); press(i, b); }); }); round(); }
    function round() { seq.push(pick(9)); pos = 0; busy = true; stage.querySelector('.rx-count').textContent = 'Round ' + seq.length + ': watch'; var pads = stage.querySelectorAll('.rx-pads button'); seq.forEach(function (k, i) { setTimeout(function () { pads[k].classList.add('lit'); setTimeout(function () { pads[k].classList.remove('lit'); }, 380); }, 600 + i * 620); }); setTimeout(function () { busy = false; var c = stage.querySelector('.rx-count'); if (c) c.textContent = 'Round ' + seq.length + ': your turn'; }, 600 + seq.length * 620); }
    function press(i, b) {
      if (busy) return;
      if (i === seq[pos]) { b.classList.add('ok'); setTimeout(function () { b.classList.remove('ok'); }, 160); pos++; if (pos === seq.length) { busy = true; setTimeout(round, 500); } }
      else { b.classList.add('bad'); busy = true; var got = seq.length - 1; setTimeout(function () { result(stage, 'sequence', got, 'You repeated a pattern of ' + got + (got === 1 ? ' step' : ' steps') + ' and slipped on the next.', idle); }, 500); }
    }
    idle();
  }

  /* ---- number memory ---- */
  function number(root) {
    var stage = root.querySelector('.rx-stage'), len, num;
    function idle() { stage.className = 'rx-stage idle'; stage.innerHTML = '<p class="rx-big">Tap to start</p><p>A number appears for a few seconds. Remember it, then type it. It gets one digit longer each time.</p>'; stage.onclick = function () { stage.onclick = null; len = 3; show(); }; }
    function show() { num = String(1 + pick(9)); while (num.length < len) num += pick(10); stage.className = 'rx-stage play'; stage.innerHTML = '<p class="rx-num">' + num + '</p><p>' + len + ' digits. Remember it.</p>'; setTimeout(ask, 1200 + len * 550); }
    function ask() { stage.className = 'rx-stage ask'; stage.innerHTML = '<form><label for="rx-in">What was the number?</label><input id="rx-in" type="text" inputmode="numeric" autocomplete="off" maxlength="30"><button class="btn" type="submit">Check</button></form>'; var inp = stage.querySelector('input'); inp.focus(); stage.querySelector('form').addEventListener('submit', function (e) { e.preventDefault(); var v = inp.value.replace(/\D/g, ''); if (v === num) { len++; stage.innerHTML = '<p class="rx-big">Correct</p><p>Next: ' + len + ' digits.</p>'; setTimeout(show, 900); } else result(stage, 'number', len - 1, 'The number was ' + num + '. You typed ' + (v || 'nothing') + '. The longest number you got right had ' + (len - 1) + ' digits.', idle); }); }
    idle();
  }

  /* ---- tile memory ---- */
  function tiles(root) {
    var stage = root.querySelector('.rx-stage'), k, lives, want, got, busy, size;
    function idle() { stage.className = 'rx-stage idle'; stage.innerHTML = '<p class="rx-big">Tap to start</p><p>Some tiles flash. When they hide, tap the ones that flashed. Three mistakes end the test.</p>'; stage.onclick = function () { stage.onclick = null; k = 3; lives = 3; round(); }; }
    function round() {
      size = k <= 4 ? 3 : k <= 7 ? 4 : k <= 12 ? 5 : 6; want = {}; got = 0; busy = true; var n = size * size, c = 0; while (c < k) { var x = pick(n); if (!want[x]) { want[x] = 1; c++; } }
      stage.className = 'rx-stage grid'; stage.innerHTML = '<p class="rx-count">' + k + ' tiles · lives ' + lives + '</p><div class="rx-pads g' + size + '">' + new Array(n + 1).join('<button type="button"></button>') + '</div>';
      var pads = stage.querySelectorAll('.rx-pads button');
      [].forEach.call(pads, function (b, i) { if (want[i]) b.classList.add('lit'); b.addEventListener('pointerdown', function (e) { e.preventDefault(); press(i, b); }); });
      setTimeout(function () { [].forEach.call(pads, function (b) { b.classList.remove('lit'); }); busy = false; }, 1100 + k * 120);
    }
    function press(i, b) {
      if (busy || b.classList.contains('ok') || b.classList.contains('bad')) return;
      if (want[i]) { b.classList.add('ok'); got++; if (got === k) { busy = true; k++; setTimeout(round, 600); } }
      else { b.classList.add('bad'); lives--; stage.querySelector('.rx-count').textContent = k + ' tiles · lives ' + lives; if (lives <= 0) { busy = true; var best = k - 1; setTimeout(function () { result(stage, 'tiles', best, 'You remembered a pattern of ' + best + ' tiles.', idle); }, 500); } }
    }
    idle();
  }

  /* ---- my scores ---- */
  function scores() {
    [].forEach.call(d.querySelectorAll('[data-rx-scores]'), function (box) {
      var rows = '', any = false;
      Object.keys(INFO).forEach(function (t) { var s = load('rx-' + t, null), inf = INFO[t]; if (s && s.hist.length) { any = true; var last = s.hist[s.hist.length - 1][1]; rows += '<tr><td><a href="' + inf.path + '">' + inf.name + '</a></td><td data-l="Best">' + s.best + ' ' + inf.unit + '</td><td data-l="Last">' + last + '</td><td data-l="Tries">' + s.hist.length + '</td></tr>'; } else rows += '<tr><td><a href="' + inf.path + '">' + inf.name + '</a></td><td data-l="Best">not tried yet</td><td data-l="Last"></td><td data-l="Tries">0</td></tr>'; });
      box.innerHTML = '<div class="tbl"><table class="stack"><thead><tr><th>Test</th><th>Your best</th><th>Last score</th><th>Tries kept</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
        (any ? '<p class="hint">Kept only in this browser, up to 30 tries per test. <button class="btn sm ghost" type="button" id="rx-clear">Clear my scores</button></p>' : '<p class="hint">Your scores will appear here. They are kept only in this browser.</p>');
      var c = d.getElementById('rx-clear'); if (c) c.onclick = function () { if (window.confirm('Clear all your saved scores on this device?')) { Object.keys(INFO).forEach(function (t) { try { LS.removeItem('rx-' + t); } catch (e) { } }); scores(); } };
    });
  }
  var RUN = { reaction: function (r) { reaction(r, 'light'); }, sound: function (r) { reaction(r, 'sound'); }, gonogo: gonogo, aim: aim, tap: tap, sequence: sequence, number: number, tiles: tiles };
  function init() {
    [].forEach.call(d.querySelectorAll('[data-test]'), function (r) {
      var f = RUN[r.getAttribute('data-test')], st = r.querySelector('.rx-stage'); if (!f) return; f(r);
      st.addEventListener('keydown', function (e) {   // keyboard: Space or Enter acts like a tap on the stage
        if (e.target !== st || (e.key !== ' ' && e.key !== 'Enter')) return; e.preventDefault();
        if (st.onclick) st.onclick(); else st.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
      });
    });
    scores();
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', init); else init();
})();
