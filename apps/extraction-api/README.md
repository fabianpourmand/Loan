# Loanalize Extraction API (A-03)

Server-side statement extraction service for mortgage statements. Handles PDF + image uploads with deterministic text extraction (embedded text → OCRmyPDF → regex heuristics).

## Quick Start

### Prerequisites
- Docker & Docker Compose

### Run Locally

```bash
cd apps/extraction-api
docker-compose up --build
```

Service runs on `http://localhost:8009`

## API Endpoints

### GET /health
Health check.

```bash
curl http://localhost:8009/health
```

Response:
```json
{"status": "ok"}
```

### POST /v1/extract
Extract fields from mortgage statement.

**Request:**
- `Content-Type: multipart/form-data`
- `file` (form field): PDF or image file (jpg, png, pdf)

**Response:**
```json
{
  "fields": {
    "principal_balance": {
      "value": "300000.00",
      "confidence": 0.9,
      "provenance": "pdf_text"
    },
    "note_rate": {
      "value": "6.375",
      "confidence": 0.9,
      "provenance": "pdf_text"
    },
    "scheduled_pi": {
      "value": "1896.20",
      "confidence": 0.85,
      "provenance": "pdf_text"
    },
    "escrow": {
      "value": "450.00",
      "confidence": 0.85,
      "provenance": "pdf_text"
    },
    "next_due_date": {
      "value": "2026-02-01",
      "confidence": 0.9,
      "provenance": "pdf_text"
    },
    "maturity_date": {
      "value": "2056-01-01",
      "confidence": 0.9,
      "provenance": "pdf_text"
    }
  },
  "debug": {
    "doc_type": "pdf",
    "pages_used": [1],
    "text_stats": {
      "source": "pdf_text",
      "chars": 2847,
      "lines": 56
    },
    "timings_ms": {},
    "errors": []
  }
}
```

## Extraction Pipeline

1. **Embedded Text Extraction** (PDF only)
   - Extract text directly from PDF using PyPDF

2. **OCR** (PDF with insufficient text OR image uploads)
   - PDF: Run OCRmyPDF to add text layer, then re-extract text
   - Image: Preprocess (RGB → grayscale, 2x resize) then run Tesseract with `--oem 1 --psm 6`

3. **Field Extraction**
   - Apply regex heuristics to extracted text
   - Extract: principal_balance, note_rate, scheduled_pi, escrow, next_due_date, maturity_date
   - All fields use doc-level provenance (pdf_text or ocr_text)

4. **Cleanup**
   - Delete temp files immediately (TemporaryDirectory)

## Field Matching Heuristics

- **principal_balance**: "Principal Balance", "Unpaid Principal Balance"
- **note_rate**: "Interest Rate", "Note Rate" (percent value)
- **scheduled_pi**: "Principal and Interest", "P&I", "Monthly Payment"
- **escrow**: "Escrow", "Escrow Payment"
- **next_due_date**: "Next Payment Due", "Payment Due Date"
- **maturity_date**: "Maturity Date", "Payoff Date"

## Response Fields

### fields: Dict[str, FieldExtraction]
- `value`: Extracted value (string) or empty string "" if not found
- `confidence`: Float 0.0-1.0 indicating match quality
- `provenance`: Source of extraction (strictly: **"pdf_text" | "ocr_text" | "llm_fallback"**)
  - `pdf_text`: Extracted from embedded PDF text
  - `ocr_text`: Extracted from OCR (OCRmyPDF or Tesseract on images)
  - `llm_fallback`: Extracted via LLM (stub; not yet implemented)

### debug: Dict
- `doc_type`: "pdf" or "image"
- `pages_used`: List of page numbers processed
- `text_stats`: Text extraction statistics for OCR diagnostics
  - `source`: Provenance used for this document ("pdf_text" or "ocr_text")
  - `chars`: Total character count extracted
  - `lines`: Total line count extracted
- `text_sample`: (Optional) First 300 chars of extracted text (only if `EXTRACT_DEBUG=1`)
- `timings_ms`: Timing breakdown (for future perf tracking)
- `errors`: List of errors encountered during extraction

## Testing

Test with a sample PDF:

```bash
curl -X POST -F "file=@/path/to/statement.pdf" http://localhost:8009/v1/extract | jq .
```

## Environment Variables

- `PYTHONUNBUFFERED=1` (set in docker-compose for instant logging)
- `EXTRACT_DEBUG=1` (optional) - Includes `text_sample` (first 300 chars) in debug output for OCR diagnostics

### Enable Debug Mode (Local Development)

Use the debug override file:
```bash
docker-compose -f docker-compose.yml -f docker-compose.debug.yml up --build
```

This enables `text_sample` (first 300 chars) in the response for OCR diagnostics.

## LLM Fallback (Stub)

LLM fallback is **not yet implemented**. When confidence is low for individual fields, the system will attempt extraction with available heuristics. Stub for OpenAI integration reserved for Phase 2.

## Notes

- Phase II A-03 skeleton (MVP-ready)
- No mobile integration yet (see apps/mobile for A-04)
- System deps: tesseract-ocr, ghostscript, qpdf
- No auth/keys in this service
