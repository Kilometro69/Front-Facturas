/**
 * api.js — Cliente HTTP del panel
 * -----------------------------------------------------------------------------
 * Un solo lugar donde se arma la petición, se adjunta el token y se traduce el
 * error del servidor a algo que la interfaz pueda mostrar.
 *
 * BASE_URL queda vacía por defecto: en desarrollo, el proxy de vite.config.js
 * redirige "/panel/..." a localhost:3000 sin que haga falta nada más. Si el
 * panel se despliega en un dominio DISTINTO al de la API (por ejemplo, cada
 * uno como su propio servicio en Railway), hay que setear VITE_API_URL en
 * tiempo de build para que las peticiones salgan hacia el dominio correcto en
 * vez de intentar pegarle a "/panel" del propio dominio del panel.
 */

const BASE_URL = import.meta.env.VITE_API_URL || '';

const LLAVE_TOKEN = 'facturacion.token';

export const token = {
  leer:    () => localStorage.getItem(LLAVE_TOKEN),
  guardar: (t) => localStorage.setItem(LLAVE_TOKEN, t),
  borrar:  () => localStorage.removeItem(LLAVE_TOKEN),
};

/** Error con los detalles que devuelve el servidor, no solo un mensaje. */
export class ErrorApi extends Error {
  constructor(mensaje, { status, codigo, detalles } = {}) {
    super(mensaje);
    this.status = status;
    this.codigo = codigo;
    this.detalles = detalles || [];
  }
}

async function pedir(ruta, { metodo = 'GET', cuerpo, comoTexto = false, comoBlob = false } = {}) {
  const t = token.leer();

  const respuesta = await fetch(`${BASE_URL}/panel${ruta}`, {
    method: metodo,
    headers: {
      ...(cuerpo ? { 'Content-Type': 'application/json' } : {}),
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
    },
    ...(cuerpo ? { body: JSON.stringify(cuerpo) } : {}),
  });

  // La sesión venció: se limpia y se recarga para volver al login.
  if (respuesta.status === 401 && t) {
    token.borrar();
    window.location.reload();
    return null;
  }

  if (comoTexto) {
    const texto = await respuesta.text();
    if (!respuesta.ok) throw new ErrorApi('No se pudo generar la vista previa', { status: respuesta.status });
    return texto;
  }

  // El PDF viaja como bytes directos (Content-Type: application/pdf), no como JSON.
  if (comoBlob) {
    if (!respuesta.ok) {
      const datos = await respuesta.json().catch(() => ({}));
      throw new ErrorApi(datos.mensaje || MENSAJES[datos.error] || 'No se pudo obtener el PDF', { status: respuesta.status, codigo: datos.error });
    }
    return respuesta.blob();
  }

  const datos = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok) {
    throw new ErrorApi(
      datos.mensaje || MENSAJES[datos.error] || 'Algo salió mal',
      { status: respuesta.status, codigo: datos.error, detalles: datos.detalles }
    );
  }
  return datos;
}

/** Mensajes en el idioma del usuario, no en el del sistema. */
const MENSAJES = {
  CREDENCIALES_INVALIDAS: 'Correo o contraseña incorrectos',
  DATOS_INCOMPLETOS: 'Complete todos los campos',
  LAYOUT_INVALIDO: 'La plantilla tiene bloques mal configurados',
  ADAPTADOR_INVALIDO: 'El adaptador tiene errores de configuración',
  NOMBRE_REQUERIDO: 'Escriba un nombre',
  SIN_PERMISO: 'Su rol no permite esta acción',
  NO_ENCONTRADA: 'No se encontró',
  NO_ENCONTRADO: 'No se encontró',
  PASSWORD_DEBIL: 'La contraseña debe tener al menos 8 caracteres',
  IDENTIFICACION_YA_REGISTRADA: 'Ya existe una cuenta registrada con esa identificación',
  CORREO_YA_REGISTRADO: 'Ya existe una cuenta registrada con ese correo',
  FALTA_PASSWORD_ACTUAL: 'Debe indicar su contraseña actual para cambiarla',
  PASSWORD_INCORRECTA: 'La contraseña actual no es correcta',
  SERVICIO_NO_DISPONIBLE: 'El servicio de Firma Digital no respondió. Intente de nuevo más tarde',
  CUENTA_YA_VERIFICADA: 'No se puede cambiar la identificación de una cuenta ya verificada',
  DISTRITO_INVALIDO: 'El distrito debe ser solo su código (1 o 2 dígitos), no la provincia y el cantón juntos',
};

export const api = {
  login:   (email, password) => pedir('/auth/login', { metodo: 'POST', cuerpo: { email, password } }),
  // registro: alta de un tenant nuevo + su primer usuario administrador. Devuelve, ademas del
  // token de sesion, la API key inicial (se muestra UNA sola vez, igual que las que se crean
  // despues desde la pantalla de Integración).
  registro: (tenant, usuario) => pedir('/auth/registro', { metodo: 'POST', cuerpo: { tenant, usuario } }),
  // ubicaciones: provincias y cantones para el formulario de registro (ruta pública, no exige token).
  ubicaciones: (provincia, canton) => {
    const parametros = new URLSearchParams();
    if (provincia) parametros.set('provincia', provincia);
    if (canton) parametros.set('canton', canton);
    const query = parametros.toString();
    return pedir(`/ubicaciones${query ? `?${query}` : ''}`);
  },
  yo:      () => pedir('/auth/me'),
  renovar: () => pedir('/auth/renovar', { metodo: 'POST' }),
  perfil:  () => pedir('/perfil'),
  // actualizarPerfil: usuario y tenant son opcionales e independientes -- se puede mandar
  // cualquiera de los dos, o los dos juntos.
  actualizarPerfil: (usuario, tenant) => pedir('/perfil', { metodo: 'PUT', cuerpo: { usuario, tenant } }),

  verificar: () => pedir('/verificacion', { metodo: 'POST' }),

  bloques:   () => pedir('/bloques'),
  modelos:   () => pedir('/modelos'),
  catalogos: (notas) => pedir(`/catalogos${notas ? `?notas=${notas.join(',')}` : ''}`),

  plantillas:       () => pedir('/plantillas'),
  crearPlantilla:   (datos) => pedir('/plantillas', { metodo: 'POST', cuerpo: datos }),
  guardarPlantilla: (id, datos) => pedir(`/plantillas/${id}`, { metodo: 'PUT', cuerpo: datos }),
  marcarPorDefecto: (id) => pedir(`/plantillas/${id}/por-defecto`, { metodo: 'POST' }),
  vistaPrevia:      (datos) => pedir('/plantillas/preview', { metodo: 'POST', cuerpo: datos, comoTexto: true }),

  documentos:    (params = {}) => pedir(`/documentos?${new URLSearchParams(params)}`),
  documento:     (id) => pedir(`/documentos/${id}`),
  pdf:           (id) => pedir(`/documentos/${id}/pdf`, { comoBlob: true }),

  llaves:      () => pedir('/llaves'),
  crearLlave:  (nombre) => pedir('/llaves', { metodo: 'POST', cuerpo: { nombre } }),
  revocarLlave: (id) => pedir(`/llaves/${id}`, { metodo: 'DELETE' }),

  adaptadores:        () => pedir('/adaptadores'),
  guardarAdaptador:   (datos) => pedir('/adaptadores', { metodo: 'POST', cuerpo: datos }),
  probarAdaptador:    (adaptador, entrada) =>
    pedir('/adaptadores/probar', { metodo: 'POST', cuerpo: { adaptador, entrada } }),
};
