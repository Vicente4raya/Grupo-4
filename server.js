require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static('vistas'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'vistas', 'registro.html'));
});

const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI)
  .then(() => console.log('Conectado exitosamente a MongoDB Atlas'))
  .catch(err => console.error('Error al conectar con MongoDB:', err));

const MascotaSchema = new mongoose.Schema({
  animalId: {
    type: String,
    required: true,
    unique: true
  },
  especie: {
    type: String,
    required: true,
    trim: true
  },
  especieId: {
    type: String,
    required: true,
    trim: true
  },
  razaId: {
    type: String,
    default: null
  },
  raza: {
    type: String,
    default: null
  },
  razaObservada: {
    type: String,
    default: null,
    trim: true
  },
  nombre: {
    type: String,
    required: true,
    trim: true
  },
  sexo: {
    type: String,
    required: true,
    enum: ['macho', 'hembra']
  },
  edadAproximada: {
    type: Number,
    required: true,
    min: 0
  },
  microchip: {
    type: String,
    default: null,
    unique: true,
    sparse: true
  },
  estado: {
    type: String,
    enum: ['registrado', 'con_microchip', 'inscrito', 'fallecido'],
    default: 'registrado'
  },
  tutorRut: {
    type: String,
    default: null,
    trim: true
  },
  comunitario: {
    type: Boolean,
    default: false
  },
  responsableRut: {
    type: String,
    default: null,
    trim: true
  },
  historialTutores: [
    {
      tutorRut: String,
      fechaCambio: { type: Date, default: Date.now }
    }
  ],
  fechaRegistro: {
    type: Date,
    default: Date.now
  }
});

const Mascota = mongoose.model('Mascota', MascotaSchema);

app.post('/api/registro/animales', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        error: { codigo: 'NO_AUTORIZADO', mensaje: 'Falta el token de sesión' }
      });
    }

    let usuarioNucleo;
    try {
      const respNucleo = await fetch('https://nucleo-tr.onrender.com/api/nucleo/sesiones/actual', {
        headers: { Authorization: authHeader }
      });

      if (respNucleo.status === 401) {
        return res.status(401).json({
          error: { codigo: 'TOKEN_INVALIDO', mensaje: 'Token inválido o expirado' }
        });
      }
      if (!respNucleo.ok) {
        return res.status(503).json({
          error: { codigo: 'NUCLEO_NO_DISPONIBLE', mensaje: 'Error al validar sesión con el núcleo' }
        });
      }
      usuarioNucleo = await respNucleo.json();
    } catch (err) {
      return res.status(503).json({
        error: { codigo: 'NUCLEO_NO_DISPONIBLE', mensaje: 'El núcleo no responde' }
      });
    }

    const {
      especie, especieId, razaId, raza, razaObservada,
      nombre, sexo, edadAproximada, microchip, comunitario,
      tutorRut, responsableRut
    } = req.body;

    if (!especie || !especieId || !nombre || !sexo || edadAproximada === undefined) {
      return res.status(400).json({
        error: { codigo: 'DATOS_INCOMPLETOS', mensaje: 'Faltan campos obligatorios del animal' }
      });
    }

    if (!razaId && !razaObservada) {
      return res.status(400).json({
        error: { codigo: 'RAZA_REQUERIDA', mensaje: 'Debe indicar una raza o especificar raza observada si es mestizo' }
      });
    }

    if (microchip && !/^\d{15}$/.test(String(microchip))) {
      return res.status(400).json({
        error: { codigo: 'MICROCHIP_INVALIDO', mensaje: 'El microchip debe tener exactamente 15 dígitos numéricos' }
      });
    }

    const esComunitario = Boolean(comunitario);
    const rutTutorFinal = esComunitario ? null : String(tutorRut || usuarioNucleo.rut).trim();
    const rutResponsableFinal = esComunitario ? String(responsableRut || usuarioNucleo.rut).trim() : null;

    const regexRut = /^\d{7,8}-[\dkK]$/;
    if (rutTutorFinal && !regexRut.test(rutTutorFinal)) {
      return res.status(400).json({
        error: { codigo: 'RUT_INVALIDO', mensaje: 'El formato del RUT del tutor es inválido (ej: 11111111-1)' }
      });
    }
    if (rutResponsableFinal && !regexRut.test(rutResponsableFinal)) {
      return res.status(400).json({
        error: { codigo: 'RUT_INVALIDO', mensaje: 'El formato del RUT del responsable es inválido (ej: 11111111-1)' }
      });
    }

    const RUTS_PROHIBIDOS = ['9876543-3'];
    if (rutTutorFinal && RUTS_PROHIBIDOS.includes(rutTutorFinal)) {
      return res.status(409).json({
        error: { codigo: 'PROHIBICION_TENENCIA', mensaje: 'Este RUT tiene prohibición legal de tenencia de mascotas' }
      });
    }

    if (usuarioNucleo.perfil === 'vecino' && !esComunitario && rutTutorFinal !== usuarioNucleo.rut) {
      return res.status(403).json({
        error: { codigo: 'PERFIL_NO_AUTORIZADO', mensaje: 'Un vecino solo puede registrar mascotas a su propio RUT' }
      });
    }

    const totalAnimales = await Mascota.countDocuments();
    const nuevoAnimalId = `A-${String(totalAnimales + 1).padStart(6, '0')}`;

    const nuevaMascota = new Mascota({
      animalId: nuevoAnimalId,
      especie: String(especie).trim(),
      especieId: String(especieId).trim(),
      razaId: razaId ? String(razaId).trim() : null,
      raza: raza ? String(raza).trim() : null,
      razaObservada: razaObservada ? String(razaObservada).trim() : null,
      nombre: String(nombre).trim(),
      sexo: String(sexo).trim().toLowerCase(),
      edadAproximada: Number(edadAproximada),
      microchip: microchip ? String(microchip).trim() : null,
      estado: 'registrado',
      tutorRut: rutTutorFinal,
      comunitario: esComunitario,
      responsableRut: rutResponsableFinal
    });

    await nuevaMascota.save();

    res.status(201).json(nuevaMascota);

  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        error: { codigo: 'MICROCHIP_DUPLICADO', mensaje: 'Ese número de microchip ya está registrado' }
      });
    }
    res.status(400).json({
      error: { codigo: 'ERROR_REGISTRO', mensaje: 'No se pudo registrar el animal. Revise los datos enviados.' }
    });
  }
});

