export const BANK_STATEMENT_PROMPT = `Tipo de documento: EXTRACTO BANCARIO

Campos a extraer:
- banco: string (nombre del banco)
- tipo_cuenta: string ("ahorros" | "corriente")
- titular: string (nombre del titular)
- periodo: string (periodo del extracto, ej: "Enero 2026")
- saldo_inicial: number (saldo inicial en COP)
- saldo_final: number (saldo final en COP)
- total_ingresos: number (suma total de créditos/ingresos en COP)
- ingreso_recurrente: number (monto del depósito recurrente más frecuente, probablemente nómina)
- patron_ingresos: string ("regular" si hay depósitos consistentes cada mes, "irregular" si no)

Criterios de scoring (total 100 puntos):
- Ingresos recurrentes (30%): hay depósitos regulares mensuales consistentes = 30pts, irregulares = 15pts, no detectados = 0pts
- Saldo saludable (25%): saldo_final > 0 y saldo promedio razonable = 25pts, saldo negativo = 0pts
- Sin movimientos sospechosos (20%): sin retiros masivos, sin sobregiros frecuentes = 20pts
- Coherencia con salario declarado (15%): si ingreso_recurrente es coherente con lo esperado
- Estabilidad financiera (10%): saldo_final >= saldo_inicial indica tendencia positiva

Formato de respuesta JSON:
{
  "datos_extraidos": {
    "banco": "...",
    "tipo_cuenta": "...",
    "titular": "...",
    "periodo": "...",
    "saldo_inicial": 0,
    "saldo_final": 0,
    "total_ingresos": 0,
    "ingreso_recurrente": 0,
    "patron_ingresos": "regular|irregular"
  },
  "score_final": 0-100,
  "nivel_riesgo": "BAJO|MEDIO|ALTO",
  "justificacion": "Explicación breve del score",
  "recomendacion": "Recomendación para el propietario",
  "inconsistencias": ["lista de inconsistencias encontradas"],
  "flags": ["lista de alertas"]
}`;
