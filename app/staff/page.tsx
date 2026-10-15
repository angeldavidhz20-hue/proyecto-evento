'use client';

import { useState, useEffect, useRef } from 'react';
import { useEventPassStore } from '@/lib/store';
import { Event } from '@/lib/types';
import {
  QrCode,
  Camera,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  Sparkles,
  Search,
  Lock,
  UserCheck,
  RefreshCw,
  CameraOff,
  LogOut,
  Key
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

export default function StaffPWAPage() {
  const { events, verifyAndCheckInQR, isFirebaseOnline, isLoaded } = useEventPassStore();

  // Estados de autenticación y autorización
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [authorizedEvent, setAuthorizedEvent] = useState<Event | null>(null);
  const [scannerOperator, setScannerOperator] = useState<string>('Staff en Puerta');
  const [authError, setAuthError] = useState<string | null>(null);

  // Formulario manual de desbloqueo si no entraron por link directo
  const [unlockPin, setUnlockPin] = useState('');
  const [unlockName, setUnlockName] = useState('');

  // Entrada manual de folio de boleto (para reflejos en pantalla)
  const [manualCode, setManualCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  // Estado del resultado del escaneo
  const [scannedResult, setScannedResult] = useState<{
    type: 'valid' | 'already_attended' | 'pending_payment' | 'wrong_event' | 'not_inscribed';
    message: string;
    attendeeName?: string;
    timestamp?: string;
    eventName?: string;
    folio?: string;
  } | null>(null);

  const [personalScanCount, setPersonalScanCount] = useState(0);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isCameraActiveRef = useRef(false);
  const isProcessingRef = useRef(false);
  const lastScannedTimeRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });

  // 1. VERIFICAR AUTORIZACIÓN POR PARÁMETROS DE URL O SESIÓN GUARDADA
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const eventIdParam = params.get('event');
    const keyParam = params.get('key');
    const nameParam = params.get('name');
    const roleParam = params.get('role');

    // CASO A: Viene con parámetros en la URL (Enlace generado por el Admin)
    if (eventIdParam && keyParam) {
      const targetEvent = events.find((e) => e.id === eventIdParam);
      if (targetEvent) {
        const eventPin = (targetEvent.staffPin || '').trim().toUpperCase();
        if (eventPin === keyParam.trim().toUpperCase()) {
          const opName =
            nameParam?.trim() ||
            (roleParam === 'admin'
              ? `${targetEvent.creatorName || 'Organizador'} (Admin)`
              : 'Staff en Puerta');

          setIsAuthorized(true);
          setAuthorizedEvent(targetEvent);
          setScannerOperator(opName);
          setAuthError(null);
          setIsCheckingAuth(false);

          // Guardar sesión autorizada en el celular
          localStorage.setItem(
            'ep_staff_auth_session',
            JSON.stringify({
              eventId: targetEvent.id,
              key: keyParam.trim().toUpperCase(),
              name: opName,
              role: roleParam || 'staff',
            })
          );
          return;
        } else {
          setIsAuthorized(false);
          setAuthorizedEvent(null);
          setAuthError('La clave de acceso en el enlace no es válida o fue revocada por el organizador.');
          setIsCheckingAuth(false);
          return;
        }
      }
    }

    // CASO B: Verificar si hay sesión previa guardada en este dispositivo
    const savedSessionRaw = localStorage.getItem('ep_staff_auth_session');
    if (savedSessionRaw) {
      try {
        const session = JSON.parse(savedSessionRaw);
        const targetEvent = events.find((e) => e.id === session.eventId);
        if (targetEvent) {
          const eventPin = (targetEvent.staffPin || '').trim().toUpperCase();
          if (eventPin === (session.key || '').trim().toUpperCase()) {
            setIsAuthorized(true);
            setAuthorizedEvent(targetEvent);
            setScannerOperator(session.name || 'Staff en Puerta');
            setAuthError(null);
            setIsCheckingAuth(false);
            return;
          } else {
            // El admin cambió la clave maestra del evento
            localStorage.removeItem('ep_staff_auth_session');
            setIsAuthorized(false);
            setAuthorizedEvent(null);
            setAuthError('La clave de este evento fue modificada por el organizador. Requiere un nuevo enlace.');
            setIsCheckingAuth(false);
            return;
          }
        }
      } catch {}
    }

    // Si aún no cargó el store, esperar
    if (!isLoaded) {
      return;
    }

    // Sin credenciales válidas -> BLOQUEADO
    setIsAuthorized(false);
    setIsCheckingAuth(false);
  }, [events, isLoaded]);

  // Desbloqueo manual por PIN si no entraron por enlace directo
  const handleManualUnlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = unlockPin.trim().toUpperCase();
    const cleanName = unlockName.trim() || 'Staff en Puerta';

    const match = events.find((evt) => (evt.staffPin || '').trim().toUpperCase() === cleanPin);
    if (match) {
      setIsAuthorized(true);
      setAuthorizedEvent(match);
      setScannerOperator(cleanName);
      setAuthError(null);

      localStorage.setItem(
        'ep_staff_auth_session',
        JSON.stringify({
          eventId: match.id,
          key: cleanPin,
          name: cleanName,
          role: 'staff',
        })
      );
    } else {
      setAuthError('Clave de evento no válida. Solicita el enlace oficial al organizador.');
    }
  };

  const handleLogout = () => {
    stopCamera();
    localStorage.removeItem('ep_staff_auth_session');
    setIsAuthorized(false);
    setAuthorizedEvent(null);
    setAuthError(null);
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', '/staff');
    }
  };

  // Audio Synthesizer Beeps (Native Web Audio API)
  const playSound = (type: 'success' | 'warning' | 'error') => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'success') {
        osc.frequency.setValueAtTime(880, audioCtx.currentTime); // High pitch (A5)
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.18);
      } else if (type === 'warning') {
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        osc.start();
        setTimeout(() => {
          osc.frequency.setValueAtTime(330, audioCtx.currentTime + 0.1);
        }, 100);
        osc.stop(audioCtx.currentTime + 0.35);
      } else {
        osc.frequency.setValueAtTime(220, audioCtx.currentTime); // Low buzz
        gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.38);
      }
    } catch {
      // Audio fallback
    }
  };

  // Función asíncrona central de validación
  const handleValidateCode = async (rawCode: string) => {
    if (!authorizedEvent) return;
    const code = (rawCode || '').trim();
    if (!code) return;

    // Cooldown para evitar lecturas duplicadas continuas de la cámara
    const now = Date.now();
    if (isProcessingRef.current) return;
    if (
      lastScannedTimeRef.current.code.toUpperCase() === code.toUpperCase() &&
      now - lastScannedTimeRef.current.time < 3000
    ) {
      return;
    }

    lastScannedTimeRef.current = { code, time: now };
    isProcessingRef.current = true;
    setIsValidating(true);

    try {
      // Validar estrictamente contra el evento autorizado
      const res = await verifyAndCheckInQR(code, scannerOperator, authorizedEvent.id);

      if (res.code === 'valid' && res.attendee) {
        playSound('success');
        setPersonalScanCount((prev) => prev + 1);
        setScannedResult({
          type: 'valid',
          message: '¡Ingreso Autorizado! 🟢',
          attendeeName: res.attendee.fullName,
          folio: res.attendee.id,
          eventName: authorizedEvent.title,
          timestamp: `Acceso confirmado hoy a las ${res.attendee.attendedAt || 'ahora'}`,
        });
      } else if (res.code === 'already_attended' && res.attendee) {
        playSound('warning');
        setScannedResult({
          type: 'already_attended',
          message: 'Boleto Ya Utilizado 🟡',
          attendeeName: res.attendee.fullName,
          folio: res.attendee.id,
          eventName: authorizedEvent.title,
          timestamp: `Registrado previamente a las ${res.attendee.attendedAt || 'hoy'} por ${res.attendee.attendedByScanner || 'Staff'}`,
        });
      } else if (res.code === 'pending_payment' && res.attendee) {
        playSound('warning');
        setScannedResult({
          type: 'pending_payment',
          message: 'Pago No Confirmado 🟠',
          attendeeName: res.attendee.fullName,
          folio: res.attendee.id,
          eventName: authorizedEvent.title,
          timestamp: 'El asistente completó registro pero su pago sigue pendiente de validación.',
        });
      } else if (res.code === 'wrong_event') {
        playSound('warning');
        setScannedResult({
          type: 'wrong_event',
          message: 'Boleto de Otro Evento 🟣',
          attendeeName: res.attendee?.fullName,
          folio: res.attendee?.id,
          eventName: res.eventName,
          timestamp: `Este boleto pertenece a "${res.eventName || 'otro evento'}", no a este evento.`,
        });
      } else {
        playSound('error');
        setScannedResult({
          type: 'not_inscribed',
          message: 'Boleto Inválido o No Encontrado 🔴',
          folio: code,
          timestamp: res.message || 'Código no registrado en el sistema.',
        });
      }
    } catch (err) {
      console.error('Error al validar QR:', err);
      playSound('error');
      setScannedResult({
        type: 'not_inscribed',
        message: 'Error de Lectura 🔴',
        timestamp: 'Ocurrió un error al verificar el boleto. Intenta de nuevo.',
      });
    } finally {
      setIsValidating(false);
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 1500);
      setTimeout(() => {
        setScannedResult(null);
      }, 6000);
    }
  };

  // Liberar forzosamente todos los MediaStream del hardware y limpiar el DOM
  const forceReleaseAllCameras = () => {
    try {
      const videoElements = document.querySelectorAll('video');
      videoElements.forEach((video) => {
        if (video.srcObject instanceof MediaStream) {
          video.srcObject.getTracks().forEach((track) => {
            try {
              track.stop();
            } catch {}
          });
          video.srcObject = null;
        }
      });
    } catch {}

    const container = document.getElementById('qr-reader-viewport');
    if (container) {
      container.innerHTML = '';
    }
  };

  // Activar cámara física con soporte multidispositivo y manejo de errores
  const startCamera = async () => {
    setCameraError(null);
    setIsStartingCamera(true);

    try {
      // 1. Limpieza rigurosa previa para liberar el sensor de la cámara en el sistema operativo
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            await scannerRef.current.stop();
          }
          await scannerRef.current.clear();
        } catch {}
        scannerRef.current = null;
      }
      forceReleaseAllCameras();

      await new Promise((r) => setTimeout(r, 200));

      const qrCodeScanner = new Html5Qrcode('qr-reader-viewport');
      scannerRef.current = qrCodeScanner;

      const qrboxCalc = (viewfinderWidth: number, viewfinderHeight: number) => {
        const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
        const edge = Math.max(160, Math.floor(minEdge * 0.72));
        return { width: edge, height: edge };
      };

      const scanConfig = {
        fps: 10,
        qrbox: qrboxCalc,
      };

      // Intento 1: cámara trasera directa
      try {
        await qrCodeScanner.start(
          { facingMode: 'environment' },
          scanConfig,
          (decodedText) => handleValidateCode(decodedText),
          () => {}
        );
        isCameraActiveRef.current = true;
        setIsCameraActive(true);
        setIsStartingCamera(false);
        return;
      } catch (facingErr) {
        console.warn('facingMode environment falló, probando selector de cámaras:', facingErr);
      }

      // Intento 2: Listar cámaras del dispositivo (útil en Chrome Android / iOS)
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length > 0) {
        const backCam =
          devices.find(
            (d) =>
              d.label.toLowerCase().includes('back') ||
              d.label.toLowerCase().includes('trasera') ||
              d.label.toLowerCase().includes('posterior') ||
              d.label.toLowerCase().includes('environment')
          ) || devices[devices.length - 1];

        await qrCodeScanner.start(
          backCam.id,
          scanConfig,
          (decodedText) => handleValidateCode(decodedText),
          () => {}
        );
        isCameraActiveRef.current = true;
        setIsCameraActive(true);
        setIsStartingCamera(false);
        return;
      }

      throw new Error('No se detectó ninguna cámara disponible en el dispositivo.');
    } catch (err: any) {
      console.error('Error al iniciar cámara:', err);
      isCameraActiveRef.current = false;
      setIsCameraActive(false);
      forceReleaseAllCameras();
      const errStr = (err?.message || err?.toString() || '').toLowerCase();
      if (errStr.includes('permission') || errStr.includes('notallowed') || err?.name === 'NotAllowedError') {
        setCameraError('Permiso denegado: Autoriza el acceso a la cámara en los permisos de tu navegador.');
      } else if (errStr.includes('notfound') || err?.name === 'NotFoundError') {
        setCameraError('No se encontró ninguna cámara disponible en el dispositivo.');
      } else {
        setCameraError('No se pudo acceder a la cámara: ' + (err?.message || 'Error de hardware o permisos'));
      }
    } finally {
      setIsStartingCamera(false);
    }
  };

  const stopCamera = async () => {
    isCameraActiveRef.current = false;
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (err) {
        console.warn('Camera stop warning:', err);
      } finally {
        scannerRef.current = null;
      }
    }
    forceReleaseAllCameras();
    setIsCameraActive(false);
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && isCameraActiveRef.current) {
        stopCamera();
      }
    };
    const handleBeforeUnload = () => {
      stopCamera();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      stopCamera();
    };
  }, []);

  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-5">
      
      {/* Top Header Kiosk (Sin enlaces de navegación externa) */}
      <div className="flex items-center justify-between border-b border-purple-100 pb-3">
        <div className="inline-flex items-center gap-2 text-xs text-slate-800 font-bold">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center font-black text-[10px] shadow-xs">
            EP
          </div>
          <span>Terminal de Entrada</span>
        </div>
        <div className="flex items-center gap-2">
          {isFirebaseOnline && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Sincronizado en tiempo real" />
          )}
          <span className="text-xs font-semibold bg-purple-100 text-purple-800 px-3 py-1 rounded-full border border-purple-200 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-600" /> Modo Staff
          </span>
        </div>
      </div>

      {/* 🔒 PANTALLA DE ACCESO RESTRINGIDO (Si no entra con enlace o credencial autorizada) */}
      {!isAuthorized ? (
        <div className="bg-white border-2 border-purple-100 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl shadow-purple-50 text-center animate-in fade-in">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-rose-100 text-purple-800 rounded-2xl flex items-center justify-center mx-auto shadow-inner border border-purple-200">
            <Lock className="w-8 h-8 text-purple-700" />
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 px-3 py-0.5 rounded-full border border-rose-200 inline-block">
              Acceso Restringido 🔒
            </span>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Escáner de Puerta Protegido</h2>
            <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
              Para validar boletos en la entrada de un evento debes ingresar mediante el <strong>enlace oficial</strong> generado por el organizador.
            </p>
          </div>

          {authError && (
            <div className="p-3.5 bg-rose-50 text-rose-800 border border-rose-200 rounded-2xl text-xs font-semibold leading-relaxed text-left">
              ⚠️ {authError}
            </div>
          )}

          {/* Formulario de desbloqueo manual seguro */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-3">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-purple-600" /> ¿Tienes la Clave Maestra del Evento?
            </h3>
            <form onSubmit={handleManualUnlockSubmit} className="space-y-2.5">
              <div>
                <label className="text-[11px] font-bold text-slate-600">Clave o PIN del Evento</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: PRUE26"
                  value={unlockPin}
                  onChange={(e) => setUnlockPin(e.target.value.toUpperCase())}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 uppercase focus:outline-none focus:border-purple-500 mt-0.5"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600">Tu Nombre o Puerta</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Puerta 1 / Carlos Staff"
                  value={unlockName}
                  onChange={(e) => setUnlockName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-purple-500 mt-0.5"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow-md shadow-purple-200 active:scale-95"
              >
                Desbloquear Escáner 🔓
              </button>
            </form>
          </div>

          <div className="pt-1 text-[11px] text-slate-400">
            🔒 Terminal de acceso seguro para personal autorizado.
          </div>
        </div>
      ) : (
        /* 🟢 ESCÁNER AUTORIZADO Y BLOQUEADO AL EVENTO ESPECÍFICO */
        <div className="space-y-5 animate-in fade-in">
          
          {/* Tarjeta de Lector Autorizado */}
          <div className="bg-gradient-to-r from-purple-800 via-indigo-800 to-purple-900 text-white rounded-3xl p-5 shadow-lg shadow-purple-200/50 space-y-2.5 border border-purple-700">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-purple-200 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-pink-300" /> Lector Autorizado en Puerta
                </span>
                <h3 className="text-base font-black text-white mt-0.5">
                  {authorizedEvent?.title}
                </h3>
                <p className="text-xs text-purple-200 mt-0.5 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-purple-300" /> Operador: <strong className="text-white">{scannerOperator}</strong>
                </p>
              </div>

              <button
                onClick={handleLogout}
                className="text-[11px] bg-white/15 hover:bg-white/25 text-white px-2.5 py-1.5 rounded-xl transition-colors font-semibold flex items-center gap-1"
                title="Cerrar sesión de este escáner"
              >
                <LogOut className="w-3 h-3" /> Salir
              </button>
            </div>
          </div>

          {/* Camara Viewport Box */}
          <div className="bg-white border border-purple-100 rounded-3xl p-5 space-y-4 shadow-md shadow-purple-50">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-purple-600" /> Escáner de Boletos QR
              </span>
              <span className="text-[11px] font-mono text-slate-500 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-100">
                Escaneados: <strong className="text-purple-700 font-bold">{personalScanCount}</strong>
              </span>
            </div>

            <div className="relative bg-slate-900 rounded-2xl min-h-[300px] overflow-hidden border border-slate-800 flex flex-col items-center justify-center">
              <div id="qr-reader-viewport" className="w-full min-h-[300px]"></div>

              {!isCameraActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center space-y-3 bg-slate-900/95 text-center p-6 z-10">
                  <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-purple-400/40 flex items-center justify-center text-purple-300 bg-purple-500/10">
                    <QrCode className="w-8 h-8" />
                  </div>

                  {cameraError ? (
                    <div className="space-y-3 max-w-[260px]">
                      <p className="text-xs text-rose-300 leading-relaxed font-semibold">
                        ⚠️ {cameraError}
                      </p>
                      <button
                        onClick={startCamera}
                        disabled={isStartingCamera}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md active:scale-95"
                      >
                        {isStartingCamera ? 'Iniciando...' : 'Reintentar Cámara 📷'}
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs text-slate-300 max-w-[220px] leading-relaxed">
                        Apunta la cámara del celular al código QR del boleto del asistente
                      </p>
                      <button
                        onClick={startCamera}
                        disabled={isStartingCamera}
                        className="bg-white hover:bg-purple-50 text-purple-900 font-bold text-xs px-5 py-3 rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-1.5"
                      >
                        {isStartingCamera ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Conectando cámara...
                          </>
                        ) : (
                          <>
                            <Camera className="w-3.5 h-3.5" /> Activar Cámara del Celular
                          </>
                        )}
                      </button>
                    </>
                  )}
                </div>
              )}

              {isCameraActive && (
                <div className="absolute top-3 left-3 right-3 flex justify-between items-center z-20 pointer-events-none">
                  <button
                    onClick={async () => {
                      await stopCamera();
                      setTimeout(startCamera, 250);
                    }}
                    className="pointer-events-auto bg-slate-900/80 hover:bg-slate-900 text-white text-[11px] px-2.5 py-1 rounded-lg border border-slate-700 flex items-center gap-1 backdrop-blur-xs shadow-md active:scale-95 transition-all"
                  >
                    <RefreshCw className="w-3 h-3" /> Reiniciar 🔄
                  </button>
                  <button
                    onClick={stopCamera}
                    className="pointer-events-auto bg-slate-900/80 hover:bg-slate-900 text-white text-[11px] px-2.5 py-1 rounded-lg border border-slate-700 flex items-center gap-1 backdrop-blur-xs shadow-md active:scale-95 transition-all"
                  >
                    <CameraOff className="w-3 h-3" /> Apagar
                  </button>
                </div>
              )}
            </div>

            {/* Estilos para el visor de la cámara html5-qrcode */}
            <style jsx global>{`
              #qr-reader-viewport {
                border: none !important;
                width: 100% !important;
                min-height: 300px !important;
                background: #0f172a !important;
                position: relative !important;
              }
              #qr-reader-viewport video {
                width: 100% !important;
                height: 100% !important;
                min-height: 300px !important;
                max-height: 400px !important;
                object-fit: cover !important;
                border-radius: 1rem !important;
                display: block !important;
              }
              #qr-reader-viewport__scan_region {
                background: transparent !important;
              }
              #qr-reader-viewport__dashboard_section_csr,
              #qr-reader-viewport__dashboard_section_swaplink {
                display: none !important;
              }
            `}</style>

            {/* SCAN FEEDBACK RESULT CARD */}
            {scannedResult && (
              <div
                className={`p-4 rounded-2xl border-2 text-center space-y-1.5 animate-in zoom-in-95 duration-200 shadow-sm ${
                  scannedResult.type === 'valid'
                    ? 'bg-emerald-50 border-emerald-400 text-emerald-950'
                    : scannedResult.type === 'already_attended'
                    ? 'bg-amber-50 border-amber-400 text-amber-950'
                    : scannedResult.type === 'pending_payment'
                    ? 'bg-orange-50 border-orange-400 text-orange-950'
                    : scannedResult.type === 'wrong_event'
                    ? 'bg-purple-50 border-purple-400 text-purple-950'
                    : 'bg-rose-50 border-rose-400 text-rose-950'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  {scannedResult.type === 'valid' && <CheckCircle2 className="w-6 h-6 text-emerald-600" />}
                  {scannedResult.type === 'already_attended' && <AlertTriangle className="w-6 h-6 text-amber-600" />}
                  {scannedResult.type === 'pending_payment' && <AlertTriangle className="w-6 h-6 text-orange-600" />}
                  {scannedResult.type === 'wrong_event' && <AlertTriangle className="w-6 h-6 text-purple-600" />}
                  {scannedResult.type === 'not_inscribed' && <XCircle className="w-6 h-6 text-rose-600" />}
                  <h4 className="font-extrabold text-base tracking-tight">{scannedResult.message}</h4>
                </div>

                {scannedResult.attendeeName && (
                  <p className="font-extrabold text-lg text-slate-900">{scannedResult.attendeeName}</p>
                )}

                {scannedResult.folio && (
                  <p className="text-xs font-mono font-semibold text-slate-700 bg-white/70 py-0.5 px-2 rounded-md inline-block">
                    {scannedResult.folio}
                  </p>
                )}

                {scannedResult.eventName && (
                  <p className="text-xs font-medium text-slate-600">
                    Evento: <strong>{scannedResult.eventName}</strong>
                  </p>
                )}

                {scannedResult.timestamp && (
                  <p className="text-[11px] opacity-90 font-sans mt-0.5 leading-relaxed">{scannedResult.timestamp}</p>
                )}
              </div>
            )}

            {/* ENTRADA MANUAL DE FOLIO (Para reflejos en pantalla o códigos arrugados) */}
            <div className="pt-2 border-t border-purple-100 space-y-2">
              <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                <Search className="w-3 h-3 text-purple-600" /> ¿Reflejo en pantalla? Validar por folio escrito:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                  placeholder="ej: REG-PRUE26-P0RP"
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-purple-500 focus:bg-white uppercase"
                />
                <button
                  onClick={() => {
                    handleValidateCode(manualCode);
                    setManualCode('');
                  }}
                  disabled={isValidating || !manualCode.trim()}
                  className="bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-xs active:scale-95 flex items-center gap-1"
                >
                  {isValidating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Verificar'}
                </button>
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
