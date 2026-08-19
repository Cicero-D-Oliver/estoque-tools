[CmdletBinding()]
param(
    [string]$JarPath,
    [string]$JavaCommand = "java",
    [switch]$KeepArtifacts
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Net.Http

$projectRoot = [System.IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
$targetRoot = [System.IO.Path]::GetFullPath((Join-Path $projectRoot "target"))
$smokeRoot = [System.IO.Path]::GetFullPath((Join-Path $targetRoot "smoke-test"))
$developmentDatabase = [System.IO.Path]::GetFullPath((Join-Path $projectRoot "estoque.db"))

function Get-FileSnapshot {
    param([Parameter(Mandatory = $true)][string]$Path)

    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        return [pscustomobject]@{
            Exists = $false
            Length = $null
            LastWriteTimeUtcTicks = $null
            Sha256 = $null
        }
    }

    $item = Get-Item -LiteralPath $Path
    return [pscustomobject]@{
        Exists = $true
        Length = $item.Length
        LastWriteTimeUtcTicks = $item.LastWriteTimeUtc.Ticks
        Sha256 = (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash
    }
}

function Test-SameSnapshot {
    param($Before, $After)

    return $Before.Exists -eq $After.Exists `
        -and $Before.Length -eq $After.Length `
        -and $Before.LastWriteTimeUtcTicks -eq $After.LastWriteTimeUtcTicks `
        -and $Before.Sha256 -eq $After.Sha256
}

function Get-FreeTcpPort {
    $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 0)
    try {
        $listener.Start()
        return ([System.Net.IPEndPoint]$listener.LocalEndpoint).Port
    }
    finally {
        $listener.Stop()
    }
}

function Invoke-SmokeHttp {
    param(
        [Parameter(Mandatory = $true)][string]$Method,
        [Parameter(Mandatory = $true)][string]$Uri,
        [string]$Body,
        [hashtable]$Headers = @{}
    )

    $handler = [System.Net.Http.HttpClientHandler]::new()
    $handler.AllowAutoRedirect = $true
    $client = [System.Net.Http.HttpClient]::new($handler)
    $request = [System.Net.Http.HttpRequestMessage]::new(
        [System.Net.Http.HttpMethod]::new($Method),
        $Uri
    )

    try {
        foreach ($header in $Headers.GetEnumerator()) {
            $request.Headers.TryAddWithoutValidation($header.Key, [string]$header.Value) | Out-Null
        }
        if ($PSBoundParameters.ContainsKey("Body")) {
            $request.Content = [System.Net.Http.StringContent]::new(
                $Body,
                [System.Text.Encoding]::UTF8,
                "application/json"
            )
        }

        $response = $client.SendAsync($request).GetAwaiter().GetResult()
        $content = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
        return [pscustomobject]@{
            Status = [int]$response.StatusCode
            Content = $content
        }
    }
    finally {
        $request.Dispose()
        $client.Dispose()
        $handler.Dispose()
    }
}

function Assert-Status {
    param($Response, [int]$Expected, [string]$Description)

    if ($Response.Status -ne $Expected) {
        throw "$Description retornou HTTP $($Response.Status), esperado $Expected. Corpo: $($Response.Content)"
    }
}

function Assert-NoDuplicates {
    param([object[]]$Items, [string]$Property, [string]$Description)

    $values = @($Items | ForEach-Object { $_.$Property })
    $uniqueValues = @($values | Sort-Object -Unique)
    if ($values.Count -ne $uniqueValues.Count) {
        throw "Foram encontradas duplicidades em $Description, propriedade $Property."
    }
}

if ([string]::IsNullOrWhiteSpace($JarPath)) {
    $jar = Get-ChildItem -LiteralPath $targetRoot -Filter "*.jar" -File -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -notlike "*.original" } |
        Select-Object -First 1
    if ($null -eq $jar) {
        throw "JAR não encontrado em target. Execute 'mvn clean verify' antes do smoke test."
    }
    $resolvedJar = $jar.FullName
}
else {
    $candidateJar = if ([System.IO.Path]::IsPathRooted($JarPath)) {
        $JarPath
    }
    else {
        Join-Path $projectRoot $JarPath
    }
    $resolvedJar = [System.IO.Path]::GetFullPath($candidateJar)
    if (-not (Test-Path -LiteralPath $resolvedJar -PathType Leaf)) {
        throw "JAR não encontrado: $resolvedJar"
    }
}

$java = Get-Command $JavaCommand -ErrorAction Stop
$javaExecutable = $java.Source
$runId = [guid]::NewGuid().ToString("N")
$workDirectory = [System.IO.Path]::GetFullPath((Join-Path $smokeRoot $runId))
$isolatedDatabase = [System.IO.Path]::GetFullPath((Join-Path $workDirectory "smoke.db"))
$sqliteUrl = "jdbc:sqlite:$($isolatedDatabase.Replace('\', '/'))"
$port = Get-FreeTcpPort
$baseUrl = "http://127.0.0.1:$port"
$developmentBefore = Get-FileSnapshot -Path $developmentDatabase
$backend = $null
$firstStopped = $false
$secondStopped = $false
$databaseRemoved = $false
$isolatedSnapshot = $null
$firstCounts = $null
$secondCounts = $null
$smokeEmail = "smoke-$runId@example.test"

New-Item -ItemType Directory -Path $workDirectory -Force | Out-Null

function Start-SmokeBackend {
    $startInfo = [System.Diagnostics.ProcessStartInfo]::new()
    $startInfo.FileName = $javaExecutable
    $startInfo.Arguments = "-jar `"$resolvedJar`" --spring.profiles.active=sqlite"
    $startInfo.WorkingDirectory = $projectRoot
    $startInfo.UseShellExecute = $false
    $startInfo.CreateNoWindow = $true
    $startInfo.RedirectStandardOutput = $true
    $startInfo.RedirectStandardError = $true

    $process = [System.Diagnostics.Process]::new()
    $process.StartInfo = $startInfo
    $processEnvironment = @{
        SERVER_PORT = [string]$port
        SQLITE_URL = $sqliteUrl
    }
    $previousEnvironment = @{}
    foreach ($entry in $processEnvironment.GetEnumerator()) {
        $previousEnvironment[$entry.Key] = [System.Environment]::GetEnvironmentVariable(
            $entry.Key,
            [System.EnvironmentVariableTarget]::Process
        )
        [System.Environment]::SetEnvironmentVariable(
            $entry.Key,
            [string]$entry.Value,
            [System.EnvironmentVariableTarget]::Process
        )
    }
    try {
        if (-not $process.Start()) {
            throw "Não foi possível iniciar o backend."
        }
    }
    finally {
        foreach ($entry in $previousEnvironment.GetEnumerator()) {
            [System.Environment]::SetEnvironmentVariable(
                $entry.Key,
                $entry.Value,
                [System.EnvironmentVariableTarget]::Process
            )
        }
    }

    return [pscustomobject]@{
        Process = $process
        StandardOutput = $process.StandardOutput.ReadToEndAsync()
        StandardError = $process.StandardError.ReadToEndAsync()
    }
}

function Stop-SmokeBackend {
    param($RunningBackend)

    if ($null -eq $RunningBackend) {
        return $true
    }
    if (-not $RunningBackend.Process.HasExited) {
        $RunningBackend.Process.Kill()
        if (-not $RunningBackend.Process.WaitForExit(10000)) {
            throw "O backend não encerrou dentro do limite de 10 segundos."
        }
    }
    $RunningBackend.StandardOutput.GetAwaiter().GetResult() | Out-Null
    $RunningBackend.StandardError.GetAwaiter().GetResult() | Out-Null
    $stopped = $RunningBackend.Process.HasExited
    $RunningBackend.Process.Dispose()
    return $stopped
}

function Wait-ForHealth {
    param($RunningBackend)

    for ($attempt = 0; $attempt -lt 90; $attempt++) {
        if ($RunningBackend.Process.HasExited) {
            $stdout = $RunningBackend.StandardOutput.GetAwaiter().GetResult()
            $stderr = $RunningBackend.StandardError.GetAwaiter().GetResult()
            throw "O backend encerrou durante a inicialização.`nSTDOUT:`n$stdout`nSTDERR:`n$stderr"
        }
        try {
            $response = Invoke-SmokeHttp -Method "GET" -Uri "$baseUrl/actuator/health"
            if ($response.Status -eq 200) {
                $body = $response.Content | ConvertFrom-Json
                if ($body.status -eq "UP") {
                    return
                }
            }
        }
        catch {
            # A conexão recusada é esperada enquanto o servidor inicializa.
        }
        Start-Sleep -Milliseconds 500
    }
    throw "Healthcheck não ficou UP dentro de 45 segundos."
}

try {
    $backend = Start-SmokeBackend
    Wait-ForHealth -RunningBackend $backend

    $openApi = Invoke-SmokeHttp -Method "GET" -Uri "$baseUrl/v3/api-docs"
    Assert-Status -Response $openApi -Expected 200 -Description "OpenAPI"
    $openApiBody = $openApi.Content | ConvertFrom-Json
    if ($openApiBody.openapi -ne "3.1.0") {
        throw "Versão OpenAPI inesperada: $($openApiBody.openapi)"
    }

    $swagger = Invoke-SmokeHttp -Method "GET" -Uri "$baseUrl/swagger-ui.html"
    Assert-Status -Response $swagger -Expected 200 -Description "Swagger UI"

    $validBody = @{
        nome = "Usuário Smoke Test"
        email = $smokeEmail
        perfil = "OPERADOR"
    } | ConvertTo-Json -Compress
    $validResponse = Invoke-SmokeHttp -Method "POST" -Uri "$baseUrl/api/usuarios" -Body $validBody
    Assert-Status -Response $validResponse -Expected 201 -Description "Requisição válida"
    $createdUser = $validResponse.Content | ConvertFrom-Json

    $invalidBody = '{"nome":"Inválido","email":"invalido@example.test","perfil":"NAO_EXISTE"}'
    $invalidResponse = Invoke-SmokeHttp -Method "POST" -Uri "$baseUrl/api/usuarios" `
        -Body $invalidBody -Headers @{ "X-Correlation-Id" = "smoke-invalid-request" }
    Assert-Status -Response $invalidResponse -Expected 400 -Description "Requisição inválida"
    $invalidError = $invalidResponse.Content | ConvertFrom-Json
    if ($invalidError.codigo -ne "REQUISICAO_MALFORMADA") {
        throw "Código de erro inesperado: $($invalidError.codigo)"
    }
    $internalFields = @("exception", "trace", "stackTrace", "cause")
    foreach ($field in $internalFields) {
        if ($invalidError.PSObject.Properties.Name -contains $field) {
            throw "A resposta inválida expôs o campo interno '$field'."
        }
    }
    if ($invalidError.mensagem -match "(?i)(java\.|org\.|sql|exception|stack)") {
        throw "A mensagem de erro contém detalhe interno: $($invalidError.mensagem)"
    }

    $usersFirst = @(((Invoke-SmokeHttp -Method "GET" -Uri "$baseUrl/api/usuarios").Content | ConvertFrom-Json))
    $itemsFirst = @(((Invoke-SmokeHttp -Method "GET" -Uri "$baseUrl/api/itens").Content | ConvertFrom-Json))
    $toolsFirst = @(((Invoke-SmokeHttp -Method "GET" -Uri "$baseUrl/api/ferramentas").Content | ConvertFrom-Json))
    Assert-NoDuplicates -Items $usersFirst -Property "email" -Description "usuários"
    Assert-NoDuplicates -Items $itemsFirst -Property "codigo" -Description "itens"
    Assert-NoDuplicates -Items $toolsFirst -Property "patrimonio" -Description "ferramentas"
    $firstCounts = [pscustomobject]@{
        usuarios = $usersFirst.Count
        itens = $itemsFirst.Count
        ferramentas = $toolsFirst.Count
    }

    $firstStopped = Stop-SmokeBackend -RunningBackend $backend
    $backend = $null
    if (-not $firstStopped) {
        throw "A primeira execução não foi encerrada corretamente."
    }
    if (-not (Test-Path -LiteralPath $isolatedDatabase -PathType Leaf)) {
        throw "O banco isolado não foi criado em $isolatedDatabase"
    }

    $backend = Start-SmokeBackend
    Wait-ForHealth -RunningBackend $backend

    $usersSecond = @(((Invoke-SmokeHttp -Method "GET" -Uri "$baseUrl/api/usuarios").Content | ConvertFrom-Json))
    $itemsSecond = @(((Invoke-SmokeHttp -Method "GET" -Uri "$baseUrl/api/itens").Content | ConvertFrom-Json))
    $toolsSecond = @(((Invoke-SmokeHttp -Method "GET" -Uri "$baseUrl/api/ferramentas").Content | ConvertFrom-Json))
    Assert-NoDuplicates -Items $usersSecond -Property "email" -Description "usuários após reinicialização"
    Assert-NoDuplicates -Items $itemsSecond -Property "codigo" -Description "itens após reinicialização"
    Assert-NoDuplicates -Items $toolsSecond -Property "patrimonio" -Description "ferramentas após reinicialização"
    $secondCounts = [pscustomobject]@{
        usuarios = $usersSecond.Count
        itens = $itemsSecond.Count
        ferramentas = $toolsSecond.Count
    }

    if ($firstCounts.usuarios -ne $secondCounts.usuarios `
            -or $firstCounts.itens -ne $secondCounts.itens `
            -or $firstCounts.ferramentas -ne $secondCounts.ferramentas) {
        throw "As quantidades mudaram após a reinicialização; possível duplicidade no seed."
    }
    $smokeUsers = @($usersSecond | Where-Object { $_.email -eq $smokeEmail })
    if ($smokeUsers.Count -ne 1 -or $smokeUsers[0].id -ne $createdUser.id) {
        throw "O usuário criado não foi persistido exatamente uma vez no banco isolado."
    }

    $secondStopped = Stop-SmokeBackend -RunningBackend $backend
    $backend = $null
    if (-not $secondStopped) {
        throw "A segunda execução não foi encerrada corretamente."
    }

    $isolatedSnapshot = Get-FileSnapshot -Path $isolatedDatabase
    $developmentAfter = Get-FileSnapshot -Path $developmentDatabase
    if (-not (Test-SameSnapshot -Before $developmentBefore -After $developmentAfter)) {
        throw "O banco local de desenvolvimento foi alterado durante o smoke test."
    }

    $result = [ordered]@{
        success = $true
        jar = $resolvedJar
        java = $javaExecutable
        sqliteUrl = $sqliteUrl
        isolatedDatabase = $isolatedDatabase
        isolatedDatabaseExistsBeforeCleanup = $isolatedSnapshot.Exists
        isolatedDatabaseSha256 = $isolatedSnapshot.Sha256
        developmentDatabase = $developmentDatabase
        developmentDatabaseUnchanged = $true
        developmentDatabaseSha256 = $developmentAfter.Sha256
        health = "UP"
        openApiStatus = 200
        openApiVersion = $openApiBody.openapi
        swaggerStatus = 200
        validRequestStatus = 201
        invalidRequestStatus = 400
        invalidRequestCode = $invalidError.codigo
        invalidResponseSanitized = $true
        firstProcessStopped = $firstStopped
        secondProcessStopped = $secondStopped
        countsBeforeRestart = $firstCounts
        countsAfterRestart = $secondCounts
        duplicatesFound = $false
    }
}
finally {
    if ($null -ne $backend) {
        Stop-SmokeBackend -RunningBackend $backend | Out-Null
    }

    $developmentAfterFinally = Get-FileSnapshot -Path $developmentDatabase
    if (-not (Test-SameSnapshot -Before $developmentBefore -After $developmentAfterFinally)) {
        throw "O banco local de desenvolvimento foi alterado durante o smoke test."
    }

    if (-not $KeepArtifacts) {
        $safePrefix = $smokeRoot.TrimEnd([System.IO.Path]::DirectorySeparatorChar) `
            + [System.IO.Path]::DirectorySeparatorChar
        if (-not $workDirectory.StartsWith($safePrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
            throw "Diretório temporário fora da raiz segura: $workDirectory"
        }
        if (Test-Path -LiteralPath $workDirectory) {
            Remove-Item -LiteralPath $workDirectory -Recurse -Force
        }
        $databaseRemoved = -not (Test-Path -LiteralPath $isolatedDatabase)
    }
}

$result.databaseRemovedAfterTest = $databaseRemoved
$result | ConvertTo-Json -Depth 5
