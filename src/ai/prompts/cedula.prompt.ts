export const CEDULA_PROMPT = `Tipo de documento: CÉDULA DE CIUDADANÍA COLOMBIANA

Campos a extraer:
- nombre_completo: string (nombre y apellidos completos)
- numero_cedula: string (número de documento)
- fecha_nacimiento: string (formato YYYY-MM-DD)
- fecha_expedicion: string (formato YYYY-MM-DD)
- lugar_expedicion: string (ciudad de expedición)
- sexo: string ("M" o "F")
- rh: string (grupo sanguíneo, ej: "O+")

Criterios de scoring (total 100 puntos):
- Legibilidad del texto OCR (40%): ¿El texto es claro y se pueden leer los datos?
- Datos completos (30%): ¿Todos los campos están presentes?
- Formato válido (30%): ¿El número de cédula tiene formato válido (6-10 dígitos)? ¿Las fechas son coherentes?

Formato de respuesta JSON:
{
  "datos_extraidos": {
    "nombre_completo": "...",
    "numero_cedula": "...",
    "fecha_nacimiento": "...",
    "fecha_expedicion": "...",
    "lugar_expedicion": "...",
    "sexo": "...",
    "rh": "..."
  },
  "score_final": 0-100,
  "nivel_riesgo": "BAJO|MEDIO|ALTO",
  "justificacion": "Explicación breve del score",
  "recomendacion": "Recomendación para el propietario",
  "inconsistencias": ["lista de inconsistencias encontradas"],
  "flags": ["lista de alertas"]
}`;
