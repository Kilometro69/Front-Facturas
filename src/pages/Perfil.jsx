/**
 * Perfil.jsx
 * -----------------------------------------------------------------------------
 * Edición de los datos que tiene sentido poder cambiar después del registro:
 * nombre, correo y contraseña de la cuenta; nombre comercial, teléfono y
 * ubicación del tenant. A propósito NO incluye identificación ni código de
 * actividad económica: esos quedan atados a la verificación real de
 * existencia del cliente (ver TenantSchema.verificacion en el backend), no a
 * una edición libre desde acá.
 * -----------------------------------------------------------------------------
 */

import { useEffect, useState } from 'react';
import { Container, Card, Form, Row, Col, Button, Alert, Spinner } from 'react-bootstrap';
import { api } from '../api';

export default function Perfil() {
  const [cargando, setCargando] = useState(true);
  const [datos, setDatos] = useState(null);
  const [passwordActual, setPasswordActual] = useState('');
  const [passwordNueva, setPasswordNueva] = useState('');
  const [confirmarNueva, setConfirmarNueva] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  useEffect(() => {
    api.perfil()
      .then((d) => setDatos({
        nombre: d.usuario.nombre || '',
        email: d.usuario.email || '',
        nombreComercial: d.tenant.nombreComercial || '',
        codigoPaisTelefono: d.tenant.telefono?.codigoPais || '',
        numTelefono: d.tenant.telefono?.numTelefono || '',
        correo: d.tenant.correos?.[0] || '',
        provincia: d.tenant.ubicacion?.provincia || '',
        canton: d.tenant.ubicacion?.canton || '',
        distrito: d.tenant.ubicacion?.distrito || '',
        otrasSenas: d.tenant.ubicacion?.otrasSenas || '',
      }))
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false));
  }, []);

  function cambiar(campo) {
    return (e) => setDatos((d) => ({ ...d, [campo]: e.target.value }));
  }

  async function guardar(e) {
    e.preventDefault();
    setError('');
    setExito('');

    if (passwordNueva && passwordNueva !== confirmarNueva) {
      setError('Las contraseñas nuevas no coinciden.');
      return;
    }

    setGuardando(true);
    try {
      const usuario = { nombre: datos.nombre, email: datos.email };
      if (passwordNueva) {
        usuario.passwordActual = passwordActual;
        usuario.passwordNueva = passwordNueva;
      }

      const tenant = {
        nombreComercial: datos.nombreComercial,
        telefono: datos.codigoPaisTelefono && datos.numTelefono
          ? { codigoPais: Number(datos.codigoPaisTelefono), numTelefono: Number(datos.numTelefono) }
          : undefined,
        correos: datos.correo ? [datos.correo] : undefined,
        ubicacion: {
          provincia: datos.provincia, canton: datos.canton,
          distrito: datos.distrito, otrasSenas: datos.otrasSenas,
        },
      };

      await api.actualizarPerfil(usuario, tenant);
      setExito('Los cambios se guardaron correctamente.');
      setPasswordActual('');
      setPasswordNueva('');
      setConfirmarNueva('');
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" />
      </Container>
    );
  }

  return (
    <Container className="py-4" style={{ maxWidth: 640 }}>
      <h1 className="h4 mb-4">Mi perfil</h1>

      {error && <Alert variant="danger" className="py-2 small">{error}</Alert>}
      {exito && <Alert variant="success" className="py-2 small">{exito}</Alert>}

      <Form onSubmit={guardar}>
        <Card className="mb-3">
          <Card.Body>
            <p className="text-uppercase text-secondary small fw-semibold mb-3">Su cuenta</p>
            <Row className="g-3">
              <Col sm={6}>
                <Form.Label className="small">Su nombre</Form.Label>
                <Form.Control value={datos.nombre} onChange={cambiar('nombre')} />
              </Col>
              <Col sm={6}>
                <Form.Label className="small">Correo de acceso</Form.Label>
                <Form.Control type="email" value={datos.email} onChange={cambiar('email')} />
              </Col>
            </Row>

            <hr />

            <p className="text-secondary small mb-3">
              Para cambiar la contraseña, complete los 3 campos. Si los deja vacíos, la
              contraseña actual no se toca.
            </p>
            <Row className="g-3">
              <Col sm={4}>
                <Form.Label className="small">Contraseña actual</Form.Label>
                <Form.Control
                  type="password" value={passwordActual}
                  onChange={(e) => setPasswordActual(e.target.value)}
                />
              </Col>
              <Col sm={4}>
                <Form.Label className="small">Contraseña nueva</Form.Label>
                <Form.Control
                  type="password" minLength={8} value={passwordNueva}
                  onChange={(e) => setPasswordNueva(e.target.value)}
                />
              </Col>
              <Col sm={4}>
                <Form.Label className="small">Confirmar contraseña nueva</Form.Label>
                <Form.Control
                  type="password" value={confirmarNueva}
                  onChange={(e) => setConfirmarNueva(e.target.value)}
                />
              </Col>
            </Row>
          </Card.Body>
        </Card>

        <Card className="mb-3">
          <Card.Body>
            <p className="text-uppercase text-secondary small fw-semibold mb-3">Su empresa</p>
            <Row className="g-3">
              <Col sm={12}>
                <Form.Label className="small">Nombre comercial</Form.Label>
                <Form.Control value={datos.nombreComercial} onChange={cambiar('nombreComercial')} />
              </Col>
              <Col sm={4}>
                <Form.Label className="small">Código de país</Form.Label>
                <Form.Control placeholder="506" value={datos.codigoPaisTelefono} onChange={cambiar('codigoPaisTelefono')} />
              </Col>
              <Col sm={8}>
                <Form.Label className="small">Teléfono</Form.Label>
                <Form.Control value={datos.numTelefono} onChange={cambiar('numTelefono')} />
              </Col>
              <Col sm={12}>
                <Form.Label className="small">Correo de la empresa</Form.Label>
                <Form.Control type="email" value={datos.correo} onChange={cambiar('correo')} />
              </Col>
            </Row>
          </Card.Body>
        </Card>

        <Card className="mb-4">
          <Card.Body>
            <p className="text-uppercase text-secondary small fw-semibold mb-3">Ubicación</p>
            <Row className="g-3">
              <Col sm={4}>
                <Form.Label className="small">Provincia</Form.Label>
                <Form.Control value={datos.provincia} onChange={cambiar('provincia')} />
              </Col>
              <Col sm={4}>
                <Form.Label className="small">Cantón</Form.Label>
                <Form.Control value={datos.canton} onChange={cambiar('canton')} />
              </Col>
              <Col sm={4}>
                <Form.Label className="small">Distrito</Form.Label>
                <Form.Control value={datos.distrito} onChange={cambiar('distrito')} />
              </Col>
              <Col sm={12}>
                <Form.Label className="small">Otras señas</Form.Label>
                <Form.Control value={datos.otrasSenas} onChange={cambiar('otrasSenas')} />
              </Col>
            </Row>
          </Card.Body>
        </Card>

        <Button type="submit" variant="primary" disabled={guardando}>
          {guardando ? <Spinner size="sm" animation="border" className="me-2" /> : null}
          Guardar cambios
        </Button>
      </Form>
    </Container>
  );
}
