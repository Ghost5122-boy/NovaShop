# Installe Nova Shop au demarrage de Windows

$Root = $PSScriptRoot
$bat = Join-Path $Root "DEMARRER.bat"
$startup = [Environment]::GetFolderPath("Startup")
$shortcut = Join-Path $startup "Nova Shop.lnk"

$wsh = New-Object -ComObject WScript.Shell
$lnk = $wsh.CreateShortcut($shortcut)
$lnk.TargetPath = $bat
$lnk.WorkingDirectory = $Root
$lnk.WindowStyle = 7
$lnk.Description = "Nova Shop - Site + Admin"
$lnk.Save()

Write-Host ""
Write-Host "  Nova Shop demarrera automatiquement avec Windows." -ForegroundColor Green
Write-Host "  Raccourci: $shortcut" -ForegroundColor Cyan
Write-Host ""
pause
