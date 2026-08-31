/**
 * Perfil.jsx
 * -----------------------------------------------------------------------------
 * Edición de los datos que tiene sentido poder cambiar después del registro:
 * nombre, correo y contraseña de la cuenta; nombre comercial, teléfono y
 * ubicación del tenant. A propósito NO incluye identificación ni código de
 * actividad económica: esos quedan atados a la verificación real de
 * existencia del cliente (ver TenantSchema.verificacion en el backend), no a
 * una edición libre desde aca
 * -----------------------------------------------------------------------------
 */

import { useEffect, useState } from 'react';
import { Container, Card, Form, Row, Col, Button, Alert, Spinner, Badge } from 'react-bootstrap';
import { api } from '../api';

const TIPOS_IDENTIFICACION = [
  { codigo: '01', nombre: 'Cédula Física' },
  { codigo: '02', nombre: 'Cédula Jurídica' },
  { codigo: '03', nombre: 'DIMEX' },
  { codigo: '04', nombre: 'NITE' },
];

export default function Perfil() {
  const [cargando, setCargando] = useState(true);
  const [datos, setDatos] = useState(null);
  const [provincias, setProvincias] = useState([]);
  const [cantones, setCantones] = useState([]);
  const [distritos, setDistritos] = useState([]);
  const [verificacion, setVerificacion] = useState({ nivel: 'sin_verificar', verificadoEn: null });
  const [verificando, setVerificando] = useState(false);
  const [passwordActual, setPasswordActual] = useState('');
  const [passwordNueva, setPasswordNueva] = useState('');
  const [confirmarNueva, setConfirmarNueva] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  useEffect(() => {
    api.perfil()
      .then((d) => {
        setDatos({
          nombre: d.usuario.nombre || '',
          email: d.usuario.email || '',
          nombreComercial: d.tenant.nombreComercial || '',
          tipoIdentificacion: d.tenant.identificacion?.tipo || '01',
          numeroIdentificacion: d.tenant.identificacion?.numero || '',
          codigoPaisTelefono: d.tenant.telefono?.codigoPais || '',
          numTelefono: d.tenant.telefono?.numTelefono || '',
          correo: d.tenant.correos?.[0] || '',
          provincia: d.tenant.ubicacion?.provincia || '',
          canton: d.tenant.ubicacion?.canton || '',
          distrito: d.tenant.ubicacion?.distrito || '',
          otrasSenas: d.tenant.ubicacion?.otrasSenas || '',
        });
        setVerificacion(d.tenant.verificacion || { nivel: 'sin_verificar', verificadoEn: null });
      })
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false));

    api.ubicaciones().then((d) => setProvincias(d.provincias)).catch(() => setProvincias([]));
  }, []);

  // Cascada provincia -> cantón -> distrito, igual que en Registro.jsx. Se dispara también al
  // terminar de cargar el perfil (para traer el cantón/distrito ya guardados), y de nuevo cada
  // vez que la persona cambia la selección.
  useEffect(() => {
    if (!datos?.provincia) { setCantones([]); return; }
    api.ubicaciones(datos.provincia).then((d) => setCantones(d.cantones)).catch(() => setCantones([]));
  }, [datos?.provincia]);

  useEffect(() => {
    if (!datos?.provincia || !datos?.canton) { setDistritos([]); return; }
    api.ubicaciones(datos.provincia, datos.canton).then((d) => setDistritos(d.distritos)).catch(() => setDistritos([]));
  }, [datos?.provincia, datos?.canton]);

  // verificarAhora: le pide al backend que consulte Firma Digital (HSM Sign CR) por la
  // identificación de este tenant. Nunca bloquea nada -- solo actualiza la etiqueta.
  async function verificarAhora() {
    setVerificando(true);
    setError('');
    setExito('');
    try {
      const resultado = await api.verificar();
      setVerificacion(resultado.verificado ? { nivel: 'verificado', verificadoEn: new Date().toISOString() } : { nivel: 'sin_verificar', verificadoEn: null });
      if (resultado.verificado) {
        setExito('Su cuenta quedó verificada.');
      } else {
        setError(resultado.motivo || 'No se pudo verificar la cuenta.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setVerificando(false);
    }
  }

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
        // Solo se manda si todavía se puede editar -- una vez verificada, el backend la
        // rechaza igual, pero no tiene sentido ni intentarlo.
        identificacion: verificacion.nivel !== 'verificado'
          ? { tipo: datos.tipoIdentificacion, numero: datos.numeroIdentificacion }
          : undefined,
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

      <Card className="mb-3 border-0 bg-light">
        <Card.Body className="d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div>
            <div className="d-flex align-items-center gap-2 mb-1">
              <span className="fw-semibold">Verificación de identidad</span>
              {verificacion.nivel === 'verificado' ? (
                <Badge bg="success">Verificada</Badge>
              ) : (
                <Badge bg="warning" text="dark">Sin verificar</Badge>
              )}
            </div>
            <p className="text-secondary small mb-0">
              {verificacion.nivel === 'verificado'
                ? 'Su identificación fue confirmada contra Firma Digital.'
                : 'Para poder facturar, verifique su identificación contra Firma Digital (HSM Sign CR).'}
            </p>
          </div>
          {verificacion.nivel !== 'verificado' && (
            <Button size="sm" variant="dark" disabled={verificando} onClick={verificarAhora}>
              {verificando ? <Spinner size="sm" animation="border" className="me-2" /> : null}
              Verificar ahora
            </Button>
          )}
        </Card.Body>
      </Card>

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

              <Col sm={5}>
                <Form.Label className="small">Tipo de identificación</Form.Label>
                {verificacion.nivel === 'verificado' ? (
                  <Form.Control
                    plaintext readOnly
                    value={TIPOS_IDENTIFICACION.find((t) => t.codigo === datos.tipoIdentificacion)?.nombre || datos.tipoIdentificacion}
                  />
                ) : (
                  <Form.Select value={datos.tipoIdentificacion} onChange={cambiar('tipoIdentificacion')}>
                    {TIPOS_IDENTIFICACION.map((t) => (
                      <option key={t.codigo} value={t.codigo}>{t.nombre}</option>
                    ))}
                  </Form.Select>
                )}
              </Col>
              <Col sm={7}>
                <Form.Label className="small">Número de identificación</Form.Label>
                {verificacion.nivel === 'verificado' ? (
                  <Form.Control plaintext readOnly value={datos.numeroIdentificacion} />
                ) : (
                  <Form.Control value={datos.numeroIdentificacion} onChange={cambiar('numeroIdentificacion')} />
                )}
                {verificacion.nivel === 'verificado' && (
                  <Form.Text className="text-secondary">
                    No se puede cambiar: la cuenta ya está verificada contra Firma Digital.
                  </Form.Text>
                )}
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
                <Form.Select value={datos.provincia} onChange={cambiar('provincia')}>
                  <option value="">Seleccione...</option>
                  {provincias.map((p) => <option key={p.codigo} value={p.codigo}>{p.nombre}</option>)}
                </Form.Select>
              </Col>
              <Col sm={4}>
                <Form.Label className="small">Cantón</Form.Label>
                <Form.Select value={datos.canton} onChange={cambiar('canton')} disabled={!datos.provincia}>
                  <option value="">Seleccione...</option>
                  {cantones.map((c) => <option key={c.codigo} value={c.codigo}>{c.nombre}</option>)}
                </Form.Select>
              </Col>
              <Col sm={4}>
                <Form.Label className="small">Distrito</Form.Label>
                <Form.Select value={datos.distrito} onChange={cambiar('distrito')} disabled={!datos.canton}>
                  <option value="">Seleccione...</option>
                  {distritos.map((d) => <option key={d.codigo} value={d.codigo}>{d.nombre}</option>)}
                </Form.Select>
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
