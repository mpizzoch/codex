# Verifica requisiti vs documentazione

Piccola app client-side che confronta un file di requisiti con una o più fonti documentali caricate dall'utente.

## Funzionalità

- upload di un file requisiti in formato `.txt`, `.md`, `.csv` o `.json`;
- upload di più file di documentazione;
- estrazione automatica dei requisiti come elenco di righe/voci;
- valutazione euristica della copertura in tre stati: **coperto**, **parziale**, **non coperto**;
- riepilogo con conteggi e dettaglio della migliore evidenza documentale per ogni requisito;
- dataset di esempio incorporato per testare subito il flusso.

## Avvio

Essendo un'app statica, basta aprire `index.html` nel browser oppure servire la cartella con un web server minimale:

```bash
python3 -m http.server 8000
```

Poi visita `http://localhost:8000`.

## Come funziona

1. Il file di requisiti viene letto interamente nel browser.
2. I requisiti vengono estratti da righe o array JSON.
3. Ogni requisito viene tokenizzato e confrontato con i token presenti nei documenti caricati.
4. La copertura è stimata in base alla percentuale di keyword condivise.
5. L'app mostra il documento con il punteggio migliore e una frase di evidenza.

## Limiti attuali

- il matching è lessicale/euristico, non semantico;
- non interroga documentazione remota: lavora sui file caricati localmente;
- PDF e DOCX non sono ancora supportati;
- per requisiti complessi può essere utile affinare keyword, stopword o soglie.
