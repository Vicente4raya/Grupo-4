const NUCLEO_SESIONES = 'https://nucleo-tr.onrender.com/api/nucleo/sesiones';
let sesion = null;

const loginSection = document.getElementById('loginSection');
const signedInSections = document.getElementById('signedInSections');
const sessionLabel = document.getElementById('sessionLabel');
const logoutButton = document.getElementById('logoutButton');
const loginMessage = document.getElementById('loginMessage');
const resultSection = document.getElementById('resultSection');
const resultTitle = document.getElementById('resultTitle');
const resultMessage = document.getElementById('resultMessage');
const resultData = document.getElementById('resultData');

function mostrarResultado(status, data, mensajeAlternativo = '') {
  const correcto = status >= 200 && status < 300;
  const codigo = status ? `HTTP ${status}` : 'Sin respuesta';
  const mensaje = data?.error?.mensaje || data?.mensaje || mensajeAlternativo || (correcto ? 'Operación completada.' : 'No se pudo completar la operación.');

  resultSection.hidden = false;
  resultTitle.textContent = `${correcto ? '✓' : '✕'} ${codigo} · ${mensaje}`;
  resultTitle.className = `result-title ${correcto ? 'success' : 'error'}`;
  resultMessage.textContent = data?.error?.codigo ? `Código: ${data.error.codigo}` : '';

  const visibleData = { ...data };
  delete visibleData.token;
  if (visibleData.error) delete visibleData.error.detalle;
  resultData.textContent = Object.keys(visibleData).length ? JSON.stringify(visibleData, null, 2) : '';
  resultData.hidden = !resultData.textContent;
}

function mostrarSesion(usuario) {
  sesion = usuario;
  loginSection.hidden = true;
  signedInSections.hidden = false;
  sessionLabel.hidden = false;
  logoutButton.hidden = false;
  sessionLabel.textContent = `Sesión: ${usuario.nombre} (${usuario.perfil})`;
  loginMessage.hidden = true;
}

document.getElementById('loginForm').addEventListener('submit', async event => {
  event.preventDefault();
  const rut = document.getElementById('loginRut').value.trim();
  const clave = document.getElementById('loginPassword').value;
  const submit = event.currentTarget.querySelector('button[type="submit"]');
  loginMessage.hidden = true;
  submit.disabled = true;
  submit.textContent = 'Ingresando…';

  try {
    const response = await fetch(NUCLEO_SESIONES, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rut, clave })
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.token) {
      loginMessage.textContent = data?.error?.mensaje || data?.mensaje || 'No se pudo iniciar sesión. Revisa el RUT y la clave.';
      loginMessage.className = 'message error';
      loginMessage.hidden = false;
      mostrarResultado(response.status, data);
      return;
    }

    if (!['funcionario', 'admin'].includes(String(data.perfil || '').toLowerCase())) {
      loginMessage.textContent = 'Este módulo está disponible para funcionarios y administradores.';
      loginMessage.className = 'message error';
      loginMessage.hidden = false;
      mostrarResultado(403, { error: { codigo: 'PERFIL_NO_AUTORIZADO', mensaje: loginMessage.textContent } });
      return;
    }

    mostrarSesion({ token: data.token, nombre: data.nombre, perfil: data.perfil, rut: data.rut });
    mostrarResultado(response.status, { nombre: data.nombre, perfil: data.perfil, rut: data.rut, expira: data.expira }, 'Sesión iniciada.');
    event.currentTarget.reset();
  } catch (error) {
    loginMessage.textContent = 'No se pudo conectar con el Núcleo. Revisa tu conexión e inténtalo nuevamente.';
    loginMessage.className = 'message error';
    loginMessage.hidden = false;
    mostrarResultado(0, {}, loginMessage.textContent);
  } finally {
    submit.disabled = false;
    submit.textContent = 'Ingresar';
  }
});

document.getElementById('transferForm').addEventListener('submit', async event => {
  event.preventDefault();
  if (!sesion?.token) return;

  const animalId = document.getElementById('transferAnimalId').value.trim();
  const sinTutor = document.getElementById('noTutor').checked;
  const tutorRut = sinTutor ? null : document.getElementById('newTutorRut').value.trim();
  const payload = { tutorRut };
  const submit = event.currentTarget.querySelector('button[type="submit"]');
  submit.disabled = true;

  try {
    const response = await fetch(`/api/registro/animales/${encodeURIComponent(animalId)}/tutor`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${sesion.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await response.json().catch(() => ({}));
    mostrarResultado(response.status, data);
    if (response.ok) {
      document.getElementById('transferForm').reset();
      const tutorInput = document.getElementById('newTutorRut');
      tutorInput.disabled = false;
      tutorInput.required = true;
    }
  } catch (error) {
    mostrarResultado(0, {}, 'No se pudo conectar con el servidor local. Comprueba que esté iniciado.');
  } finally {
    submit.disabled = false;
  }
});

document.getElementById('statusForm').addEventListener('submit', event => {
  event.preventDefault();
  mostrarResultado(0, {}, 'La ruta para guardar microchip y estado vital está pendiente de implementación.');
});

document.getElementById('noTutor').addEventListener('change', event => {
  const tutorRut = document.getElementById('newTutorRut');
  tutorRut.disabled = event.target.checked;
  tutorRut.required = !event.target.checked;
  if (event.target.checked) tutorRut.value = '';
});

logoutButton.addEventListener('click', () => {
  sesion = null;
  loginSection.hidden = false;
  signedInSections.hidden = true;
  sessionLabel.hidden = true;
  logoutButton.hidden = true;
  sessionLabel.textContent = '';
  document.getElementById('loginForm').reset();
  document.getElementById('transferForm').reset();
  const tutorInput = document.getElementById('newTutorRut');
  tutorInput.disabled = false;
  tutorInput.required = true;
  document.getElementById('statusForm').reset();
  resultSection.hidden = true;
  loginMessage.hidden = true;
});
