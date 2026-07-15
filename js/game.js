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

  // ===== WESEN ABILITY ENGINE =====
  const CN = ['Kraft','Magie','Bedrohung','Seltenheit','MM-Klasse'];
  function addV(v,i,d){ const r=v.slice(); r[i]=Math.max(1,r[i]+d); return r; }
  function setV(v,i,x){ const r=v.slice(); r[i]=Math.max(1,x); return r; }
  function addAll(v,d){ return v.map(x=>Math.max(1,x+d)); }
  function useOnce(uses,key){ if(uses[key])return false; uses[key]=true; return true; }
  let _keepMsg = null; // set by distribute(), read by resolveRoundCpu()

  const WESEN_DESC = {
    'Schwarm':'Gegner-Kraft < 6: eigene Kraft +2','Wächter':'Gegner-Seltenheit < 6: Seltenheit +2',
    'Zaubererloyal':'Mehr Karten als Gegner: Kraft +2','Giftbiss':'Bei Bedrohung: Gegner-Kraft -1',
    'Boteninstinkt':'Bei Seltenheit: Seltenheit +2','Tanz der Feen':'Mehr Karten: Bedrohung +2',
    'Freier Flug':'Bei Bedrohung: Bedrohung +2','Tarnfarbe':'Seltenheit immer +2',
    'Feuerfest':'Gegen Drachen: Magie +2','Licht':'Gegen Geister: Gegner-Magie -2',
    'Magiepanzer':'Bei Magie: Gegner-Magie -2','Fluchtinstinkt':'Gewinnt Bedrohungs-Unentschieden',
    'Muggelradar':'Bei Seltenheit: Seltenheit +3','Meeresherrscher':'Gegner-Seltenheit < 8: Kraft & Magie +1',
    'Tödlicher Stachel':'Gewinnt Kraft-Unentschieden','Vollmondtanz':'Bei Seltenheit: Seltenheit +2',
    'Blitzangriff':'Bei Bedrohung: alle Werte +1','Fünf Beine':'Bedrohung immer +2',
    'Heiliger Käfer':'Seltenheit immer +2','Schwarmangriff':'Gegner-Kraft > 7: Kraft +3',
    'Meerestiefe':'Gegner-Seltenheit < 6: Bedrohung +2','Nur für Eingeweihte':'Bei Seltenheit: Seltenheit +3',
    'Silberpanzer':'Bei Magie: Gegner-Magie -2','Tarnung':'Deine Werte beim eigenen Zug verborgen',
    'Opalblick':'Eigener Zug: Gegner-Bedrohung → max. 4','Keulenhieb':'Kraft (eig. Zug): Kraft +3',
    'Levitation':'Eigener Zug: Gegner-Bedrohung → 1','Desorientierung':'Gegner wählt nächste Runde zufällig',
    'Feuerball':'Magie (eig. Zug): Magie +3','Blutsauger':'Eigener Zug: stiehlt 2 Punkte der gewählten Kat.',
    'Unsichtbarkeit':'Deine Werte beim eigenen Zug verborgen','Sturm':'Eigener Zug: alle Gegner-Werte -1',
    'Meeresherr':'Kraft/Magie (eig. Zug): +2','Einfrieren':'Eigener Zug: Gegner-Bedrohung → max. 2',
    'Pfeifenzauber':'Magie (eig. Zug): Gegner-Magie -2','Feueratem':'Magie (eig. Zug): Magie +3 – einmalig',
    'Wahnsinnslied':'Gegner wählt zufällige Kategorie','Gartenwüter':'Seltenheit ↔ beste andere Kat.',
    'Melancholie':'Eigener Zug: Gegner-Magie -2','Reißen':'Bedrohung (eig. Zug): Gegner-Bedrohung -2',
    'Adlerstolz':'Kraft (Gegnerzug): eigene Kraft +2','Verschwinden lassen':'Eigener Zug: Gegner-Wert → 1',
    'Dunkelmantel':'Kraft/Bedrohung (eig. Zug): Unentschieden → Sieg',
    'Scheingold':'Eigener Zug: Seltenheit mit Gegner tauschen','Giftschleuder':'Eigener Zug: Gegner-Kraft -2',
    'Schatzsuche':'Eigener Zug: Seltenheit += Gegner-Seltenheit/2','Stachelschutz':'Kraft (eig. Zug): Gegner-Kraft -2',
    'Wolfsverwandlung':'Eigener Zug: Kraft ↔ Bedrohung','Stärkeblut':'Kraft (eig. Zug): Kraft +3 – einmalig',
    'Blaue Flammen':'Magie (eig. Zug): Magie +3','Giftpfeil':'Eigener Zug: Gegner-Wert -3',
    'Höllenflammen':'Kraft/Magie (eig. Zug): +3','Unsichtbares Wesen':'Deine Werte beim eigenen Zug verborgen',
    'Keulenwirbel':'Kraft (eig. Zug): Kraft +2','Hornaufspießen':'Kraft (eig. Zug): Kraft +2, Gegner -1',
    'Vollmondwut':'Kraft/Bedrohung (eig. Zug): +3','Explosion':'Kraft (eig. Zug): Kraft +2',
    'Kreischen':'Eigener Zug: Gegner-Bedrohung -2','Regenruf':'Magie (Gegnerzug): Gegner-Magie -2',
    'Feuerhintern':'Kraft (Gegnerzug): Gegner-Kraft -2','Todesomen':'Seltenheit (Gegnerzug): Gegner-Seltenheit -3',
    'Anker':'Bedrohung (Gegnerzug): Gegner-Bedrohung → 1','Kammangriff':'Kraft (Gegnerzug): eigene Kraft +2',
    'Seegeheimnis':'Seltenheit (Gegnerzug): eigene Seltenheit +3',
    'Klebeschleim':'Bedrohung (Gegnerzug): Gegner-Bedrohung -3',
    'Schneesturm':'Bei Kraft/Bedrohung: Gegner-Bedrohung -2',
    'Teleport':'Bei Niederlage: Karte einmalig behalten','Energiesog':'Bei Niederlage: Karte immer behalten',
    'Schrumpfen':'Bei Niederlage: Karte einmalig behalten',
    'Unzerstörbar':'Bei Niederlage: 50% Chance, Karte zu behalten',
    'Tödlicher Blick':'Automatischer Sieg beim eigenen Zug – einmalig',
  };

  const WESEN_AB = {
    // ── PASSIV ──
    'Schwarm':           c => c.oppV[0]<6 ? {myV:addV(c.myV,0,2),msg:'Schwarm: Kraft +2'} : null,
    'Wächter':           c => c.oppV[3]<6 ? {myV:addV(c.myV,3,2),msg:'Wächter: Seltenheit +2'} : null,
    'Zaubererloyal':     c => c.myDeckLen>c.oppDeckLen ? {myV:addV(c.myV,0,2),msg:'Zaubererloyal: Kraft +2'} : null,
    'Giftbiss':          c => c.cat===2 ? {oppV:addV(c.oppV,0,-1),msg:'Giftbiss: Gegner-Kraft -1'} : null,
    'Boteninstinkt':     c => c.cat===3 ? {myV:addV(c.myV,3,2),msg:'Boteninstinkt: Seltenheit +2'} : null,
    'Tanz der Feen':     c => c.myDeckLen>c.oppDeckLen ? {myV:addV(c.myV,2,2),msg:'Tanz der Feen: Bedrohung +2'} : null,
    'Freier Flug':       c => c.cat===2 ? {myV:addV(c.myV,2,2),msg:'Freier Flug: Bedrohung +2'} : null,
    'Tarnfarbe':         c => ({myV:addV(c.myV,3,2),msg:'Tarnfarbe: Seltenheit +2'}),
    'Feuerfest':         c => c.oppCard.kat==='Drachen' ? {myV:addV(c.myV,1,2),msg:'Feuerfest: Magie +2 (gegen Drachen)'} : null,
    'Licht':             c => c.oppCard.kat==='Geister' ? {oppV:addV(c.oppV,1,-2),msg:'Licht: Gegner-Magie -2 (gegen Geister)'} : null,
    'Magiepanzer':       c => c.cat===1 ? {oppV:addV(c.oppV,1,-2),msg:'Magiepanzer: Gegner-Magie -2'} : null,
    'Fluchtinstinkt':    c => c.cat===2 ? {winTie:true,msg:'Fluchtinstinkt: Gewinnt Bedrohungs-Gleichstand'} : null,
    'Muggelradar':       c => c.cat===3 ? {myV:addV(c.myV,3,3),msg:'Muggelradar: Seltenheit +3'} : null,
    'Meeresherrscher':   c => c.oppV[3]<8 ? {myV:addV(addV(c.myV,0,1),1,1),msg:'Meeresherrscher: Kraft & Magie +1'} : null,
    'Tödlicher Stachel': c => c.cat===0 ? {winTie:true,msg:'Tödlicher Stachel: Gewinnt Kraft-Gleichstand'} : null,
    'Vollmondtanz':      c => c.cat===3 ? {myV:addV(c.myV,3,2),msg:'Vollmondtanz: Seltenheit +2'} : null,
    'Blitzangriff':      c => c.cat===2 ? {myV:addAll(c.myV,1),msg:'Blitzangriff: Alle Werte +1'} : null,
    'Fünf Beine':        c => ({myV:addV(c.myV,2,2),msg:'Fünf Beine: Bedrohung +2'}),
    'Heiliger Käfer':    c => ({myV:addV(c.myV,3,2),msg:'Heiliger Käfer: Seltenheit +2'}),
    'Schwarmangriff':    c => c.oppV[0]>7 ? {myV:addV(c.myV,0,3),msg:'Schwarmangriff: Kraft +3'} : null,
    'Meerestiefe':       c => c.oppV[3]<6 ? {myV:addV(c.myV,2,2),msg:'Meerestiefe: Bedrohung +2'} : null,
    'Nur für Eingeweihte': c => c.cat===3 ? {myV:addV(c.myV,3,3),msg:'Nur für Eingeweihte: Seltenheit +3'} : null,
    'Silberpanzer':      c => c.cat===1 ? {oppV:addV(c.oppV,1,-2),msg:'Silberpanzer: Gegner-Magie -2'} : null,
    'Tarnung':           (c,mt) => mt ? {msg:'Tarnung: Deine Werte sind verborgen'} : null,
    'Dreifachnatur':     () => null,
    'Drei Köpfe':        () => null,
    // ── AKTIV (myTurn = true wenn Besitzer wählt) ──
    'Opalblick':         (c,mt) => mt ? {oppV:setV(c.oppV,2,Math.min(c.oppV[2],4)),msg:'Opalblick: Gegner-Bedrohung → 4'} : null,
    'Keulenhieb':        (c,mt) => mt&&c.cat===0 ? {myV:addV(c.myV,0,3),msg:'Keulenhieb: Kraft +3'} : null,
    'Levitation':        (c,mt) => mt ? {oppV:setV(c.oppV,2,Math.min(c.oppV[2],1)),msg:'Levitation: Gegner-Bedrohung → 1'} : null,
    'Desorientierung':   (c,mt) => mt ? {forceNonBest:true,msg:'Desorientierung: Gegner muss andere Kategorie wählen'} : null,
    'Feuerball':         (c,mt) => mt&&c.cat===1 ? {myV:addV(c.myV,1,3),msg:'Feuerball: Magie +3'} : null,
    'Blutsauger':        (c,mt) => mt ? {myV:addV(c.myV,c.cat,2),oppV:addV(c.oppV,c.cat,-2),msg:'Blutsauger: Stehle 2 Punkte'} : null,
    'Unsichtbarkeit':    (c,mt) => mt ? {msg:'Unsichtbarkeit: Deine Werte sind verborgen'} : null,
    'Sturm':             (c,mt) => mt ? {oppV:addAll(c.oppV,-1),msg:'Sturm: Alle Gegner-Werte -1'} : null,
    'Meeresherr':        (c,mt) => mt&&(c.cat===0||c.cat===1) ? {myV:addV(c.myV,c.cat,2),msg:'Meeresherr: '+CN[c.cat]+' +2'} : null,
    'Einfrieren':        (c,mt) => mt ? {oppV:setV(c.oppV,2,Math.min(c.oppV[2],2)),msg:'Einfrieren: Gegner-Bedrohung → 2'} : null,
    'Pfeifenzauber':     (c,mt) => mt&&c.cat===1 ? {oppV:addV(c.oppV,1,-2),msg:'Pfeifenzauber: Gegner-Magie -2'} : null,
    'Feueratem':         (c,mt,uses,id) => mt&&c.cat===1&&useOnce(uses,id+'_fa') ? {myV:addV(c.myV,1,3),msg:'Feueratem: Magie +3 ⚡'} : null,
    'Wahnsinnslied':     (c,mt) => mt ? {forceNonBest:true,msg:'Wahnsinnslied: Gegner wählt zufällig!'} : null,
    'Gartenwüter':       (c,mt) => {
      if(!mt)return null;
      const others=[0,1,2,4], best=others.reduce((a,b)=>c.myV[a]>=c.myV[b]?a:b);
      if(best===3)return {msg:'Gartenwüter: Seltenheit ist bereits am höchsten'};
      const v=c.myV.slice(); [v[3],v[best]]=[v[best],v[3]];
      return {myV:v,msg:'Gartenwüter: Seltenheit ↔ '+CN[best]};
    },
    'Melancholie':       (c,mt) => mt ? {oppV:addV(c.oppV,1,-2),msg:'Melancholie: Gegner-Magie -2'} : null,
    'Reißen':            (c,mt) => mt&&c.cat===2 ? {oppV:addV(c.oppV,2,-2),msg:'Reißen: Gegner-Bedrohung -2'} : null,
    'Adlerstolz':        (c,mt) => !mt&&c.cat===0 ? {myV:addV(c.myV,0,2),msg:'Adlerstolz: Kraft +2'} : null,
    'Verschwinden lassen': (c,mt) => mt ? {oppV:setV(c.oppV,c.cat,1),msg:'Verschwinden lassen: Gegner-'+CN[c.cat]+' → 1'} : null,
    'Dunkelmantel':      (c,mt) => mt&&(c.cat===0||c.cat===2) ? {winTie:true,msg:'Dunkelmantel: Gewinnt Gleichstand'} : null,
    'Scheingold':        (c,mt) => {
      if(!mt)return null;
      const mv=c.myV.slice(),ov=c.oppV.slice(); [mv[3],ov[3]]=[ov[3],mv[3]];
      return {myV:mv,oppV:ov,msg:'Scheingold: Seltenheit getauscht'};
    },
    'Giftschleuder':     (c,mt) => mt ? {oppV:addV(c.oppV,0,-2),msg:'Giftschleuder: Gegner-Kraft -2'} : null,
    'Schatzsuche':       (c,mt) => {
      if(!mt)return null;
      const b=Math.floor(c.oppV[3]/2);
      return b>0 ? {myV:addV(c.myV,3,b),msg:'Schatzsuche: Seltenheit +'+b} : null;
    },
    'Stachelschutz':     (c,mt) => mt&&c.cat===0 ? {oppV:addV(c.oppV,0,-2),msg:'Stachelschutz: Gegner-Kraft -2'} : null,
    'Wolfsverwandlung':  (c,mt) => {
      if(!mt)return null;
      const v=c.myV.slice(); [v[0],v[2]]=[v[2],v[0]];
      return {myV:v,msg:'Wolfsverwandlung: Kraft ↔ Bedrohung'};
    },
    'Stärkeblut':        (c,mt,uses,id) => mt&&useOnce(uses,id+'_sb') ? {myV:addV(c.myV,0,3),msg:'Stärkeblut: Kraft +3 ⚡'} : null,
    'Blaue Flammen':     (c,mt) => mt&&c.cat===1 ? {myV:addV(c.myV,1,3),msg:'Blaue Flammen: Magie +3'} : null,
    'Giftpfeil':         (c,mt) => mt ? {oppV:addV(c.oppV,c.cat,-3),msg:'Giftpfeil: Gegner-'+CN[c.cat]+' -3'} : null,
    'Höllenflammen':     (c,mt) => mt&&(c.cat===0||c.cat===1) ? {myV:addV(c.myV,c.cat,3),msg:'Höllenflammen: '+CN[c.cat]+' +3'} : null,
    'Unsichtbares Wesen':(c,mt) => mt ? {msg:'Unsichtbares Wesen: Deine Werte sind verborgen'} : null,
    'Keulenwirbel':      (c,mt) => mt&&c.cat===0 ? {myV:addV(c.myV,0,2),msg:'Keulenwirbel: Kraft +2'} : null,
    'Hornaufspießen':    (c,mt) => mt&&c.cat===0 ? {myV:addV(c.myV,0,2),oppV:addV(c.oppV,0,-1),msg:'Hornaufspießen: Kraft +2, Gegner-Kraft -1'} : null,
    'Vollmondwut':       (c,mt) => mt&&(c.cat===0||c.cat===2) ? {myV:addV(c.myV,c.cat,3),msg:'Vollmondwut: '+CN[c.cat]+' +3'} : null,
    'Explosion':         (c,mt) => mt&&c.cat===0 ? {myV:addV(c.myV,0,2),msg:'Explosion: Kraft +2'} : null,
    'Kreischen':         (c,mt) => mt ? {oppV:addV(c.oppV,2,-2),msg:'Kreischen: Gegner-Bedrohung -2'} : null,
    // ── REAKTIV (myTurn = false wenn Gegner wählt) ──
    'Regenruf':          (c,mt) => !mt&&c.cat===1 ? {oppV:addV(c.oppV,1,-2),msg:'Regenruf: Gegner-Magie -2'} : null,
    'Feuerhintern':      (c,mt) => !mt&&c.cat===0 ? {oppV:addV(c.oppV,0,-2),msg:'Feuerhintern: Gegner-Kraft -2'} : null,
    'Todesomen':         (c,mt) => !mt&&c.cat===3 ? {oppV:addV(c.oppV,3,-3),msg:'Todesomen: Gegner-Seltenheit -3'} : null,
    'Anker':             (c,mt) => !mt&&c.cat===2 ? {oppV:setV(c.oppV,2,1),msg:'Anker: Gegner-Bedrohung → 1'} : null,
    'Kammangriff':       (c,mt) => !mt&&c.cat===0 ? {myV:addV(c.myV,0,2),msg:'Kammangriff: Kraft +2'} : null,
    'Seegeheimnis':      (c,mt) => !mt&&c.cat===3 ? {myV:addV(c.myV,3,3),msg:'Seegeheimnis: Seltenheit +3'} : null,
    'Klebeschleim':      (c,mt) => !mt&&c.cat===2 ? {oppV:addV(c.oppV,2,-3),msg:'Klebeschleim: Gegner-Bedrohung -3'} : null,
    'Schneesturm':       c => (c.cat===0||c.cat===2) ? {oppV:addV(c.oppV,2,-2),msg:'Schneesturm: Gegner-Bedrohung -2'} : null,
    // ── BEI VERLUST ──
    'Teleport':          () => ({keepCard:'once',msg:'Teleport: Karte behalten!'}),
    'Energiesog':        () => ({keepCard:'always',msg:'Energiesog: Karte behalten!'}),
    'Schrumpfen':        () => ({keepCard:'once',msg:'Schrumpfen: Karte behalten!'}),
    'Unzerstörbar':      () => ({keepCard:'chance50',msg:'Unzerstörbar'}),
    // ── AUTO-WIN ──
    'Tödlicher Blick':   (c,mt,uses,id) => mt&&useOnce(uses,id+'_tb') ? {autoWin:true,msg:'Tödlicher Blick: Automatischer Sieg! 💀'} : null,
  };

  function applyWesenAbilities(myCard, oppCard, catIdx, playerPicks) {
    let myV = myCard.values.slice(), oppV = oppCard.values.slice();
    let autoWin = null, keepCardMe = null, keepCardOpp = null;
    let winTie = null, forceNonBest = false;
    const msgs = [];

    const applyOne = (ab, cardId, card, oppRef, myLen, oppLen, isMyTurn, side) => {
      if (!ab) return;
      const ctx = {
        myV: side==='me' ? myV : oppV,
        oppV: side==='me' ? oppV : myV,
        cat: catIdx, myCard: card, oppCard: oppRef,
        myDeckLen: myLen, oppDeckLen: oppLen,
      };
      const r = ab(ctx, isMyTurn, state.abilityUses, cardId);
      if (!r) return;
      if (side === 'me') {
        if (r.myV) myV = r.myV;
        if (r.oppV) oppV = r.oppV;
        if (r.autoWin) autoWin = 'me';
        if (r.keepCard) keepCardMe = r;
        if (r.winTie && !winTie) winTie = 'me';
      } else {
        if (r.myV) oppV = r.myV;
        if (r.oppV) myV = r.oppV;
        if (r.autoWin) autoWin = 'opp';
        if (r.keepCard) keepCardOpp = r;
        if (r.winTie && !winTie) winTie = 'opp';
      }
      if (r.forceNonBest) forceNonBest = true;
      if (r.msg) msgs.push({ side, text: r.msg });
    };

    applyOne(WESEN_AB[myCard.faehigkeit], myCard.id, myCard, oppCard,
             state.myDeck.length, state.oppDeck.length, playerPicks, 'me');
    applyOne(WESEN_AB[oppCard.faehigkeit], oppCard.id, oppCard, myCard,
             state.oppDeck.length, state.myDeck.length, !playerPicks, 'opp');

    return { myV, oppV, autoWin, keepCardMe, keepCardOpp, winTie, forceNonBest, msgs };
  }
  // ===== END ABILITY ENGINE =====

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
    const indices = opts.cats ? opts.cats : q.categories.map((_, i) => i);
    return indices.map(i => {
      const cat = q.categories[i];
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
      '<span class="hp-num">' + esc(card.id.replace('HP', '')) + '</span>' +
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
    if (q.id === 'hp')    return renderHpCard(q, card, opts);
    if (q.id === 'wesen') return renderWesenCard(q, card, opts);
    return renderTaubenCard(q, card, opts);
  }

  function renderWesenCard(q, card, opts) {
    const kc = card.katColor;
    const num = card.id.replace('W', '');
    const typMap = { 'Passiv': 'passiv', 'Aktiv': 'aktiv', 'Reaktiv': 'reaktiv' };
    const typCls = 'wk-abil-type wk-abil-' + (typMap[card.typ] || 'passiv');
    const desc = WESEN_DESC[card.faehigkeit] || '';
    const artHtml = card.img
      ? '<div class="wk-art-wrap"><img class="wk-art-img" src="' + card.img + '" alt="' + esc(card.name) + '"></div>'
      : '<div class="wk-no-img">' + esc(card.name) + '</div>';
    return (
      '<div class="tcard wesen-card">' +
      '<div class="wk-hdr">' +
        '<div class="wk-hdr-left"><span class="wk-num">' + num + '</span><span class="wk-name">' + esc(card.name) + '</span></div>' +
        '<span class="wk-kat" style="background:' + kc + '">' + esc(card.kat) + '</span>' +
      '</div>' +
      artHtml +
      '<div class="wk-stats">' +
      statRows(q, card, Object.assign({ barColor: kc, cats: [0, 1, 2, 3] }, opts)) +
      '</div>' +
      '<div class="wk-ability">' +
        '<div class="wk-abil-row">' +
          '<span class="' + typCls + '">' + esc(card.typEmoji) + ' ' + esc(card.typ) + '</span>' +
          '<span class="wk-abil-name">' + esc(card.faehigkeit) + '</span>' +
        '</div>' +
        (desc ? '<p class="wk-abil-desc">' + esc(desc) + '</p>' : '') +
      '</div>' +
      '</div>'
    );
  }

  function renderBack() {
    const id = state.quartett.id;
    const src = id === 'hp' ? 'img/backs/back-hp.jpg'
              : id === 'wesen' ? 'img/backs/back-wesen.svg'
              : 'img/backs/back-tauben.jpg';
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
    document.body.classList.toggle('theme-hp',    id === 'hp');
    document.body.classList.toggle('theme-wesen', id === 'wesen');
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
  function showReveal(myCard, oppCard, catIdx, outcome, counts, announce, abilMsgs, effVals) {
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
        const myEffVal  = effVals ? effVals.myV[catIdx]  : myCard.values[catIdx];
        const oppEffVal = effVals ? effVals.oppV[catIdx] : oppCard.values[catIdx];
        const detail = cat.emoji + ' ' + esc(cat.label) + ': <b>' + myEffVal + '</b> gegen <b>' + oppEffVal + '</b>';
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
        if (abilMsgs && abilMsgs.length) {
          const abilHtml = '<div class="abil-notifs">' +
            abilMsgs.map(m => '<span class="abil-notif abil-' + m.side + '">' + esc(m.text) + '</span>').join('') +
            '</div>';
          banner.innerHTML += abilHtml;
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
    state.abilityUses = {};
    state.forceNextCpuNonBest = false;
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
      const forceNB = state.forceNextCpuNonBest;
      state.forceNextCpuNonBest = false;
      state.cpuTimer = setTimeout(() => {
        const idx = cpuChooseCategory(forceNB);
        resolveRoundCpu(idx, true);
      }, 1300);
    }
  }

  // KI: 50 % stärkster Wert, sonst zufällig eine der übrigen Kategorien
  function cpuChooseCategory(forceNonBest) {
    const vals = state.oppDeck[0].values;
    const order = vals
      .map((v, i) => ({ v, i }))
      .sort((a, b) => b.v - a.v || Math.random() - 0.5);
    if (forceNonBest) {
      // Desorientierung / Wahnsinnslied: darf nicht die beste Kategorie wählen
      const rest = order.slice(1);
      return rest[Math.floor(Math.random() * rest.length)].i;
    }
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

    let abilResult = null;
    if (state.quartett.id === 'wesen') {
      abilResult = applyWesenAbilities(myCard, oppCard, catIdx, state.turn === 'me');
      if (abilResult.forceNonBest && state.turn === 'me') {
        state.forceNextCpuNonBest = true;
      }
    }

    _keepMsg = null;
    const outcome = distribute(myCard, oppCard, catIdx, abilResult);
    const msgs = abilResult ? abilResult.msgs.slice() : [];
    if (_keepMsg) msgs.push(_keepMsg);

    showReveal(myCard, oppCard, catIdx, outcome,
      { my: state.myDeck.length, opp: state.oppDeck.length, pot: state.pot.length },
      announceCpu ? 'Der Computer' : null, msgs, abilResult);
  }

  // Karten verteilen (cpu + host): outcome 'me' | 'opp' | 'tie'
  function distribute(myCard, oppCard, catIdx, ar) {
    const myV   = ar ? ar.myV   : myCard.values;
    const oppV  = ar ? ar.oppV  : oppCard.values;
    const autoW = ar ? ar.autoWin  : null;
    const wTie  = ar ? ar.winTie   : null;
    const kcMe  = ar ? ar.keepCardMe  : null;

    let outcome;
    if (autoW) {
      outcome = autoW;
    } else {
      const a = myV[catIdx], b = oppV[catIdx];
      if (a > b) outcome = 'me';
      else if (b > a) outcome = 'opp';
      else outcome = wTie || 'tie';
    }

    // keepCard: nur anwenden wenn Besitzer verliert
    let myCardKept = false;
    if (outcome === 'opp' && kcMe) {
      const kc = kcMe.keepCard;
      if (kc === 'always') {
        myCardKept = true;
      } else if (kc === 'chance50') {
        myCardKept = Math.random() < 0.5;
        _keepMsg = { side: 'me', text: kcMe.msg + (myCardKept ? ' – Glück gehabt! (50%)' : ' – kein Glück (50%)') };
      } else { // 'once'
        myCardKept = useOnce(state.abilityUses, myCard.id + '_keep');
      }
      if (myCardKept && kc !== 'chance50') _keepMsg = { side: 'me', text: kcMe.msg };
    }

    if (outcome === 'me') {
      state.myDeck.push(myCard, oppCard, ...state.pot);
      state.pot = [];
      state.turn = 'me';
    } else if (outcome === 'opp') {
      state.oppDeck.push(oppCard, ...state.pot);
      if (myCardKept) state.myDeck.push(myCard);
      else state.oppDeck.push(myCard);
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
