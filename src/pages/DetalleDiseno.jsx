/**
 * DetalleDiseno.jsx — Ficha de un diseño guardado
 * -----------------------------------------------------------------------------
 * Responde tres preguntas que el usuario tiene al abrir un diseño hecho:
 *   ¿Cómo se ve?        vista previa con el caso de uso que elija
 *   ¿Cómo lo uso?       el código exacto para su aplicación
 *   ¿Qué más hay?       referencia de las rutas de la API
 *
 * El código se genera a partir del adaptador, no de un texto fijo: si el
 * adaptador cambia sus campos, el ejemplo cambia con él.
 */

import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container, Row, Col, Card, Button, Spinner, Alert, Tabs, Tab,
  Form, Badge, Stack, Table,
} from 'react-bootstrap';
import { api } from '../api';
import { LENGUAJES, camposQueEspera } from '../codigoEjemplo';
import ReferenciaApi from '../components/ReferenciaApi';

export default function DetalleDiseno() {
  const { id } = useParams();
  const navegar = useNavigate();

  const [diseno, setDiseno] = useState(null);
  const [adaptadores, setAdaptadores] = useState([]);
  const [porCategoria, setPorCategoria] = useState({});
  const [elegido, setElegido] = useState('multa');
  const [html, setHtml] = useState('');
  const [lenguaje, setLenguaje] = useState('js');
  const [copiado, setCopiado] = useState(false);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    Promise.all([api.plantillas(), api.adaptadores()])
      .then(([p, a]) => {
        const d = p.plantillas.find((x) => String(x._id) === id);
        if (!d) throw new Error('No se encontró ese diseño');
        setDiseno(d);
        setAdaptadores(a.catalogo);
        setPorCategoria(a.porCategoria);
      })
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false));
  }, [id]);

  useEffect(() => {
    if (!diseno) return;
    api.vistaPrevia({ branding: diseno.branding, layout: diseno.layout, adaptador: elegido })
      .then(setHtml)
      .catch(() => setHtml(''));
  }, [diseno, elegido]);

  const adaptador = useMemo(
    () => adaptadores.find((a) => a.nombre === elegido),
    [adaptadores, elegido]
  );

  const codigo = useMemo(() => {
    const l = LENGUAJES.find((x) => x.clave === lenguaje);
    return l ? l.generar(adaptador, id) : '';
  }, [lenguaje, adaptador, id]);

  const campos = useMemo(() => camposQueEspera(adaptador), [adaptador]);

  if (cargando) {
    return <Container className="py-5 text-center"><Spinner animation="border" /></Container>;
  }
  if (error) {
    return (
      <Container className="py-5">
        <Alert variant="danger">{error}</Alert>
        <Button variant="outline-secondary" onClick={() => navegar('/')}>Volver al inicio</Button>
      </Container>
    );
  }

  return (
    <Container className="py-4" style={{ maxWidth: 1200 }}>
      <Row className="align-items-center mb-4">
        <Col>
          <h1 className="h4 mb-1">{diseno.nombre}</h1>
          <p className="text-secondary small mb-0">
            Modelo {diseno.modeloBase} · versión {diseno.version}
          </p>
        </Col>
        <Col xs="auto">
          <Stack direction="horizontal" gap={2}>
            <Button variant="outline-secondary" onClick={() => navegar('/')}>Inicio</Button>
            <Button variant="primary" onClick={() => navegar(`/disenos/${id}/editar`)}>
              Editar diseño
            </Button>
          </Stack>
        </Col>
      </Row>

      {/* Selector de caso de uso: aplica al preview y al código */}
      <Card className="mb-4">
        <Card.Body>
          <Row className="align-items-center g-3">
            <Col md={5}>
              <Form.Label className="small mb-1">Ver este diseño con un caso de uso</Form.Label>
              <Form.Select value={elegido} onChange={(e) => setElegido(e.target.value)}>
                {Object.entries(porCategoria).map(([categoria, lista]) => (
                  <optgroup key={categoria} label={categoria}>
                    {lista.map((a) => (
                      <option key={a.nombre} value={a.nombre}>{a.titulo}</option>
                    ))}
                  </optgroup>
                ))}
              </Form.Select>
            </Col>
            <Col md={7}>
              {adaptador && (
                <>
                  <p className="small mb-1">{adaptador.descripcion}</p>
                  <div className="small text-secondary">
                    <Badge bg="light" text="dark" className="border fw-normal me-2">
                      {adaptador.lineas ? 'Con líneas de detalle' : 'Sin líneas de detalle'}
                    </Badge>
                    {adaptador.paraQuien}
                  </div>
                </>
              )}
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Tabs defaultActiveKey="vista" className="mb-3">

        <Tab eventKey="vista" title="Cómo se ve">
          <div className="bg-body-secondary rounded p-3" style={{ maxHeight: '75vh', overflow: 'auto' }}>
            <iframe
              title="Vista previa del comprobante"
              srcDoc={html}
              sandbox=""
              style={{
                width: '210mm', minHeight: '297mm', border: 'none', background: '#fff',
                boxShadow: '0 2px 12px rgba(0,0,0,.12)', display: 'block', margin: '0 auto',
              }}
            />
          </div>
        </Tab>

        <Tab eventKey="uso" title="Cómo usarlo">
          <Row className="g-4">
            <Col lg={7}>
              <Card>
                <Card.Body>
                  <div className="d-flex align-items-center mb-3">
                    <div className="flex-grow-1">
                      <h2 className="h6 mb-0">Péguelo en su aplicación</h2>
                      <p className="small text-secondary mb-0">
                        Este diseño ya viene fijado en el llamado.
                      </p>
                    </div>
                    <Form.Select
                      size="sm" style={{ width: 130 }}
                      value={lenguaje} onChange={(e) => setLenguaje(e.target.value)}
                    >
                      {LENGUAJES.map((l) => (
                        <option key={l.clave} value={l.clave}>{l.nombre}</option>
                      ))}
                    </Form.Select>
                  </div>

                  <pre
                    className="bg-body-secondary rounded p-3 mb-2 font-monospace"
                    style={{ fontSize: '.75rem', maxHeight: 460, overflow: 'auto' }}
                  >{codigo}</pre>

                  <Button
                    size="sm" variant="outline-secondary"
                    onClick={() => { navigator.clipboard.writeText(codigo); setCopiado(true); setTimeout(() => setCopiado(false), 2000); }}
                  >
                    {copiado ? 'Copiado' : 'Copiar código'}
                  </Button>
                </Card.Body>
              </Card>
            </Col>

            <Col lg={5}>
              <Card className="mb-3">
                <Card.Body>
                  <h2 className="h6">Qué campos debe enviar</h2>
                  <p className="small text-secondary">
                    Los montos van calculados desde su sistema. La plataforma no
                    los deriva.
                  </p>

                  <Table size="sm" className="small mb-0">
                    <tbody>
                      {campos.raiz?.map((c) => (
                        <tr key={c}><td><code>{c}</code></td></tr>
                      ))}
                    </tbody>
                  </Table>

                  {campos.arrayLineas && (
                    <>
                      <h3 className="small text-secondary text-uppercase mt-3">
                        Por cada elemento de <code>{campos.arrayLineas}</code>
                      </h3>
                      <Table size="sm" className="small mb-0">
                        <tbody>
                          {campos.linea?.map((c) => (
                            <tr key={c}><td><code>{c}</code></td></tr>
                          ))}
                        </tbody>
                      </Table>
                    </>
                  )}
                </Card.Body>
              </Card>

              <Alert variant="light" className="border small mb-0">
                <strong>Antes de conectar,</strong> cree una llave en Integración
                y pruebe su JSON en el probador de adaptadores. Ahí verá los
                errores sin emitir nada.
              </Alert>
            </Col>
          </Row>
        </Tab>

        <Tab eventKey="api" title="Referencia de la API">
          <ReferenciaApi />
        </Tab>
      </Tabs>
    </Container>
  );
}
