/**
 * Integracion.jsx — Llaves de API y adaptadores
 * -----------------------------------------------------------------------------
 * Acá el cliente conecta su sistema: genera una llave y define cómo se traduce
 * su JSON al comprobante.
 *
 * El probador de adaptadores es la pieza importante. Deja ver el resultado de
 * la traducción y los errores de validación ANTES de emitir nada, sin gastar
 * consecutivos ni ensuciar el historial.
 */

import { useEffect, useState } from 'react';
import {
  Container, Row, Col, Card, Table, Form, Button, Badge, Spinner,
  Alert, Modal, Tabs, Tab, Stack, ListGroup,
} from 'react-bootstrap';
import { api } from '../api';
import ReferenciaApi from '../components/ReferenciaApi';

export default function Integracion() {
  return (
    <Container fluid className="py-4 px-4">
      <h1 className="h4 mb-1">Integración</h1>
      <p className="text-secondary small mb-4">
        Conecte su sistema para que emita comprobantes automáticamente.
      </p>

      <Tabs defaultActiveKey="llaves" className="mb-4">
        <Tab eventKey="llaves" title="Llaves">
          <Llaves />
        </Tab>
        <Tab eventKey="adaptadores" title="Adaptadores">
          <Adaptadores />
        </Tab>
        <Tab eventKey="referencia" title="Referencia de la API">
          <ReferenciaApi />
        </Tab>
      </Tabs>
    </Container>
  );
}

// -----------------------------------------------------------------------------
// Llaves
// -----------------------------------------------------------------------------

