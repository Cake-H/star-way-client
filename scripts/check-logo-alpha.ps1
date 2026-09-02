Add-Type -AssemblyName System.Drawing

$src = 'c:/Users/86135/Desktop/智能投递助手APP/public/ChatGPT Image 2026年9月2日 10_20_33.png'
$img = [System.Drawing.Image]::FromFile($src)
$bmp = New-Object System.Drawing.Bitmap($img)

Write-Output ("Size: {0}x{1}, Format: {2}" -f $bmp.Width, $bmp.Height, $bmp.PixelFormat)

# 检查四角 + 边缘中点的 alpha
$w = $bmp.Width; $h = $bmp.Height
$points = @(
  @(0, 0), @($w - 1, 0), @(0, $h - 1), @($w - 1, $h - 1),
  @([int]($w/2), 0), @(0, [int]($h/2))
)
$transparent = 0
foreach ($p in $points) {
  $c = $bmp.GetPixel($p[0], $p[1])
  Write-Output ("({0},{1}) A={2} R={3} G={4} B={5}" -f $p[0], $p[1], $c.A, $c.R, $c.G, $c.B)
  if ($c.A -lt 10) { $transparent++ }
}
Write-Output ("Transparent points: {0}/{1}" -f $transparent, $points.Count)
$img.Dispose()
