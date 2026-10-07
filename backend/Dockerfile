FROM python:3.11-slim

WORKDIR /app

# System deps for PyMuPDF, tree-sitter, git
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ git libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000
