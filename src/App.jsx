/**
 * App.jsx — Navegación y sesión
 * -----------------------------------------------------------------------------
 * Navbar fija arriba en todas las páginas, y control de sesión por inactividad:
 * aviso a los 50 minutos, cierre a los 60.
 */

import { useCallback, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom';
import { Navbar, Nav, Container, Button, Spinner, Modal, ProgressBar } from 'react-bootstrap';
import { api, token } from './api';
import { useSesion, formatearRestante, DURACION, AVISO_EN } from './sesion';
import Login from './pages/Login';
import Registro from './pages/Registro';
import Inicio from './pages/Inicio';
import Editor from './pages/Editor';
import DetalleDiseno from './pages/DetalleDiseno';
import Comprobantes from './pages/Comprobantes';
import Integracion from './pages/Integracion';

const MARCA = 'Billing Kilometer';

export default function App() {
  const [sesion, setSesion] = useState(null);
  const [comprobando, setComprobando] = useState(true);
  const [motivoCierre, setMotivoCierre] = useState(null);
  // No usa react-router-dom a propósito: antes de tener sesión no hay nada más que
  // alternar entre estas dos pantallas, y el router recién se monta después.
  const [vistaAuth, setVistaAuth] = useState('login');

  useEffect(() => {
    if (!token.leer()) { setComprobando(false); return; }
    api.yo()
      .then(setSesion)
      .catch(() => token.borrar())
      .finally(() => setComprobando(false));
  }, []);

  const cerrar = useCallback((motivo) => {
    token.borrar();
    setSesion(null);
    setMotivoCierre(motivo || null);
  }, []);

  const { avisando, restante, continuar } = useSesion(Boolean(sesion), cerrar);

  if (comprobando) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" />
      </Container>
    );
  }

  if (!sesion) {
    return vistaAuth === 'registro' ? (
      <Registro
        marca={MARCA}
        onRegistrado={(s) => { setMotivoCierre(null); setSesion(s); }}
        onIrALogin={() => setVistaAuth('login')}
      />
    ) : (
      <Login
        marca={MARCA}
        motivoCierre={motivoCierre}
        onEntrar={(s) => { setMotivoCierre(null); setSesion(s); }}
        onIrARegistro={() => setVistaAuth('registro')}
      />
    );
  }

  return (
    <BrowserRouter>
      <BarraNavegacion sesion={sesion} onSalir={() => cerrar()} />

      <main>
        <Routes>
          <Route path="/" element={<Inicio />} />
          <Route path="/disenos/:id" element={<DetalleDiseno />} />
          <Route path="/disenos/:id/editar" element={<Editor />} />
          <Route path="/diseno" element={<Editor />} />
          <Route path="/comprobantes" element={<Comprobantes />} />
          <Route path="/integracion" element={<Integracion />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <AvisoSesion
        mostrar={avisando}
        restante={restante}
        onContinuar={continuar}
        onSalir={() => cerrar()}
      />
    </BrowserRouter>
  );
}

// -----------------------------------------------------------------------------

function BarraNavegacion({ sesion, onSalir }) {
  const navegar = useNavigate();

  return (
    <Navbar
      bg="white"
      expand="lg"
      sticky="top"
      className="border-bottom"
      style={{ zIndex: 1030 }}
    >
      <Container fluid className="px-4">
        <Navbar.Brand
          onClick={() => navegar('/')}
          style={{ cursor: 'pointer' }}
          className="d-flex align-items-center gap-2 fw-semibold"
        >
          <Logotipo />
          {MARCA}
        </Navbar.Brand>

        <Navbar.Toggle aria-controls="nav-principal" />
        <Navbar.Collapse id="nav-principal">
          <Nav className="me-auto">
            <Nav.Link as={NavLink} to="/" end>Inicio</Nav.Link>
            <Nav.Link as={NavLink} to="/comprobantes">Comprobantes</Nav.Link>
            <Nav.Link as={NavLink} to="/integracion">Integración</Nav.Link>
          </Nav>

          <Nav className="align-items-lg-center">
            <span className="text-secondary small me-3">
              {sesion.tenant.nombre} · {sesion.usuario.email}
            </span>
            <Button variant="outline-secondary" size="sm" onClick={onSalir}>
              Cerrar sesión
            </Button>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

/** Marca: un odómetro, por el "kilometer" del nombre. */
function Logotipo() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
      <circle cx="13" cy="13" r="11" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M13 13 L13 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M13 13 L18 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="13" cy="13" r="1.6" fill="currentColor" />
    </svg>
  );
}

// -----------------------------------------------------------------------------

/**
 * Aviso previo al cierre. Aparece a los 50 minutos de inactividad y cuenta
 * hacia atrás los 10 que quedan.
 *
 * No se cierra con Escape ni haciendo clic fuera: si el usuario lo descarta sin
 * querer, pierde el trabajo sin enterarse.
 */
function AvisoSesion({ mostrar, restante, onContinuar, onSalir }) {
  const total = (DURACION - AVISO_EN) / 1000;

  return (
    <Modal show={mostrar} backdrop="static" keyboard={false} centered size="sm">
      <Modal.Body className="p-4">
        <h2 className="h6 mb-2">Su sesión está por cerrarse</h2>
        <p className="small text-secondary mb-3">
          Lleva un rato sin actividad. Se cerrará en{' '}
          <strong>{formatearRestante(restante)}</strong> para proteger su cuenta.
        </p>

        <ProgressBar
          now={(restante / total) * 100}
          variant={restante < 60 ? 'danger' : 'warning'}
          style={{ height: 4 }}
          className="mb-3"
        />

        <div className="d-grid gap-2">
          <Button variant="primary" onClick={onContinuar}>Seguir trabajando</Button>
          <Button variant="link" size="sm" className="text-secondary" onClick={onSalir}>
            Cerrar sesión ahora
          </Button>
        </div>
      </Modal.Body>
    </Modal>
  );
}
