# Kühlschrank-Zwilling · v0.1.2

Digitaler Zwilling des Kühlschrankinhalts – Variante 1.

## Was v0.1.2 enthält
- getrennte Datenmodelle für Produktstammdaten, Bestand und Bewegungen
- zentrale Produktkategorien mit passenden Icons
- freie Mengenänderungen statt 50-g-Zwang
- standardisierte interne Einheiten: g, ml, Stück
- haushaltsfreundliche Anzeige, z. B. 0,53 kg → 530 g
- Verbrauch als Dashboard je Artikel, 7/30 Tage
- Detailhistorie je Artikel
- MHD optional: kein MHD / MHD unbekannt / konkretes MHD
- MHD-Warnungen nur bei konkretem MHD
- Duplikatprüfung unabhängig von Groß-/Kleinschreibung
- bei vorhandenen Produkten: Bestand hinzufügen statt Doppelprodukt
- optionale Marke, Bild-URL und Packungsgröße
- Event-Typen `PURCHASE`, `CONSUMPTION`, `WASTE`, `ADJUSTMENT`
- Event-Quelle und Confidence für spätere Automatisierung
- lokale Browser-Persistenz inklusive Migration aus dem v0.1-Format
- automatische Einkaufsliste über Mindestbestand

## Datenmodell
`PRODUCT → STOCK → EVENT`

Ein Produkt beschreibt den Stammsatz. Ein Bestand beschreibt die aktuell vorhandene Menge, Lagerort und MHD. Jede Mengenänderung wird als Event gespeichert.

Für spätere Erkennung sind folgende Quellen vorgesehen:
`MANUAL`, `BARCODE`, `CAMERA_AI`, `WEIGHT_SENSOR`, `SMART_DEVICE`, `RECIPE`.

## Bewusst noch nicht in v0.1.2
Kamera/KI, Barcode-Scanner, Sensor-Hardware, Rezepte, mehrere Nutzer, automatische Bestellungen und weitere Küchenbereiche.

## Start lokal
```bash
npm install
npm run dev
```
Dann http://localhost:3000 öffnen.

## Update über GitHub + Vercel
1. Die Dateien aus diesem Projekt in dein bestehendes Repository `kuehlschrank-zwilling` übernehmen.
2. Wichtig: `app/` muss im Repository-Root liegen und `globals.css`, `layout.tsx` und `page.tsx` enthalten.
3. Commit nach `main` erstellen.
4. Vercel erkennt den neuen Commit automatisch und startet ein neues Deployment.

Falls die Anwendung bereits läuft, ist normalerweise kein manuelles Vercel-Deployment nötig.
