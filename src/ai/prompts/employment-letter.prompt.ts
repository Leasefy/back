export const EMPLOYMENT_LETTER_PROMPT = `Tipo de documento: CARTA LABORAL

Campos a extraer:
- empresa: string (nombre de la empresa)
- nit: string (NIT de la empresa)
- cargo: string (cargo del empleado)
- salario_mensual: number (salario mensual en COP, solo número)
- fecha_ingreso: string (formato YYYY-MM-DD)
- tipo_contrato: string ("indefinido" | "fijo" | "obra_labor" | "prestacion_servicios" | "otro")
- antiguedad_meses: number (meses de antigüedad calculados desde fecha_ingreso hasta hoy)
- firmado_por: string (nombre de quien firma la carta)
- tiene_membrete: boolean (¿tiene membrete o logo de la empresa?)
- tiene_firma: boolean (¿tiene firma visible?)

Criterios de scoring (total 100 puntos):
- Antigüedad laboral (30%): >= 24 meses = 30pts, >= 12 meses = 22pts, >= 6 meses = 15pts, < 6 meses = 5pts
- Tipo de contrato (25%): indefinido = 25pts, fijo = 18pts, obra_labor = 10pts, prestacion_servicios = 8pts
- Legitimidad (20%): tiene membrete + firma = 20pts, solo uno = 12pts, ninguno = 3pts
- Coherencia salarial (15%): salario > 0 y parece razonable para el cargo = 15pts
- Formato y completitud (10%): todos los campos presentes = 10pts

Formato de respuesta JSON:
{
  "datos_extraidos": {
    "empresa": "...",
    "nit": "...",
    "cargo": "...",
    "salario_mensual": 0,
    "fecha_ingreso": "...",
    "tipo_contrato": "...",
    "antiguedad_meses": 0,
    "firmado_por": "...",
    "tiene_membrete": true/false,
    "tiene_firma": true/false
  },
  "score_final": 0-100,
  "nivel_riesgo": "BAJO|MEDIO|ALTO",
  "justificacion": "Explicación breve del score",
  "recomendacion": "Recomendación para el propietario",
  "inconsistencias": ["lista de inconsistencias encontradas"],
  "flags": ["lista de alertas"]
}`;
