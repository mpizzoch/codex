# Cubo stabile con Three.js

Applicazione web minimale che disegna un cubo 3D composto da sottocubi (`Nx * Ny * Nz`) usando Three.js.

## Interazioni

- **OrbitControls** per ruotare/zoomare la scena.
- **Click su un cubetto** per mostrare solo la riga corrispondente all'asse `y`.
- **Doppio click** per ripristinare la vista completa.

## Avvio

Essendo un'app statica, puoi aprire `index.html` direttamente o usare un server locale:

```bash
python3 -m http.server 8000
```

Poi apri `http://localhost:8000`.
