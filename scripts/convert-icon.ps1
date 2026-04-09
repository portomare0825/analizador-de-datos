Add-Type -AssemblyName System.Drawing
$inputPath = Join-Path $PSScriptRoot "..\public\sparkles.png"
$outputPath = Join-Path $PSScriptRoot "..\public\sparkles_real.png"
$img = [System.Drawing.Image]::FromFile($inputPath)
$img.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
$img.Dispose()
Write-Host "✅ Conversión completa: $outputPath"
