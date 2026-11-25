const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

app.use(express.json());
app.use(cors());

// Conexión segura usando la variable secreta de Render
const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI)
  .then(() => console.log('Conectado exitosamente a MongoDB Atlas'))
  .catch(err => console.error('Error al conectar con MongoDB:', err));

// Ruta principal
app.get('/', (req, res) => {
  res.json({
    mensaje: "Servidor del Grupo 4 funcionando correctamente"
  });
});

// Configuración del puerto
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
