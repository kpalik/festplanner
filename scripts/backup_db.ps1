# Supabase Backup Script
# Usage: ./backup_db.ps1

# Configuration
# You can hardcode your connection string here OR set it as an environment variable 'SUPABASE_DB_URL'
# Configuration
$ConfigFile = Join-Path $PSScriptRoot "backup_config.json"
$DbUrl = $null

if (Test-Path $ConfigFile) {
    try {
        $Config = Get-Content $ConfigFile | ConvertFrom-Json
        if ($Config.dbUrl -and $Config.dbUrl -ne "postgres://postgres.[YOUR-ID]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres") {
            $DbUrl = $Config.dbUrl
            Write-Host "Loaded connection string from config file." -ForegroundColor DarkGray
        }
    }
    catch {
        Write-Warning "Failed to parse backup_config.json"
    }
}

if (-not $DbUrl) {
    $DbUrl = $env:SUPABASE_DB_URL
}

if (-not $DbUrl) {
    Write-Host "Please enter your Supabase Connection String (Direct Connection/URI):" -ForegroundColor Yellow
    Write-Host "Format: postgres://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres" -ForegroundColor Gray
    Write-Host "You can find this in Supabase Dashboard -> Project Settings -> Database -> Connection string -> Direct connection" -ForegroundColor Gray
    $DbUrl = Read-Host
    
    # Offer to save
    $Save = Read-Host "Save this to backup_config.json for future use? (Y/N)"
    if ($Save -match "^[Yy]") {
        $ConfigObj = @{ dbUrl = $DbUrl }
        $ConfigObj | ConvertTo-Json | Set-Content $ConfigFile
        Write-Host "Configuration saved to $ConfigFile" -ForegroundColor Green
    }
}

# Check for pg_dump
if (-not (Get-Command pg_dump -ErrorAction SilentlyContinue)) {
    Write-Error "pg_dump is not installed or not in your PATH."
    Write-Host "Please install PostgreSQL Command Line Tools."
    Write-Host "Windows: https://www.postgresql.org/download/windows/ (Select 'Command Line Tools' in the installer)"
    # Try to find it in common paths
    $CommonPaths = @(
        "C:\Program Files\PostgreSQL\*\bin\pg_dump.exe",
        "C:\Program Files (x86)\PostgreSQL\*\bin\pg_dump.exe",
        "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe"
    )
    $Found = Get-Item $CommonPaths -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($Found) {
        Write-Host "Found pg_dump at $($Found.FullName). Adding to PATH for this session." -ForegroundColor Green
        $Env:Path += ";$($Found.DirectoryName)"
    }
    else {
        exit 1
    }
}

# Create backups directory if not exists
$BackupDir = Join-Path $PSScriptRoot "..\backups"
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir | Out-Null
    Write-Host "Created backup directory: $BackupDir"
}

$Timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$OutputFile = Join-Path $BackupDir "supabase_backup_$Timestamp.sql"

Write-Host "Starting backup to $OutputFile..." -ForegroundColor Cyan

try {
    # Run pg_dump
    # -x: no privileges (Supabase manages roles differently)
    # --clean: include DROP commands
    # --if-exists: used with clean
    # --no-owner: skip ownership commands
    # --no-acl: skip privilege commands
    Invoke-Expression "pg_dump '$DbUrl' -f '$OutputFile' --clean --if-exists --no-owner --no-privileges --quote-all-identifiers"

    if ($LASTEXITCODE -eq 0) {
        Write-Host "Backup completed successfully!" -ForegroundColor Green
        Write-Host "File saved to: $OutputFile"
    }
    else {
        Write-Error "pg_dump failed with exit code $LASTEXITCODE"
    }
}
catch {
    Write-Error "An error occurred: $_"
}
