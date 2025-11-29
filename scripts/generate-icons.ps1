Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

$root = Get-Location
$iconDir = Join-Path $root 'assets/icons'
if (-not (Test-Path $iconDir)) {
    New-Item -ItemType Directory -Path $iconDir | Out-Null
}

$baseSize = 1024
$baseIconPath = Join-Path $iconDir 'app-icon-1024.png'

$bitmap = New-Object Drawing.Bitmap($baseSize, $baseSize)
$graphics = [Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::HighQuality

$rect = New-Object Drawing.Rectangle(0, 0, $baseSize, $baseSize)
$gradientBrush = New-Object Drawing.Drawing2D.LinearGradientBrush(
    $rect,
    [Drawing.Color]::FromArgb(255, 16, 185, 129),
    [Drawing.Color]::FromArgb(255, 4, 120, 87),
    45
)
$graphics.FillRectangle($gradientBrush, $rect)

$circleBrush = New-Object Drawing.SolidBrush([Drawing.Color]::FromArgb(235, 255, 255, 255))
$padding = [int]($baseSize * 0.12)
$diameter = $baseSize - ($padding * 2)
$graphics.FillEllipse($circleBrush, $padding, $padding, $diameter, $diameter)

# Draw a scale/balance icon
$pen = New-Object Drawing.Pen([Drawing.Color]::FromArgb(255, 18, 109, 80), [int]($baseSize * 0.04))
$pen.StartCap = [Drawing.Drawing2D.LineCap]::Round
$pen.EndCap = [Drawing.Drawing2D.LineCap]::Round

$centerX = $baseSize / 2
$centerY = $baseSize / 2

# Draw base
$baseY = $centerY + ($baseSize * 0.25)
$baseWidth = $baseSize * 0.4
$graphics.DrawLine($pen, $centerX - $baseWidth/2, $baseY, $centerX + $baseWidth/2, $baseY)

# Draw vertical pole
$poleTop = $centerY - ($baseSize * 0.2)
$graphics.DrawLine($pen, $centerX, $baseY, $centerX, $poleTop)

# Draw horizontal beam
$beamWidth = $baseSize * 0.35
$beamY = $poleTop + ($baseSize * 0.05)
$graphics.DrawLine($pen, $centerX - $beamWidth/2, $beamY, $centerX + $beamWidth/2, $beamY)

# Draw left pan
$panWidth = $baseSize * 0.15
$panHeight = $baseSize * 0.08
$leftPanX = $centerX - $beamWidth/2
$panY = $beamY + ($baseSize * 0.08)
$graphics.DrawLine($pen, $leftPanX, $beamY, $leftPanX, $panY)
$graphics.DrawArc($pen, $leftPanX - $panWidth/2, $panY - $panHeight/2, $panWidth, $panHeight, 0, -180)

# Draw right pan  
$rightPanX = $centerX + $beamWidth/2
$graphics.DrawLine($pen, $rightPanX, $beamY, $rightPanX, $panY)
$graphics.DrawArc($pen, $rightPanX - $panWidth/2, $panY - $panHeight/2, $panWidth, $panHeight, 0, -180)

# Draw rice grain symbols on pans (small circles)
$riceBrush = New-Object Drawing.SolidBrush([Drawing.Color]::FromArgb(200, 251, 191, 36))
$riceSize = [int]($baseSize * 0.025)
# Left pan rice
$graphics.FillEllipse($riceBrush, $leftPanX - $riceSize, $panY - $riceSize/2, $riceSize*2, $riceSize*2)
$graphics.FillEllipse($riceBrush, $leftPanX - $riceSize*2.5, $panY - $riceSize, $riceSize*1.5, $riceSize*1.5)
$graphics.FillEllipse($riceBrush, $leftPanX + $riceSize*0.5, $panY - $riceSize, $riceSize*1.5, $riceSize*1.5)
# Right pan rice
$graphics.FillEllipse($riceBrush, $rightPanX - $riceSize, $panY - $riceSize/2, $riceSize*2, $riceSize*2)
$graphics.FillEllipse($riceBrush, $rightPanX - $riceSize*2.5, $panY - $riceSize, $riceSize*1.5, $riceSize*1.5)
$graphics.FillEllipse($riceBrush, $rightPanX + $riceSize*0.5, $panY - $riceSize, $riceSize*1.5, $riceSize*1.5)

$pen.Dispose()
$riceBrush.Dispose()

$graphics.Dispose()
$gradientBrush.Dispose()
$circleBrush.Dispose()
$bitmap.Save($baseIconPath, [Drawing.Imaging.ImageFormat]::Png)
$bitmap.Dispose()

$sourceImage = [Drawing.Image]::FromFile($baseIconPath)

function Save-Icon {
    param(
        [int]$TargetSize,
        [string]$Destination
    )

    $dir = [System.IO.Path]::GetDirectoryName($Destination)
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir | Out-Null
    }

    $canvas = New-Object Drawing.Bitmap($TargetSize, $TargetSize)
    $g = [Drawing.Graphics]::FromImage($canvas)
    $g.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.DrawImage($sourceImage, 0, 0, $TargetSize, $TargetSize)

    $g.Dispose()
    $canvas.Save($Destination, [Drawing.Imaging.ImageFormat]::Png)
    $canvas.Dispose()
}

$androidTargets = @(
    @{ Size = 48; Path = 'android/app/src/main/res/mipmap-mdpi/ic_launcher.png' },
    @{ Size = 48; Path = 'android/app/src/main/res/mipmap-mdpi/ic_launcher_round.png' },
    @{ Size = 72; Path = 'android/app/src/main/res/mipmap-hdpi/ic_launcher.png' },
    @{ Size = 72; Path = 'android/app/src/main/res/mipmap-hdpi/ic_launcher_round.png' },
    @{ Size = 96; Path = 'android/app/src/main/res/mipmap-xhdpi/ic_launcher.png' },
    @{ Size = 96; Path = 'android/app/src/main/res/mipmap-xhdpi/ic_launcher_round.png' },
    @{ Size = 144; Path = 'android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png' },
    @{ Size = 144; Path = 'android/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png' },
    @{ Size = 192; Path = 'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png' },
    @{ Size = 192; Path = 'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png' }
)

foreach ($target in $androidTargets) {
    Save-Icon -TargetSize $target.Size -Destination (Join-Path $root $target.Path)
}

$iosDir = Join-Path $root 'ios/CanLua/Images.xcassets/AppIcon.appiconset'
$iosTargets = @(
    @{ Size = 40; Name = 'Icon-App-20x20@2x.png' },
    @{ Size = 60; Name = 'Icon-App-20x20@3x.png' },
    @{ Size = 58; Name = 'Icon-App-29x29@2x.png' },
    @{ Size = 87; Name = 'Icon-App-29x29@3x.png' },
    @{ Size = 80; Name = 'Icon-App-40x40@2x.png' },
    @{ Size = 120; Name = 'Icon-App-40x40@3x.png' },
    @{ Size = 120; Name = 'Icon-App-60x60@2x.png' },
    @{ Size = 180; Name = 'Icon-App-60x60@3x.png' },
    @{ Size = 1024; Name = 'Icon-App-1024x1024@1x.png' }
)

foreach ($target in $iosTargets) {
    Save-Icon -TargetSize $target.Size -Destination (Join-Path $iosDir $target.Name)
}

$sourceImage.Dispose()
