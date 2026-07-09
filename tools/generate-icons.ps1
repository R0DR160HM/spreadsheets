# Generates the PWA icons (a simple white grid on a blue tile) into public/icons.
Add-Type -AssemblyName System.Drawing

$outDir = Join-Path $PSScriptRoot '..\public\icons'
New-Item -ItemType Directory -Force $outDir | Out-Null

function New-Icon([int]$size, [double]$padRatio, [string]$path) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = 'AntiAlias'
    $g.Clear([System.Drawing.Color]::FromArgb(255, 29, 78, 216))  # #1d4ed8

    $pad = [int]($size * $padRatio)
    $area = $size - 2 * $pad
    $cell = [int]($area / 4)
    $gridW = $cell * 4
    $x0 = [int](($size - $gridW) / 2)
    $y0 = $x0

    $white = New-Object System.Drawing.Pen([System.Drawing.Color]::White, [Math]::Max(2, $size / 48))
    for ($i = 0; $i -le 4; $i++) {
        $g.DrawLine($white, $x0, $y0 + $i * $cell, $x0 + $gridW, $y0 + $i * $cell)
        $g.DrawLine($white, $x0 + $i * $cell, $y0, $x0 + $i * $cell, $y0 + $gridW)
    }
    # Header row/column accent
    $accent = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(160, 255, 255, 255))
    $g.FillRectangle($accent, $x0, $y0, $gridW, $cell)
    $g.FillRectangle($accent, $x0, $y0, $cell, $gridW)

    $g.Dispose()
    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
}

New-Icon 192 0.16 (Join-Path $outDir 'icon-192.png')
New-Icon 512 0.16 (Join-Path $outDir 'icon-512.png')
New-Icon 512 0.26 (Join-Path $outDir 'icon-maskable-512.png')
Write-Output "Icons written to $outDir"
