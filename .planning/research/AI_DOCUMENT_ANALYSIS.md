# AI Document Analysis Research

**Date:** 2026-01-24
**Confidence:** HIGH
**Priority:** CRITICAL - Core differentiator del producto

---

## Executive Summary

**Recomendación: Claude API (Anthropic) como primario + AWS Textract como fallback para OCR estructurado.**

| Aspecto | Claude API | GPT-4 Vision | AWS Textract |
|---------|------------|--------------|--------------|
| Costo/doc (estimado) | ~$0.02-0.05 | ~$0.03-0.08 | ~$0.05-0.15 |
| Análisis semántico | Excelente | Excelente | Limitado |
| Extracción estructurada | Bueno | Bueno | Excelente |
| Colombia (español) | Excelente | Excelente | Bueno |
| Integración | Simple (API REST) | Simple (API REST) | Más compleja (AWS SDK) |

**Para 1,000 aplicaciones/mes (4 docs cada una = 4,000 docs):**
- Claude API: ~$80-200/mes
- GPT-4 Vision: ~$120-320/mes
- AWS Textract: ~$200-600/mes

---

## Documentos a Analizar

| Documento | Qué Extraer | Complejidad |
|-----------|-------------|-------------|
| Cédula de ciudadanía | Nombre, número, fecha nacimiento, fecha expedición | Media |
| Carta laboral | Empresa, cargo, salario, antigüedad, tipo contrato | Alta |
| Desprendibles de nómina | Salario base, deducciones, neto, fecha | Alta |
| Extractos bancarios | Ingresos recurrentes, saldo promedio, movimientos | Alta |
| Referencias | Sentiment, red flags, verificación datos | Media |

---

## Opciones Comparadas

### 1. Claude API (Anthropic) ⭐ RECOMENDADO

**Modelos disponibles:**
- **Claude 3.5 Sonnet** - Mejor balance precio/rendimiento
- **Claude 3.5 Haiku** - Más económico para tareas simples
- **Claude 3 Opus / Claude 4 Opus** - Máxima capacidad

**Pricing (Enero 2026):**

| Modelo | Input (1M tokens) | Output (1M tokens) |
|--------|-------------------|-------------------|
| Claude 3.5 Sonnet | $3.00 | $15.00 |
| Claude 3.5 Haiku | $0.25 | $1.25 |
| Claude 3 Opus | $15.00 | $75.00 |

**Imágenes:**
- Las imágenes se convierten a tokens (~1,000-2,000 tokens por imagen típica)
- Una imagen de documento: ~$0.003-0.006 (Sonnet)

**Costo estimado por documento:**
- Imagen + prompt + respuesta estructurada
- ~1,500 tokens input + 500 tokens output
- **~$0.01-0.02 por documento** (Sonnet)

**Capacidades:**
- ✅ Visión multimodal (lee imágenes directamente)
- ✅ Extracción de datos estructurados
- ✅ Análisis semántico (detecta inconsistencias)
- ✅ Español nativo excelente
- ✅ Puede seguir schemas JSON
- ✅ Context window 200K tokens

**Ejemplo de uso:**
```typescript
const response = await anthropic.messages.create({
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 1024,
  messages: [{
    role: 'user',
    content: [
      {
        type: 'image',
        source: { type: 'base64', media_type: 'image/jpeg', data: documentBase64 }
      },
      {
        type: 'text',
        text: `Analiza esta carta laboral colombiana. Extrae en JSON:
        - empresa: string
        - cargo: string
        - salarioMensual: number (en COP)
        - fechaIngreso: string (YYYY-MM-DD)
        - tipoContrato: "indefinido" | "fijo" | "obra_labor"
        - antiguedadMeses: number
        - verificado: boolean (si parece legítima)`
      }
    ]
  }]
});
```

**Pros:**
- Mejor razonamiento y detección de inconsistencias
- Excelente para análisis semántico
- API simple y bien documentada
- Prompt caching reduce costos en queries repetitivos

**Cons:**
- No tiene OCR estructurado nativo (tablas complejas)
- Requiere prompt engineering cuidadoso

---

### 2. GPT-4 Vision (OpenAI)

**Modelos disponibles:**
- **GPT-4o** - Multimodal optimizado
- **GPT-4o Mini** - Económico

**Pricing (Enero 2026):**

