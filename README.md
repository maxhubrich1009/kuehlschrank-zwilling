# Kühlschrank-Zwilling · v0.1

Digitaler Zwilling des Kühlschrankinhalts – Variante 1.

## Aktueller Scope
- Produkte anlegen
- Bestand und Einheit verwalten
- Freie Mengenänderungen / Verbrauch erfassen
- MHD-Warnungen
- Verbrauchshistorie
- einfache Leerstands-/Verbrauchsprognose
- automatische Einkaufsliste über Mindestbestand
- lokale Persistenz im Browser

## Datenmodell
PRODUCT → INVENTORY → EVENT

Events enthalten Typ, Quelle und Confidence. Dadurch kann Variante 2 später dieselbe Bestandslogik über Aktionen wie `CONSUMPTION` bedienen, ohne die UI neu zu bauen.

## Bewusst noch nicht in v0.1
Kamera/KI, Barcode-Scanner, Sensoren, Rezepte, mehrere Nutzer und weitere Küchenbereiche.

## Start
```bash
npm install
npm run dev
```
Dann http://localhost:3000 öffnen.

Technischer Startpunkt ist Next.js App Router. Die offizielle Next.js-Dokumentation beschreibt App Router als aktuellen Routing-Ansatz; der Projektaufbau nutzt `app/page.tsx` und `app/layout.tsx`. 
