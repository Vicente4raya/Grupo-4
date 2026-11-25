const URL_NUCLEO = 'https://nucleo-tr.onrender.com/api/nucleo';
const URL_SESION_ACTUAL = `${URL_NUCLEO}/sesiones/actual`;

async function verificarSesion(req, res, next) {
  const authorization = req.get('authorization');

  if (!authorization || !/^Bearer\s+\S+$/i.test(authorization)) {
    return res.status(401).json({
      error: { codigo: 'NO_AUTORIZADO', mensaje: 'Falta un token Bearer válido' }
    });
  }

  try {
    const respuesta = await fetch(URL_SESION_ACTUAL, {
      method: 'GET',
      headers: { Authorization: authorization },
      signal: AbortSignal.timeout(8000)
    });

    if (respuesta.status === 401 || respuesta.status === 403) {
      return res.status(401).json({
        error: { codigo: 'TOKEN_INVALIDO', mensaje: 'Token inválido o expirado' }
      });
    }

    if (!respuesta.ok) {
      return res.status(503).json({
        error: { codigo: 'NUCLEO_NO_DISPONIBLE', mensaje: 'No se pudo validar la sesión' }
      });
    }

    const usuario = await respuesta.json();
    if (!usuario || typeof usuario !== 'object' || !usuario.perfil) {
      return res.status(401).json({
        error: { codigo: 'SESION_INVALIDA', mensaje: 'El Núcleo devolvió una sesión inválida' }
      });
    }

    req.usuario = usuario;
    next();
  } catch (error) {
    return res.status(503).json({
      error: { codigo: 'NUCLEO_NO_DISPONIBLE', mensaje: 'No fue posible comunicarse con el Núcleo' }
    });
  }
}

function autorizarPerfiles(...perfilesPermitidos) {
  const permitidos = new Set(perfilesPermitidos.map(perfil => String(perfil).toLowerCase()));

  return (req, res, next) => {
    const perfil = String(req.usuario?.perfil || '').toLowerCase();

    if (!perfil || !permitidos.has(perfil)) {
      return res.status(403).json({
        error: { codigo: 'PERFIL_NO_AUTORIZADO', mensaje: 'Tu perfil no tiene permiso para esta acción' }
      });
    }

    next();
  };
}

async function consultarUsuarioNucleo(rut, authorization) {
  try {
    const respuesta = await fetch(`${URL_NUCLEO}/usuarios/${encodeURIComponent(rut)}`, {
      method: 'GET',
      headers: { Authorization: authorization },
      signal: AbortSignal.timeout(8000)
    });

    let datos = null;
    try {
      datos = await respuesta.json();
    } catch (error) {
    }

    return { status: respuesta.status, datos };
  } catch (error) {
    return { status: 503, datos: null };
  }
}

module.exports = { verificarSesion, autorizarPerfiles, consultarUsuarioNucleo };