| Modelo | Input (1M tokens) | Output (1M tokens) |
|--------|-------------------|-------------------|
| GPT-4o | $5.00 ($2.50 cached) | $20.00 |
| GPT-4o Mini | $0.60 ($0.30 cached) | $2.40 |

**Costo estimado por documento:**
- **~$0.02-0.04 por documento** (GPT-4o)
- **~$0.002-0.005 por documento** (GPT-4o Mini)

**Capacidades:**
- ✅ Visión multimodal excelente
- ✅ Español muy bueno
- ✅ JSON mode nativo
- ✅ Function calling estructurado

**Pros:**
- Ecosystem más maduro
- Más integraciones disponibles
- JSON mode garantiza estructura

**Cons:**
- Ligeramente más caro que Claude Sonnet
- Menos ventana de contexto (128K vs 200K)

---

### 3. AWS Textract

**Pricing (US East, Enero 2026):**

| API | Precio por página |
|-----|-------------------|
| Detect Document Text (OCR básico) | $0.0015 |
| Analyze Document - Forms | $0.05 |
| Analyze Document - Tables | $0.05 |
| Analyze Document - Queries | $0.05 |
| Analyze ID | $0.10 |
| Analyze Expense (facturas) | $0.10 |

**Costo estimado por documento:**
- Cédula (Analyze ID): $0.10
- Carta laboral (Forms): $0.05
- Extracto bancario (Tables): $0.05-0.10

**Capacidades:**
- ✅ OCR muy preciso
- ✅ Extracción de tablas excelente
- ✅ Key-value pairs automáticos
- ✅ Específico para IDs y facturas
- ❌ No hace análisis semántico
- ❌ No detecta inconsistencias

**Integración NestJS:**
```typescript
import { TextractClient, AnalyzeDocumentCommand } from '@aws-sdk/client-textract';

const textract = new TextractClient({ region: 'us-east-1' });
const response = await textract.send(new AnalyzeDocumentCommand({
  Document: { Bytes: documentBuffer },
  FeatureTypes: ['FORMS', 'TABLES']
}));
```

**Pros:**
- Mejor para extracción estructurada (tablas, formularios)
- Integración nativa con S3/Lambda
- Pricing por página predecible

**Cons:**
- Solo OCR + extracción, no "entiende" el documento
- Requiere AWS account y configuración
- No analiza semánticamente

---

### 4. Google Document AI

**Pricing:**
- General (OCR): $0.0015/página
- Form Parser: $0.05/página
- Invoice Parser: $0.10/página
- ID Parser: $0.10/página

**Capacidades:**
- Similar a Textract
- Soporte para ~50 idiomas
- Custom processors entrenables

**Benchmarks 2025:**
- Accuracy general: ~82% (similar a Textract)
- Line-item detection: 40% (vs 82% Textract) - problema significativo
- Tablas complejas: rendimiento inferior

**Veredicto:** No recomendado sobre Textract. Menor accuracy en benchmarks y requiere Google Cloud.

---

### 5. APIs Especializadas

#### Plaid (Verificación bancaria)
- **Qué hace:** Conecta directamente a cuentas bancarias
- **Colombia:** ❌ No disponible
- **Alternativa:** Open banking Colombia (en desarrollo)

#### Argyle (Verificación de empleo)
- **Qué hace:** Verifica empleo conectando a nóminas
- **Colombia:** ❌ Limitado
- **Alternativa:** Carta laboral + IA

#### Truora (Colombia-específico)
- **Qué hace:** Verificación de identidad, antecedentes
- **Colombia:** ✅ Nativo
- **Pricing:** Contactar ventas
- **Consideración:** Posible integración futura para verificación de identidad

---

## Tabla Comparativa Final

| Criterio | Claude Sonnet | GPT-4o | Textract | Google Doc AI |
|----------|---------------|--------|----------|---------------|
| **Costo/doc** | $0.01-0.02 | $0.02-0.04 | $0.05-0.15 | $0.05-0.15 |
| **Análisis semántico** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐ | ⭐ |
| **Extracción tablas** | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Detección fraude** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ❌ | ❌ |
| **Español Colombia** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| **Integración** | Simple | Simple | Media | Media |
| **Latencia** | 2-5s | 2-5s | 1-3s | 1-3s |

---

## Proyección de Costos

### Escenario: 1,000 aplicaciones/mes

