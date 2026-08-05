param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('run', 'test', 'clean', 'build', 'coverage')]
    [string]$Task
)

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$maven = Get-Command mvn -ErrorAction SilentlyContinue
if ($null -eq $maven) {
    throw 'Maven não encontrado. Instale Maven 3.9+ e confirme que o comando mvn está no PATH.'
}

[string[]]$mavenArguments = switch ($Task) {
    'run'      { @('spring-boot:run') }
    'test'     { @('test') }
    'clean'    { @('clean') }
    'build'    { @('clean', 'package', '-DskipTests=true') }
    'coverage' { @('clean', 'verify') }
}

Push-Location $projectRoot
try {
    & $maven.Source @mavenArguments
    exit $LASTEXITCODE
} finally {
    Pop-Location
}
