/**
 * Login.jsx
 */

import { useState } from 'react';
import { Container, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { api, token } from '../api';

export default function Login({ onEntrar, onIrARegistro, marca = 'Billing Kilometer', motivoCierre }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  async function entrar(e) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      const datos = await api.login(email, password);
      token.guardar(datos.token);
      onEntrar({ usuario: datos.usuario, tenant: datos.tenant });
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Container className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
      <Card style={{ width: '100%', maxWidth: 380 }} className="shadow-sm">
        <Card.Body className="p-4">
          <div className="d-flex align-items-center gap-2 mb-3">
            <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
              <circle cx="13" cy="13" r="11" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <path d="M13 13 L13 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              <path d="M13 13 L18 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              <circle cx="13" cy="13" r="1.6" fill="currentColor" />
            </svg>
            <span className="fw-semibold">{marca}</span>
          </div>

          <h1 className="h5 mb-1">Entrar al panel</h1>
          <p className="text-secondary small mb-4">Administre el diseño de sus comprobantes.</p>

          {motivoCierre === 'inactividad' && (
            <Alert variant="info" className="py-2 small">
              Cerramos su sesión por inactividad. Vuelva a entrar para continuar.
            </Alert>
          )}

          {error && <Alert variant="danger" className="py-2 small">{error}</Alert>}

          <Form onSubmit={entrar}>
            <Form.Group className="mb-3">
              <Form.Label>Correo</Form.Label>
              <Form.Control
                type="email" value={email} required autoFocus
                onChange={(e) => setEmail(e.target.value)}
              />
            </Form.Group>
            <Form.Group className="mb-4">
              <Form.Label>Contraseña</Form.Label>
              <Form.Control
                type="password" value={password} required
                onChange={(e) => setPassword(e.target.value)}
              />
            </Form.Group>
            <Button type="submit" variant="primary" className="w-100" disabled={enviando}>
              {enviando ? <Spinner size="sm" animation="border" /> : 'Entrar'}
            </Button>
          </Form>

          {onIrARegistro && (
            <div className="text-center mt-3">
              <Button variant="link" size="sm" className="text-secondary" onClick={onIrARegistro}>
                ¿No tiene cuenta? Regístrese
              </Button>
            </div>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
}