function Llaves() {
  const [llaves, setLlaves] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [nombre, setNombre] = useState('');
  const [nueva, setNueva] = useState(null);
  const [copiada, setCopiada] = useState(false);

  async function cargar() {
    try {
      const r = await api.llaves();
      setLlaves(r.llaves);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargar(); }, []);

  async function crear(e) {
    e.preventDefault();
    try {
      const r = await api.crearLlave(nombre);
      setNueva(r);
      setNombre('');
      setCopiada(false);
      cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  async function revocar(id) {
    try {
      await api.revocarLlave(id);
      cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  if (cargando) return <div className="py-5 text-center"><Spinner animation="border" /></div>;

  return (
    <>
      {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}

      <Row className="g-4">
        <Col lg={7}>
          <Card>
            <Card.Body>
              {llaves.length === 0 ? (
                <p className="text-secondary mb-0 py-3 text-center">
                  Todavía no hay llaves. Cree una para conectar su sistema.
                </p>
              ) : (
                <Table className="mb-0 align-middle">
                  <thead>
                    <tr className="small text-secondary">
                      <th>Nombre</th><th>Llave</th><th>Último uso</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {llaves.map((k) => (
                      <tr key={k.id} className={k.revocada ? 'text-secondary' : ''}>
                        <td>
                          {k.nombre}
                          {k.revocada && <Badge bg="secondary" className="ms-2 fw-normal">Revocada</Badge>}
                        </td>
                        <td><code className="small">{k.prefijo}</code></td>
                        <td className="small">
                          {k.ultimoUso
                            ? new Date(k.ultimoUso).toLocaleDateString('es-CR')
                            : 'Sin usar'}
                        </td>
                        <td className="text-end">
                          {!k.revocada && (
                            <Button size="sm" variant="outline-danger" onClick={() => revocar(k.id)}>
                              Revocar
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col lg={5}>
          <Card>
            <Card.Body>
              <h2 className="h6">Crear una llave</h2>
              <p className="small text-secondary">
                Use una llave distinta por cada sistema que conecte. Así puede
                revocar una sin afectar a las demás.
              </p>
              <Form onSubmit={crear}>
                <Form.Group className="mb-3">
                  <Form.Label className="small">Para qué sistema es</Form.Label>
                  <Form.Control
                    value={nombre} required
                    placeholder="Sistema de gestión del club"
                    onChange={(e) => setNombre(e.target.value)}
                  />
                </Form.Group>
                <Button type="submit" variant="primary" size="sm">Crear llave</Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* La llave se muestra una sola vez: después solo queda su hash. */}
      <Modal show={Boolean(nueva)} onHide={() => setNueva(null)} backdrop="static">
        <Modal.Header closeButton>
          <Modal.Title className="h6">Su llave nueva</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="warning" className="small">
            Cópiela ahora. Por seguridad no se puede volver a mostrar; si la
            pierde, revoque esta y cree otra.
          </Alert>
          <Form.Control
            readOnly value={nueva?.llave || ''}
            onFocus={(e) => e.target.select()}
            className="font-monospace small mb-2"
          />
          <Button
            size="sm" variant="outline-secondary"
            onClick={() => {
              navigator.clipboard.writeText(nueva.llave);
              setCopiada(true);
            }}
          >
            {copiada ? 'Copiada' : 'Copiar'}
          </Button>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={() => setNueva(null)}>Ya la guardé</Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

// -----------------------------------------------------------------------------
// Adaptadores
// -----------------------------------------------------------------------------

function Adaptadores() {
  const [propios, setPropios] = useState([]);
  const [ejemplos, setEjemplos] = useState([]);
  const [seleccionado, setSeleccionado] = useState(null);
  const [entrada, setEntrada] = useState('{}');
  const [resultado, setResultado] = useState(null);
  const [probando, setProbando] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.adaptadores()
      .then((r) => {
        setPropios(r.propios);
        setEjemplos(r.catalogo);
        const inicial = r.propios[0] || r.catalogo[0] || null;
        setSeleccionado(inicial);
        if (inicial?.ejemploEntrada) {
          setEntrada(JSON.stringify(inicial.ejemploEntrada, null, 2));
        }
      })
      .catch((err) => setError(err.message));
  }, []);

  async function probar() {
    setProbando(true);
    setError(null);
    try {
      const datos = JSON.parse(entrada);
      setResultado(await api.probarAdaptador(seleccionado, datos));
    } catch (err) {
      setError(err instanceof SyntaxError ? 'El JSON de entrada tiene un error de formato' : err.message);
      setResultado(null);
    } finally {
      setProbando(false);
    }
  }

  const todos = [...propios, ...ejemplos.filter((e) => !propios.some((p) => p.nombre === e.nombre))];

  return (
    <>
      {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}

      <Row className="g-4">
        <Col lg={3}>
          <ListGroup>
            {todos.map((a) => (
              <ListGroup.Item
                key={a.nombre} action
                active={seleccionado?.nombre === a.nombre}
                onClick={() => {
                  setSeleccionado(a);
                  setResultado(null);
                  if (a.ejemploEntrada) setEntrada(JSON.stringify(a.ejemploEntrada, null, 2));
                }}
              >
                <div className="fw-medium">{a.titulo || a.nombre}</div>
                <div className="small opacity-75">{a.paraQuien || a.tipoComprobante}</div>
              </ListGroup.Item>
            ))}
          </ListGroup>
        </Col>

        <Col lg={9}>
          <Card>
            <Card.Body>
              <div className="d-flex align-items-center mb-3">
                <div className="flex-grow-1">
                  <h2 className="h6 mb-0">Probar la traducción</h2>
                  <p className="small text-secondary mb-0">
                    No emite nada ni consume numeración.
                  </p>
                </div>
                <Button size="sm" onClick={probar} disabled={probando || !seleccionado}>
                  {probando ? 'Probando…' : 'Probar'}
                </Button>
              </div>

              <Row className="g-3">
                <Col md={6}>
                  <Form.Label className="small">JSON que envía su sistema</Form.Label>
                  <Form.Control
                    as="textarea" rows={14}
                    className="font-monospace" style={{ fontSize: '.8rem' }}
                    value={entrada}
                    onChange={(e) => setEntrada(e.target.value)}
                  />
                </Col>
                <Col md={6}>
                  <Form.Label className="small">Comprobante resultante</Form.Label>
                  <div
                    className="border rounded bg-body-secondary p-2 font-monospace"
                    style={{ fontSize: '.75rem', height: 320, overflow: 'auto' }}
                  >
                    <pre className="mb-0">
                      {resultado ? JSON.stringify(resultado.canonico, null, 2) : '—'}
                    </pre>
                  </div>
                </Col>
              </Row>

              {resultado && (
                <div className="mt-3">
                  {resultado.validacion.valido ? (
                    <Alert variant="success" className="small mb-0">
                      El comprobante cumple con la estructura v4.4. Total:{' '}
                      <strong>{resultado.resumen?.totalComprobante ?? '—'}</strong>
                    </Alert>
                  ) : (
                    <Alert variant="warning" className="small mb-0">
                      <strong>
                        {resultado.validacion.errores.length} campo(s) por corregir:
                      </strong>
                      <ul className="mb-0 mt-2">
                        {resultado.validacion.errores.map((e, i) => (
                          <li key={i}>
                            <code>{e.campo}</code> — {e.mensaje}
                            {e.nota && <span className="text-secondary"> (nota {e.nota})</span>}
                          </li>
                        ))}
                      </ul>
                    </Alert>
                  )}
                </div>
              )}
            </Card.Body>
          </Card>

          {seleccionado && (
            <Card className="mt-3">
              <Card.Body>
                <h2 className="h6">Cómo está configurado</h2>
                <pre
                  className="bg-body-secondary rounded p-3 mb-0 font-monospace"
                  style={{ fontSize: '.75rem', maxHeight: 260, overflow: 'auto' }}
                >
                  {JSON.stringify(seleccionado, null, 2)}
                </pre>
              </Card.Body>
            </Card>
          )}
        </Col>
      </Row>
    </>
  );
}
