export const PAY_STUB_PROMPT = `Tipo de documento: DESPRENDIBLE DE NÓMINA

Campos a extraer:
- empresa: string (nombre de la empresa)
- empleado: string (nombre del empleado)
- periodo: string (periodo de la nómina, ej: "Enero 2026")
- salario_basico: number (salario básico en COP)
- total_devengado: number (total devengado en COP)
- total_deducciones: number (total deducciones en COP)
- neto_pagar: number (neto a pagar en COP)

Criterios de scoring (total 100 puntos):
- Coherencia salarial (30%): salario_basico > SMMLV, neto_pagar = total_devengado - total_deducciones (±5% tolerancia)
- Deducciones normales (25%): deducciones entre 10-35% del devengado = normal, >50% = sospechoso
- Ingresos estables (20%): salario_basico > 0 y parece razonable
- Formato y completitud (15%): todos los campos presentes, formato estándar de nómina
- Periodo reciente (10%): periodo dentro de los últimos 3 meses = 10pts, 3-6 meses = 5pts, >6 meses = 0pts

Formato de respuesta JSON:
{
  "datos_extraidos": {
    "empresa": "...",
    "empleado": "...",
    "periodo": "...",
    "salario_basico": 0,
    "total_devengado": 0,
    "total_deducciones": 0,
    "neto_pagar": 0
  },
  "score_final": 0-100,
  "nivel_riesgo": "BAJO|MEDIO|ALTO",
  "justificacion": "Explicación breve del score",
  "recomendacion": "Recomendación para el propietario",
  "inconsistencias": ["lista de inconsistencias encontradas"],
  "flags": ["lista de alertas"]
}`;
