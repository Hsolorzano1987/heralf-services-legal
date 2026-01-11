# Script PowerShell para construir Lambda functions - HerAlf Legal

Write-Host "🔨 Construyendo Lambda functions..." -ForegroundColor Cyan

# Form Processor
Write-Host "📦 Construyendo form-processor..." -ForegroundColor Yellow
Set-Location backend/form-processor
npm install --production
Set-Location ../..

# Crear ZIP
if (Test-Path infra/form-processor.zip) {
    Remove-Item infra/form-processor.zip -Force
}

Add-Type -Assembly System.IO.Compression.FileSystem
$compress = @{
    Path = "backend/form-processor/index.js", "backend/form-processor/package.json"
    CompressionLevel = "Optimal"
    DestinationPath = "infra/form-processor.zip"
}
Compress-Archive @compress

Write-Host "✅ Build completado!" -ForegroundColor Green
Write-Host "Archivo creado: infra/form-processor.zip" -ForegroundColor Cyan
