/**
 * Comprobantes.jsx — Historial de comprobantes emitidos
 * -----------------------------------------------------------------------------
 * Solo lectura. La emisión ocurre desde el sistema del cliente vía API, y las
 * notas de crédito también: quien tiene el contexto para decidir que una multa
 * se anula es el club, no alguien mirando una tabla.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Container, Row, Col, Card, Table, Form, Button, Badge, Spinner,
  Alert, Pagination, Modal, Stack, InputGroup,
} from 'react-bootstrap';
import { api } from '../api';

const TIPOS = {
  FE: 'Factura', FEE: 'Factura de exportación', FEC: 'Factura de compra',
  TE: 'Tiquete', NC: 'Nota de crédito', ND: 'Nota de débito', REP: 'Recibo de pago',
};

function moneda(valor, codigo = 'CRC') {
  const simbolo = { CRC: '₡', USD: '$', EUR: '€' }[codigo] || `${codigo} `;
  const [ent, dec] = Number(valor || 0).toFixed(2).split('.');
  return `${simbolo}${ent.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${dec}`;
}

const fecha = (v) => new Date(v).toLocaleString('es-CR', {
  day: '2-digit', month: '2-digit', year: 'numeric',
  hour: '2-digit', minute: '2-digit', timeZone: 'America/Costa_Rica',
});

export default function Comprobantes() {
  const [datos, setDatos] = useState([]);
  const [totales, setTotales] = useState([]);
  const [paginacion, setPaginacion] = useState({ pagina: 1, paginas: 1, total: 0 });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const [filtros, setFiltros] = useState({ q: '', tipo: '', estado: '', desde: '', hasta: '' });
  const [pagina, setPagina] = useState(1);
  const [detalle, setDetalle] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const params = Object.fromEntries(
        Object.entries({ ...filtros, page: pagina }).filter(([, v]) => v !== '' && v != null)
      );
      const r = await api.documentos(params);
      setDatos(r.datos);
      setTotales(r.totales);
      setPaginacion(r.paginacion);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [filtros, pagina]);

  useEffect(() => { cargar(); }, [cargar]);

  function aplicarFiltro(campo, valor) {
    setFiltros((f) => ({ ...f, [campo]: valor }));
    setPagina(1);
  }

  async function abrirPdf(id) {
    try {
      const blob = await api.pdf(id);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener');
      // El objeto URL solo vive en este navegador; se libera cuando ya no hace
      // falta, sin apurar el cierre de la pestaña que se acaba de abrir.
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <Container fluid className="py-4 px-4">
      <Row className="align-items-center mb-4">
        <Col>
          <h1 className="h4 mb-1">Comprobantes</h1>
          <p className="text-secondary small mb-0">
            {paginacion.total} emitidos
            {totales.map((t) => ` · ${moneda(t.total, t._id)} en ${t.cantidad}`).join('')}
          </p>
        </Col>
      </Row>

      {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}

      <Card className="mb-3">
        <Card.Body>
          <Row className="g-2">
            <Col md={4}>
              <InputGroup size="sm">
                <Form.Control
                  placeholder="Nombre, clave o consecutivo"
                  value={filtros.q}
                  onChange={(e) => aplicarFiltro('q', e.target.value)}
                />
              </InputGroup>
            </Col>
            <Col md={2}>
              <Form.Select size="sm" value={filtros.tipo} onChange={(e) => aplicarFiltro('tipo', e.target.value)}>
                <option value="">Todos los tipos</option>
                {Object.entries(TIPOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Form.Select>
            </Col>
            <Col md={2}>
              <Form.Select size="sm" value={filtros.estado} onChange={(e) => aplicarFiltro('estado', e.target.value)}>
                <option value="">Todos los estados</option>
                <option value="emitido">Emitidos</option>
                <option value="anulado">Anulados</option>
              </Form.Select>
            </Col>
            <Col md={2}>
              <Form.Control size="sm" type="date" value={filtros.desde}
                onChange={(e) => aplicarFiltro('desde', e.target.value)} />
            </Col>
            <Col md={2}>
              <Form.Control size="sm" type="date" value={filtros.hasta}
                onChange={(e) => aplicarFiltro('hasta', e.target.value)} />
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Card>
        {cargando ? (
          <Card.Body className="text-center py-5"><Spinner animation="border" /></Card.Body>
        ) : datos.length === 0 ? (
          <Card.Body className="text-center py-5">
            <p className="text-secondary mb-1">No hay comprobantes que coincidan.</p>
            <p className="small text-secondary mb-0">
              Los comprobantes aparecen acá cuando su sistema los emite por la API.
            </p>
          </Card.Body>
        ) : (
          <Table hover responsive className="mb-0 align-middle">
            <thead>
              <tr className="small text-secondary">
                <th className="ps-3">Fecha</th>
                <th>Tipo</th>
                <th>Consecutivo</th>
                <th>Receptor</th>
                <th className="text-end">Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {datos.map((d) => (
                <tr key={d._id} className={d.estado === 'anulado' ? 'text-secondary' : ''}>
                  <td className="ps-3 small">{fecha(d.fechaEmision)}</td>
                  <td>
                    <span className="small">{TIPOS[d.tipoComprobante] || d.tipoComprobante}</span>
                    {d.estado === 'anulado' && (
                      <Badge bg="secondary" className="ms-2 fw-normal">Anulado</Badge>
                    )}
                  </td>
                  <td><code className="small">{d.consecutivo}</code></td>
                  <td>
                    <div>{d.receptorNombre || '—'}</div>
                    {d.receptorCedula && <div className="small text-secondary">{d.receptorCedula}</div>}
                  </td>
                  <td className="text-end fw-medium">{moneda(d.totalComprobante, d.moneda)}</td>
                  <td className="text-end pe-3">
                    <Stack direction="horizontal" gap={1} className="justify-content-end">
                      <Button size="sm" variant="outline-secondary" onClick={() => setDetalle(d)}>
                        Ver
                      </Button>
                      <Button size="sm" variant="outline-primary" onClick={() => abrirPdf(d._id)}>
                        PDF
                      </Button>
                    </Stack>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {paginacion.paginas > 1 && (
        <Pagination className="mt-3 justify-content-center">
          <Pagination.Prev disabled={pagina === 1} onClick={() => setPagina((p) => p - 1)} />
          <Pagination.Item disabled>{pagina} de {paginacion.paginas}</Pagination.Item>
          <Pagination.Next
            disabled={pagina >= paginacion.paginas}
            onClick={() => setPagina((p) => p + 1)}
          />
        </Pagination>
      )}

      <DetalleComprobante
        documento={detalle}
        onCerrar={() => setDetalle(null)}
        onPdf={abrirPdf}
      />
    </Container>
  );
}

// -----------------------------------------------------------------------------

function DetalleComprobante({ documento, onCerrar, onPdf }) {
  const [completo, setCompleto] = useState(null);

  useEffect(() => {
    if (!documento) { setCompleto(null); return; }
    api.documento(documento._id).then(setCompleto).catch(() => setCompleto(documento));
  }, [documento]);

  if (!documento) return null;
  const p = completo?.payload;

  return (
    <Modal show onHide={onCerrar} size="lg" scrollable>
      <Modal.Header closeButton>
        <Modal.Title className="h6">
          {TIPOS[documento.tipoComprobante]} {documento.consecutivo}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <dl className="row small mb-4">
          <dt className="col-sm-3 text-secondary fw-normal">Clave</dt>
          <dd className="col-sm-9"><code className="text-break">{documento.clave}</code></dd>
          <dt className="col-sm-3 text-secondary fw-normal">Emitido</dt>
          <dd className="col-sm-9">{fecha(documento.fechaEmision)}</dd>
          <dt className="col-sm-3 text-secondary fw-normal">Receptor</dt>
          <dd className="col-sm-9">
            {documento.receptorNombre} · {documento.receptorCedula}
          </dd>
          <dt className="col-sm-3 text-secondary fw-normal">Total</dt>
          <dd className="col-sm-9 fw-medium">
            {moneda(documento.totalComprobante, documento.moneda)}
          </dd>
        </dl>

        {p?.detalleServicio?.lineaDetalle?.length > 0 && (
          <>
            <h6 className="small text-secondary text-uppercase">Líneas</h6>
            <Table size="sm" className="mb-4">
              <tbody>
                {p.detalleServicio.lineaDetalle.map((l) => (
                  <tr key={l.numeroLinea}>
                    <td className="small">{l.detalle}</td>
                    <td className="small text-secondary text-end">{l.cantidad} ×</td>
                    <td className="small text-end">{moneda(l.precioUnitario, documento.moneda)}</td>
                    <td className="small text-end fw-medium">
                      {moneda(l.montoTotalLinea, documento.moneda)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </>
        )}

        {p?.otrosCargos?.length > 0 && (
          <>
            <h6 className="small text-secondary text-uppercase">Otros cargos</h6>
            <Table size="sm" className="mb-4">
              <tbody>
                {p.otrosCargos.map((c, i) => (
                  <tr key={i}>
                    <td className="small">{c.detalle}</td>
                    <td className="small text-end fw-medium">
                      {moneda(c.montoCargo, documento.moneda)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </>
        )}

        {p?.informacionReferencia?.length > 0 && (
          <Alert variant="light" className="border small mb-0">
            <strong>Referencia:</strong> {p.informacionReferencia[0].razon}
            <div className="text-secondary mt-1">
              <code className="small">{p.informacionReferencia[0].numero}</code>
            </div>
          </Alert>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onCerrar}>Cerrar</Button>
        <Button variant="primary" onClick={() => onPdf(documento._id)}>Abrir PDF</Button>
      </Modal.Footer>
    </Modal>
  );
}
