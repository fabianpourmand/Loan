import os
import re
import tempfile
from typing import Optional, Dict, Any
from datetime import datetime
from pathlib import Path
import logging

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, field_validator
from typing import Literal
import pypdf
import ocrmypdf
from PIL import Image, ImageOps, ImageFilter, ImageEnhance
import pytesseract
from dateutil import parser as date_parser


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Loanalize Extraction API",
    description="Statement extraction service for mortgage statements",
    version="0.1.0"
)


# ============================================================================
# Type Definitions
# ============================================================================

class FieldExtraction(BaseModel):
    value: Optional[str] = None
    confidence: float = 0.0
    provenance: Literal["pdf_text", "ocr_text", "llm_fallback"]

    @field_validator("confidence")
    @classmethod
    def validate_confidence(cls, v: float) -> float:
        """Ensure confidence is between 0.0 and 1.0."""
        if not 0.0 <= v <= 1.0:
            raise ValueError(f"confidence must be between 0.0 and 1.0, got {v}")
        return v


class ExtractionResponse(BaseModel):
    fields: Dict[str, FieldExtraction]
    debug: Dict[str, Any]


# ============================================================================
# Extraction Heuristics
# ============================================================================

def extract_principal_balance(text: str, provenance: str) -> Optional[FieldExtraction]:
    """Extract principal balance from text."""
    patterns = [
        r"(?:Principal\s+Balance|Unpaid\s+Principal\s+Balance|Principal\s+balance)[:\s]+\$?\s*([\d,]+\.?\d*)",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            value = match.group(1).replace(",", "")
            try:
                float(value)
                return FieldExtraction(value=value, confidence=0.9, provenance=provenance)
            except ValueError:
                pass
    return None


def normalize_rate_token(s: str) -> str:
    """Normalize OCR-misread rate tokens (§ or S instead of 5)."""
    # Handle "§.5600%" → "5.5600%"
    match = re.match(r"^[§S]\.(\d{3,4})%$", s)
    if match:
        return f"5.{match.group(1)}%"

    # Handle "§5.5600%" → "55.5600%" (rare)
    match = re.match(r"^[§S](\d)\.(\d{3,4})%$", s)
    if match:
        return f"5{match.group(1)}.{match.group(2)}%"

    return s


def extract_note_rate(text: str, provenance: str) -> Optional[FieldExtraction]:
    """Extract interest rate from text."""

    # Primary patterns (high confidence)
    primary_patterns = [
        r"(?:Interest\s+Rate(?:\s*\(.*?\))?|Note\s+Rate(?:\s*\(.*?\))?|Current\s+Interest\s+Rate(?:\s*\(.*?\))?)[:\s]+([\d§S]+\.?\d*)\s*%?",
    ]

    for pattern in primary_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            captured = match.group(1)
            # Add % if not present for normalization
            if not captured.endswith("%"):
                captured = captured + "%"

            normalized = normalize_rate_token(captured)
            value = normalized.rstrip("%")

            try:
                rate = float(value)
                # Sanity check: 0 < rate <= 25
                if rate > 0 and rate <= 25:
                    return FieldExtraction(value=value, confidence=0.90, provenance=provenance)
            except ValueError:
                pass

    # Secondary pattern: scan "Interest Rates" tables (medium confidence)
    if re.search(r"Interest\s+Rates", text, re.IGNORECASE):
        # Find the position of "Interest Rates"
        table_match = re.search(r"Interest\s+Rates", text, re.IGNORECASE)
        if table_match:
            # Get text after "Interest Rates" (next ~500 chars for ~15 lines)
            start_pos = table_match.end()
            snippet = text[start_pos:start_pos + 500]

            # Find all percent tokens
            rate_tokens = re.findall(r"[\d§S]{1,2}\.\d{2,4}%", snippet)

            if rate_tokens:
                # Normalize all tokens
                normalized_tokens = [normalize_rate_token(t) for t in rate_tokens]

                # Parse and validate
                valid_rates = []
                for token in normalized_tokens:
                    value = token.rstrip("%")
                    try:
                        rate = float(value)
                        if rate > 0 and rate <= 25:
                            valid_rates.append(value)
                    except ValueError:
                        pass

                if valid_rates:
                    # Choose most frequent, or first if all unique
                    from collections import Counter
                    rate_counts = Counter(valid_rates)
                    most_common_rate = rate_counts.most_common(1)[0][0]

                    return FieldExtraction(value=most_common_rate, confidence=0.70, provenance=provenance)

    return None


def extract_scheduled_pi(text: str, provenance: str) -> Optional[FieldExtraction]:
    """Extract scheduled P&I payment from text."""

    # Primary patterns (high confidence)
    primary_patterns = [
        (r"(?:Principal\s+and\s+Interest|P&I|P\s+and\s+I|Principal\s+&\s+Interest)[:\s]+(\$?[\d,]+\.?\d*)", 0.90),
    ]

    # Secondary patterns (medium confidence)
    secondary_patterns = [
        (r"(?:Monthly\s+Payment|Payment\s+Amount|Total\s+Payment)[:\s]+(\$?[\d,]+\.?\d*)", 0.80),
    ]

    # Fallback patterns (lower confidence)
    fallback_patterns = [
        (r"(?:Amount\s+Due)[:\s]+(\$?[\d,]+\.?\d*)", 0.65),
    ]

    all_patterns = primary_patterns + secondary_patterns + fallback_patterns

    for pattern, confidence in all_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            captured = match.group(1)

            # Currency validation: must have $, comma, or decimal
            has_dollar = "$" in captured
            has_comma = "," in captured
            has_decimal = "." in captured

            if not (has_dollar or has_comma or has_decimal):
                continue  # Skip invalid currency format

            # Normalize: strip $ and commas
            normalized = captured.replace("$", "").replace(",", "")

            try:
                amount = float(normalized)

                # Sanity check: 100 <= amount <= 100000
                if amount < 100 or amount > 100000:
                    continue  # Skip out-of-range values

                # Format as string with 2 decimals
                value_str = f"{amount:.2f}"

                return FieldExtraction(value=value_str, confidence=confidence, provenance=provenance)
            except ValueError:
                continue  # Skip if can't parse to float

    return None


def extract_escrow(text: str, provenance: str) -> Optional[FieldExtraction]:
    """Extract escrow payment from text."""
    patterns = [
        r"(?:Escrow\s+Payment|Escrow)[:\s]+\$?\s*([\d,]+\.?\d*)",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            value = match.group(1).replace(",", "")
            try:
                float(value)
                return FieldExtraction(value=value, confidence=0.85, provenance=provenance)
            except ValueError:
                pass
    return None


def extract_next_due_date(text: str, provenance: str) -> Optional[FieldExtraction]:
    """Extract next payment due date from text."""
    patterns = [
        r"(?:Next\s+Payment\s+Due(?:\s*\(.*?\))?|Payment\s+Due\s+Date(?:\s*\(.*?\))?|Payment\s+Due(?:\s*\(.*?\))?)[:\s]+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\w+\s+\d{1,2},?\s+\d{4})",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            date_str = match.group(1)
            try:
                parsed_date = date_parser.parse(date_str)
                iso_date = parsed_date.strftime("%Y-%m-%d")
                return FieldExtraction(value=iso_date, confidence=0.9, provenance=provenance)
            except (ValueError, date_parser.ParserError):
                return FieldExtraction(value=date_str, confidence=0.5, provenance=provenance)
    return None


def extract_maturity_date(text: str, provenance: str) -> Optional[FieldExtraction]:
    """Extract maturity date from text."""
    patterns = [
        r"(?:Maturity\s+Date|Payoff\s+Date)[:\s]+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\w+\s+\d{1,2},?\s+\d{4})",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            date_str = match.group(1)
            try:
                parsed_date = date_parser.parse(date_str)
                iso_date = parsed_date.strftime("%Y-%m-%d")
                return FieldExtraction(value=iso_date, confidence=0.9, provenance=provenance)
            except (ValueError, date_parser.ParserError):
                return FieldExtraction(value=date_str, confidence=0.5, provenance=provenance)
    return None


# ============================================================================
# Extraction Pipeline
# ============================================================================

def extract_text_from_pdf(pdf_path: str) -> tuple:
    """
    Extract text from PDF.
    Returns: (extracted_text, provenance)
    """
    try:
        with open(pdf_path, "rb") as f:
            reader = pypdf.PdfReader(f)
            text = ""
            for page_num, page in enumerate(reader.pages[:1]):  # First page only for MVP
                text += page.extract_text()

            # If we got text, return it
            if text.strip():
                return text, "pdf_text"

            # No text extracted; will need OCR
            return "", "pdf_text"
    except Exception as e:
        logger.error(f"Error extracting PDF text: {e}")
        return "", "pdf_text"


def extract_text_from_image(image_path: str) -> tuple:
    """
    Extract text from image using Tesseract with preprocessing.
    Returns: (extracted_text, provenance)
    """
    def score_text(text: str) -> int:
        """Score OCR text quality based on digit count, keywords, and length."""
        digit_count = sum(c.isdigit() for c in text)
        keywords = ["LOAN", "PAYMENT", "BORROWER", "PRINCIPAL", "INTEREST", "RATE", "MATURITY", "ESCROW"]
        keyword_hits = sum(1 for kw in keywords if kw in text.upper())
        return digit_count + 50 * keyword_hits + (len(text) // 200)

    try:
        image = Image.open(image_path)
        image = ImageOps.exif_transpose(image)

        # Preprocessing: convert to RGB, then grayscale
        if image.mode != "RGB":
            image = image.convert("RGB")
        image = image.convert("L")

        # Resize 2x for better OCR
        width, height = image.size
        image = image.resize((width * 2, height * 2), Image.Resampling.LANCZOS)

        # Pass A: Base OCR (grayscale + resize only)
        base_config = r"--oem 1 --psm 6"
        text_base = pytesseract.image_to_string(image, lang="eng", config=base_config)

        # Pass B: Enhanced OCR (apply preprocessing filters)
        image_enhanced = image.copy()
        image_enhanced = ImageOps.autocontrast(image_enhanced)
        image_enhanced = ImageEnhance.Contrast(image_enhanced).enhance(1.8)
        image_enhanced = image_enhanced.filter(ImageFilter.MedianFilter(size=3))
        image_enhanced = image_enhanced.filter(ImageFilter.SHARPEN)
        enhanced_config = r"--oem 1 --psm 6 -c preserve_interword_spaces=1"
        text_enhanced = pytesseract.image_to_string(image_enhanced, lang="eng", config=enhanced_config)

        # Score both results and return the better one
        score_base = score_text(text_base)
        score_enhanced = score_text(text_enhanced)

        if score_enhanced > score_base:
            return text_enhanced, "ocr_text"
        else:
            return text_base, "ocr_text"
    except Exception as e:
        logger.error(f"Error extracting image text: {e}")
        return "", "ocr_text"


def run_ocrmypdf(pdf_path: str, output_path: str) -> bool:
    """
    Run OCRmyPDF to add text layer to PDF.
    Returns: success boolean
    """
    try:
        ocrmypdf.ocr(pdf_path, output_path, language="eng")
        return True
    except Exception as e:
        logger.error(f"Error running OCRmyPDF: {e}")
        return False


def process_extraction(file_path: str, file_type: str) -> Dict[str, Any]:
    """
    Main extraction pipeline.
    file_type: "pdf" or "image"
    Returns: dict with fields, debug info
    """
    debug_info = {
        "doc_type": file_type,
        "pages_used": [1],
        "timings_ms": {},
        "errors": [],
    }

    extracted_fields = {
        "principal_balance": None,
        "note_rate": None,
        "scheduled_pi": None,
        "escrow": None,
        "next_due_date": None,
        "maturity_date": None,
    }

    text = ""
    text_provenance = "pdf_text" if file_type == "pdf" else "ocr_text"

    try:
        if file_type == "pdf":
            # Step 1: Try to extract text from PDF
            text, text_provenance = extract_text_from_pdf(file_path)

            # Step 2: If insufficient text, run OCRmyPDF
            if not text.strip() or len(text.strip()) < 100:
                logger.info("PDF has no/low text. Running OCRmyPDF...")
                ocr_pdf_path = file_path.replace(".pdf", "_ocr.pdf")
                if run_ocrmypdf(file_path, ocr_pdf_path):
                    text, _ = extract_text_from_pdf(ocr_pdf_path)
                    text_provenance = "ocr_text"
                    # Clean up OCR temp file
                    try:
                        os.remove(ocr_pdf_path)
                    except:
                        pass
        else:
            # For images, use Tesseract directly
            text, text_provenance = extract_text_from_image(file_path)
    except Exception as e:
        logger.error(f"Error in extraction pipeline: {e}")
        debug_info["errors"].append(str(e))

    # Add text statistics for OCR diagnostics
    debug_info["text_stats"] = {
        "source": text_provenance,
        "chars": len(text),
        "lines": len(text.splitlines()),
    }

    # Add optional text sample if EXTRACT_DEBUG=1
    if os.environ.get("EXTRACT_DEBUG") == "1":
        debug_info["text_sample"] = text[:300] if text else ""

    # Step 3: Run regex heuristics on extracted text
    if text.strip():
        extracted_fields["principal_balance"] = extract_principal_balance(text, text_provenance)
        extracted_fields["note_rate"] = extract_note_rate(text, text_provenance)
        extracted_fields["scheduled_pi"] = extract_scheduled_pi(text, text_provenance)
        extracted_fields["escrow"] = extract_escrow(text, text_provenance)
        extracted_fields["next_due_date"] = extract_next_due_date(text, text_provenance)
        extracted_fields["maturity_date"] = extract_maturity_date(text, text_provenance)
    else:
        debug_info["errors"].append("No text extracted from document")

    # Convert None fields to empty FieldExtraction with doc-level provenance
    for field_name in extracted_fields:
        if extracted_fields[field_name] is None:
            extracted_fields[field_name] = FieldExtraction(value="", confidence=0.0, provenance=text_provenance)

    return {
        "fields": extracted_fields,
        "debug": debug_info,
    }


# ============================================================================
# API Endpoints
# ============================================================================

@app.get("/health")
def health() -> Dict[str, str]:
    """Health check endpoint."""
    return {"status": "ok"}


@app.post("/v1/extract")
async def extract(file: UploadFile = File(...)) -> ExtractionResponse:
    """
    Extract fields from mortgage statement (PDF or image).

    Multipart form-data:
    - file: PDF or image file (jpg, png, pdf)

    Returns:
    - fields: dict of extracted fields with confidence and provenance
    - debug: debug info (doc type, pages, timings, errors)
    """
    # Validate file type
    content_type = file.content_type or ""
    is_pdf = "pdf" in content_type.lower()
    is_image = any(img_type in content_type.lower() for img_type in ["image", "jpg", "jpeg", "png"])

    if not (is_pdf or is_image):
        raise HTTPException(
            status_code=400,
            detail={
                "error": "Unsupported file type",
                "content_type": content_type,
                "accepted_types": ["application/pdf", "image/jpeg", "image/png"],
            }
        )

    file_type = "pdf" if is_pdf else "image"

    # Use TemporaryDirectory to guarantee cleanup
    with tempfile.TemporaryDirectory() as temp_dir:
        try:
            # Save uploaded file to temp location
            temp_file_path = os.path.join(temp_dir, file.filename or f"upload.{file_type}")
            with open(temp_file_path, "wb") as f:
                contents = await file.read()
                f.write(contents)

            # Run extraction pipeline
            result = process_extraction(temp_file_path, file_type)

            # Return response
            return ExtractionResponse(**result)
        except Exception as e:
            logger.exception(f"Error processing extraction request: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Extraction failed: {str(e)}"
            )
        # TemporaryDirectory automatically cleans up on exit


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8009)
