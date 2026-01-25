const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Conectar a la base de datos
const db = new sqlite3.Database('./database.sqlite');

// Crear tablas si no existen
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS bloques (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha DATE NOT NULL,
    tipo_bloque TEXT NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    costo_total DECIMAL NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS inscripciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bloque_id INTEGER NOT NULL,
    nombre_alumno TEXT NOT NULL,
    ano_escolar INTEGER NOT NULL,
    codigo_acceso TEXT UNIQUE NOT NULL,
    fecha_inscripcion DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bloque_id) REFERENCES bloques (id)
  )`);
});

// Ruta para obtener todos los bloques con sus inscripciones
app.get('/api/bloques', (req, res) => {
  const query = `
    SELECT 
      b.*,
      GROUP_CONCAT(i.id) as inscripciones_ids,
      GROUP_CONCAT(i.nombre_alumno) as nombres,
      GROUP_CONCAT(i.ano_escolar) as anos,
      GROUP_CONCAT(i.codigo_acceso) as codigos
    FROM bloques b
    LEFT JOIN inscripciones i ON b.id = i.bloque_id
    GROUP BY b.id
    ORDER BY b.fecha, b.hora_inicio
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    // Procesar los resultados para que sean más fáciles de usar en el frontend
    const bloques = rows.map(row => {
      let inscripciones = [];
      if (row.inscripciones_ids) {
        const ids = row.inscripciones_ids.split(',');
        const nombres = row.nombres.split(',');
        const anos = row.anos.split(',').map(Number);
        const codigos = row.codigos.split(',');
        inscripciones = ids.map((id, index) => ({
          id: parseInt(id),
          nombre_alumno: nombres[index],
          ano_escolar: anos[index],
          codigo_acceso: codigos[index]
        }));
      }

      return {
        id: row.id,
        fecha: row.fecha,
        tipo_bloque: row.tipo_bloque,
        hora_inicio: row.hora_inicio,
        hora_fin: row.hora_fin,
        costo_total: row.costo_total,
        inscripciones: inscripciones
      };
    });

    res.json(bloques);
  });
});

// Ruta para inscribir un alumno
app.post('/api/inscribir', (req, res) => {
  const { bloque_id, nombre_alumno, ano_escolar, codigo_acceso } = req.body;

  // Verificar que el bloque no esté lleno (máximo 6 alumnos)
  db.get('SELECT COUNT(*) as count FROM inscripciones WHERE bloque_id = ?', [bloque_id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    if (row.count >= 6) {
      res.status(400).json({ error: 'El bloque está lleno' });
      return;
    }

    // Insertar la inscripción
    const stmt = db.prepare('INSERT INTO inscripciones (bloque_id, nombre_alumno, ano_escolar, codigo_acceso) VALUES (?, ?, ?, ?)');
    stmt.run(bloque_id, nombre_alumno, ano_escolar, codigo_acceso, function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      res.json({ 
        message: 'Inscripción exitosa',
        inscripcion_id: this.lastID 
      });
    });
    stmt.finalize();
  });
});

// Ruta para obtener una inscripción por código
app.get('/api/inscripcion/:codigo', (req, res) => {
  const { codigo } = req.params;

  db.get('SELECT * FROM inscripciones WHERE codigo_acceso = ?', [codigo], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    if (!row) {
      res.status(404).json({ error: 'Inscripción no encontrada' });
      return;
    }

    res.json(row);
  });
});

// Ruta para modificar una inscripción (cambiar de bloque)
app.put('/api/inscripcion/:codigo', (req, res) => {
  const { codigo } = req.params;
  const { nuevo_bloque_id } = req.body;

  // Verificar que el nuevo bloque no esté lleno
  db.get('SELECT COUNT(*) as count FROM inscripciones WHERE bloque_id = ?', [nuevo_bloque_id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    if (row.count >= 6) {
      res.status(400).json({ error: 'El nuevo bloque está lleno' });
      return;
    }

    // Actualizar la inscripción
    db.run('UPDATE inscripciones SET bloque_id = ? WHERE codigo_acceso = ?', [nuevo_bloque_id, codigo], function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      res.json({ message: 'Inscripción actualizada' });
    });
  });
});

// Ruta para cancelar una inscripción
app.delete('/api/inscripcion/:codigo', (req, res) => {
  const { codigo } = req.params;

  db.run('DELETE FROM inscripciones WHERE codigo_acceso = ?', [codigo], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    res.json({ message: 'Inscripción cancelada' });
  });
});

// Inicializar la base de datos con los bloques (solo una vez)
function inicializarBloques() {
  // Fechas de las 4 semanas: lunes a jueves desde el 26/01/2026
  const fechaInicio = new Date('2026-01-26');
  const bloques = [];

  for (let semana = 0; semana < 4; semana++) {
    for (let dia = 0; dia < 4; dia++) { // 0: lunes, 1: martes, 2: miércoles, 3: jueves
      const fecha = new Date(fechaInicio);
      fecha.setDate(fecha.getDate() + (semana * 7) + dia);

      // Bloque extendido: 3:30-5:00 (costo $9)
      bloques.push({
        fecha: fecha.toISOString().split('T')[0],
        tipo_bloque: 'extendido',
        hora_inicio: '15:30',
        hora_fin: '17:00',
        costo_total: 9.00
      });

      // Bloque estándar: 5:00-5:45 (costo $4.50)
      bloques.push({
        fecha: fecha.toISOString().split('T')[0],
        tipo_bloque: 'estandar',
        hora_inicio: '17:00',
        hora_fin: '17:45',
        costo_total: 4.50
      });
    }
  }

  // Insertar bloques si la tabla está vacía
  db.get('SELECT COUNT(*) as count FROM bloques', (err, row) => {
    if (err) throw err;

    if (row.count === 0) {
      const stmt = db.prepare('INSERT INTO bloques (fecha, tipo_bloque, hora_inicio, hora_fin, costo_total) VALUES (?, ?, ?, ?, ?)');
      bloques.forEach(bloque => {
        stmt.run(bloque.fecha, bloque.tipo_bloque, bloque.hora_inicio, bloque.hora_fin, bloque.costo_total);
      });
      stmt.finalize();
      console.log('Bloques inicializados');
    }
  });
}

inicializarBloques();

app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