Cada aplicación tiene ~4 documentos:
- 1 Cédula
- 1 Carta laboral
- 2 Extractos/desprendibles

**Total: 4,000 documentos/mes**

| Proveedor | Costo mensual estimado |
|-----------|------------------------|
| Claude 3.5 Sonnet (solo) | $40-80 |
| Claude + Textract (híbrido) | $80-150 |
| GPT-4o (solo) | $80-160 |
| Textract (solo) | $200-400 |

---

## Arquitectura Recomendada

```
┌─────────────────────────────────────────────────────────────┐
│                    Document Analyzer Service                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │ Pre-process  │───▶│   Router     │───▶│   Claude     │  │
│  │ (validate,   │    │ (by doc type)│    │   Sonnet     │  │
│  │  resize)     │    └──────┬───────┘    │              │  │
│  └──────────────┘           │            │ - Análisis   │  │
│                             │            │ - Extracción │  │
│                             │            │ - Fraude     │  │
│                             ▼            └──────────────┘  │
│                    ┌──────────────┐                        │
│                    │  Textract    │ (fallback para         │
│                    │  (opcional)  │  tablas complejas)     │
│                    └──────────────┘                        │
│                                                              │
│  Output: JSON estructurado + confidence + flags             │
└─────────────────────────────────────────────────────────────┘
```

### Flujo recomendado:

1. **Upload** → Supabase Storage
2. **Pre-process** → Validar formato, comprimir si necesario
3. **Classify** → Detectar tipo de documento
4. **Analyze** → Claude Sonnet para extracción + análisis
5. **Validate** → Cross-check datos extraídos
6. **Store** → Guardar resultado estructurado + raw para auditoría

---

## Implementación Sugerida

```typescript
// document-analyzer.service.ts
@Injectable()
export class DocumentAnalyzerService {
  constructor(
    private readonly anthropic: Anthropic,
    private readonly configService: ConfigService,
  ) {}

  async analyzeDocument(
    documentBuffer: Buffer,
    documentType: DocumentType,
  ): Promise<DocumentAnalysisResult> {
    const base64 = documentBuffer.toString('base64');
    const prompt = this.getPromptForType(documentType);

    const response = await this.anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } },
          { type: 'text', text: prompt }
        ]
      }]
    });

    return this.parseResponse(response, documentType);
  }

  private getPromptForType(type: DocumentType): string {
    const prompts = {
      [DocumentType.ID]: `Analiza esta cédula de ciudadanía colombiana...`,
      [DocumentType.EMPLOYMENT_LETTER]: `Analiza esta carta laboral...`,
      [DocumentType.PAY_STUB]: `Analiza este desprendible de nómina...`,
      [DocumentType.BANK_STATEMENT]: `Analiza este extracto bancario...`,
    };
    return prompts[type];
  }
}
```

---

## Recomendación Final

### MVP (Fase 1)
**Usar solo Claude 3.5 Sonnet**
- Costo bajo (~$0.02/doc)
- Análisis semántico incluido
- Detección de fraude incluida
- Una sola integración

### Escalamiento (Fase 2+)
**Agregar Textract para casos específicos:**
- Extractos bancarios con tablas complejas
- Alto volumen de documentos similares
- Cuando se necesite OCR más preciso

### No usar:
- Google Document AI (menor accuracy)
- Solo Textract (no analiza semánticamente)
- GPT-4o (más caro sin ventaja clara sobre Claude)

---

## Sources

- [Anthropic Claude Pricing](https://www.anthropic.com/pricing)
- [OpenAI API Pricing](https://openai.com/api/pricing/)
- [AWS Textract Pricing](https://aws.amazon.com/textract/pricing/)
- [Google Document AI Pricing](https://cloud.google.com/document-ai/pricing)
- [LLM API Pricing Comparison 2025](https://intuitionlabs.ai/articles/llm-api-pricing-comparison-2025)
- [Claude vs GPT Cost Comparison](https://www.vantage.sh/blog/aws-bedrock-claude-vs-azure-openai-gpt-ai-cost)
- [AWS Textract vs Google Document AI Benchmark](https://www.businesswaretech.com/blog/research-best-ai-services-for-automatic-invoice-processing)
- [Top OCR Models 2025](https://www.marktechpost.com/2025/11/02/comparing-the-top-6-ocr-optical-character-recognition-models-systems-in-2025/)
