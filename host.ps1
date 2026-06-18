# Nova Shop - Hebergeur PC
$Root = $PSScriptRoot
$Port = 4782
$LogDir = Join-Path $Root "logs"
$UrlFile = Join-Path $Root "MES-URLS.txt"

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

# Arreter l'ancien serveur
Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue |
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
Start-Sleep -Seconds 1

# Demarrer Node en fenetre separee (plus fiable)
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    Write-Host "Installe Node.js: winget install OpenJS.NodeJS.LTS" -ForegroundColor Red
    pause; exit 1
}

Start-Process -FilePath "node" -ArgumentList "server.js" -WorkingDirectory $Root -WindowStyle Minimized

# Attendre que le port soit ouvert (max 30 sec)
$ready = $false
for ($i = 0; $i -lt 30; $i++) {
    $open = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    if ($open) { $ready = $true; break }
    Start-Sleep -Seconds 1
}

if (-not $ready) {
    Write-Host "Erreur: le serveur n'a pas demarre sur le port $Port" -ForegroundColor Red
    pause; exit 1
}

# URLs
$urls = @"
========================================
  NOVA SHOP - Actif sur ton PC
========================================

Boutique : http://localhost:$Port
Admin    : http://localhost:$Port/admin/
MDP      : NovaShop1986*

Ne ferme pas la fenetre du serveur Node.
========================================
"@
$urls | Set-Content $UrlFile -Encoding UTF8
Clear-Host
Write-Host $urls -ForegroundColor Green

Start-Process "http://localhost:$Port"

# Tunnel Internet (optionnel)
Write-Host "Ouverture tunnel Internet..." -ForegroundColor Cyan
$tunnelJob = Start-Job -ScriptBlock {
    param($p)
    npx --yes localtunnel --port $p 2>&1
} -ArgumentList $Port

Start-Sleep -Seconds 12
$tunnelOut = Receive-Job $tunnelJob -ErrorAction SilentlyContinue
if ($tunnelOut -match 'https://[a-z0-9-]+\.loca\.lt') {
    $url = $Matches[0]
    Write-Host "Internet : $url" -ForegroundColor Cyan
    Write-Host "Admin    : $url/admin/" -ForegroundColor Cyan
    Add-Content $UrlFile "`nInternet : $url`nAdmin    : $url/admin/"
}

Write-Host "`nAppuie sur une touche pour arreter le site..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue |
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
Stop-Job $tunnelJob -ErrorAction SilentlyContinue
Remove-Job $tunnelJob -ErrorAction SilentlyContinue
