/**
 * ReferenciaApi.jsx — Rutas de la API
 * -----------------------------------------------------------------------------
 * Se extrajo a un componente porque aparece en dos lugares: en la ficha de cada
 * diseño y en la pantalla de Integración. Duplicarla garantizaría que una de
 * las dos copias quede desactualizada.
 */

import { Row, Col, Card, Badge, Stack, Alert } from 'react-bootstrap';

const RUTAS = [
  { metodo: 'POST', ruta: '/api/v1/documents',
    que: 'Emite un comprobante y devuelve el enlace al PDF' },
  { metodo: 'GET', ruta: '/api/v1/documents',
    que: 'Lista comprobantes. Filtre por receptor, fecha o tipo' },
  { metodo: 'GET', ruta: '/api/v1/documents/:id',
    que: 'Consulta un comprobante por su id o por su clave de 50 dígitos' },
  { metodo: 'GET', ruta: '/api/v1/documents/:id/pdf',
    que: 'Genera un enlace nuevo al PDF cuando el anterior caducó' },
  { metodo: 'POST', ruta: '/api/v1/documents/:id/nota-credito',
    que: 'Anula o corrige un comprobante ya emitido' },
  { metodo: 'POST', ruta: '/api/v1/documents/preview',
    que: 'Devuelve el comprobante sin emitirlo ni consumir numeración' },
];

const RESPUESTA = `{
  "id": "6712...",
  "clave": "50617082603101123456...",
  "consecutivo": "00100001010000000042",
  "total": 15000,
  "pdf": {
    "url": "https://storage.googleapis.com/...",
    "expiraEn": "2026-08-17T10:10:00.000Z"
  }
}`;

const ERROR = `{
  "error": "VALIDATION_FAILED",
  "cantidadErrores": 2,
  "detalles": [
    {
      "campo": "receptor.identificacion.numero",
      "regla": "cedula",
      "mensaje": "cédula física: 9 dígitos, sin cero inicial ni guiones",
      "recibido": "1-1234-5678"
    },
    {
      "campo": "resumen.medioPago[0].tipoMedioPago",
      "regla": "catalogo",
      "nota": 6,
      "mensaje": "código no existe en el catálogo de la nota 6"
    }
  ]
}`;

export default function ReferenciaApi() {
  return (
    <Row className="g-4">
      <Col lg={5}>
        <Card>
          <Card.Body>
            <h2 className="h6 mb-3">Rutas disponibles</h2>
            <Stack gap={3}>
              {RUTAS.map((r) => (
                <div key={r.metodo + r.ruta}>
                  <div>
                    <Badge bg={r.metodo === 'GET' ? 'secondary' : 'primary'} className="fw-normal me-2">
                      {r.metodo}
                    </Badge>
                    <code className="small">{r.ruta}</code>
                  </div>
                  <div className="small text-secondary mt-1">{r.que}</div>
                </div>
              ))}
            </Stack>
          </Card.Body>
        </Card>

        <Alert variant="light" className="border small mt-3 mb-0">
          Todas las rutas se autentican con el encabezado <code>x-api-key</code>.
          Cree su llave en Integración.
        </Alert>
      </Col>

      <Col lg={7}>
        <Card className="mb-3">
          <Card.Body>
            <h2 className="h6">Respuesta al emitir</h2>
            <pre
              className="bg-body-secondary rounded p-3 mb-0 font-monospace"
              style={{ fontSize: '.75rem', overflow: 'auto' }}
            >{RESPUESTA}</pre>
            <p className="small text-secondary mt-2 mb-0">
              El enlace caduca a los 10 minutos. Pídalo cuando el usuario abra la
              pantalla; no lo guarde en su base de datos.
            </p>
          </Card.Body>
        </Card>

        <Card>
          <Card.Body>
            <h2 className="h6">Si el comprobante no valida</h2>
            <p className="small text-secondary">
              Devuelve <code>422</code> con todos los campos por corregir, no solo
              el primero. No se emite nada ni se consume numeración.
            </p>
            <pre
              className="bg-body-secondary rounded p-3 mb-0 font-monospace"
              style={{ fontSize: '.75rem', overflow: 'auto' }}
            >{ERROR}</pre>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
}
