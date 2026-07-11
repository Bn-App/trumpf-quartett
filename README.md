# Trumpf Quartett

Spiele Trumpf-Quartett gegen den Computer — mit zwei Decks:

- **Tauben-Quartett** (64 Karten, Serie A & B) — Kategorien: Eleganz, Stärke, Schnelligkeit, Intelligenz, Mut, Humor
- **Harry Potter Quartett** (88 Karten) — Kategorien: Zauberkraft, Mut, Weisheit, Loyalität, Geschick, Glück

## Spielregeln

1. Vor jeder Partie werden die Karten neu gemischt und gleichmäßig verteilt (Kartenanzahl wählbar: 16, 32 oder alle).
2. Wer am Zug ist, wählt eine Kategorie seiner obersten Karte. Der höhere Wert gewinnt beide Karten.
3. Bei Gleichstand kommen beide Karten in den Topf — der Gewinner der nächsten Runde bekommt alles.
4. Der Gewinner einer Runde wählt in der nächsten Runde die Kategorie.
5. Wer alle Karten hat, gewinnt.

## Spielmodi

- **🤖 Gegen den Computer** — der Computer wählt zu 50 % die Kategorie seines stärksten Wertes, ansonsten zufällig eine der übrigen.
- **👥 Gegen einen Freund** — du bekommst einen QR-Code und einen Einladungslink. Dein Freund scannt den Code (oder öffnet den Link), und ihr spielt direkt gegeneinander. Die Verbindung läuft per WebRTC (PeerJS) direkt von Browser zu Browser — es wird kein eigener Server benötigt. Beide Spieler brauchen nur Internet; es funktioniert auch auf dem Handy.

## Lokal spielen

Einfach `index.html` im Browser öffnen (Doppelklick). Der Modus „Gegen einen Freund" braucht eine Internetverbindung; damit der Einladungslink für den Freund erreichbar ist, sollte das Spiel dafür online (z. B. auf GitHub Pages) laufen.

## Auf GitHub Pages veröffentlichen

1. Neues Repository auf GitHub anlegen (z. B. `trumpf-quartett`).
2. Alle Dateien dieses Ordners hochladen / pushen.
3. Im Repository: **Settings → Pages → Source: Deploy from a branch**, Branch `main`, Ordner `/ (root)` wählen.
4. Nach kurzer Zeit ist das Spiel unter `https://<benutzername>.github.io/trumpf-quartett/` erreichbar.
