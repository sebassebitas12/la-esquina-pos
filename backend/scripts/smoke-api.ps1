param([string]$BaseUrl = 'http://localhost:3002/api')

$ErrorActionPreference = 'Stop'
$script:AccessToken = $null
$clienteId = $null
$categoriaId = $null
$unidadMedidaId = $null
$productoId = $null
$sku = $null
$facturaId = $null
$facturaMostradorId = $null
$detalleId = $null
$detalleCascadeId = $null
$correo = "prueba.$([guid]::NewGuid().ToString('N').Substring(0, 12))@example.test"
$correoUsuario = "usuario.$([guid]::NewGuid().ToString('N').Substring(0, 12))@example.test"
$passwordUsuario = "V$([guid]::NewGuid().ToString('N'))!Aa"

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
    $registro = Assert-Status -Method POST -Uri "$BaseUrl/autenticacion/registro" -Expected 201 -Body @{ nombre = 'Usuario temporal'; correo = $correoUsuario; contrasena = $passwordUsuario }
    $usuarioCreado = ($registro.Content | ConvertFrom-Json).data
    if ($usuarioCreado.correo -ne $correoUsuario -or $usuarioCreado.rol -ne 'lector' -or $usuarioCreado.contrasenaHash -or $usuarioCreado.contrasena) { throw 'Registration did not return a reader account with safe user data.' }
    Assert-Status -Method POST -Uri "$BaseUrl/autenticacion/registro" -Expected 400 -Body @{ nombre = 'Usuario duplicado'; correo = $correoUsuario.ToUpperInvariant(); contrasena = $passwordUsuario }
    Assert-Status -Method POST -Uri "$BaseUrl/autenticacion/registro" -Expected 400 -Body @{ nombre = 'Usuario sin contraseña'; correo = "sin-clave.$([guid]::NewGuid().ToString('N').Substring(0, 8))@example.test" }
    Assert-Status -Method POST -Uri "$BaseUrl/autenticacion/registro" -Expected 400 -Body @{ nombre = 'Campo no permitido'; correo = "rol.$([guid]::NewGuid().ToString('N').Substring(0, 8))@example.test"; contrasena = $passwordUsuario; rol = 'administrador' }
    Assert-Status -Method POST -Uri "$BaseUrl/autenticacion/iniciar-sesion" -Expected 400 -Body @{ correo = $correoUsuario; password = $passwordUsuario }
    Assert-Status -Method POST -Uri "$BaseUrl/autenticacion/iniciar-sesion" -Expected 401 -Body @{ correo = $correoUsuario; contrasena = 'Clave incorrecta 123!' }
    Assert-Status -Method GET -Uri "$BaseUrl/autenticacion/sesion" -Expected 401

    $recursos = @('clientes', 'categorias', 'marcas', 'unidades-medida', 'productos', 'proveedores', 'productos-proveedores', 'compras', 'detalles-compra', 'facturas', 'detalles-factura', 'metodos-pago', 'pagos', 'existencias', 'movimientos-inventario', 'devoluciones', 'detalles-devolucion')
    foreach ($recurso in $recursos) {
        Assert-Status -Method POST -Uri "$BaseUrl/$recurso" -Expected 401 -Body @{}
        Assert-Status -Method GET -Uri "$BaseUrl/$recurso" -Expected 401
        Assert-Status -Method GET -Uri "$BaseUrl/$recurso/2147483647" -Expected 401
        Assert-Status -Method PUT -Uri "$BaseUrl/$recurso/2147483647" -Expected 401 -Body @{}
        Assert-Status -Method PATCH -Uri "$BaseUrl/$recurso/2147483647" -Expected 401 -Body @{}
        Assert-Status -Method DELETE -Uri "$BaseUrl/$recurso/2147483647" -Expected 401
    }
    Assert-Status -Method GET -Uri "$BaseUrl/clientes" -Expected 401 -Headers @{ Authorization = 'Bearer token-invalido' }
    & node (Join-Path $PSScriptRoot 'check-expired-token.js') $BaseUrl
    if ($LASTEXITCODE -ne 0) { throw 'Expired JWT test failed.' }

    $sesion = Assert-Status -Method POST -Uri "$BaseUrl/autenticacion/iniciar-sesion" -Expected 200 -Body @{ correo = $correoUsuario; contrasena = $passwordUsuario }
    $datosSesion = $sesion.Content | ConvertFrom-Json
    if ([string]::IsNullOrWhiteSpace($datosSesion.token) -or $datosSesion.usuario.correo -ne $correoUsuario -or $datosSesion.usuario.rol -ne 'lector' -or $datosSesion.usuario.contrasenaHash) { throw 'Login did not return a reader token and safe user data.' }
    $script:AccessToken = $datosSesion.token
    $yo = Invoke-RestMethod -Method Get -Uri "$BaseUrl/autenticacion/sesion" -Headers @{ Authorization = "Bearer $script:AccessToken" }
    if ($yo.data.correo -ne $correoUsuario -or $yo.data.rol -ne 'lector' -or $yo.data.contrasenaHash) { throw 'GET /autenticacion/sesion returned unexpected or sensitive user data.' }
    Write-Host 'OK GET /autenticacion/sesion -> authenticated reader account'

    foreach ($recurso in $recursos) {
        Assert-Status -Method GET -Uri "$BaseUrl/$recurso" -Expected 200
        Assert-Status -Method POST -Uri "$BaseUrl/$recurso" -Expected 403 -Body @{}
        Assert-Status -Method PUT -Uri "$BaseUrl/$recurso/2147483647" -Expected 403 -Body @{}
        Assert-Status -Method PATCH -Uri "$BaseUrl/$recurso/2147483647" -Expected 403 -Body @{}
        Assert-Status -Method DELETE -Uri "$BaseUrl/$recurso/2147483647" -Expected 403
    }
    Write-Host 'OK reader can query all resources and cannot modify any of them'

    & node (Join-Path $PSScriptRoot 'asignar-rol.js') "--correo=$correoUsuario" '--rol=administrador'
    if ($LASTEXITCODE -ne 0) { throw 'Could not promote temporary account to administrator for CRUD verification.' }
    $sesionAdmin = Assert-Status -Method POST -Uri "$BaseUrl/autenticacion/iniciar-sesion" -Expected 200 -Body @{ correo = $correoUsuario; contrasena = $passwordUsuario }
    $datosAdmin = $sesionAdmin.Content | ConvertFrom-Json
    if ($datosAdmin.usuario.rol -ne 'administrador') { throw 'Login did not return the promoted administrator role.' }
    $script:AccessToken = $datosAdmin.token

    $response = Assert-Status -Method POST -Uri "$BaseUrl/clientes" -Expected 201 -Body @{ nombre = 'Cliente prueba API'; correo = $correo; telefono = '8888-0000' }
    $clienteId = [int](($response.Content | ConvertFrom-Json).data.id)
    $response = Assert-Status -Method POST -Uri "$BaseUrl/categorias" -Expected 201 -Body @{ nombre = "Categoría smoke $([guid]::NewGuid().ToString('N').Substring(0, 8))" }
    $categoriaId = [int](($response.Content | ConvertFrom-Json).data.id)
    $response = Assert-Status -Method POST -Uri "$BaseUrl/unidades-medida" -Expected 201 -Body @{ nombre = "Unidad smoke $([guid]::NewGuid().ToString('N').Substring(0, 8))"; abreviatura = "u$([guid]::NewGuid().ToString('N').Substring(0, 5))" }
    $unidadMedidaId = [int](($response.Content | ConvertFrom-Json).data.id)
    $sku = "SMK$([guid]::NewGuid().ToString('N').Substring(0, 10))"
    $response = Assert-Status -Method POST -Uri "$BaseUrl/productos" -Expected 201 -Body @{ nombre = 'Producto prueba API'; precio = 1250.50; sku = $sku; categoriaId = $categoriaId; unidadMedidaId = $unidadMedidaId }
    $productoId = [int](($response.Content | ConvertFrom-Json).data.id)
    if ($clienteId -le 0 -or $productoId -le 0) { throw 'A create endpoint returned an invalid id.' }

    Assert-Status -Method GET -Uri "$BaseUrl/clientes" -Expected 200
    Assert-Status -Method GET -Uri "$BaseUrl/clientes/$clienteId" -Expected 200
    Assert-Status -Method GET -Uri "$BaseUrl/productos" -Expected 200
    Assert-Status -Method GET -Uri "$BaseUrl/productos/$productoId" -Expected 200
    Assert-Status -Method POST -Uri "$BaseUrl/productos" -Expected 400 -Body @{ nombre = 'Precio inválido'; precio = -1; sku = "SMK$([guid]::NewGuid().ToString('N').Substring(0, 10))"; categoriaId = $categoriaId; unidadMedidaId = $unidadMedidaId }

    $response = Assert-Status -Method POST -Uri "$BaseUrl/facturas" -Expected 201 -Body @{ clienteId = $clienteId }
    $createdFactura = ($response.Content | ConvertFrom-Json).data
    $facturaId = [int]$createdFactura.id
    if ($facturaId -le 0 -or -not $createdFactura.fecha) { throw 'The invoice did not return its id and default date.' }
    $response = Assert-Status -Method POST -Uri "$BaseUrl/facturas" -Expected 201 -Body @{ clienteId = $null }
    $facturaMostradorId = [int](($response.Content | ConvertFrom-Json).data.id)
    $facturaMostrador = Invoke-RestMethod -Method Get -Uri "$BaseUrl/facturas/$facturaMostradorId" -Headers @{ Authorization = "Bearer $script:AccessToken" }
    if ($facturaMostrador.data.clienteId -ne $null) { throw 'A counter invoice should allow a null customer.' }
    Assert-Status -Method DELETE -Uri "$BaseUrl/facturas/$facturaMostradorId" -Expected 204
    $facturaMostradorId = $null
    Assert-Status -Method POST -Uri "$BaseUrl/facturas" -Expected 404 -Body @{ clienteId = 2147483647 }
    Assert-Status -Method GET -Uri "$BaseUrl/facturas" -Expected 200
    Assert-Status -Method GET -Uri "$BaseUrl/facturas/$facturaId" -Expected 200

    $response = Assert-Status -Method POST -Uri "$BaseUrl/detalles-factura" -Expected 201 -Body @{ facturaId = $facturaId; productoId = $productoId; cantidad = 2; precioUnitario = '1250.50' }
    $detalleId = [int](($response.Content | ConvertFrom-Json).data.id)
    if ($detalleId -le 0) { throw 'The invoice detail returned an invalid id.' }
    $response = Assert-Status -Method POST -Uri "$BaseUrl/detalles-factura" -Expected 201 -Body @{ facturaId = $facturaId; productoId = $productoId; cantidad = 1; precioUnitario = '1250.50' }
    $detalleCascadeId = [int](($response.Content | ConvertFrom-Json).data.id)
    if ($detalleCascadeId -le 0) { throw 'The second invoice detail returned an invalid id.' }
    $facturaCompleta = Invoke-RestMethod -Method Get -Uri "$BaseUrl/facturas/$facturaId" -Headers @{ Authorization = "Bearer $script:AccessToken" }
    if ($facturaCompleta.data.cliente.nombre -ne 'Cliente prueba API' -or $facturaCompleta.data.detalles.Count -ne 2 -or $facturaCompleta.data.detalles[0].producto.nombre -ne 'Producto prueba API') { throw 'Invoice GET did not include its related customer, details and product.' }
    $detalleCompleto = Invoke-RestMethod -Method Get -Uri "$BaseUrl/detalles-factura/$detalleId" -Headers @{ Authorization = "Bearer $script:AccessToken" }
    if ($detalleCompleto.data.producto.nombre -ne 'Producto prueba API' -or [int]$detalleCompleto.data.factura.id -ne $facturaId) { throw 'Invoice detail GET did not include its related invoice and product.' }
    Assert-Status -Method DELETE -Uri "$BaseUrl/detalles-factura/$detalleId" -Expected 204
    Assert-Status -Method GET -Uri "$BaseUrl/detalles-factura/$detalleId" -Expected 404
    $detalleId = $null
    Assert-Status -Method POST -Uri "$BaseUrl/detalles-factura" -Expected 400 -Body @{ facturaId = $facturaId; productoId = $productoId; cantidad = 0; precioUnitario = 1250 }
    Assert-Status -Method POST -Uri "$BaseUrl/detalles-factura" -Expected 404 -Body @{ facturaId = $facturaId; productoId = 2147483647; cantidad = 1; precioUnitario = 1 }
    Assert-Status -Method GET -Uri "$BaseUrl/detalles-factura" -Expected 200
    Assert-Status -Method GET -Uri "$BaseUrl/detalles-factura/$detalleCascadeId" -Expected 200
    Assert-Status -Method DELETE -Uri "$BaseUrl/clientes/$clienteId" -Expected 409
    Assert-Status -Method DELETE -Uri "$BaseUrl/productos/$productoId" -Expected 409

    $response = Assert-Status -Method PUT -Uri "$BaseUrl/clientes/$clienteId" -Expected 200 -Body @{ nombre = 'Cliente actualizado'; correo = 'actualizado@example.test'; telefono = '8888-1111' }
    $clienteActualizado = ($response.Content | ConvertFrom-Json).data
    if ($clienteActualizado.nombre -ne 'Cliente actualizado' -or $clienteActualizado.correo -ne 'actualizado@example.test') { throw 'PUT client did not replace all client fields.' }
    $response = Assert-Status -Method PATCH -Uri "$BaseUrl/clientes/$clienteId" -Expected 200 -Body @{ telefono = '8999-2222' }
    $clienteParcial = ($response.Content | ConvertFrom-Json).data
    if ($clienteParcial.nombre -ne 'Cliente actualizado' -or $clienteParcial.telefono -ne '8999-2222') { throw 'PATCH client did not preserve unchanged fields.' }

    $response = Assert-Status -Method PATCH -Uri "$BaseUrl/productos/$productoId" -Expected 200 -Body @{ precio = 1300.75 }
    $productoParcial = ($response.Content | ConvertFrom-Json).data
    if ($productoParcial.nombre -ne 'Producto prueba API' -or $productoParcial.precio -ne '1300.75') { throw 'PATCH product did not preserve its name and update its price.' }
    $null = Assert-Status -Method PUT -Uri "$BaseUrl/productos/$productoId" -Expected 200 -Body @{ nombre = 'Producto actualizado'; precio = 1400; sku = $sku; categoriaId = $categoriaId; unidadMedidaId = $unidadMedidaId }

    $fechaAlterna = (Get-Date).AddDays(-1).ToString('yyyy-MM-dd')
    $response = Assert-Status -Method PATCH -Uri "$BaseUrl/facturas/$facturaId" -Expected 200 -Body @{ fecha = $fechaAlterna }
    $facturaParcial = ($response.Content | ConvertFrom-Json).data
    if ([int]$facturaParcial.clienteId -ne $clienteId -or $facturaParcial.fecha -ne $fechaAlterna) { throw 'PATCH invoice did not preserve its client and update its date.' }
    $null = Assert-Status -Method PUT -Uri "$BaseUrl/facturas/$facturaId" -Expected 200 -Body @{ clienteId = $clienteId; fecha = $fechaAlterna }

    $response = Assert-Status -Method PATCH -Uri "$BaseUrl/detalles-factura/$detalleCascadeId" -Expected 200 -Body @{ cantidad = 4 }
    $detalleParcial = ($response.Content | ConvertFrom-Json).data
    if ([int]$detalleParcial.cantidad -ne 4 -or [int]$detalleParcial.productoId -ne $productoId -or [decimal]$detalleParcial.precioUnitario -ne 1250.50) { throw 'PATCH invoice detail did not preserve unchanged fields.' }
    $response = Assert-Status -Method PUT -Uri "$BaseUrl/detalles-factura/$detalleCascadeId" -Expected 200 -Body @{ productoId = $productoId; cantidad = 3; precioUnitario = 1400 }
    $detalleActualizado = ($response.Content | ConvertFrom-Json).data
    if ([int]$detalleActualizado.cantidad -ne 3 -or [decimal]$detalleActualizado.precioUnitario -ne 1400) { throw 'PUT invoice detail did not replace all fields.' }

    Assert-Status -Method DELETE -Uri "$BaseUrl/facturas/$facturaId" -Expected 204
    $facturaId = $null
    Assert-Status -Method GET -Uri "$BaseUrl/detalles-factura/$detalleCascadeId" -Expected 404
    $detalleCascadeId = $null
    Assert-Status -Method DELETE -Uri "$BaseUrl/productos/$productoId" -Expected 204
    $productoId = $null
    Assert-Status -Method DELETE -Uri "$BaseUrl/unidades-medida/$unidadMedidaId" -Expected 204
    $unidadMedidaId = $null
    Assert-Status -Method DELETE -Uri "$BaseUrl/categorias/$categoriaId" -Expected 204
    $categoriaId = $null
    Assert-Status -Method DELETE -Uri "$BaseUrl/clientes/$clienteId" -Expected 204
    $clienteId = $null
} finally {
    if ($null -ne $facturaMostradorId -and $script:AccessToken) { try { Invoke-RestMethod -Method Delete -Uri "$BaseUrl/facturas/$facturaMostradorId" -Headers @{ Authorization = "Bearer $script:AccessToken" } | Out-Null } catch { } }
    if ($null -ne $facturaId -and $script:AccessToken) { try { Invoke-RestMethod -Method Delete -Uri "$BaseUrl/facturas/$facturaId" -Headers @{ Authorization = "Bearer $script:AccessToken" } | Out-Null } catch { } }
    if ($null -ne $detalleId -and $script:AccessToken) { try { Invoke-RestMethod -Method Delete -Uri "$BaseUrl/detalles-factura/$detalleId" -Headers @{ Authorization = "Bearer $script:AccessToken" } | Out-Null } catch { } }
    if ($null -ne $detalleCascadeId -and $script:AccessToken) { try { Invoke-RestMethod -Method Delete -Uri "$BaseUrl/detalles-factura/$detalleCascadeId" -Headers @{ Authorization = "Bearer $script:AccessToken" } | Out-Null } catch { } }
    if ($null -ne $productoId -and $script:AccessToken) { try { Invoke-RestMethod -Method Delete -Uri "$BaseUrl/productos/$productoId" -Headers @{ Authorization = "Bearer $script:AccessToken" } | Out-Null } catch { } }
    if ($null -ne $unidadMedidaId -and $script:AccessToken) { try { Invoke-RestMethod -Method Delete -Uri "$BaseUrl/unidades-medida/$unidadMedidaId" -Headers @{ Authorization = "Bearer $script:AccessToken" } | Out-Null } catch { } }
    if ($null -ne $categoriaId -and $script:AccessToken) { try { Invoke-RestMethod -Method Delete -Uri "$BaseUrl/categorias/$categoriaId" -Headers @{ Authorization = "Bearer $script:AccessToken" } | Out-Null } catch { } }
    if ($null -ne $clienteId -and $script:AccessToken) { try { Invoke-RestMethod -Method Delete -Uri "$BaseUrl/clientes/$clienteId" -Headers @{ Authorization = "Bearer $script:AccessToken" } | Out-Null } catch { } }
    & node (Join-Path $PSScriptRoot 'delete-smoke-user.js') $correoUsuario
    if ($LASTEXITCODE -ne 0) { Write-Warning 'No se pudo borrar el usuario temporal de smoke:api.' }
}
