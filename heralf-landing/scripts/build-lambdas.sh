#!/bin/bash
# Script para construir Lambda functions - HerAlf Legal

set -e

echo "🔨 Construyendo Lambda functions..."

# Form Processor
echo "📦 Construyendo form-processor..."
cd backend/form-processor
npm install --production
cd ../..
zip -j infra/form-processor.zip backend/form-processor/index.js backend/form-processor/package.json

echo "✅ Build completado!"
echo "Archivos creados:"
echo "  - infra/form-processor.zip"
