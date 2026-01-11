#!/bin/bash
# Script de prueba para HerAlf Legal

echo "🧪 Probando estructura del proyecto..."
echo ""

# Verificar estructura
echo "📁 Estructura actual:"
find . -type d -name ".git" -prune -o -type d -print | sort

echo ""
echo "📋 Archivos importantes:"
ls -la infra/*.tf 2>/dev/null || echo "No hay archivos .tf en infra/"
ls -la backend/form-processor/ 2>/dev/null || echo "No hay Lambda en backend/"
