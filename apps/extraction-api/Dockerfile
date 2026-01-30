FROM python:3.11-slim

# Install system dependencies for OCRmyPDF, Tesseract, and related tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    ghostscript \
    qpdf \
    libpoppler-cpp-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app/ ./app/

# Expose port
EXPOSE 8009

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8009"]
