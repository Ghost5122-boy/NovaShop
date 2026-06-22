# Nova Shop - Serveur local (sans Node.js)
# Double-cliquez sur DEMARRER.bat ou lancez: powershell -ExecutionPolicy Bypass -File start.ps1

$Port = 4782
$Root = $PSScriptRoot
$DataFile = Join-Path $Root "data\store.json"
$Sessions = @{}

function Read-Store {
    if (-not (Test-Path $DataFile)) {
        throw "Fichier data\store.json introuvable"
    }
    return Get-Content $DataFile -Raw -Encoding UTF8 | ConvertFrom-Json
}

function Write-Store($store) {
    $json = $store | ConvertTo-Json -Depth 10
    [System.IO.File]::WriteAllText($DataFile, $json, [System.Text.UTF8Encoding]::new($false))
}

function Send-Json($response, $obj, $code = 200) {
    $response.StatusCode = $code
    $response.ContentType = "application/json; charset=utf-8"
    $bytes = [System.Text.Encoding]::UTF8.GetBytes(($obj | ConvertTo-Json -Depth 10 -Compress))
    $response.ContentLength64 = $bytes.Length
    $response.OutputStream.Write($bytes, 0, $bytes.Length)
    $response.Close()
}

function Send-Text($response, $text, $contentType = "text/plain", $code = 200) {
    $response.StatusCode = $code
    $response.ContentType = "$contentType; charset=utf-8"
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($text)
    $response.ContentLength64 = $bytes.Length
    $response.OutputStream.Write($bytes, 0, $bytes.Length)
    $response.Close()
}

function Send-File($response, $filePath) {
    if (-not (Test-Path $filePath)) {
        Send-Text $response "404 Not Found" "text/plain" 404
        return
    }
    $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
    $types = @{
        ".html" = "text/html"
        ".css"  = "text/css"
        ".js"   = "application/javascript"
        ".json" = "application/json"
        ".png"  = "image/png"
        ".ico"  = "image/x-icon"
        ".svg"  = "image/svg+xml"
    }
    $response.StatusCode = 200
    $response.Headers.Add("Cache-Control", "no-cache, no-store, must-revalidate")
    $response.ContentType = if ($types.ContainsKey($ext)) { $types[$ext] } else { "application/octet-stream" }
    $bytes = [System.IO.File]::ReadAllBytes($filePath)
    $response.ContentLength64 = $bytes.Length
    $response.OutputStream.Write($bytes, 0, $bytes.Length)
    $response.Close()
}

function Public-Account($acc) {
    return @{
        id = $acc.id
        username = $acc.username
        price = $acc.price
        certified = $acc.certified
        description = $acc.description
        sold = $acc.sold
    }
}

function Get-AuthToken($request) {
    $auth = $request.Headers["Authorization"]
    if ($auth -and $auth.StartsWith("Bearer ")) {
        return $auth.Substring(7)
    }
    return $null
}

