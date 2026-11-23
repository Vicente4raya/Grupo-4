const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

app.use(express.json());
app.use(cors());

// Conexión a la base de datos en MongoDB Atlas
const MONGO_URI =
  'mongodb+srv://arcerojas13thias_db_user:7Hjcmc2Lxk0azEzY@cluster0.ivpfac8.mongodb.net/modulo1_mascotas?retryWrites=true&w=majority';

mongoose.connect(MONGO_URI)
  .then(() => console.log('🟢 Conectado exitosamente a MongoDB Atlas (Nube)'))
  .catch((err) => console.error('🔴 Error al conectar con MongoDB:', err));

// Esquema de la Mascota en MongoDB
const MascotaSchema = new mongoose.Schema({
  microchip: {
    type: String,
    required: true,
    unique: true
  },
  nombre: {
    type: String,
    required: true
  },
  especie: {
    type: String,
    required: true
  },
  raza: String,
  tutorRut: {
    type: String,
    required: true
  },
  tutorNombre: String,
  estadoVital: {
    type: String,
    default: 'Vivo'
  },
  fechaRegistro: {
    type: Date,
    default: Date.now
  }
});

const Mascota = mongoose.model('Mascota', MascotaSchema);

// Ruta principal de prueba
app.get('/', (req, res) => {
  res.send('🟢 Servidor del Módulo 1 (Registro de animales y tutores) ACTIVO');
});

// -------------------------------------------------------------
// HISTORIAS DE USUARIO - MÓDULO 1
// -------------------------------------------------------------

// HU-01 (Axel): Registrar nuevo animal
app.post('/api/registro/animales', async (req, res) => {
  try {
    const nuevaMascota = new Mascota(req.body);
    await nuevaMascota.save();

    res.status(201).json({
      mensaje: 'Animal registrado con éxito (HU-01)',
      mascota: nuevaMascota
    });
  } catch (error) {
    res.status(400).json({
      error: 'Error al registrar animal',
      detalle: error.message
    });
  }
});

// HU-02 (Mathias): Consultar ficha de animal por ID o Microchip
app.get('/api/registro/animales/:id', async (req, res) => {
  try {
    const idOrChip = req.params.id;
    const isObjectId = mongoose.Types.ObjectId.isValid(idOrChip);

    const mascota = await Mascota.findOne({
      $or: [
        { _id: isObjectId ? idOrChip : null },
        { microchip: idOrChip }
      ]
    });

    if (!mascota) {
      return res.status(404).json({
        error: 'Mascota no encontrada'
      });
    }

    res.status(200).json(mascota);
  } catch (error) {
    res.status(500).json({
      error: 'Error al consultar ficha',
      detalle: error.message
    });
  }
});

// HU-03 (Jusepe): Consultar animales por RUT de tutor
app.get('/api/registro/animales', async (req, res) => {
  try {
    const { tutorRut } = req.query;

    if (!tutorRut) {
      return res.status(400).json({
        error: 'Se requiere el parámetro tutorRut'
      });
    }

    const mascotas = await Mascota.find({ tutorRut });
    res.status(200).json(mascotas);
  } catch (error) {
    res.status(500).json({
      error: 'Error al consultar mascotas del tutor',
      detalle: error.message
    });
  }
});

// HU-04 (Vicente): Actualizar/Transferir tutor de un animal
app.patch('/api/registro/animales/:id/tutor', async (req, res) => {
  try {
    const { nuevoTutorRut, nuevoTutorNombre } = req.body;

    const mascotaActualizada = await Mascota.findByIdAndUpdate(
      req.params.id,
      {
        tutorRut: nuevoTutorRut,
        tutorNombre: nuevoTutorNombre
      },
      { new: true }
    );

    if (!mascotaActualizada) {
      return res.status(404).json({
        error: 'Mascota no encontrada'
      });
    }

    res.status(200).json({
      mensaje: 'Tutor actualizado con éxito (HU-04)',
      mascota: mascotaActualizada
    });
  } catch (error) {
    res.status(500).json({
      error: 'Error al transferir tutor',
      detalle: error.message
    });
  }
});

// Puerto de ejecución
const PORT = 3000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
});
