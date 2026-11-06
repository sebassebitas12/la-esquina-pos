param([string]$BaseUrl = 'http://localhost:3002/api')

$ErrorActionPreference = 'Stop'
$script:AccessToken = $null
$recordId = $null
$email = "test.$([guid]::NewGuid().ToString('N').Substring(0, 10))@example.test"
$authEmail = "usuario.$([guid]::NewGuid().ToString('N').Substring(0, 12))@example.test"
$authPassword = "V$([guid]::NewGuid().ToString('N'))!Aa"

function Assert-Status([string]$Method, [string]$Uri, [int]$Expected, $Body = $null, [hashtable]$Headers = $null) {
    $requestHeaders = @{}
    if (-not [string]::IsNullOrWhiteSpace($script:AccessToken)) { $requestHeaders.Authorization = "Bearer $script:AccessToken" }
    if ($null -ne $Headers) { foreach ($key in $Headers.Keys) { $requestHeaders[$key] = $Headers[$key] } }
    $params = @{ Method = $Method; Uri = $Uri; UseBasicParsing = $true }
    if ($requestHeaders.Count -gt 0) { $params.Headers = $requestHeaders }
    if ($null -ne $Body) {
        $params.ContentType = 'application/json; charset=utf-8'
        $params.Body = $Body | ConvertTo-Json -Compress
    }
    try {
        $response = Invoke-WebRequest @params
        $status = [int]$response.StatusCode
    } catch {
        if ($null -eq $_.Exception.Response) { throw }
        $status = [int]$_.Exception.Response.StatusCode
        $response = $null
    }
    if ($status -ne $Expected) { throw "${Method} ${Uri}: expected HTTP ${Expected}, received ${status}." }
    Write-Host "OK ${Method} $Uri -> HTTP $status"
    if ($null -ne $Body) { return $response }
}

try {
    $null = Assert-Status -Method POST -Uri "$BaseUrl/auth/register" -Expected 201 -Body @{ nombre = 'Usuario temporal'; correo = $authEmail; password = $authPassword }
    $session = Assert-Status -Method POST -Uri "$BaseUrl/auth/login" -Expected 200 -Body @{ correo = $authEmail; password = $authPassword }
    $script:AccessToken = ($session.Content | ConvertFrom-Json).token
    if ([string]::IsNullOrWhiteSpace($script:AccessToken)) { throw 'Login did not return an access token.' }

    $createdResponse = Assert-Status -Method POST -Uri "$BaseUrl/clientes" -Expected 201 -Body @{ nombre = 'Cliente temporal'; correo = $email; telefono = '8888-0000' }
    $created = $createdResponse.Content | ConvertFrom-Json
    $recordId = [int]$created.data.id
    if ($recordId -le 0) { throw 'POST did not return a valid id.' }
    Assert-Status -Method POST -Uri "$BaseUrl/clientes" -Expected 400 -Body @{ nombre = '' }
    Assert-Status -Method POST -Uri "$BaseUrl/clientes" -Expected 400 -Body @{ nombre = 'Cliente inválido'; correo = 'correo-inválido' }
    Assert-Status -Method POST -Uri "$BaseUrl/clientes" -Expected 400 -Body @{ nombre = 'x' * 151 }
    Assert-Status -Method PUT -Uri "$BaseUrl/clientes/$recordId" -Expected 400 -Body @{ correo = 'nuevo@example.test' }
    Assert-Status -Method POST -Uri "$BaseUrl/clientes" -Expected 413 -Body @{ nombre = 'x' * 33000 }
    $listed = Invoke-RestMethod -Method Get -Uri "$BaseUrl/clientes" -Headers @{ Authorization = "Bearer $script:AccessToken" }
    if (-not ($listed.data | Where-Object { [int]$_.id -eq $recordId })) { throw 'GET list did not include the created record.' }
    Write-Host "OK GET list includes client $recordId"
    Assert-Status -Method GET -Uri "$BaseUrl/clientes/$recordId" -Expected 200
    $one = Invoke-RestMethod -Method Get -Uri "$BaseUrl/clientes/$recordId" -Headers @{ Authorization = "Bearer $script:AccessToken" }
    if ($one.data.correo -ne $email) { throw 'GET by id returned unexpected data.' }
    $updatedResponse = Assert-Status -Method PUT -Uri "$BaseUrl/clientes/$recordId" -Expected 200 -Body @{ nombre = 'Cliente actualizado'; correo = 'actualizado@example.test'; telefono = '8888-1111' }
    $updated = $updatedResponse.Content | ConvertFrom-Json
    if ($updated.data.nombre -ne 'Cliente actualizado') { throw 'PUT did not update the record.' }
    if ($updated.data.correo -ne 'actualizado@example.test' -or $updated.data.telefono -ne '8888-1111') { throw 'PUT did not replace all client fields.' }
    Assert-Status -Method PATCH -Uri "$BaseUrl/clientes/$recordId" -Expected 400 -Body @{}
    $patchedResponse = Assert-Status -Method PATCH -Uri "$BaseUrl/clientes/$recordId" -Expected 200 -Body @{ telefono = '8999-2222' }
    $patched = $patchedResponse.Content | ConvertFrom-Json
    if ($patched.data.nombre -ne 'Cliente actualizado' -or $patched.data.correo -ne 'actualizado@example.test' -or $patched.data.telefono -ne '8999-2222') { throw 'PATCH did not preserve unchanged fields.' }
    $check = Invoke-RestMethod -Method Get -Uri "$BaseUrl/clientes/$recordId" -Headers @{ Authorization = "Bearer $script:AccessToken" }
    if ($check.data.telefono -ne '8999-2222') { throw 'GET did not return the patched record.' }
    Assert-Status -Method DELETE -Uri "$BaseUrl/clientes/$recordId" -Expected 204
    Assert-Status -Method GET -Uri "$BaseUrl/clientes/$recordId" -Expected 404
    $recordId = $null
} finally {
    if ($null -ne $recordId) {
        if ($script:AccessToken) { try { Invoke-RestMethod -Method Delete -Uri "$BaseUrl/clientes/$recordId" -Headers @{ Authorization = "Bearer $script:AccessToken" } | Out-Null } catch { } }
    }
    & node (Join-Path $PSScriptRoot 'delete-smoke-user.js') $authEmail
    if ($LASTEXITCODE -ne 0) { Write-Warning 'No se pudo borrar el usuario temporal de smoke:clients.' }
}
