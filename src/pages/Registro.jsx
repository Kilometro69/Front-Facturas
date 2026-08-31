/**
 * Registro.jsx
 * -----------------------------------------------------------------------------
 * Alta de un cliente nuevo. Se piden exactamente los campos que el emisor
 * necesita para poder facturar de inmediato
 *
 * Al terminar, el servidor devuelve una API key que solo se muestra UNA vez
 * (igual que las que se crean después desde Integración): por eso el registro
 * tiene un segundo paso, "llave generada", antes de entrar al panel.
 * -----------------------------------------------------------------------------
 */

import { useEffect, useState } from 'react';
import { Container, Card, Form, Row, Col, Button, Alert, Spinner, InputGroup } from 'react-bootstrap';
import { api, token } from '../api';

const TIPOS_IDENTIFICACION = [
  { codigo: '01', nombre: 'Cédula Física' },
  { codigo: '02', nombre: 'Cédula Jurídica' },
  { codigo: '03', nombre: 'DIMEX' },
  { codigo: '04', nombre: 'NITE' },
];

const VACIO = {
  nombre: '', nombreComercial: '', tipoIdentificacion: '01', numeroIdentificacion: '',
  provincia: '', canton: '', distrito: '', otrasSenas: '',
  correo: '', email: '', password: '', confirmarPassword: '', nombreUsuario: '',
};

