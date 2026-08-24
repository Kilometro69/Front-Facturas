/**
 * PanelBloques.jsx — Orden y visibilidad de los bloques del comprobante
 * -----------------------------------------------------------------------------
 * Se ofrecen dos formas de reordenar: arrastrar y botones de subir/bajar. El
 * arrastre es más rápido con mouse, pero no funciona con teclado ni bien en
 * táctil, así que los botones no son un respaldo: son la vía principal para
 * quien no puede arrastrar.
 *
 * Los bloques requeridos por el anexo se pueden mover pero no ocultar.
 */

import { useState } from 'react';
import { Card, Form, Button, Badge, Stack, OverlayTrigger, Tooltip } from 'react-bootstrap';

export default function PanelBloques({ bloques, catalogo, onCambio, camposAdaptador }) {
  const [arrastrando, setArrastrando] = useState(null);

  const meta = (tipo) => catalogo.find((b) => b.tipo === tipo) || { nombre: tipo };

  function mover(desde, hacia) {
    if (hacia < 0 || hacia >= bloques.length) return;
    const copia = [...bloques];
    const [movido] = copia.splice(desde, 1);
    copia.splice(hacia, 0, movido);
    onCambio(copia);
  }

  function alternarVisible(i) {
    const copia = bloques.map((b, j) => (j === i ? { ...b, visible: b.visible === false } : b));
    onCambio(copia);
  }

  function cambiarOpcion(i, clave, valor) {
    const copia = bloques.map((b, j) =>
      j === i ? { ...b, opciones: { ...(b.opciones || {}), [clave]: valor } } : b
    );
    onCambio(copia);
  }

  return (
    <Stack gap={2}>
      {bloques.map((bloque, i) => {
        const info = meta(bloque.tipo);
        const oculto = bloque.visible === false;

        return (
          <Card
            key={bloque.tipo}
            draggable
            onDragStart={() => setArrastrando(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (arrastrando !== null && arrastrando !== i) mover(arrastrando, i);
              setArrastrando(null);
            }}
            onDragEnd={() => setArrastrando(null)}
            className={arrastrando === i ? 'opacity-50' : ''}
            style={{ cursor: 'grab' }}
            body
          >
            <div className="d-flex align-items-center gap-2">
              <span className="text-secondary" aria-hidden="true">⠿</span>

              <div className="flex-grow-1">
                <div className={oculto ? 'text-secondary' : ''}>
                  {info.nombre}
                  {info.requerido && (
                    <OverlayTrigger
                      overlay={<Tooltip>{info.ayuda || 'Obligatorio en todos los comprobantes'}</Tooltip>}
                    >
                      <Badge bg="light" text="dark" className="ms-2 fw-normal border">
                        Obligatorio
                      </Badge>
                    </OverlayTrigger>
                  )}
                </div>
              </div>

              <Button
                variant="outline-secondary" size="sm"
                onClick={() => mover(i, i - 1)} disabled={i === 0}
                aria-label={`Subir ${info.nombre}`}
              >↑</Button>
              <Button
                variant="outline-secondary" size="sm"
                onClick={() => mover(i, i + 1)} disabled={i === bloques.length - 1}
                aria-label={`Bajar ${info.nombre}`}
              >↓</Button>

              <Form.Check
                type="switch"
                checked={!oculto}
                disabled={info.requerido}
                onChange={() => alternarVisible(i)}
                aria-label={`Mostrar ${info.nombre}`}
              />
            </div>

            {/* Opciones del bloque, solo si tiene y está visible */}
            {!oculto && info.opciones?.length > 0 && (
              <div className="mt-3 ps-4 border-start">
                {info.opciones.includes('mostrarCabys') && (
                  <Form.Check
                    type="checkbox" id={`${bloque.tipo}-cabys`}
                    label="Mostrar el código CAByS de cada línea"
                    checked={Boolean(bloque.opciones?.mostrarCabys)}
                    onChange={(e) => cambiarOpcion(i, 'mostrarCabys', e.target.checked)}
                  />
                )}
                {info.opciones.includes('mostrarDescuentos') && (
                  <Form.Check
                    type="checkbox" id={`${bloque.tipo}-desc`}
                    label="Mostrar la columna de descuentos"
                    checked={bloque.opciones?.mostrarDescuentos !== false}
                    onChange={(e) => cambiarOpcion(i, 'mostrarDescuentos', e.target.checked)}
                  />
                )}
                {info.opciones.includes('titulo') && (
                  <>
                    <Form.Group>
                      <Form.Label className="small mb-1">Título de la sección</Form.Label>
                      <Form.Control
                        size="sm"
                        value={bloque.opciones?.titulo || ''}
                        placeholder="Información adicional"
                        onChange={(e) => cambiarOpcion(i, 'titulo', e.target.value)}
                      />
                    </Form.Group>

                    {/* Qué va a imprimirse acá según el caso de uso elegido */}
                    {camposAdaptador?.length > 0 && (
                      <div className="small text-secondary mt-2">
                        Este caso de uso envía:{' '}
                        {camposAdaptador.map((c) => (
                          <code key={c} className="me-2">{c.replace('$.', '')}</code>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </Card>
        );
      })}
    </Stack>
  );
}
