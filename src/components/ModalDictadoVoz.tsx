import { CheckCircle2, Mic, MicOff, Sparkles, X } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { interpretarNotaCampo, type AccionVozInterpretada } from '../domain/parserVozCampo';
import type { EstadoGanaderia } from '../domain/types';
import { ModalBase } from './ModalBase';

interface SpeechRecognitionEventLike {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

const EJEMPLOS_FRASES = [
  'Hoy parió la 4521, ternera hembra frisona',
  'Mamitis en la 4521 trasero izquierdo',
  'Se le cayó el crotal izquierdo a la 5772',
  'Inseminada la 4521 con toro Capitán',
];

export function ModalDictadoVoz({
  estado,
  onCerrar,
  onConfirmarAccion,
}: {
  estado: EstadoGanaderia;
  onCerrar: () => void;
  onConfirmarAccion: (accion: AccionVozInterpretada) => void;
}) {
  const [texto, setTexto] = useState('');
  const [escuchando, setEscuchando] = useState(false);
  const [errorMicro, setErrorMicro] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const interpretacion = useMemo(() => interpretarNotaCampo(texto, estado), [texto, estado]);

  const soportaVoz =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const toggleMicro = () => {
    setErrorMicro(null);
    if (escuchando) {
      recognitionRef.current?.stop();
      setEscuchando(false);
      return;
    }

    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const SpeechRec = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SpeechRec) {
      setErrorMicro('Tu navegador no soporta dictado directo; puedes escribir o pegar el texto.');
      return;
    }

    const rec = new SpeechRec();
    rec.lang = 'es-ES';
    rec.continuous = false;
    rec.interimResults = true;
    rec.onresult = (event) => {
      let trans = '';
      for (let i = 0; i < event.results.length; i++) {
        trans += event.results[i][0].transcript;
      }
      setTexto(trans);
    };
    rec.onerror = () => {
      setErrorMicro('No se pudo escuchar el micrófono. Revisa permisos o escribe la frase.');
      setEscuchando(false);
    };
    rec.onend = () => setEscuchando(false);
    recognitionRef.current = rec;
    setEscuchando(true);
    rec.start();
  };

  const puedeConfirmar =
    interpretacion.tipo !== 'NO_RECONOCIDA' &&
    (interpretacion.tipo === 'NACIMIENTO' || Boolean(interpretacion.animal));

  return (
    <ModalBase onCerrar={onCerrar} maxWidthClass="max-w-lg">
      <div className="p-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
              <Mic className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Registro Rápido de Cuadra (Voz o Texto)
              </h3>
              <p className="text-[11px] text-slate-500">
                Dicta partos, crotales caídos, bajas o inseminaciones sin rellenar formularios
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleMicro}
              disabled={!soportaVoz}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
                escuchando
                  ? 'animate-pulse bg-red-600 text-white'
                  : 'bg-emerald-800 text-white hover:bg-emerald-900 disabled:bg-slate-300'
              }`}
            >
              {escuchando ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              {escuchando ? 'Escuchando... (pulsar para parar)' : 'Hablar por micrófono'}
            </button>
            <span className="text-[11px] text-slate-500">
              {soportaVoz ? 'Reconocimiento español (es-ES)' : 'Modo texto / WhatsApp'}
            </span>
          </div>

          {errorMicro && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">{errorMicro}</p>
          )}

          <textarea
            rows={3}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder='Ej: "Hoy parió la 4521, ternera hembra frisona" o "Se le cayó el crotal derecho a la 5772"'
            className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-emerald-500 focus:outline-none"
          />

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-500">Probar frases:</span>
            {EJEMPLOS_FRASES.map((frase) => (
              <button
                key={frase}
                type="button"
                onClick={() => setTexto(frase)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-700 hover:border-emerald-300 hover:bg-emerald-50"
              >
                {frase}
              </button>
            ))}
          </div>

          {/* Previsualización interpretada */}
          <div
            className={`rounded-xl border p-3.5 text-xs ${
              puedeConfirmar
                ? 'border-emerald-200 bg-emerald-50/70 text-emerald-950'
                : 'border-slate-200 bg-slate-50 text-slate-600'
            }`}
          >
            <div className="flex items-center gap-1.5 font-bold">
              <Sparkles className="h-3.5 w-3.5 text-emerald-700" />
              <span>
                Interpretación automática:{' '}
                {interpretacion.tipo === 'NO_RECONOCIDA' ? 'Esperando comando' : interpretacion.tipo}
              </span>
            </div>
            <p className="mt-1">{interpretacion.resumen}</p>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!puedeConfirmar}
            onClick={() => onConfirmarAccion(interpretacion)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-800 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-900 disabled:bg-slate-300"
          >
            <CheckCircle2 className="h-4 w-4" />
            Aplicar acción ahora
          </button>
        </div>
      </div>
    </ModalBase>
  );
}
