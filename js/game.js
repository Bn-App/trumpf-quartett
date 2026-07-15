/* Trumpf Quartett — gegen den Computer oder einen Freund (WebRTC/PeerJS) */
(function () {
  'use strict';

  // ---------- Helpers ----------
  const $ = (sel) => document.querySelector(sel);

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  // ---------- State ----------
  const state = {
    mode: 'cpu',          // 'cpu' | 'host' | 'guest'
    quartett: null,
    selectedDeck: null,
    selectedSize: '32',
    // Engine (cpu + host): eigene Sicht
    myDeck: [],
    oppDeck: [],
    pot: [],
    turn: 'me',           // 'me' | 'opp'
    phase: 'choose',      // 'choose' | 'reveal' | 'over'
    rounds: 0,
    cpuTimer: null,
    // Multiplayer
    peer: null,
    conn: null,
    myReady: false,
    oppReady: false,
    // Gast-Sicht
    guestCard: null,      // aktuelle eigene Karte (Objekt)
    lastCounts: null,     // { my, opp, pot } nach letztem Ergebnis
    cardById: {},
  };

  const OPP_NAME = () => (state.mode === 'cpu' ? 'Der Computer' : 'Dein Freund');

  // ---------- Screens ----------
  function showScreen(id) {
    document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
    $(id).classList.add('active');
  }

  // ---------- Card rendering ----------
  function statRows(q, card, opts) {
    return q.categories.map((cat, i) => {
      const v = card.values[i];
      const pct = Math.round((v / cat.max) * 100);
      const cls = ['stat-row'];
      if (opts.clickable) cls.push('clickable');
      if (opts.chosen === i) cls.push('chosen');
      if (opts.wonRow === i) cls.push('won-row');
      if (opts.lostRow === i) cls.push('lost-row');
      return (
        '<div class="' + cls.join(' ') + '" data-idx="' + i + '">' +
        '<span class="stat-emoji">' + cat.emoji + '</span>' +
        '<span class="stat-label">' + esc(cat.label) + '</span>' +
        '<div class="stat-bar-wrap"><div class="stat-bar" style="width:' + pct + '%;background:' + opts.barColor + '"></div></div>' +
        '<span class="stat-num">' + v + '</span>' +
        '</div>'
      );
    }).join('');
  }

  function renderTaubenCard(q, card, opts) {
    const [light, mid, accent] = card.palette;
    const total = card.values.reduce((a, b) => a + b, 0);
    return (
      '<div class="tcard" style="border:3px solid ' + accent + '">' +
      '<div class="tc-head" style="background:linear-gradient(90deg,#0f2657,#24457e)">' +
      '<span class="tc-head-brand">Tauben-Quartett</span>' +
      '<span class="tc-id">' + esc(card.id) + '</span>' +
      '</div>' +
      '<div class="tc-art" style="background:linear-gradient(160deg,' + light + ' 0%,' + mid + ' 100%)">' +
      '<div class="bub1"></div><div class="bub2"></div>' +
      '<img src="' + card.img + '" alt="' + esc(card.name) + '">' +
      '</div>' +
      '<div class="tc-name" style="background:linear-gradient(90deg,' + accent + ',' + mid + ')">' +
      '<span class="star">✦</span><span class="nm">' + esc(card.name) + '</span><span class="star">✦</span>' +
      '</div>' +
      '<div class="tc-stats">' +
      statRows(q, card, Object.assign({ barColor: 'linear-gradient(90deg,' + mid + ',' + accent + ')' }, opts)) +
      '</div>' +
      '<div class="tc-foot" style="background:' + light + ';border-top:1px solid ' + mid + ';color:' + accent + '">' +
      '<span class="lbl">Gesamt</span><span class="tot">' + total + '</span>' +
      '</div>' +
      '</div>'
    );
  }

  function renderHpCard(q, card, opts) {
    const total = card.values.reduce((a, b) => a + b, 0);
    return (
      '<div class="tcard hp-card">' +
      '<div class="hp-head" style="background:' + card.houseColor + '">' +
      '<span class="hp-num">' + esc(card.id.replace('HP', '')) + '</span><span class="haus">' + esc(card.haus) + '</span>' +
      '</div>' +
      '<div class="hp-art-wrap"><div class="hp-art">' +
      (card.img ? '<img src="' + card.img + '" alt="' + esc(card.name) + '">' : '') +
      '</div></div>' +
      '<div class="hp-name">' +
      '<div class="nm">' + esc(card.name) + '</div>' +
      '<div class="zug" style="color:' + card.houseTextColor + '">' + esc(card.zugehoerigkeit) + '</div>' +
      '</div>' +
      '<div class="hp-stats">' +
      statRows(q, card, Object.assign({ barColor: card.houseColor }, opts)) +
      '</div>' +
      (card.fakt ? '<div class="hp-fakt">✦ ' + esc(card.fakt) + '</div>' : '') +
      '<div class="hp-foot" style="background:' + card.houseColor + '">' +
      '<span class="lbl">Gesamt</span><span class="tot">' + total + '</span>' +
      '</div>' +
      '</div>'
    );
  }

  function renderCard(card, opts) {
    opts = opts || {};
    const q = state.quartett;
    return q.id === 'hp' ? renderHpCard(q, card, opts) : renderTaubenCard(q, card, opts);
  }

  function renderBack() {
    const isHp = state.quartett.id === 'hp';
    const src = isHp ? 'img/backs/back-hp.jpg' : 'img/backs/back-tauben.jpg';
    return '<div class="card-back"><img src="' + src + '" alt="Kartenrücken"></div>';
  }

  // ---------- Animation helpers ----------
  function flipReveal(container, newHtml, done) {
    container.classList.add('flipping');
    container.style.transition = 'transform 160ms ease-in';
    container.style.transform = 'scaleX(0)';
    setTimeout(() => {
      container.innerHTML = newHtml;
      void container.offsetWidth; // force reflow so transition sees the scaleX(0) start point
      container.style.transition = 'transform 230ms cubic-bezier(0.34,1.4,0.64,1)';
      container.style.transform = 'scaleX(1)';
      setTimeout(() => {
        container.classList.remove('flipping');
        container.style.transform = '';
        container.style.transition = '';
        if (done) done();
      }, 245);
    }, 175);
  }

  function animateStatBars(container) {
    const bars = container.querySelectorAll('.stat-bar');
    if (!bars.length) return;
    const widths = Array.from(bars).map((b) => b.style.width);
    bars.forEach((b) => { b.style.transition = 'none'; b.style.width = '0%'; });
    void container.offsetWidth; // force reflow so transition sees the 0% start point
    bars.forEach((b, i) => {
      b.style.transition = 'width .42s cubic-bezier(0.4,0,0.2,1) ' + (i * 50) + 'ms';
      b.style.width = widths[i];
    });
  }

  function bumpEl(el) {
    el.classList.remove('count-bump');
    void el.offsetWidth;
    el.classList.add('count-bump');
  }

  function pulseVs() {
    const vs = $('#vs-badge');
    vs.classList.remove('pulse');
    void vs.offsetWidth;
    vs.classList.add('pulse');
  }

  // ---------- Shared UI ----------
  function setStatus(html) {
    $('#status-bar').innerHTML = html;
  }

  function setQuartett(id) {
    state.quartett = window.QUARTETTS[id];
    state.cardById = {};
    state.quartett.cards.forEach((c) => { state.cardById[c.id] = c; });
    document.body.classList.toggle('theme-hp', id === 'hp');
    $('#game-title').textContent = state.quartett.name;
  }

  function updateCounts(my, opp, pot) {
    const pEl = $('#count-player'), cEl = $('#count-cpu'), potEl = $('#count-pot');
    if (pEl.textContent !== String(my)) { pEl.textContent = my; bumpEl(pEl); } else { pEl.textContent = my; }
    if (cEl.textContent !== String(opp)) { cEl.textContent = opp; bumpEl(cEl); } else { cEl.textContent = opp; }
    potEl.textContent = pot;
    $('#pot-wrap').hidden = pot === 0;
    const oppLabel = state.mode === 'cpu' ? 'Computer' : 'Freund';
    $('#count-opp-label').textContent = oppLabel;
    $('#opp-slot-title').textContent = oppLabel;
  }

  function attachPickHandlers() {
    $('#card-player').querySelectorAll('.stat-row').forEach((row) => {
      row.addEventListener('click', () => {
        if (state.phase !== 'choose' || state.turn !== 'me') return;
        row.classList.add('picking');
        setTimeout(() => row.classList.remove('picking'), 300);
        const idx = parseInt(row.dataset.idx, 10);
        if (state.mode === 'guest') {
          state.phase = 'wait';
          setStatus('Übertrage deine Wahl <span class="thinking">…</span>');
          send({ t: 'pick', cat: idx });
        } else if (state.mode === 'host') {
          hostResolve(idx, 'me');
        } else {
          resolveRoundCpu(idx);
        }
      });
    });
  }

  function showChooseUi(myCard, myTurn) {
    state.phase = 'choose';
    $('#result-banner').hidden = true;
    $('#btn-next').hidden = true;
    $('#card-player').innerHTML = renderCard(myCard, { clickable: myTurn });
    animateStatBars($('#card-player'));
    $('#card-cpu').innerHTML = renderBack();
    pulseVs();
    if (myTurn) {
      setStatus('<span class="hl">Du bist dran</span> — wähle eine Kategorie auf deiner Karte!');
      attachPickHandlers();
    } else {
      const back = $('#card-cpu').querySelector('.card-back');
      if (back) back.classList.add('thinking-card');
      setStatus(esc(OPP_NAME()) + ' ist dran <span class="thinking">… bitte warten …</span>');
    }
  }

  // Enthüllung mit kurzer Ankündigung der Kategorie
  function showReveal(myCard, oppCard, catIdx, outcome, counts, announce) {
    state.phase = 'reveal';
    const cat = state.quartett.categories[catIdx];
    const doReveal = () => {
      const myOpts = {};
      const oppOpts = {};
      if (outcome === 'me') { myOpts.wonRow = catIdx; oppOpts.lostRow = catIdx; }
      else if (outcome === 'opp') { myOpts.lostRow = catIdx; oppOpts.wonRow = catIdx; }
      else { myOpts.chosen = catIdx; oppOpts.chosen = catIdx; }

      // Flip the CPU card over, then show results
      flipReveal($('#card-cpu'), renderCard(oppCard, oppOpts), () => {
        animateStatBars($('#card-cpu'));

        // Fade-highlight the player card
        const playerSlot = $('#card-player');
        playerSlot.style.transition = 'opacity .15s ease';
        playerSlot.style.opacity = '0.25';
        setTimeout(() => {
          playerSlot.innerHTML = renderCard(myCard, myOpts);
          playerSlot.style.transition = 'opacity .18s ease';
          playerSlot.style.opacity = '1';
          setTimeout(() => { playerSlot.style.transition = ''; }, 200);
          animateStatBars(playerSlot);
        }, 160);

        // Result banner
        const banner = $('#result-banner');
        banner.hidden = false;
        banner.className = 'result-banner';
        const detail = cat.emoji + ' ' + esc(cat.label) + ': <b>' + myCard.values[catIdx] + '</b> gegen <b>' + oppCard.values[catIdx] + '</b>';
        if (outcome === 'me') {
          banner.classList.add('win');
          banner.innerHTML = 'Du gewinnst die Runde! 🎉<span class="detail">' + detail + '</span>';
        } else if (outcome === 'opp') {
          banner.classList.add('lose');
          banner.innerHTML = esc(OPP_NAME()) + ' gewinnt. 😐<span class="detail">' + detail + '</span>';
        } else {
          banner.classList.add('tie');
          banner.innerHTML = 'Gleichstand! Beide Karten kommen in den Topf.<span class="detail">' + detail + '</span>';
        }
        setStatus('');
        updateCounts(counts.my, counts.opp, counts.pot);
        $('#btn-next').hidden = false;
      });
    };

    if (announce) {
      setStatus(esc(announce) + ' wählt: <span class="hl">' + cat.emoji + ' ' + esc(cat.label) + '</span>');
      state.cpuTimer = setTimeout(doReveal, 1100);
    } else {
      doReveal();
    }
  }

  function computeEnd(my, opp) {
    if (my > 0 && opp > 0) return null;
    if (my === 0 && opp === 0) return 'tie';
    return my === 0 ? 'opp' : 'me';
  }

  function showEndScreen(result) {
    state.phase = 'over';
    const emoji = $('#end-emoji');
    const title = $('#end-title');
    const sub = $('#end-sub');
    const opp = OPP_NAME();
    emoji.style.animation = 'none';
    void emoji.offsetWidth;
    emoji.style.animation = '';
    if (result === 'tie') {
      emoji.textContent = '🤝';
      title.textContent = 'Unentschieden!';
      sub.textContent = 'Alle Karten liegen im Topf — das gibt es selten! (' + state.rounds + ' Runden gespielt)';
    } else if (result === 'me') {
      emoji.textContent = '🏆';
      title.textContent = 'Du hast gewonnen!';
      sub.textContent = 'Du hast ' + (state.mode === 'cpu' ? 'dem Computer' : 'deinem Freund') + ' alle Karten abgenommen — nach ' + state.rounds + ' Runden. Stark!';
    } else {
      emoji.textContent = '💔';
      title.textContent = opp + ' gewinnt …';
      sub.textContent = 'Nach ' + state.rounds + ' Runden sind deine Karten aufgebraucht. Revanche?';
    }
    // Gast kann keine Revanche starten — das macht der Host
    $('#btn-again').hidden = state.mode === 'guest';
    if (state.mode === 'guest') {
      sub.textContent += ' Dein Freund kann eine Revanche starten — bleib einfach hier.';
    }
    showScreen('#screen-end');
  }

  // =====================================================
  // Modus: GEGEN DEN COMPUTER
  // =====================================================
  function startCpuGame() {
    clearTimeout(state.cpuTimer);
    state.mode = 'cpu';
    setQuartett(state.selectedDeck);
    let cards = shuffle(state.quartett.cards);
    if (state.selectedSize !== 'all') {
      cards = cards.slice(0, Math.min(parseInt(state.selectedSize, 10), cards.length));
    }
    if (cards.length % 2 === 1) cards = cards.slice(0, cards.length - 1);
    const half = cards.length / 2;
    state.myDeck = cards.slice(0, half);
    state.oppDeck = cards.slice(half);
    state.pot = [];
    state.rounds = 0;
    state.turn = Math.random() < 0.5 ? 'me' : 'opp';
    state.phase = 'choose';
    showScreen('#screen-game');
    setStatus(state.turn === 'me' ? 'Du beginnst!' : 'Der Computer beginnt!');
    state.cpuTimer = setTimeout(cpuNextRound, 700);
  }

  function cpuNextRound() {
    clearTimeout(state.cpuTimer);
    const end = computeEnd(state.myDeck.length, state.oppDeck.length);
    if (end) { showEndScreen(end); return; }
    updateCounts(state.myDeck.length, state.oppDeck.length, state.pot.length);
    showChooseUi(state.myDeck[0], state.turn === 'me');
    if (state.turn === 'opp') {
      setStatus('Der Computer ist dran <span class="thinking">… er überlegt …</span>');
      state.cpuTimer = setTimeout(() => {
        const idx = cpuChooseCategory();
        resolveRoundCpu(idx, true);
      }, 1300);
    }
  }

  // KI: 50 % stärkster Wert, sonst zufällig eine der übrigen Kategorien
  function cpuChooseCategory() {
    const vals = state.oppDeck[0].values;
    const order = vals
      .map((v, i) => ({ v, i }))
      .sort((a, b) => b.v - a.v || Math.random() - 0.5);
    if (Math.random() < 0.5) return order[0].i;
    const rest = order.slice(1);
    return rest[Math.floor(Math.random() * rest.length)].i;
  }

  function resolveRoundCpu(catIdx, announceCpu) {
    if (state.phase !== 'choose') return;
    state.phase = 'reveal';
    state.rounds++;
    const myCard = state.myDeck.shift();
    const oppCard = state.oppDeck.shift();
    const outcome = distribute(myCard, oppCard, catIdx);
    showReveal(myCard, oppCard, catIdx, outcome,
      { my: state.myDeck.length, opp: state.oppDeck.length, pot: state.pot.length },
      announceCpu ? 'Der Computer' : null);
  }

  // Karten verteilen (cpu + host): outcome 'me' | 'opp' | 'tie'
  function distribute(myCard, oppCard, catIdx) {
    const a = myCard.values[catIdx], b = oppCard.values[catIdx];
    let outcome;
    if (a > b) outcome = 'me';
    else if (b > a) outcome = 'opp';
    else outcome = 'tie';
    if (outcome === 'me') {
      state.myDeck.push(myCard, oppCard, ...state.pot);
      state.pot = [];
      state.turn = 'me';
    } else if (outcome === 'opp') {
      state.oppDeck.push(oppCard, myCard, ...state.pot);
      state.pot = [];
      state.turn = 'opp';
    } else {
      state.pot.push(myCard, oppCard);
    }
    return outcome;
  }

  // =====================================================
  // Multiplayer: Verbindung
  // =====================================================
  function send(msg) {
    if (state.conn && state.conn.open) state.conn.send(msg);
  }

  function cleanupPeer() {
    clearTimeout(state.cpuTimer);
    if (state.conn) { try { state.conn.close(); } catch (e) {} state.conn = null; }
    if (state.peer) { try { state.peer.destroy(); } catch (e) {} state.peer = null; }
    state.myReady = false;
    state.oppReady = false;
  }

  function connectionLost() {
    if (state.mode !== 'host' && state.mode !== 'guest') return;
    cleanupPeer();
    state.mode = 'cpu';
    document.body.classList.remove('theme-hp');
    history.replaceState(null, '', location.pathname);
    showScreen('#screen-start');
    const note = $('#mp-unavailable');
    note.textContent = '⚠️ Die Verbindung zu deinem Mitspieler wurde getrennt.';
    note.hidden = false;
    setTimeout(() => { note.hidden = true; }, 6000);
  }

  function wireConnection(conn) {
    state.conn = conn;
    conn.on('data', onMessage);
    conn.on('close', connectionLost);
    conn.on('error', connectionLost);
  }

  // ---------- HOST ----------
  function startHosting() {
    if (typeof Peer === 'undefined') { $('#mp-unavailable').hidden = false; return; }
    state.mode = 'host';
    const id = 'tq-' + Math.random().toString(36).slice(2, 10);
    showScreen('#screen-lobby');
    $('#lobby-status').innerHTML = '<span class="thinking">Erstelle Spielraum …</span>';
    $('#qr-box').innerHTML = '';
    $('#invite-link').value = '';

    const peer = new Peer(id);
    state.peer = peer;

    peer.on('open', () => {
      const url = location.origin + location.pathname + '?join=' + id;
      $('#invite-link').value = url;
      const qr = qrcode(0, 'M');
      qr.addData(url);
      qr.make();
      $('#qr-box').innerHTML = qr.createImgTag(5, 4);
      $('#lobby-status').innerHTML = '<span class="thinking">Warte auf deinen Mitspieler …</span>';
    });

    peer.on('connection', (conn) => {
      if (state.conn) { try { conn.close(); } catch (e) {} return; } // nur ein Mitspieler
      wireConnection(conn);
      conn.on('open', () => {
        $('#lobby-status').textContent = 'Verbunden! Spiel startet …';
        setTimeout(startHostGame, 600);
      });
    });

    peer.on('error', (err) => {
      $('#lobby-status').textContent = 'Fehler: ' + (err.type || err.message || 'Verbindung fehlgeschlagen');
    });
    peer.on('disconnected', () => { try { peer.reconnect(); } catch (e) {} });
  }

  function startHostGame() {
    setQuartett(state.selectedDeck);
    let cards = shuffle(state.quartett.cards);
    if (state.selectedSize !== 'all') {
      cards = cards.slice(0, Math.min(parseInt(state.selectedSize, 10), cards.length));
    }
    if (cards.length % 2 === 1) cards = cards.slice(0, cards.length - 1);
    const half = cards.length / 2;
    state.myDeck = cards.slice(0, half);
    state.oppDeck = cards.slice(half);  // Karten des Gastes
    state.pot = [];
    state.rounds = 0;
    state.turn = Math.random() < 0.5 ? 'me' : 'opp';
    state.myReady = false;
    state.oppReady = false;
    send({ t: 'start', deck: state.selectedDeck });
    showScreen('#screen-game');
    setStatus(state.turn === 'me' ? 'Du beginnst!' : 'Dein Freund beginnt!');
    setTimeout(hostSendRound, 700);
  }

  function hostSendRound() {
    const end = computeEnd(state.myDeck.length, state.oppDeck.length);
    if (end) {
      send({ t: 'over' });
      showEndScreen(end);
      return;
    }
    state.myReady = false;
    state.oppReady = false;
    send({
      t: 'round',
      yourCard: state.oppDeck[0].id,
      counts: { you: state.oppDeck.length, opp: state.myDeck.length, pot: state.pot.length },
      turn: state.turn === 'me' ? 'host' : 'guest',
    });
    updateCounts(state.myDeck.length, state.oppDeck.length, state.pot.length);
    showChooseUi(state.myDeck[0], state.turn === 'me');
  }

  function hostResolve(catIdx, picker) {
    if (state.phase !== 'choose') return;
    state.phase = 'reveal';
    state.rounds++;
    const myCard = state.myDeck.shift();
    const oppCard = state.oppDeck.shift();
    const outcome = distribute(myCard, oppCard, catIdx);
    send({
      t: 'result',
      hostCard: myCard.id,
      guestCard: oppCard.id,
      cat: catIdx,
      winner: outcome === 'me' ? 'host' : outcome === 'opp' ? 'guest' : 'tie',
      counts: { you: state.oppDeck.length, opp: state.myDeck.length, pot: state.pot.length },
      pickedBy: picker === 'me' ? 'host' : 'guest',
    });
    showReveal(myCard, oppCard, catIdx, outcome,
      { my: state.myDeck.length, opp: state.oppDeck.length, pot: state.pot.length },
      picker === 'opp' ? 'Dein Freund' : null);
  }

  function tryAdvanceHost() {
    if (state.myReady && state.oppReady) hostSendRound();
    else if (state.myReady) setStatus('Warte auf deinen Freund <span class="thinking">…</span>');
  }

  // ---------- GUEST ----------
  function startJoining(hostId) {
    if (typeof Peer === 'undefined') {
      $('#join-status').textContent = 'Keine Internetverbindung — Mehrspieler nicht möglich.';
      return;
    }
    state.mode = 'guest';
    showScreen('#screen-join');
    const peer = new Peer();
    state.peer = peer;
    peer.on('open', () => {
      const conn = peer.connect(hostId, { reliable: true });
      wireConnection(conn);
      conn.on('open', () => {
        $('#join-status').innerHTML = 'Verbunden! <span class="thinking">Warte auf den Start …</span>';
      });
    });
    peer.on('error', (err) => {
      $('#join-status').textContent =
        err.type === 'peer-unavailable'
          ? 'Spiel nicht gefunden — ist der Link noch gültig?'
          : 'Fehler: ' + (err.type || 'Verbindung fehlgeschlagen');
    });
  }

  // ---------- Nachrichten ----------
  function onMessage(msg) {
    if (!msg || typeof msg !== 'object') return;
    switch (msg.t) {
      // ----- Gast empfängt -----
      case 'start': {
        setQuartett(msg.deck);
        state.rounds = 0;
        showScreen('#screen-game');
        setStatus('Los geht\'s!');
        break;
      }
      case 'round': {
        clearTimeout(state.cpuTimer);
        state.guestCard = state.cardById[msg.yourCard];
        state.lastCounts = { my: msg.counts.you, opp: msg.counts.opp, pot: msg.counts.pot };
        state.turn = msg.turn === 'guest' ? 'me' : 'opp';
        if ($('#screen-game').classList.contains('active') === false) showScreen('#screen-game');
        updateCounts(msg.counts.you, msg.counts.opp, msg.counts.pot);
        showChooseUi(state.guestCard, state.turn === 'me');
        break;
      }
      case 'result': {
        state.rounds++;
        const myCard = state.cardById[msg.guestCard];
        const oppCard = state.cardById[msg.hostCard];
        const outcome = msg.winner === 'guest' ? 'me' : msg.winner === 'host' ? 'opp' : 'tie';
        state.lastCounts = { my: msg.counts.you, opp: msg.counts.opp, pot: msg.counts.pot };
        state.myReady = false;
        showReveal(myCard, oppCard, msg.cat, outcome, state.lastCounts,
          msg.pickedBy === 'host' ? 'Dein Freund' : null);
        break;
      }
      case 'over': {
        const end = computeEnd(state.lastCounts ? state.lastCounts.my : 0, state.lastCounts ? state.lastCounts.opp : 0);
        showEndScreen(end || 'tie');
        break;
      }
      // ----- Host empfängt -----
      case 'pick': {
        if (state.mode === 'host' && state.turn === 'opp') hostResolve(msg.cat, 'opp');
        break;
      }
      case 'ready': {
        if (state.mode === 'host') {
          state.oppReady = true;
          tryAdvanceHost();
        }
        break;
      }
    }
  }

  // ---------- UI wiring ----------
  function updateStartButtons() {
    const ok = !!state.selectedDeck;
    $('#btn-start').disabled = !ok;
    $('#btn-host').disabled = !ok;
  }

  document.querySelectorAll('.deck-option').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.deck-option').forEach((b) => b.classList.remove('selected'));
      btn.classList.add('selected');
      state.selectedDeck = btn.dataset.deck;
      updateStartButtons();
    });
  });

  document.querySelectorAll('.size-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.size-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.selectedSize = btn.dataset.size;
    });
  });

  $('#btn-start').addEventListener('click', () => {
    if (state.selectedDeck) startCpuGame();
  });

  $('#btn-host').addEventListener('click', () => {
    if (state.selectedDeck) startHosting();
  });

  $('#btn-copy').addEventListener('click', () => {
    const input = $('#invite-link');
    input.select();
    try { navigator.clipboard.writeText(input.value); } catch (e) { document.execCommand('copy'); }
    $('#btn-copy').textContent = 'Kopiert ✓';
    setTimeout(() => { $('#btn-copy').textContent = 'Kopieren'; }, 1500);
  });

  $('#btn-lobby-cancel').addEventListener('click', () => {
    cleanupPeer();
    state.mode = 'cpu';
    showScreen('#screen-start');
  });

  $('#btn-join-cancel').addEventListener('click', () => {
    cleanupPeer();
    state.mode = 'cpu';
    history.replaceState(null, '', location.pathname);
    showScreen('#screen-start');
  });

  $('#btn-next').addEventListener('click', () => {
    if (state.mode === 'cpu') {
      cpuNextRound();
    } else if (state.mode === 'host') {
      if (state.phase !== 'reveal') return;
      state.myReady = true;
      $('#btn-next').hidden = true;
      tryAdvanceHost();
    } else if (state.mode === 'guest') {
      if (state.phase !== 'reveal') return;
      state.myReady = true;
      $('#btn-next').hidden = true;
      const end = computeEnd(state.lastCounts.my, state.lastCounts.opp);
      if (end) { showEndScreen(end); }
      else setStatus('Warte auf deinen Freund <span class="thinking">…</span>');
      send({ t: 'ready' });
    }
  });

  $('#btn-quit').addEventListener('click', () => {
    cleanupPeer();
    state.mode = 'cpu';
    document.body.classList.remove('theme-hp');
    history.replaceState(null, '', location.pathname);
    showScreen('#screen-start');
  });

  $('#btn-again').addEventListener('click', () => {
    if (state.mode === 'host') startHostGame();
    else startCpuGame();
  });

  $('#btn-menu').addEventListener('click', () => {
    cleanupPeer();
    state.mode = 'cpu';
    document.body.classList.remove('theme-hp');
    history.replaceState(null, '', location.pathname);
    showScreen('#screen-start');
  });

  // ---------- Einstieg über Einladungslink ----------
  const joinId = new URLSearchParams(location.search).get('join');
  if (joinId) startJoining(joinId);
})();
