/**
 * Editor.jsx — Editor de plantillas
 * -----------------------------------------------------------------------------
 * Dos columnas: controles a la izquierda, comprobante a la derecha.
 *
 * La vista previa es el mismo HTML que el servidor imprime a PDF. No es una
 * aproximación: lo que se ve acá es exactamente el archivo que va a recibir el
 * receptor. Por eso se renderiza en un iframe y no se reimplementa en React.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container, Row, Col, Card, Form, Button, Spinner, Alert,
  Accordion, Badge, Stack, ButtonGroup,
} from 'react-bootstrap';
import { api } from '../api';
import PanelBloques from '../components/PanelBloques';

/** Espera a que el usuario deje de escribir antes de pedir la vista previa. */
function useRetardo(valor, ms = 400) {
  const [retardado, setRetardado] = useState(valor);
  useEffect(() => {
    const t = setTimeout(() => setRetardado(valor), ms);
    return () => clearTimeout(t);
  }, [valor, ms]);
  return retardado;
}

const FUENTES = [
  { valor: 'Helvetica, Arial, sans-serif', nombre: 'Helvetica' },
  { valor: "'Segoe UI', Helvetica, Arial, sans-serif", nombre: 'Segoe UI' },
  { valor: 'Georgia, "Times New Roman", serif', nombre: 'Georgia' },
  { valor: '"Trebuchet MS", Helvetica, sans-serif', nombre: 'Trebuchet' },
  { valor: '"Courier New", monospace', nombre: 'Courier' },
];

