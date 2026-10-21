const express = require('express');
const path = require('path');
const { randomUUID } = require('crypto');

const app = express();
const PORT = process.env.PORT || 8080;
const jugadores = new Map();
const MASCOTAS = new Set(['Hipodoge', 'Capipepo', 'Ratigueya']);
const ATAQUES = new Set(['FUEGO', 'AGUA', 'TIERRA']);
const JUGADOR_INACTIVO_MS = 60_000;

app.use(express.json());
// Servir los archivos desde esta carpeta, independientemente de dónde se ejecute npm.
app.use(express.static(path.join(__dirname, 'public')));

class Jugador {
  constructor(id) {
    this.id = id;
    this.mokepon = null;
    this.x = 0;
    this.y = 0;
    this.ataques = [];
    this.ultimaActividad = Date.now();
  }
  actividad() { this.ultimaActividad = Date.now(); }
}

function buscarJugador(id) {
  const jugador = jugadores.get(id);
  if (jugador) jugador.actividad();
  return jugador;
}

function limpiarJugadoresInactivos() {
  const limite = Date.now() - JUGADOR_INACTIVO_MS;
  for (const [id, jugador] of jugadores) {
    if (jugador.ultimaActividad < limite) jugadores.delete(id);
  }
}

app.get('/unirse', (_req, res) => {
  limpiarJugadoresInactivos();
  const id = randomUUID();
  jugadores.set(id, new Jugador(id));
  res.type('text/plain').send(id);
});

app.post('/mokepon/:jugadorId', (req, res) => {
  const jugador = buscarJugador(req.params.jugadorId);
  if (!jugador) return res.status(404).json({ error: 'Jugador no encontrado. Recarga la página.' });

  const nombre = req.body?.mokepon;
  if (!MASCOTAS.has(nombre)) return res.status(400).json({ error: 'Mascota no válida.' });

  jugador.mokepon = { nombre };
  jugador.ataques = [];
  res.sendStatus(204);
});

app.post('/mokepon/:jugadorId/posicion', (req, res) => {
  limpiarJugadoresInactivos();
  const jugador = buscarJugador(req.params.jugadorId);
  if (!jugador) return res.status(404).json({ error: 'Jugador no encontrado. Recarga la página.' });

  const x = Number(req.body?.x);
  const y = Number(req.body?.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return res.status(400).json({ error: 'Las coordenadas deben ser números.' });
  }
  jugador.x = x;
  jugador.y = y;

  const enemigos = [...jugadores.values()]
    .filter((otro) => otro.id !== jugador.id && otro.mokepon)
    .map((otro) => ({
      id: otro.id,
      mokepon: otro.mokepon,
      x: otro.x,
      y: otro.y,
      ataques: otro.ataques,
    }));
  res.json({ enemigos });
});

app.post('/mokepon/:jugadorId/ataques', (req, res) => {
  const jugador = buscarJugador(req.params.jugadorId);
  if (!jugador) return res.status(404).json({ error: 'Jugador no encontrado. Recarga la página.' });

  const ataques = req.body?.ataques;
  if (!Array.isArray(ataques) || ataques.length !== 5 || ataques.some((ataque) => !ATAQUES.has(ataque))) {
    return res.status(400).json({ error: 'Debes enviar exactamente cinco ataques válidos.' });
  }
  jugador.ataques = [...ataques];
  res.sendStatus(204);
});

app.get('/mokepon/:jugadorId/ataques', (req, res) => {
  const jugador = buscarJugador(req.params.jugadorId);
  if (!jugador) return res.status(404).json({ error: 'Jugador no encontrado. Recarga la página.' });
  res.json({ ataques: jugador.ataques });
});

app.post('/salir/:jugadorId', (req, res) => {
  jugadores.delete(req.params.jugadorId);
  res.sendStatus(204);
});

app.get('/estado', (_req, res) => {
  limpiarJugadoresInactivos();
  res.json({ jugadores: jugadores.size });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor Mokepon listo en http://localhost:${PORT}`);
  console.log('Abre la dirección en dos pestañas o ventanas para probar dos jugadores.');
});
