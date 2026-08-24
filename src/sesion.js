/**
 * sesion.js — Cierre de sesión por inactividad
 * -----------------------------------------------------------------------------
 * La sesión dura una hora. Mientras el usuario esté activo, el token se renueva
 * solo; si deja de interactuar, nadie lo renueva y vence.
 *
 * A los 50 minutos sin actividad aparece un aviso con cuenta regresiva. A los
 * 60 se cierra la sesión.
 *
 * La renovación se limita a una cada cinco minutos: sin ese freno, mover el
 * mouse dispararía una petición por evento.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { api, token } from './api';

export const DURACION = 60 * 60 * 1000;   // 1 hora
export const AVISO_EN = 50 * 60 * 1000;   // aviso a los 50 minutos
const CADA_RENOVACION = 5 * 60 * 1000;    // renovar como máximo cada 5 min

const EVENTOS = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

export function useSesion(activa, alCerrar) {
  const [avisando, setAvisando] = useState(false);
  const [restante, setRestante] = useState(0);

  const ultimaActividad = useRef(Date.now());
  const ultimaRenovacion = useRef(Date.now());

  /** Marca actividad y renueva el token si toca. */
  const registrarActividad = useCallback(() => {
    ultimaActividad.current = Date.now();

    if (Date.now() - ultimaRenovacion.current > CADA_RENOVACION) {
      ultimaRenovacion.current = Date.now();
      api.renovar()
        .then((r) => r?.token && token.guardar(r.token))
        .catch(() => { /* si falla, el token vence solo y se cierra sesión */ });
    }
  }, []);

  /** Continuar: el usuario respondió al aviso. */
  const continuar = useCallback(() => {
    setAvisando(false);
    ultimaActividad.current = Date.now();
    ultimaRenovacion.current = Date.now();
    api.renovar()
      .then((r) => r?.token && token.guardar(r.token))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!activa) return undefined;

    for (const e of EVENTOS) {
      window.addEventListener(e, registrarActividad, { passive: true });
    }

    const reloj = setInterval(() => {
      const inactivo = Date.now() - ultimaActividad.current;

      if (inactivo >= DURACION) {
        alCerrar('inactividad');
        return;
      }
      if (inactivo >= AVISO_EN) {
        setAvisando(true);
        setRestante(Math.ceil((DURACION - inactivo) / 1000));
      } else if (avisando) {
        setAvisando(false);
      }
    }, 1000);

    return () => {
      clearInterval(reloj);
      for (const e of EVENTOS) window.removeEventListener(e, registrarActividad);
    };
  }, [activa, avisando, alCerrar, registrarActividad]);

  return { avisando, restante, continuar };
}

/** Segundos a "m:ss". */
export function formatearRestante(segundos) {
  const m = Math.floor(segundos / 60);
  const s = String(segundos % 60).padStart(2, '0');
  return `${m}:${s}`;
}
