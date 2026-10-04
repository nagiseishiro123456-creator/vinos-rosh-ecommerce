$ErrorActionPreference = "Stop"

function Assert-Command([string]$Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "No se encontró '$Name'. Instálalo antes de continuar."
  }
}

function New-RandomHex([int]$Bytes = 32) {
  $buffer = New-Object byte[] $Bytes
  [System.Security.Cryptography.RandomNumberGenerator]::Fill($buffer)
  return ($buffer | ForEach-Object { $_.ToString("x2") }) -join ""
}

Assert-Command node
Assert-Command npm
Assert-Command docker

$envPath = Join-Path $PSScriptRoot "..\.env"
$generatedAdminPassword = $null

if (-not (Test-Path $envPath)) {
  $dbPassword = "rosh_" + (New-RandomHex 12)
  $authSecret = New-RandomHex 32
  $generatedAdminPassword = "Rosh-" + (New-RandomHex 10) + "A1"

  $envContent = @"
POSTGRES_DB="vinos_rosh"
POSTGRES_USER="vinos_rosh_dev"
POSTGRES_PASSWORD="$dbPassword"
DATABASE_URL="postgresql://vinos_rosh_dev:$dbPassword@localhost:5432/vinos_rosh?schema=public"

NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="$authSecret"
SHOW_DEMO_CATALOG="true"
NEXT_PUBLIC_WHATSAPP_PHONE=""
NEXT_PUBLIC_CONTACT_EMAIL=""
NEXT_PUBLIC_GA_ID=""
NEXT_PUBLIC_META_PIXEL_ID=""

ADMIN_EMAIL="admin@vinosrosh.local"
ADMIN_PASSWORD="$generatedAdminPassword"
ADMIN_FIRST_NAME="Administrador"
ADMIN_LAST_NAME="ROSH"

PAYMENTS_CULQI_ENABLED="false"
PAYMENTS_YAPE_MANUAL_ENABLED="true"
PAYMENTS_TRANSFER_MANUAL_ENABLED="true"
CULQI_PUBLIC_KEY=""
CULQI_SECRET_KEY=""
CULQI_WEBHOOK_SECRET=""
YAPE_PHONE=""
YAPE_QR_IMAGE_URL=""
BANK_ACCOUNT_LABEL=""
BANK_ACCOUNT_NUMBER=""

CLOUDINARY_CLOUD_NAME=""
CLOUDINARY_API_KEY=""
CLOUDINARY_API_SECRET=""

RESEND_API_KEY=""
EMAIL_FROM="Vinos ROSH <no-reply@example.com>"
"@

  Set-Content -Path $envPath -Value $envContent -Encoding UTF8
  Write-Host "[OK] Archivo .env local creado con secretos aleatorios." -ForegroundColor Green
} else {
  Write-Host "[OK] Se conservará el .env existente." -ForegroundColor Green
}

Push-Location (Join-Path $PSScriptRoot "..")
try {
  Write-Host "[1/8] Instalando dependencias..." -ForegroundColor Cyan
  npm install

  Write-Host "[2/8] Levantando PostgreSQL con Docker..." -ForegroundColor Cyan
  docker compose up -d db

  Write-Host "[3/8] Esperando a PostgreSQL..." -ForegroundColor Cyan
  $ready = $false
  for ($i = 0; $i -lt 30; $i++) {
    try {
      docker compose exec -T db sh -c 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"' | Out-Null
      if ($LASTEXITCODE -eq 0) {
        $ready = $true
        break
      }
    } catch {}
    Start-Sleep -Seconds 2
  }

  if (-not $ready) {
    throw "PostgreSQL no respondió a tiempo. Revisa 'docker compose logs db'."
  }

  Write-Host "[4/8] Formateando y validando Prisma..." -ForegroundColor Cyan
  npx prisma format
  npx prisma validate

  Write-Host "[5/8] Generando Prisma Client..." -ForegroundColor Cyan
  npx prisma generate

  Write-Host "[6/8] Aplicando migraciones..." -ForegroundColor Cyan
  npx prisma migrate dev

  Write-Host "[7/8] Creando/actualizando administrador inicial..." -ForegroundColor Cyan
  npm run db:seed

  Write-Host "[8/8] Verificando TypeScript..." -ForegroundColor Cyan
  npm run typecheck

  Write-Host ""
  Write-Host "===============================================" -ForegroundColor Green
  Write-Host "Vinos ROSH: entorno local listo." -ForegroundColor Green
  Write-Host "Inicia la app con: npm run dev" -ForegroundColor Green
  Write-Host "Prisma Studio: npm run prisma:studio" -ForegroundColor Green
  Write-Host "===============================================" -ForegroundColor Green

  if ($generatedAdminPassword) {
    Write-Host "Admin local: admin@vinosrosh.local" -ForegroundColor Yellow
    Write-Host "Password local generado: $generatedAdminPassword" -ForegroundColor Yellow
    Write-Host "Guárdalo solo para desarrollo. No lo uses en producción." -ForegroundColor Yellow
  } else {
    Write-Host "El administrador se toma de ADMIN_EMAIL / ADMIN_PASSWORD en tu .env existente." -ForegroundColor Yellow
  }
}
finally {
  Pop-Location
}