export default function Editor() {
  const { id } = useParams();
  const navegar = useNavigate();

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);

  const [catalogoBloques, setCatalogoBloques] = useState([]);
  const [modelos, setModelos] = useState([]);
  const [plantillas, setPlantillas] = useState([]);
  const [plantillaId, setPlantillaId] = useState(null);

  const [nombre, setNombre] = useState('');
  const [branding, setBranding] = useState({});
  const [bloques, setBloques] = useState([]);
  const [piePagina, setPiePagina] = useState('');

  const [html, setHtml] = useState('');
  const [generandoVista, setGenerandoVista] = useState(false);

  // Caso de uso con el que se dibuja la vista previa. Diseñar contra datos
  // reales del rubro evita descubrir en producción que un bloque queda vacío
  // o que un texto se desborda.
  const [adaptador, setAdaptador] = useState('multa');
  const [porCategoria, setPorCategoria] = useState({});
  const [catalogo, setCatalogo] = useState([]);

  // --- carga inicial -------------------------------------------------------

  useEffect(() => {
    (async () => {
      try {
        const [b, m, p, a] = await Promise.all([
          api.bloques(), api.modelos(), api.plantillas(), api.adaptadores(),
        ]);
        setCatalogoBloques(b.bloques);
        setModelos(m.modelos);
        setPlantillas(p.plantillas);
        setCatalogo(a.catalogo);
        setPorCategoria(a.porCategoria);

        // Si la URL trae un diseño, se abre ese; si no, el predeterminado.
        const inicial = (id && p.plantillas.find((x) => String(x._id) === id))
          || p.plantillas.find((x) => String(x._id) === p.porDefecto)
          || p.plantillas[0];

        if (inicial) cargarPlantilla(inicial);
        else {
          setNombre('Mi plantilla');
          setBloques(b.layoutPorDefecto);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setCargando(false);
      }
    })();
  }, [id]);

  function cargarPlantilla(p) {
    setPlantillaId(p._id);
    setNombre(p.nombre);
    setBranding(p.branding || {});
    setBloques(p.layout?.bloques || []);
    setPiePagina(p.layout?.piePagina || '');
    setGuardado(false);
  }

  function aplicarModelo(clave) {
    const modelo = modelos.find((m) => m.clave === clave);
    if (!modelo) return;
    setBloques(modelo.layout.bloques);
    setBranding((b) => ({ ...modelo.brandingPorDefecto, ...b }));
  }

  // --- vista previa --------------------------------------------------------

  const layout = useMemo(
    () => ({ bloques, piePagina: piePagina || undefined }),
    [bloques, piePagina]
  );
  const layoutRetardado = useRetardo(layout, 400);
  const brandingRetardado = useRetardo(branding, 400);
  const peticion = useRef(0);

  useEffect(() => {
    if (!bloques.length) return;
    const mia = ++peticion.current;

    setGenerandoVista(true);
    api.vistaPrevia({ branding: brandingRetardado, layout: layoutRetardado, adaptador })
      .then((texto) => {
        // Descarta respuestas viejas: sin esto, una petición lenta puede
        // pisar el resultado de otra más nueva.
        if (mia === peticion.current) { setHtml(texto); setError(null); }
      })
      .catch((err) => { if (mia === peticion.current) setError(err.message); })
      .finally(() => { if (mia === peticion.current) setGenerandoVista(false); });
  }, [layoutRetardado, brandingRetardado, adaptador]);

  // --- guardar -------------------------------------------------------------

  async function guardar() {
    setGuardando(true);
    setError(null);
    try {
      const datos = { nombre, branding, layout };
      const resultado = plantillaId
        ? await api.guardarPlantilla(plantillaId, datos)
        : await api.crearPlantilla({ ...datos, modeloBase: 'clasica' });

      setPlantillaId(resultado._id);
      setPlantillas((lista) => {
        const otras = lista.filter((p) => String(p._id) !== String(resultado._id));
        return [resultado, ...otras];
      });
      setGuardado(true);
      setTimeout(() => setGuardado(false), 2500);
    } catch (err) {
      setError(err.detalles?.length ? `${err.message}: ${err.detalles.join('; ')}` : err.message);
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" role="status" />
      </Container>
    );
  }

  return (
    <Container fluid className="py-4 px-4">
      <Row className="align-items-center mb-4 g-2">
        <Col>
          <h1 className="h4 mb-1">Diseño del comprobante</h1>
          <p className="text-secondary mb-0 small">
            Los cambios se ven a la derecha. Así se verá el PDF que recibe el cliente.
          </p>
        </Col>
        <Col xs="auto">
          <Stack direction="horizontal" gap={2}>
            {plantillas.length > 1 && (
              <Form.Select
                size="sm" style={{ width: 220 }}
                value={plantillaId || ''}
                onChange={(e) => {
                  const p = plantillas.find((x) => String(x._id) === e.target.value);
                  if (p) cargarPlantilla(p);
                }}
              >
                {plantillas.map((p) => (
                  <option key={p._id} value={p._id}>{p.nombre}</option>
                ))}
              </Form.Select>
            )}
            <Button variant="outline-secondary" onClick={() => navegar('/')}>Inicio</Button>
            {plantillaId && (
              <Button variant="outline-secondary" onClick={() => navegar(`/disenos/${plantillaId}`)}>
                Ver detalle
              </Button>
            )}
            <Button variant="primary" onClick={guardar} disabled={guardando}>
              {guardando ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </Stack>
        </Col>
      </Row>

      {error && <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}
      {guardado && <Alert variant="success">Cambios guardados</Alert>}

      <Row className="g-4">
        {/* ---------------- Controles ---------------- */}
        <Col lg={5} xl={4}>
          <Accordion defaultActiveKey={['0', '1']} alwaysOpen>

            <Accordion.Item eventKey="0">
              <Accordion.Header>Identidad</Accordion.Header>
              <Accordion.Body>
                <Form.Group className="mb-3">
                  <Form.Label>Nombre de la plantilla</Form.Label>
                  <Form.Control value={nombre} onChange={(e) => setNombre(e.target.value)} />
                  <Form.Text>Solo lo ve usted, no aparece en el comprobante.</Form.Text>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Logo</Form.Label>
                  <Form.Control
                    type="url" placeholder="https://…"
                    value={branding.logoUrl || ''}
                    onChange={(e) => setBranding({ ...branding, logoUrl: e.target.value })}
                  />
                  <Form.Text>Dirección de una imagen accesible públicamente.</Form.Text>
                </Form.Group>

                <Row className="g-2 mb-3">
                  <Col xs={6}>
                    <Form.Label className="small">Color principal</Form.Label>
                    <Form.Control
                      type="color" className="form-control-color w-100"
                      value={branding.colorPrimario || '#1a3a5c'}
                      onChange={(e) => setBranding({ ...branding, colorPrimario: e.target.value })}
                    />
                  </Col>
                  <Col xs={6}>
                    <Form.Label className="small">Color del texto</Form.Label>
                    <Form.Control
                      type="color" className="form-control-color w-100"
                      value={branding.colorTexto || '#222222'}
                      onChange={(e) => setBranding({ ...branding, colorTexto: e.target.value })}
                    />
                  </Col>
                </Row>

                <Form.Group>
                  <Form.Label>Tipografía</Form.Label>
                  <Form.Select
                    value={branding.fuente || FUENTES[0].valor}
                    onChange={(e) => setBranding({ ...branding, fuente: e.target.value })}
                  >
                    {FUENTES.map((f) => (
                      <option key={f.valor} value={f.valor}>{f.nombre}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Accordion.Body>
            </Accordion.Item>

            <Accordion.Item eventKey="1">
              <Accordion.Header>
                Secciones <Badge bg="secondary" className="ms-2">{bloques.filter((b) => b.visible !== false).length}</Badge>
              </Accordion.Header>
              <Accordion.Body>
                <p className="text-secondary small">
                  Arrastre para cambiar el orden, o use las flechas. El interruptor
                  muestra u oculta cada sección.
                </p>
                <PanelBloques
                  bloques={bloques}
                  catalogo={catalogoBloques}
                  onCambio={setBloques}
                  camposAdaptador={catalogo.find((a) => a.nombre === adaptador)?.metadata}
                />

                <Form.Group className="mt-3">
                  <Form.Label>Texto al pie</Form.Label>
                  <Form.Control
                    as="textarea" rows={2} value={piePagina}
                    placeholder="Condiciones, agradecimiento o aviso legal"
                    onChange={(e) => setPiePagina(e.target.value)}
                  />
                </Form.Group>
              </Accordion.Body>
            </Accordion.Item>

            <Accordion.Item eventKey="2">
              <Accordion.Header>Empezar de un modelo</Accordion.Header>
              <Accordion.Body>
                <p className="text-secondary small">
                  Reemplaza las secciones actuales por las del modelo. Sus colores se conservan.
                </p>
                <Stack gap={2}>
                  {modelos.map((m) => (
                    <Card key={m.clave} body className="py-2">
                      <div className="d-flex align-items-center gap-2">
                        <div className="flex-grow-1">
                          <div className="fw-medium">{m.nombre}</div>
                          <div className="small text-secondary">{m.descripcion}</div>
                        </div>
                        <Button variant="outline-secondary" size="sm" onClick={() => aplicarModelo(m.clave)}>
                          Usar
                        </Button>
                      </div>
                    </Card>
                  ))}
                </Stack>
              </Accordion.Body>
            </Accordion.Item>
          </Accordion>
        </Col>

        {/* ---------------- Vista previa ---------------- */}
        <Col lg={7} xl={8}>
          <div style={{ position: 'sticky', top: 24 }}>
            <div className="d-flex align-items-center gap-2 mb-2">
              <Form.Select
                size="sm" style={{ width: 260 }}
                value={adaptador}
                onChange={(e) => setAdaptador(e.target.value)}
                aria-label="Caso de uso de la vista previa"
              >
                {Object.entries(porCategoria).map(([categoria, lista]) => (
                  <optgroup key={categoria} label={categoria}>
                    {lista.map((a) => (
                      <option key={a.nombre} value={a.nombre}>{a.titulo}</option>
                    ))}
                  </optgroup>
                ))}
              </Form.Select>
              {generandoVista && <Spinner animation="border" size="sm" variant="secondary" />}
              <span className="small text-secondary ms-auto">A4</span>
            </div>

            <div
              className="bg-body-secondary rounded p-3"
              style={{ maxHeight: 'calc(100vh - 140px)', overflow: 'auto' }}
            >
              <iframe
                title="Vista previa del comprobante"
                srcDoc={html}
                sandbox=""
                style={{
                  width: '210mm',
                  minHeight: '297mm',
                  border: 'none',
                  background: '#fff',
                  boxShadow: '0 2px 12px rgba(0,0,0,.12)',
                  display: 'block',
                  margin: '0 auto',
                  transformOrigin: 'top center',
                }}
              />
            </div>

            <p className="small text-secondary mt-2 mb-0">
              Datos de muestra del caso elegido. La clave y el consecutivo se
              generan al emitir.
            </p>
          </div>
        </Col>
      </Row>
    </Container>
  );
}
