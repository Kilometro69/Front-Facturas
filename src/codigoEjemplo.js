/**
 * codigoEjemplo.js — Genera el código que el cliente pega en su aplicación
 * -----------------------------------------------------------------------------
 * A partir del adaptador elegido y de su ejemplo de entrada, se arma el llamado
 * real: la URL con el adaptador, los encabezados y el cuerpo con los campos que
 * ese rubro necesita.
 *
 * Se genera desde la definición del adaptador y no de una plantilla escrita a
 * mano: si mañana el adaptador cambia sus campos, el ejemplo cambia con él y no
 * queda documentación mintiendo.
 */

const BASE = 'https://api.billingkilometer.cr';

const sangrar = (obj, espacios = 2) =>
  JSON.stringify(obj, null, 2)
    .split('\n')
    .map((l, i) => (i === 0 ? l : ' '.repeat(espacios) + l))
    .join('\n');

/** Campos que el adaptador lee del JSON del cliente, para documentarlos. */
export function camposQueEspera(adaptador) {
  if (!adaptador) return [];

  const rutas = new Set();
  const recoger = (spec) => {
    if (typeof spec === 'string' && spec.startsWith('$')) rutas.add(spec);
    else if (spec && typeof spec === 'object' && spec.desde) rutas.add(spec.desde);
  };

  Object.values(adaptador.mapeo || {}).forEach(recoger);
  (adaptador.metadata || []).forEach(recoger);

  const lineas = new Set();
  Object.values(adaptador.lineas?.mapeo || {}).forEach((s) => {
    if (typeof s === 'string' && s.startsWith('$')) lineas.add(s);
    else if (s && typeof s === 'object' && s.desde) lineas.add(s.desde);
  });

  return {
    raiz: [...rutas].map((r) => r.slice(2)).sort(),
    linea: [...lineas].map((r) => r.slice(2)).sort(),
    arrayLineas: adaptador.lineas?.desde?.slice(2) || null,
  };
}

// -----------------------------------------------------------------------------

export function generarJavaScript(adaptador, plantillaId) {
  const cuerpo = sangrar(adaptador?.ejemploEntrada || {}, 2);

  return `// Emitir un comprobante desde su aplicación
const respuesta = await fetch(
  '${BASE}/api/v1/documents?adapter=${adaptador?.nombre || 'multa'}',
  {
    method: 'POST',
    headers: {
      'x-api-key': process.env.BILLING_KILOMETER_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      plantillaId: '${plantillaId || '<id-del-diseño>'}',
      datos: ${sangrar(adaptador?.ejemploEntrada || {}, 6)},
    }),
  }
);

if (!respuesta.ok) {
  const error = await respuesta.json();
  // error.detalles trae cada campo por corregir con la nota del anexo
  throw new Error(error.mensaje);
}

// El PDF viaja directo en el cuerpo de la respuesta (Content-Type: application/pdf).
// Los metadatos del comprobante van en encabezados X-*, porque el cuerpo ya es el PDF.
const clave = respuesta.headers.get('X-Clave');
const consecutivo = respuesta.headers.get('X-Consecutivo');
const pdfBytes = await respuesta.arrayBuffer();

// Entréguelo al usuario ahora (ej. res.type('pdf').send(Buffer.from(pdfBytes))
// desde su propio backend); no hace falta guardarlo, billing kilometer conserva
// el original y usted puede volver a pedirlo con GET /documents/:id/pdf.
return { clave, consecutivo, pdfBytes };`;
}

export function generarCurl(adaptador, plantillaId) {
  const datos = JSON.stringify(
    { plantillaId: plantillaId || '<id-del-diseño>', datos: adaptador?.ejemploEntrada || {} },
    null, 2
  );

  return `curl -X POST '${BASE}/api/v1/documents?adapter=${adaptador?.nombre || 'multa'}' \\
  -H 'x-api-key: SU_LLAVE' \\
  -H 'Content-Type: application/json' \\
  -d '${datos}' \\
  --output comprobante.pdf \\
  --dump-header -   # los metadatos (X-Clave, X-Consecutivo, ...) salen por stderr/stdout aparte`;
}

export function generarPhp(adaptador, plantillaId) {
  return `<?php
$carga = [
  'plantillaId' => '${plantillaId || '<id-del-diseño>'}',
  'datos' => ${phpArray(adaptador?.ejemploEntrada || {}, 2)},
];

$ch = curl_init('${BASE}/api/v1/documents?adapter=${adaptador?.nombre || 'multa'}');
curl_setopt_array($ch, [
  CURLOPT_POST => true,
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_HEADER => true, // se necesitan los encabezados X-Clave / X-Consecutivo
  CURLOPT_HTTPHEADER => [
    'x-api-key: ' . getenv('BILLING_KILOMETER_KEY'),
    'Content-Type: application/json',
  ],
  CURLOPT_POSTFIELDS => json_encode($carga),
]);

$respuestaCompleta = curl_exec($ch);
$tamanoCabeceras = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
curl_close($ch);

$cabeceras = substr($respuestaCompleta, 0, $tamanoCabeceras);
$pdfBytes = substr($respuestaCompleta, $tamanoCabeceras); // el PDF, directo

preg_match('/X-Clave:\\s*(\\S+)/i', $cabeceras, $m);
$clave = $m[1] ?? null;

// Entréguelo al usuario ahora (ej. header('Content-Type: application/pdf'); echo $pdfBytes;);
// no hace falta guardarlo, billing kilometer conserva el original.
file_put_contents("{$clave}.pdf", $pdfBytes);
return $pdfBytes;`;
}

/** JSON a array de PHP, para que el ejemplo se vea idiomático. */
function phpArray(valor, sangria = 0) {
  const pad = ' '.repeat(sangria);
  const padInterno = ' '.repeat(sangria + 2);

  if (Array.isArray(valor)) {
    if (valor.length === 0) return '[]';
    return `[\n${valor.map((v) => padInterno + phpArray(v, sangria + 2)).join(',\n')}\n${pad}]`;
  }
  if (valor && typeof valor === 'object') {
    const pares = Object.entries(valor)
      .map(([k, v]) => `${padInterno}'${k}' => ${phpArray(v, sangria + 2)}`);
    return `[\n${pares.join(',\n')}\n${pad}]`;
  }
  if (typeof valor === 'string') return `'${valor.replace(/'/g, "\\'")}'`;
  return String(valor);
}

export const LENGUAJES = [
  { clave: 'js', nombre: 'JavaScript', generar: generarJavaScript },
  { clave: 'php', nombre: 'PHP', generar: generarPhp },
  { clave: 'curl', nombre: 'cURL', generar: generarCurl },
];