app.get('/api/estado', (req, res) => {
  res.json({
    mensaje: "Servidor del Grupo 4 funcionando correctamente"
  });
});

// Consulta paginada de animales (permite filtrar por RUT de tutor o responsable)
app.get('/api/registro/animales', async (req, res) => {
  try {
    // 1. Revisar que venga el token de sesión en el header Authorization
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        error: { codigo: 'NO_AUTORIZADO', mensaje: 'Falta el token de sesión' }
      });
    }

    // 2. Validar el token directamente contra el Núcleo
    let usuarioNucleo;
    try {
      const respNucleo = await fetch('https://nucleo-tr.onrender.com/api/nucleo/sesiones/actual', {
        headers: { Authorization: authHeader }
      });

      // Token vencido o no válido
      if (respNucleo.status === 401) {
        return res.status(401).json({
          error: { codigo: 'TOKEN_INVALIDO', mensaje: 'Token inválido o expirado' }
        });
      }
      // Error distinto al 401 desde el Núcleo
      if (!respNucleo.ok) {
        return res.status(503).json({
          error: { codigo: 'NUCLEO_NO_DISPONIBLE', mensaje: 'Error al validar sesión con el núcleo' }
        });
      }
      usuarioNucleo = await respNucleo.json();
    } catch (err) {
      // El servidor del Núcleo no respondió o hubo problema de red
      return res.status(503).json({
        error: { codigo: 'NUCLEO_NO_DISPONIBLE', mensaje: 'El núcleo no responde' }
      });
    }

    // 3. Leer parámetros de búsqueda (rut) y paginación (page y limit)
    const { rut } = req.query;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1); // Mínimo página 1
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100); // Entre 1 y 100 por página
    const skip = (page - 1) * limit; // Cuántos registros saltar según la página

    // 4. Armar el filtro de MongoDB si viene un RUT
    const filtro = {};
    if (rut) {
      const rutLimpio = String(rut).trim();
      filtro.$or = [
        { tutorRut: rutLimpio },
        { responsableRut: rutLimpio }
      ];
    }

    // 5. Contar total de resultados y traer solo la página pedida (más nuevos primero)
    const [total, animales] = await Promise.all([
      Mascota.countDocuments(filtro),
      Mascota.find(filtro)
        .sort({ fechaRegistro: -1 })
        .skip(skip)
        .limit(limit)
    ]);

    const totalPages = Math.max(Math.ceil(total / limit), 1);

    // 6. Responder con el listado y los datos de paginación
    return res.status(200).json({
      data: animales,
      paginacion: {
        total,
        page,
        limit,
        totalPages
      }
    });
  } catch (error) {
    // Error inesperado al consultar la base de datos
    return res.status(500).json({
      error: { codigo: 'ERROR_CONSULTA', mensaje: 'No se pudo obtener el listado de animales' }
    });
  }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});