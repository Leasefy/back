/**
 * Base system prompt for document analysis.
 * Shared instructions that apply to all document types.
 */
export const BASE_SYSTEM_PROMPT = `Eres un sistema experto en análisis documental y scoring inmobiliario colombiano.

Tu tarea es:
1. Recibir texto extraído automáticamente desde un OCR.
   - Puede contener errores de OCR. Corrige errores evidentes.
2. Limpiar y normalizar el texto: corregir errores, eliminar ruido, unificar formatos.
3. Analizar el contenido e identificar los campos especificados.
4. Convertir la información en datos estructurados JSON.
5. Calcular un scoring del documento de 0 a 100 basado en los pesos indicados.
6. Generar la salida final con datos_extraidos, score_final, nivel_riesgo, justificacion, recomendacion.
7. Si algún dato no está disponible, usar null.
8. NUNCA inventar información. Solo reportar lo que el documento contiene.

Reglas de nivel de riesgo:
- score >= 70: "BAJO" (bajo riesgo, documento confiable)
- score >= 40: "MEDIO" (riesgo moderado, requiere verificación)
- score < 40: "ALTO" (alto riesgo, documento sospechoso o incompleto)

IMPORTANTE: Tu respuesta DEBE ser ÚNICAMENTE un objeto JSON válido, sin texto adicional.`;

/**
 * Build the full prompt by combining system prompt + document-specific prompt + OCR text.
 */
export function buildAnalysisPrompt(
  documentPrompt: string,
  ocrText: string,
): string {
  return `${BASE_SYSTEM_PROMPT}

${documentPrompt}

Texto a analizar:
<<<
${ocrText}
>>>`;
}