export default function Registro({ marca = 'Billing Kilometer', onRegistrado, onIrALogin }) {
  const [datos, setDatos] = useState(VACIO);
  const [provincias, setProvincias] = useState([]);
  const [cantones, setCantones] = useState([]);
  const [distritos, setDistritos] = useState([]);
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [apiKey, setApiKey] = useState(null); // no-null = paso 2, "llave generada"
  const [copiada, setCopiada] = useState(false);

  useEffect(() => {
    api.ubicaciones().then((d) => setProvincias(d.provincias)).catch(() => setProvincias([]));
  }, []);

  useEffect(() => {
    if (!datos.provincia) { setCantones([]); return; }
    api.ubicaciones(datos.provincia).then((d) => setCantones(d.cantones)).catch(() => setCantones([]));
  }, [datos.provincia]);

  useEffect(() => {
    if (!datos.provincia || !datos.canton) { setDistritos([]); return; }
    api.ubicaciones(datos.provincia, datos.canton).then((d) => setDistritos(d.distritos)).catch(() => setDistritos([]));
  }, [datos.provincia, datos.canton]);

  function cambiar(campo) {
    return (e) => setDatos((d) => ({ ...d, [campo]: e.target.value }));
  }

  async function registrar(e) {
    e.preventDefault();
    setError(null);

    if (datos.password !== datos.confirmarPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setEnviando(true);
    try {
      const resultado = await api.registro(
        {
          nombre: datos.nombre,
          nombreComercial: datos.nombreComercial || undefined,
          identificacion: { tipo: datos.tipoIdentificacion, numero: datos.numeroIdentificacion },
          ubicacion: {
            provincia: datos.provincia, canton: datos.canton, distrito: datos.distrito,
            otrasSenas: datos.otrasSenas,
          },
          correos: [datos.correo],
        },
        { email: datos.email, password: datos.password, nombre: datos.nombreUsuario || undefined }
      );

      token.guardar(resultado.token);
      setApiKey({ llave: resultado.apiKey, sesion: { usuario: resultado.usuario, tenant: resultado.tenant } });
    } catch (err) {
      setError(err.message + (err.detalles?.length ? `: ${err.detalles.join(', ')}` : ''));
    } finally {
      setEnviando(false);
    }
  }

  function copiarLlave() {
    navigator.clipboard.writeText(apiKey.llave);
    setCopiada(true);
  }

  if (apiKey) {
    return (
      <Container className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
        <Card style={{ width: '100%', maxWidth: 480 }} className="shadow-sm">
          <Card.Body className="p-4">
            <h1 className="h5 mb-1">¡Cuenta creada!</h1>
            <p className="text-secondary small mb-4">
              Esta es su primera llave de API. Solo se muestra ahora: cópiela antes de continuar.
            </p>

            <Form.Label className="small fw-semibold">Llave de API</Form.Label>
            <InputGroup className="mb-3">
              <Form.Control readOnly value={apiKey.llave} className="font-monospace small" />
              <Button variant={copiada ? 'success' : 'outline-secondary'} onClick={copiarLlave}>
                {copiada ? 'Copiada' : 'Copiar'}
              </Button>
            </InputGroup>

            <Alert variant="warning" className="small py-2">
              Guárdela en un lugar seguro (por ejemplo, la variable de entorno de su sistema).
              No podremos volver a mostrársela; si la pierde, deberá generar una nueva desde Integración.
            </Alert>

            <Button
              variant="primary" className="w-100"
              onClick={() => onRegistrado(apiKey.sesion)}
            >
              Continuar al panel
            </Button>
          </Card.Body>
        </Card>
      </Container>
    );
  }

  return (
    <Container className="d-flex align-items-center justify-content-center py-5" style={{ minHeight: '100vh' }}>
      <Card style={{ width: '100%', maxWidth: 560 }} className="shadow-sm">
        <Card.Body className="p-4">
          <div className="d-flex align-items-center gap-2 mb-3">
            <span className="fw-semibold">{marca}</span>
          </div>

          <h1 className="h5 mb-1">Crear una cuenta</h1>
          <p className="text-secondary small mb-4">
            Estos datos son los que su empresa necesita como emisor para poder facturar.
          </p>

          {error && <Alert variant="danger" className="py-2 small">{error}</Alert>}

          <Form onSubmit={registrar}>
            <p className="text-uppercase text-secondary small fw-semibold mb-2">Su empresa</p>
            <Row className="g-3 mb-4">
              <Col sm={12}>
                <Form.Label className="small">Razón social *</Form.Label>
                <Form.Control required value={datos.nombre} onChange={cambiar('nombre')} />
              </Col>
              <Col sm={12}>
                <Form.Label className="small">Nombre comercial</Form.Label>
                <Form.Control value={datos.nombreComercial} onChange={cambiar('nombreComercial')} />
              </Col>
              <Col sm={5}>
                <Form.Label className="small">Tipo de identificación *</Form.Label>
                <Form.Select required value={datos.tipoIdentificacion} onChange={cambiar('tipoIdentificacion')}>
                  {TIPOS_IDENTIFICACION.map((t) => (
                    <option key={t.codigo} value={t.codigo}>{t.nombre}</option>
                  ))}
                </Form.Select>
              </Col>
              <Col sm={7}>
                <Form.Label className="small">Número de identificación *</Form.Label>
                <Form.Control required value={datos.numeroIdentificacion} onChange={cambiar('numeroIdentificacion')} />
              </Col>
            </Row>

            <p className="text-uppercase text-secondary small fw-semibold mb-2">Ubicación</p>
            <Row className="g-3 mb-4">
              <Col sm={4}>
                <Form.Label className="small">Provincia *</Form.Label>
                <Form.Select required value={datos.provincia} onChange={cambiar('provincia')}>
                  <option value="">Seleccione...</option>
                  {provincias.map((p) => <option key={p.codigo} value={p.codigo}>{p.nombre}</option>)}
                </Form.Select>
              </Col>
              <Col sm={4}>
                <Form.Label className="small">Cantón *</Form.Label>
                <Form.Select required value={datos.canton} onChange={cambiar('canton')} disabled={!datos.provincia}>
                  <option value="">Seleccione...</option>
                  {cantones.map((c) => <option key={c.codigo} value={c.codigo}>{c.nombre}</option>)}
                </Form.Select>
              </Col>
              <Col sm={4}>
                <Form.Label className="small">Distrito *</Form.Label>
                <Form.Select
                  required value={datos.distrito} onChange={cambiar('distrito')}
                  disabled={!datos.canton}
                >
                  <option value="">Seleccione...</option>
                  {distritos.map((d) => <option key={d.codigo} value={d.codigo}>{d.nombre}</option>)}
                </Form.Select>
              </Col>
              <Col sm={12}>
                <Form.Label className="small">Otras señas *</Form.Label>
                <Form.Control
                  required placeholder="Dirección exacta, en texto libre"
                  value={datos.otrasSenas} onChange={cambiar('otrasSenas')}
                />
              </Col>
              <Col sm={12}>
                <Form.Label className="small">Correo de la empresa *</Form.Label>
                <Form.Control type="email" required value={datos.correo} onChange={cambiar('correo')} />
              </Col>
            </Row>

            <p className="text-uppercase text-secondary small fw-semibold mb-2">Su cuenta de acceso</p>
            <Row className="g-3 mb-4">
              <Col sm={12}>
                <Form.Label className="small">Su nombre</Form.Label>
                <Form.Control value={datos.nombreUsuario} onChange={cambiar('nombreUsuario')} />
              </Col>
              <Col sm={12}>
                <Form.Label className="small">Correo de acceso *</Form.Label>
                <Form.Control type="email" required value={datos.email} onChange={cambiar('email')} />
              </Col>
              <Col sm={6}>
                <Form.Label className="small">Contraseña *</Form.Label>
                <Form.Control
                  type="password" required minLength={8}
                  value={datos.password} onChange={cambiar('password')}
                />
              </Col>
              <Col sm={6}>
                <Form.Label className="small">Confirmar contraseña *</Form.Label>
                <Form.Control
                  type="password" required
                  value={datos.confirmarPassword} onChange={cambiar('confirmarPassword')}
                />
              </Col>
            </Row>

            <Button type="submit" variant="primary" className="w-100 mb-3" disabled={enviando}>
              {enviando ? <Spinner size="sm" animation="border" /> : 'Crear cuenta'}
            </Button>

            <div className="text-center">
              <Button variant="link" size="sm" className="text-secondary" onClick={onIrALogin}>
                ¿Ya tiene cuenta? Inicie sesión
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
}
