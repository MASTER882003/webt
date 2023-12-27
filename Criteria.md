
## Allgemein
---
- [x]  Einheitliches Thema
- [x]  Nur besprochene Technologien
- [ ] Begrenzungen
  - [x] 200 Zeilen HTML
  - [x] 200 Zeilen CSS
  - [ ] 200 Zeilen JS
  - [x] 200 Zeilen PHP

## Frontend
---
- [x] Einzelnes Dokument
- [x] Einzelne Bereiche
  - [x] Navigationsbereich -> Abspringen in die einzelnen Bereiche
  - [x] Informationsbereich
    - [x] Erklären wie das ganze Funktioniert
    - [x] Ein Paragraph und ein Bild
  - [x] Eingabebereich
    - [x] Button
    - [x] Mind. drei verschiedene Inputelemente
    - [x] Entsprechende Labels
  - [x] Ausgabereich -> Anzeige der vom Server erhaltenen Daten
- [x] Bei Klick auf Button Daten ans Backend senden
  - [x] Kein Page reload
  - [x] Antwort des Backends vollständig in den Ausgabebereich des HTML-Dokuments integrieren
- [x] Nur gültiges HTML
- [x] JS und CSS in separaten Dateien
- [x] Dokumentrelative URLs
- [x] Erfüllen der WCAG-Erfolgskriterien 1.1.1 und 1.3.1
- [x] Responsives Layout
  - [x] Unterschiedliche und geeignete Darstellungen für Mobile und Desktop
  - [x] Responsivees Layout mit W3.CSS erfolgen
- [x] W3.CSS muss mittels einer abosluten URL eingebunden werden
- [x] Skalierung des Viewport muss mit folgendem Metatag ausgeschaltet sein:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```
- [x] Canvas
  - [x] Mindestens zehn Zeichenoperationen (lineTo, arc, fillRect...)
  - [x] Muss sich während der Anzeige des HTML-Dokuments dynamisch verändern (Benutzereingabe oder zeitlich)

## Backend
---
- [x] Effekt auf gesendete Daten
- [x] Erstellt JSON-Dokument und sendet es ans Frontend (muss von Eingabedaten abhängen)
- [x] Weiteren, zum Thema passenden Effekt (Write to DB)
- [x] Selbstdefiniertes Cookie setzen -> Bei erneutem Aufruf muss dies eine sichtbare Änderung an der JSON-Antwort bewirken (evtl. Farbe über fetch abfragen)

## Validierung
---
- [x] Muss in **Frontend** und **Backend** validiert werden
  - [x] Frontend- und Backendvalidierung müssen übereinstimmen.
  - [x] Frontendvalidierung muss das Absenden einer fehlerhaften Request verhindern
  - [x] Für alle Felder eine separate, passende Fehlermeldung direkt im Eingabebereich
  - [x] Alle Fehlermeldungen im DOM **(und nicht Alerts)** anzeigen

## Zusatztechnik
---
- [ ] Reaktive Eingabevalidierung mittels Vue.js
- [x] Persistenz im Backend mit MySQL
- [ ] Externer Webservice im Frontend

## Abgabe
---
- [ ] Mit folgendem Namen: `WEBT_HS23_VENETZ_ROBIN.zip`
- [ ] Unter https://elearning.hslu.ch/ilias/ilias.php?baseClass=ilreposito-
rygui&ref_id=5960336 abgeben
Letztmöglicher Termin: **12.01.2024 23:59**

## Bewertung
---

| Bewertungskriterium                      | HEP | Maximale Punkte |
| ---------------------------------------- | --- | --------------- |
| Frontend: Navigationsleiste              |  2  | 2               |
| Frontend: Informationsabschnitt          |  2  | 2               |
| Frontend: Eingabe und Senden             |  5  | 5               |
| Frontend: Empfangen und Ausgabe          |  5  | 5               |
| Backend: Effekt und JSON-Antwort         |  3  | 5               |
| Backend: Cookie                          |  0  | 3               |
| Darstellung / Layout: Responsives Layout |  1  | 4               |
| Canvas                                   |  4  | 4               |
| Validierung: Frontend                    |  6  | 6               |
| Validierung: Backend                     |  6  | 6               |
| Zusatztechnik                            |  6  | 6               |
| Einhaltung des Abgabeformats             |  1  | 1               |
| Einhaltung der Limiten                   |  0  | 1               |
