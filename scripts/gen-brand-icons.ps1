Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = 'Stop'
$srcPath = 'c:/Users/86135/Desktop/智能投递助手APP/public/ChatGPT Image 2026年9月2日 10_20_33.png'
$appPublic = 'c:/Users/86135/Desktop/智能投递助手APP/public'
$extPublic = 'c:/Users/86135/Desktop/简历一键填入插件/public'
$admPublic = 'c:/Users/86135/Desktop/星途智能求职助手-管理后台/public'

New-Item -ItemType Directory -Force -Path "$extPublic/icons" | Out-Null
New-Item -ItemType Directory -Force -Path $admPublic | Out-Null

$src = [System.Drawing.Image]::FromFile($srcPath)

function Save-Resized {
  param(
    [System.Drawing.Image]$Source,
    [string]$OutPath,
    [int]$Size,
    [double]$ContentRatio = 0.96,
    [System.Drawing.Color]$BgColor = [System.Drawing.Color]::Empty
  )
  $bmp = New-Object System.Drawing.Bitmap($Size, $Size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  if ($BgColor -ne [System.Drawing.Color]::Empty) {
    $g.Clear($BgColor)
  } else {
    $g.Clear([System.Drawing.Color]::Transparent)
  }
  $content = [int]($Size * $ContentRatio)
  $off = [int](($Size - $content) / 2)
  $g.DrawImage($Source, $off, $off, $content, $content)
  $g.Dispose()
  $bmp.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Output "wrote $OutPath ($Size)"
}

function Save-Ico {
  param(
    [System.Drawing.Image]$Source,
    [string]$OutPath,
    [int[]]$Sizes = @(16, 32, 48)
  )
  $pngDataList = @()
  foreach ($s in $Sizes) {
    $bmp = New-Object System.Drawing.Bitmap($s, $s)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.DrawImage($Source, 0, 0, $s, $s)
    $g.Dispose()
    $ms = New-Object System.IO.MemoryStream
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    $pngDataList += ,$ms.ToArray()
    $ms.Dispose()
  }
  $fs = [System.IO.File]::Create($OutPath)
  $bw = New-Object System.IO.BinaryWriter($fs)
  $bw.Write([uint16]0)          # reserved
  $bw.Write([uint16]1)          # type = icon
  $bw.Write([uint16]$Sizes.Count)
  $offset = 6 + 16 * $Sizes.Count
  for ($i = 0; $i -lt $Sizes.Count; $i++) {
    $s = $Sizes[$i]
    $data = $pngDataList[$i]
    $bw.Write([byte]($(if ($s -ge 256) { 0 } else { $s })))  # width
    $bw.Write([byte]($(if ($s -ge 256) { 0 } else { $s })))  # height
    $bw.Write([byte]0)          # color count
    $bw.Write([byte]0)          # reserved
    $bw.Write([uint16]1)        # planes
    $bw.Write([uint16]32)       # bit count
    $bw.Write([uint32]$data.Length)
    $bw.Write([uint32]$offset)
    $offset += $data.Length
  }
  foreach ($data in $pngDataList) { $bw.Write($data) }
  $bw.Close(); $fs.Close()
  Write-Output "wrote $OutPath (ico: $($Sizes -join ','))"
}

# ---------- App ----------
Save-Resized $src "$appPublic/logo.png" 512 0.96
Save-Resized $src "$appPublic/pwa-64x64.png" 64 0.96
Save-Resized $src "$appPublic/pwa-192x192.png" 192 0.96
Save-Resized $src "$appPublic/pwa-512x512.png" 512 0.96
# apple-touch-icon：必须不透明，暗夜琥珀底色
$dark = [System.Drawing.Color]::FromArgb(255, 27, 23, 18)
Save-Resized $src "$appPublic/apple-touch-icon-180x180.png" 180 0.9 $dark
# maskable：安全区 80%，同深色底
Save-Resized $src "$appPublic/maskable-icon-512x512.png" 512 0.78 $dark
Save-Resized $src "$appPublic/favicon-32x32.png" 32 0.96
Save-Ico $src "$appPublic/favicon.ico" @(16, 32, 48)

# ---------- 插件 ----------
Save-Resized $src "$extPublic/logo.png" 256 0.96
Save-Resized $src "$extPublic/icons/icon-16.png" 16 0.96
Save-Resized $src "$extPublic/icons/icon-32.png" 32 0.96
Save-Resized $src "$extPublic/icons/icon-48.png" 48 0.96
Save-Resized $src "$extPublic/icons/icon-128.png" 128 0.96

# ---------- 管理后台 ----------
Save-Resized $src "$admPublic/logo.png" 256 0.96
Save-Ico $src "$admPublic/favicon.ico" @(16, 32, 48)

$src.Dispose()
Write-Output 'DONE'
