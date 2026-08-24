/**
 * Inicio.jsx — Punto de entrada del panel
 * -----------------------------------------------------------------------------
 * Dos caminos: partir de un modelo predeterminado, o abrir un diseño ya hecho.
 *
 * El usuario llega acá sabiendo qué quiere hacer, no qué pantalla necesita, así
 * que la página se organiza por intención y no por entidad del sistema.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Row, Col, Card, Button, Spinner, Alert, Badge, Stack, Modal, Form,
} from 'react-bootstrap';
import { api } from '../api';

export default function Inicio() {
  const navegar = useNavigate();

  const [modelos, setModelos] = useState([]);
  const [disenos, setDisenos] = useState([]);
  const [porDefecto, setPorDefecto] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [creando, setCreando] = useState(null);

  useEffect(() => {
    Promise.all([api.modelos(), api.plantillas()])
      .then(([m, p]) => {
        setModelos(m.modelos);
        setDisenos(p.plantillas);
        setPorDefecto(p.porDefecto);
      })
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false));
  }, []);

  if (cargando) {
    return <Container className="py-5 text-center"><Spinner animation="border" /></Container>;
  }

  return (
    <Container className="py-5" style={{ maxWidth: 1100 }}>
      <div className="mb-5">
        <h1 className="h3 mb-1">¿Qué quiere hacer hoy?</h1>
        <p className="text-secondary mb-0">
          Diseñe cómo se ven sus comprobantes y conecte su sistema para emitirlos.
        </p>
      </div>

      {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}

      {/* ---------- Crear ---------- */}
      <section className="mb-5">
        <div className="d-flex align-items-baseline mb-3">
          <h2 className="h5 mb-0">Crear un diseño</h2>
          <span className="text-secondary small ms-3">Parta de un modelo y ajústelo</span>
        </div>

        <Row className="g-3">
          {modelos.map((m) => (
            <Col md={4} key={m.clave}>
              <Card className="h-100">
                <Card.Body className="d-flex flex-column">
                  <VistaModelo modelo={m} />
                  <h3 className="h6 mt-3 mb-1">{m.nombre}</h3>
                  <p className="small text-secondary flex-grow-1">{m.descripcion}</p>
                  <Button
                    variant="outline-primary" size="sm"
                    onClick={() => setCreando(m)}
                  >
                    Usar este modelo
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      </section>

      {/* ---------- Mis diseños ---------- */}
      <section>
        <div className="d-flex align-items-baseline mb-3">
          <h2 className="h5 mb-0">Mis diseños</h2>
          <span className="text-secondary small ms-3">
            {disenos.length === 0 ? 'Todavía ninguno' : `${disenos.length} guardado(s)`}
          </span>
        </div>

        {disenos.length === 0 ? (
          <Card body className="text-center py-5 text-secondary">
            Cuando cree un diseño aparecerá acá, listo para editar o consultar.
          </Card>
        ) : (
          <Row className="g-3">
            {disenos.map((d) => (
              <Col md={4} key={d._id}>
                <Card className="h-100">
                  <Card.Body className="d-flex flex-column">
                    <div className="d-flex align-items-start gap-2 mb-2">
                      <span
                        className="rounded-circle flex-shrink-0"
                        style={{
                          width: 14, height: 14, marginTop: 4,
                          background: d.branding?.colorPrimario || '#1a3a5c',
                        }}
                        aria-hidden="true"
                      />
                      <div className="flex-grow-1">
                        <h3 className="h6 mb-0">{d.nombre}</h3>
                        <div className="small text-secondary">
                          Modelo {d.modeloBase} · versión {d.version}
                        </div>
                      </div>
                      {String(d._id) === porDefecto && (
                        <Badge bg="light" text="dark" className="border fw-normal">
                          Predeterminado
                        </Badge>
                      )}
                    </div>

                    <div className="flex-grow-1" />

                    <Stack direction="horizontal" gap={2}>
                      <Button
                        size="sm" variant="outline-secondary"
                        onClick={() => navegar(`/disenos/${d._id}`)}
                      >
                        Ver detalle
                      </Button>
                      <Button
                        size="sm" variant="outline-primary"
                        onClick={() => navegar(`/disenos/${d._id}/editar`)}
                      >
                        Editar
                      </Button>
                    </Stack>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </section>

      <DialogoCrear
        modelo={creando}
        onCerrar={() => setCreando(null)}
        onCreado={(p) => navegar(`/disenos/${p._id}/editar`)}
      />
    </Container>
  );
}

// -----------------------------------------------------------------------------

/** Miniatura esquemática del modelo: bloques como barras. */
function VistaModelo({ modelo }) {
  const bloques = (modelo.layout?.bloques || []).filter((b) => b.visible !== false);
  const color = modelo.brandingPorDefecto?.colorPrimario || '#1a3a5c';

  const ALTURAS = {
    encabezado: 16, identificacion: 12, receptor: 10, condiciones: 6,
    detalle: 26, otrosCargos: 14, totales: 12, referencias: 8,
    camposPersonalizados: 8, piePagina: 5,
  };

  return (
    <div
      className="border rounded p-2 bg-white"
      style={{ height: 110, overflow: 'hidden' }}
      aria-hidden="true"
    >
      {bloques.map((b, i) => (
        <div
          key={b.tipo + i}
          style={{
            height: ALTURAS[b.tipo] || 8,
            marginBottom: 3,
            borderRadius: 2,
            background: b.tipo === 'identificacion' ? color : '#e9ecef',
            opacity: b.tipo === 'identificacion' ? 0.85 : 1,
          }}
        />
      ))}
    </div>
  );
}

// -----------------------------------------------------------------------------

function DialogoCrear({ modelo, onCerrar, onCreado }) {
  const [nombre, setNombre] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (modelo) { setNombre(`Comprobante ${modelo.nombre.toLowerCase()}`); setError(null); }
  }, [modelo]);

  if (!modelo) return null;

  async function crear(e) {
    e.preventDefault();
    setGuardando(true);
    try {
      const p = await api.crearPlantilla({
        nombre,
        modeloBase: modelo.clave,
        branding: modelo.brandingPorDefecto,
        layout: modelo.layout,
      });
      onCreado(p);
    } catch (err) {
      setError(err.message);
      setGuardando(false);
    }
  }

  return (
    <Modal show onHide={onCerrar}>
      <Form onSubmit={crear}>
        <Modal.Header closeButton>
          <Modal.Title className="h6">Nuevo diseño desde «{modelo.nombre}»</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger" className="small">{error}</Alert>}
          <Form.Group>
            <Form.Label>¿Cómo lo va a llamar?</Form.Label>
            <Form.Control value={nombre} onChange={(e) => setNombre(e.target.value)} required autoFocus />
            <Form.Text>Solo lo ve usted. No aparece en el comprobante.</Form.Text>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={onCerrar}>Cancelar</Button>
          <Button type="submit" variant="primary" disabled={guardando}>
            {guardando ? 'Creando…' : 'Crear y diseñar'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