function Read-Body($request) {
    if ($request.HasEntityBody) {
        $reader = New-Object System.IO.StreamReader($request.InputStream, $request.ContentEncoding)
        $body = $reader.ReadToEnd()
        $reader.Close()
        if ($body) { return $body | ConvertFrom-Json }
    }
    return $null
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Prefixes.Add("http://127.0.0.1:$Port/")
$listener.Start()

Write-Host ""
Write-Host "  ========================================" -ForegroundColor Green
Write-Host "       NEXUS MARKET - Serveur demarre !" -ForegroundColor Green
Write-Host "  ========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Site:   http://localhost:$Port" -ForegroundColor Cyan
Write-Host "  Admin:  http://localhost:$Port/admin/" -ForegroundColor Yellow
Write-Host "  MDP:    NovaShop1986*" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Appuyez sur Ctrl+C pour arreter" -ForegroundColor Gray
Write-Host ""

while ($listener.IsListening) {
    $context = $listener.GetContext()
    $request = $context.Request
    $response = $context.Response
    $path = $request.Url.LocalPath
    $method = $request.HttpMethod

    try {
        # --- API Routes ---
        if ($path -eq "/api/accounts" -and $method -eq "GET") {
            $store = Read-Store
            $accounts = @($store.accounts | Where-Object { -not $_.sold } | ForEach-Object { Public-Account $_ })
            Send-Json $response $accounts
            continue
        }

        if ($path -match "^/api/accounts/([^/]+)/credentials$" -and $method -eq "GET") {
            $id = $Matches[1]
            $token = $request.QueryString["token"]
            $store = Read-Store
            $order = $store.orders | Where-Object { $_.token -eq $token -and $_.accountId -eq $id } | Select-Object -First 1
            if (-not $order -or -not $order.paid) {
                Send-Json $response @{ error = "Paiement non confirme" } 403
                continue
            }
            $acc = $store.accounts | Where-Object { $_.id -eq $id } | Select-Object -First 1
            Send-Json $response @{ username = $acc.username; email = $acc.email; password = $acc.password }
            continue
        }

        if ($path -match "^/api/accounts/([^/]+)$" -and $method -eq "GET") {
            $id = $Matches[1]
            $store = Read-Store
            $acc = $store.accounts | Where-Object { $_.id -eq $id -and -not $_.sold } | Select-Object -First 1
            if (-not $acc) { Send-Json $response @{ error = "Compte introuvable" } 404; continue }
            Send-Json $response (Public-Account $acc)
            continue
        }

        if ($path -eq "/api/admin/login" -and $method -eq "POST") {
            $body = Read-Body $request
            $store = Read-Store
            if ($body.password -ne $store.settings.adminPassword) {
                Send-Json $response @{ error = "Mot de passe incorrect" } 401
                continue
            }
            $token = [guid]::NewGuid().ToString("N") + [guid]::NewGuid().ToString("N")
            $Sessions[$token] = $true
            Send-Json $response @{ token = $token }
            continue
        }

        if ($path -eq "/api/admin/store" -and $method -eq "GET") {
            $token = Get-AuthToken $request
            if (-not $token -or -not $Sessions.ContainsKey($token)) {
                Send-Json $response @{ error = "Non autorise" } 401
                continue
            }
            Send-Json $response (Read-Store)
            continue
        }

        if ($path -eq "/api/admin/accounts" -and $method -eq "POST") {
            $token = Get-AuthToken $request
            if (-not $token -or -not $Sessions.ContainsKey($token)) {
                Send-Json $response @{ error = "Non autorise" } 401
                continue
            }
            $body = Read-Body $request
            $store = Read-Store
            $newAcc = @{
                id = "acc-" + ([guid]::NewGuid().ToString("N")).Substring(0,8)
                username = $body.username
                price = [double]$body.price
                email = $body.email
                password = $body.password
                description = $body.description
                certified = [bool]$body.certified
                sold = $false
            }
            $store.accounts += $newAcc
            Write-Store $store
            Send-Json $response $newAcc
            continue
        }

        if ($path -eq "/api/admin/accounts" -and $method -eq "PUT") {
            $token = Get-AuthToken $request
            if (-not $token -or -not $Sessions.ContainsKey($token)) {
                Send-Json $response @{ error = "Non autorise" } 401
                continue
            }
            $body = Read-Body $request
            $store = Read-Store
            for ($i = 0; $i -lt $store.accounts.Count; $i++) {
                if ($store.accounts[$i].id -eq $body.id) {
                    $store.accounts[$i].username = $body.username
                    $store.accounts[$i].price = [double]$body.price
                    $store.accounts[$i].email = $body.email
                    $store.accounts[$i].password = $body.password
                    $store.accounts[$i].description = $body.description
                    $store.accounts[$i].certified = [bool]$body.certified
                    Write-Store $store
                    Send-Json $response $store.accounts[$i]
                    continue
                }
            }
            Send-Json $response @{ error = "Compte introuvable" } 404
            continue
        }

        if ($path -match "^/api/admin/accounts/([^/]+)$" -and $method -eq "DELETE") {
            $token = Get-AuthToken $request
            if (-not $token -or -not $Sessions.ContainsKey($token)) {
                Send-Json $response @{ error = "Non autorise" } 401
                continue
            }
            $id = $Matches[1]
            $store = Read-Store
            $store.accounts = @($store.accounts | Where-Object { $_.id -ne $id })
            Write-Store $store
            Send-Json $response @{ success = $true }
            continue
        }

        if ($path -eq "/api/admin/settings" -and $method -eq "PUT") {
            $token = Get-AuthToken $request
            if (-not $token -or -not $Sessions.ContainsKey($token)) {
                Send-Json $response @{ error = "Non autorise" } 401
                continue
            }
            $body = Read-Body $request
            $store = Read-Store
            if ($body.paypalEmail) { $store.settings.paypalEmail = $body.paypalEmail }
            if ($body.paypalClientId) { $store.settings.paypalClientId = $body.paypalClientId }
            if ($body.siteName) { $store.settings.siteName = $body.siteName }
            Write-Store $store
            Send-Json $response $store.settings
            continue
        }

        if ($path -eq "/api/paypal/create-order" -and $method -eq "POST") {
            $body = Read-Body $request
            $store = Read-Store
            $acc = $store.accounts | Where-Object { $_.id -eq $body.accountId -and -not $_.sold } | Select-Object -First 1
            if (-not $acc) { Send-Json $response @{ error = "Compte introuvable" } 404; continue }
            $orderToken = [guid]::NewGuid().ToString("N") + [guid]::NewGuid().ToString("N")
            $order = @{
                id = [guid]::NewGuid().ToString()
                accountId = $body.accountId
                token = $orderToken
                paid = $false
                amount = $acc.price
                createdAt = (Get-Date).ToString("o")
            }
            $store.orders += $order
            Write-Store $store
            $paypalLink = $null
            $me = $store.settings.paypalMe
            if (-not $me) { $me = $store.settings.paypalEmail }
            if ($me -match 'nova\s*shop') { $me = 'NexusMarket1733' }
            if (-not $me) { $me = 'NexusMarket1733' }
            if ($me) {
                $paypalLink = "https://paypal.me/$me/$([math]::Round($acc.price, 2))"
            }
            Send-Json $response @{
                orderId = $order.id
                token = $orderToken
                amount = $acc.price
                paypalLink = $paypalLink
                approvalUrl = $null
            }
            continue
        }

        if ($path -eq "/api/paypal/confirm" -and $method -eq "POST") {
            $body = Read-Body $request
            $store = Read-Store
            $order = $store.orders | Where-Object { $_.token -eq $body.token } | Select-Object -First 1
            if (-not $order) { Send-Json $response @{ error = "Commande introuvable" } 404; continue }
            $order.paid = $true
            $order.paidAt = (Get-Date).ToString("o")
            foreach ($acc in $store.accounts) {
                if ($acc.id -eq $order.accountId) { $acc.sold = $true }
            }
            Write-Store $store
            Send-Json $response @{ success = $true; token = $order.token }
            continue
        }

        # --- Static files ---
        $staticPath = $path.TrimStart("/")
        if ($staticPath -eq "" -or $staticPath -eq "/") { $staticPath = "index.html" }
        if ($staticPath.EndsWith("/")) { $staticPath += "index.html" }

        $filePath = Join-Path $Root ($staticPath -replace "/", "\")
        if (Test-Path $filePath -PathType Leaf) {
            Send-File $response $filePath
            continue
        }

        Send-Text $response "404 Not Found" "text/plain" 404
    }
    catch {
        try {
            Send-Json $response @{ error = $_.Exception.Message } 500
        } catch {}
    }
}
