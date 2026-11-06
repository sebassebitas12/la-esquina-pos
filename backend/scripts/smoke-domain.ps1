param([string]$BaseUrl = 'http://localhost:3002/api')

$ErrorActionPreference = 'Stop'
$script:AccessToken = $null
$runId = [guid]::NewGuid().ToString('N').Substring(0, 10)
$userEmail = "smkdom-user.$runId@example.test"
$userPassword = "D2SMK${runId}Aa!"
$clientEmail = "smkdom.$runId@example.test"
$categoryName = "SMKDOM categoria $runId"
$brandName = "SMKDOM marca $runId"
$unitName = "SMKDOM unidad $runId"
$supplierName = "SMKDOM proveedor $runId"
$sku = "SMKDOM-$runId"
$paymentCode = "smkdom-$runId"

function Assert-Status([string]$Method, [string]$Uri, [int]$Expected, $Body = $null) {
    $params = @{ Method = $Method; Uri = $Uri; UseBasicParsing = $true; Headers = @{ Authorization = "Bearer $script:AccessToken" } }
    if ($null -ne $Body) {
        $params.ContentType = 'application/json; charset=utf-8'
        $params.Body = $Body | ConvertTo-Json -Depth 10 -Compress
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
    Write-Host "OK $Method $Uri -> HTTP $status"
    return $response
}

function Get-Data([string]$Path) {
    return (Invoke-RestMethod -Method Get -Uri "$BaseUrl/$Path" -Headers @{ Authorization = "Bearer $script:AccessToken" }).data
}

try {
    $null = Assert-Status POST "$BaseUrl/auth/register" 201 @{ nombre = "Prueba dominio $runId"; correo = $userEmail; password = $userPassword }
    $session = Assert-Status POST "$BaseUrl/auth/login" 200 @{ correo = $userEmail; password = $userPassword }
    $script:AccessToken = ($session.Content | ConvertFrom-Json).token
    if ([string]::IsNullOrWhiteSpace($script:AccessToken)) { throw 'Login did not return an access token.' }

    $response = Assert-Status POST "$BaseUrl/categorias" 201 @{ nombre = $categoryName; descripcion = 'Categoría de prueba' }
    $categoryId = [int](($response.Content | ConvertFrom-Json).data.id)
    Assert-Status GET "$BaseUrl/categorias/$categoryId" 200 | Out-Null
    Assert-Status PUT "$BaseUrl/categorias/$categoryId" 200 @{ nombre = $categoryName; descripcion = 'Categoría de prueba'; activa = $true } | Out-Null
    Assert-Status PATCH "$BaseUrl/categorias/$categoryId" 200 @{ descripcion = 'Categoría actualizada' } | Out-Null

    $response = Assert-Status POST "$BaseUrl/marcas" 201 @{ nombre = $brandName }
    $brandId = [int](($response.Content | ConvertFrom-Json).data.id)
    Assert-Status PUT "$BaseUrl/marcas/$brandId" 200 @{ nombre = $brandName; activa = $true } | Out-Null
    Assert-Status PATCH "$BaseUrl/marcas/$brandId" 200 @{ descripcion = 'Marca del artículo de prueba' } | Out-Null

    $response = Assert-Status POST "$BaseUrl/unidades-medida" 201 @{ nombre = $unitName; abreviatura = "u$runId" }
    $unitId = [int](($response.Content | ConvertFrom-Json).data.id)
    Assert-Status PUT "$BaseUrl/unidades-medida/$unitId" 200 @{ nombre = $unitName; abreviatura = "u$runId"; activa = $true } | Out-Null
    Assert-Status PATCH "$BaseUrl/unidades-medida/$unitId" 200 @{ activa = $true } | Out-Null

    $response = Assert-Status POST "$BaseUrl/proveedores" 201 @{ nombre = $supplierName; correo = "proveedor.$runId@example.test"; identificacion = "SMK-$runId" }
    $supplierId = [int](($response.Content | ConvertFrom-Json).data.id)
    Assert-Status PUT "$BaseUrl/proveedores/$supplierId" 200 @{ nombre = $supplierName; correo = "proveedor.$runId@example.test"; identificacion = "SMK-$runId"; activo = $true } | Out-Null
    Assert-Status PATCH "$BaseUrl/proveedores/$supplierId" 200 @{ telefono = '8888-2222' } | Out-Null

    $response = Assert-Status POST "$BaseUrl/metodos-pago" 201 @{ codigo = $paymentCode; nombre = "Pago smoke $runId" }
    $methodId = [int](($response.Content | ConvertFrom-Json).data.id)
    Assert-Status PUT "$BaseUrl/metodos-pago/$methodId" 200 @{ codigo = $paymentCode; nombre = "Pago smoke $runId"; activo = $true } | Out-Null
    Assert-Status PATCH "$BaseUrl/metodos-pago/$methodId" 200 @{ activo = $true } | Out-Null
    $unusedMethod = Assert-Status POST "$BaseUrl/metodos-pago" 201 @{ codigo = "unused-$runId"; nombre = "Temporal $runId" }
    $unusedMethodId = [int](($unusedMethod.Content | ConvertFrom-Json).data.id)
    Assert-Status DELETE "$BaseUrl/metodos-pago/$unusedMethodId" 204 | Out-Null

    $response = Assert-Status POST "$BaseUrl/clientes" 201 @{ nombre = "Cliente smoke $runId"; correo = $clientEmail; telefono = '8000-0000' }
    $clientId = [int](($response.Content | ConvertFrom-Json).data.id)

    $response = Assert-Status POST "$BaseUrl/productos" 201 @{ nombre = "Artículo $runId"; precio = '500.00'; sku = $sku; categoriaId = $categoryId; marcaId = $brandId; unidadMedidaId = $unitId }
    $productId = [int](($response.Content | ConvertFrom-Json).data.id)
    $stock = Get-Data "existencias/producto/$productId"
    if ([decimal]$stock.cantidadActual -ne 0) { throw 'A new product must begin with zero stock.' }

    $response = Assert-Status POST "$BaseUrl/productos-proveedores" 201 @{ proveedorId = $supplierId; productoId = $productId; codigoProveedor = "EXT-$runId"; costoUnitario = '300.00'; preferido = $true }
    $supplierProduct = $response.Content | ConvertFrom-Json
    $supplierProductId = [int]$supplierProduct.data.id
    if ($supplierProductId -le 0) { throw "Product supplier response did not contain an id: $($response.Content)" }
    Assert-Status GET "$BaseUrl/productos-proveedores/$supplierProductId" 200 | Out-Null
    Assert-Status PUT "$BaseUrl/productos-proveedores/$supplierProductId" 200 @{ proveedorId = $supplierId; productoId = $productId; codigoProveedor = "EXT-$runId"; costoUnitario = '310.00'; preferido = $true } | Out-Null
    Assert-Status PATCH "$BaseUrl/productos-proveedores/$supplierProductId" 200 @{ costoUnitario = '300.00' } | Out-Null

    $response = Assert-Status POST "$BaseUrl/compras" 201 @{ proveedorId = $supplierId; fecha = '2026-11-05'; observaciones = $runId }
    $purchaseId = [int](($response.Content | ConvertFrom-Json).data.id)
    $response = Assert-Status POST "$BaseUrl/detalles-compra" 201 @{ compraId = $purchaseId; productoId = $productId; cantidad = '10.000'; costoUnitario = '300.00' }
    $purchaseLineId = [int](($response.Content | ConvertFrom-Json).data.id)
    Assert-Status GET "$BaseUrl/detalles-compra/$purchaseLineId" 200 | Out-Null
    Assert-Status PATCH "$BaseUrl/detalles-compra/$purchaseLineId" 200 @{ cantidad = '10.500' } | Out-Null
    Assert-Status PUT "$BaseUrl/detalles-compra/$purchaseLineId" 200 @{ productoId = $productId; cantidad = '10.000'; costoUnitario = '300.00' } | Out-Null
    Assert-Status PUT "$BaseUrl/compras/$purchaseId" 200 @{ proveedorId = $supplierId; fecha = '2026-11-05'; observaciones = $runId } | Out-Null
    Assert-Status PATCH "$BaseUrl/compras/$purchaseId" 200 @{ observaciones = $runId } | Out-Null
    $purchaseData = Get-Data "compras/$purchaseId"
    if ([decimal]$purchaseData.total -ne 3000) { throw 'Purchase total was not calculated from its lines.' }
    Assert-Status POST "$BaseUrl/compras/$purchaseId/recibir" 200 | Out-Null
    $stock = Get-Data "existencias/producto/$productId"
    if ([decimal]$stock.cantidadActual -ne 10) { throw 'Purchase receiving did not add the received quantity to inventory.' }
    Assert-Status POST "$BaseUrl/compras/$purchaseId/recibir" 409 | Out-Null
    Assert-Status PATCH "$BaseUrl/detalles-compra/$purchaseLineId" 409 @{ cantidad = '9.000' } | Out-Null
    Assert-Status DELETE "$BaseUrl/detalles-compra/$purchaseLineId" 409 | Out-Null

    $draftWithoutLines = Assert-Status POST "$BaseUrl/compras" 201 @{ proveedorId = $supplierId; observaciones = $runId }
    $emptyPurchaseId = [int](($draftWithoutLines.Content | ConvertFrom-Json).data.id)
    Assert-Status POST "$BaseUrl/compras/$emptyPurchaseId/recibir" 409 | Out-Null
    Assert-Status POST "$BaseUrl/compras/$emptyPurchaseId/anular" 200 | Out-Null

    $response = Assert-Status POST "$BaseUrl/facturas" 201 @{ clienteId = $clientId; fecha = '2026-11-05' }
    $invoiceId = [int](($response.Content | ConvertFrom-Json).data.id)
    $response = Assert-Status POST "$BaseUrl/detalles-factura" 201 @{ facturaId = $invoiceId; productoId = $productId; cantidad = '3.000'; precioUnitario = '500.00' }
    $saleLineId = [int](($response.Content | ConvertFrom-Json).data.id)
    Assert-Status GET "$BaseUrl/detalles-factura/$saleLineId" 200 | Out-Null
    Assert-Status PATCH "$BaseUrl/detalles-factura/$saleLineId" 200 @{ cantidad = '3.500' } | Out-Null
    Assert-Status PUT "$BaseUrl/detalles-factura/$saleLineId" 200 @{ productoId = $productId; cantidad = '3.000'; precioUnitario = '500.00' } | Out-Null
    $invoiceData = Get-Data "facturas/$invoiceId"
    if ([decimal]$invoiceData.total -ne 1500) { throw 'Invoice total was not calculated from its lines.' }
    Assert-Status POST "$BaseUrl/facturas/$invoiceId/confirmar" 200 | Out-Null
    $stock = Get-Data "existencias/producto/$productId"
    if ([decimal]$stock.cantidadActual -ne 7) { throw 'Confirming a sale did not deduct its stock.' }
    Assert-Status POST "$BaseUrl/facturas/$invoiceId/confirmar" 409 | Out-Null
    Assert-Status PATCH "$BaseUrl/detalles-factura/$saleLineId" 409 @{ cantidad = '2.000' } | Out-Null
    Assert-Status DELETE "$BaseUrl/detalles-factura/$saleLineId" 409 | Out-Null
    Assert-Status DELETE "$BaseUrl/facturas/$invoiceId" 409 | Out-Null

    $insufficient = Assert-Status POST "$BaseUrl/facturas" 201 @{ clienteId = $clientId; fecha = '2026-11-05' }
    $insufficientId = [int](($insufficient.Content | ConvertFrom-Json).data.id)
    $null = Assert-Status POST "$BaseUrl/detalles-factura" 201 @{ facturaId = $insufficientId; productoId = $productId; cantidad = '100.000'; precioUnitario = '500.00' }
    Assert-Status POST "$BaseUrl/facturas/$insufficientId/confirmar" 409 | Out-Null
    $stock = Get-Data "existencias/producto/$productId"
    if ([decimal]$stock.cantidadActual -ne 7) { throw 'A failed sale confirmation changed inventory instead of rolling back.' }
    Assert-Status DELETE "$BaseUrl/facturas/$insufficientId" 204 | Out-Null

    $response = Assert-Status POST "$BaseUrl/pagos" 201 @{ facturaId = $invoiceId; metodoPagoId = $methodId; monto = '1500.00'; referencia = "REF-$runId" }
    $paymentId = [int](($response.Content | ConvertFrom-Json).data.id)
    Assert-Status GET "$BaseUrl/pagos/$paymentId" 200 | Out-Null
    Assert-Status POST "$BaseUrl/pagos" 409 @{ facturaId = $invoiceId; metodoPagoId = $methodId; monto = '0.01' } | Out-Null
    Assert-Status PUT "$BaseUrl/pagos/$paymentId" 200 @{ metodoPagoId = $methodId; monto = '1400.00'; referencia = "REF-$runId" } | Out-Null
    Assert-Status PATCH "$BaseUrl/pagos/$paymentId" 200 @{ monto = '1500.00' } | Out-Null
    Assert-Status DELETE "$BaseUrl/pagos/$paymentId" 204 | Out-Null
    if ((Get-Data "pagos/$paymentId").estado -ne 'anulado') { throw 'DELETE payment did not preserve it with anulado status.' }

    $response = Assert-Status POST "$BaseUrl/devoluciones" 201 @{ facturaId = $invoiceId; motivo = 'Producto sin abrir' }
    $returnId = [int](($response.Content | ConvertFrom-Json).data.id)
    Assert-Status GET "$BaseUrl/devoluciones/$returnId" 200 | Out-Null
    Assert-Status PUT "$BaseUrl/devoluciones/$returnId" 200 @{ facturaId = $invoiceId; motivo = 'Producto sin abrir' } | Out-Null
    Assert-Status PATCH "$BaseUrl/devoluciones/$returnId" 200 @{ motivo = 'Devolución revisada' } | Out-Null
    $response = Assert-Status POST "$BaseUrl/detalles-devolucion" 201 @{ devolucionId = $returnId; detalleFacturaId = $saleLineId; cantidad = '1.000' }
    $returnLineId = [int](($response.Content | ConvertFrom-Json).data.id)
    Assert-Status GET "$BaseUrl/detalles-devolucion/$returnLineId" 200 | Out-Null
    Assert-Status PATCH "$BaseUrl/detalles-devolucion/$returnLineId" 200 @{ cantidad = '1.000' } | Out-Null
    Assert-Status PUT "$BaseUrl/detalles-devolucion/$returnLineId" 200 @{ devolucionId = $returnId; detalleFacturaId = $saleLineId; cantidad = '1.000' } | Out-Null
    Assert-Status POST "$BaseUrl/devoluciones/$returnId/procesar" 200 | Out-Null
    $stock = Get-Data "existencias/producto/$productId"
    if ([decimal]$stock.cantidadActual -ne 8) { throw 'Processing a return did not restore its stock.' }
    Assert-Status POST "$BaseUrl/devoluciones/$returnId/procesar" 409 | Out-Null
    Assert-Status DELETE "$BaseUrl/detalles-devolucion/$returnLineId" 409 | Out-Null
    Assert-Status DELETE "$BaseUrl/devoluciones/$returnId" 409 | Out-Null

    $excessReturn = Assert-Status POST "$BaseUrl/devoluciones" 201 @{ facturaId = $invoiceId; motivo = 'Límite de prueba' }
    $excessReturnId = [int](($excessReturn.Content | ConvertFrom-Json).data.id)
    $null = Assert-Status POST "$BaseUrl/detalles-devolucion" 201 @{ devolucionId = $excessReturnId; detalleFacturaId = $saleLineId; cantidad = '3.000' }
    Assert-Status POST "$BaseUrl/devoluciones/$excessReturnId/procesar" 409 | Out-Null
    Assert-Status DELETE "$BaseUrl/devoluciones/$excessReturnId" 204 | Out-Null
    Assert-Status POST "$BaseUrl/facturas/$invoiceId/anular" 409 | Out-Null

    $response = Assert-Status POST "$BaseUrl/movimientos-inventario" 201 @{ productoId = $productId; tipo = 'entrada'; cantidad = '1.000'; nota = 'Ajuste de prueba' }
    $movementId = [int](($response.Content | ConvertFrom-Json).data.id)
    Assert-Status GET "$BaseUrl/movimientos-inventario/$movementId" 200 | Out-Null
    Assert-Status POST "$BaseUrl/movimientos-inventario" 201 @{ productoId = $productId; tipo = 'ajuste'; cantidad = '-0.500'; nota = 'Corrección de conteo' } | Out-Null
    Assert-Status POST "$BaseUrl/movimientos-inventario" 409 @{ productoId = $productId; tipo = 'salida'; cantidad = '99.000'; nota = 'No debe dejar stock negativo' } | Out-Null
    Assert-Status PUT "$BaseUrl/movimientos-inventario/$movementId" 409 @{} | Out-Null
    Assert-Status PATCH "$BaseUrl/movimientos-inventario/$movementId" 409 @{} | Out-Null
    Assert-Status DELETE "$BaseUrl/movimientos-inventario/$movementId" 409 | Out-Null

    $stock = Get-Data "existencias/producto/$productId"
    Assert-Status PUT "$BaseUrl/existencias/$($stock.id)" 200 @{ cantidadMinima = '2.500' } | Out-Null
    if ([decimal](Get-Data "existencias/$($stock.id)").cantidadMinima -ne 2.5) { throw 'Stock minimum was not updated.' }
    Assert-Status DELETE "$BaseUrl/existencias/$($stock.id)" 409 | Out-Null
    Assert-Status POST "$BaseUrl/compras/$purchaseId/anular" 409 | Out-Null
    Assert-Status DELETE "$BaseUrl/compras/$purchaseId" 409 | Out-Null
    Assert-Status DELETE "$BaseUrl/productos/$productId" 409 | Out-Null
    Assert-Status DELETE "$BaseUrl/categorias/$categoryId" 409 | Out-Null
    Assert-Status DELETE "$BaseUrl/unidades-medida/$unitId" 409 | Out-Null
    Assert-Status DELETE "$BaseUrl/proveedores/$supplierId" 409 | Out-Null
    Assert-Status DELETE "$BaseUrl/productos-proveedores/$supplierProductId" 204 | Out-Null
    Assert-Status DELETE "$BaseUrl/marcas/$brandId" 204 | Out-Null
    if ((Get-Data "productos/$productId").marcaId) { throw 'Deleting an optional brand should clear the product reference.' }
    Assert-Status POST "$BaseUrl/facturas/$invoiceId/anular" 409 | Out-Null
    Write-Host "Domain workflow passed for run $runId."
} finally {
    & node (Join-Path $PSScriptRoot 'delete-domain-smoke.js') $runId
    if ($LASTEXITCODE -ne 0) { Write-Warning "Could not remove domain smoke fixture $runId." }
}
