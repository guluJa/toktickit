param(
  [string]$PgBin = "C:\Program Files\PostgreSQL\17\bin"
)

$ErrorActionPreference = "Stop"
$sourceUrl = $env:DATABASE_URL
if (-not $sourceUrl) { throw "DATABASE_URL is required." }
$uri = [uri]$sourceUrl
if ($uri.AbsolutePath -ne "/toktickit_e2e" -or $uri.Host -notin @("localhost", "127.0.0.1")) {
  throw "Recovery verification is allowed only for the local toktickit_e2e database."
}
foreach ($name in @("pg_dump", "createdb", "pg_restore", "psql", "dropdb")) {
  if (-not (Test-Path -LiteralPath (Join-Path $PgBin "$name.exe"))) {
    throw "Missing PostgreSQL utility: $name.exe"
  }
}
$userInfo = $uri.UserInfo.Split(":", 2)
if ($userInfo.Count -ne 2) { throw "Database credentials are unavailable." }
$env:PGPASSWORD = [uri]::UnescapeDataString($userInfo[1])
$env:PGCLIENTENCODING = "UTF8"
$pgUser = [uri]::UnescapeDataString($userInfo[0])
$port = if ($uri.Port -gt 0) { [string]$uri.Port } else { "5432" }
$connection = @("-h", $uri.Host, "-p", $port, "-U", $pgUser)
$scratch = "toktickit_lab4_recovery_$([guid]::NewGuid().ToString('N').Substring(0, 8))"
$dump = Join-Path $env:TEMP "lab4-recovery-$([guid]::NewGuid().ToString('N')).dump"
$scratchCreated = $false

function Invoke-Pg([string]$name, [string[]]$arguments) {
  $output = & (Join-Path $PgBin "$name.exe") @connection @arguments 2>&1
  if ($LASTEXITCODE -ne 0) { throw "$name failed: $($output | Out-String)" }
  return ($output | Out-String).Trim()
}

$countsSql = @'
SELECT jsonb_build_object(
  'users', (SELECT count(*) FROM "RequesterUser"),
  'tickets', (SELECT count(*) FROM "Ticket"),
  'attachments', (SELECT count(*) FROM "Attachment"),
  'comments', (SELECT count(*) FROM "Comment"),
  'internalNotes', (SELECT count(*) FROM "InternalNote"),
  'actions', (SELECT count(*) FROM "ActionTaken")
)::text;
'@
$snapshotSql = @'
SELECT jsonb_build_object(
  'users', (SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.id), '[]'::jsonb) FROM "RequesterUser" t),
  'tickets', (SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.id), '[]'::jsonb) FROM "Ticket" t),
  'attachments', (SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.id), '[]'::jsonb) FROM "Attachment" t),
  'comments', (SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.id), '[]'::jsonb) FROM "Comment" t),
  'internalNotes', (SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.id), '[]'::jsonb) FROM "InternalNote" t),
  'actions', (SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.id), '[]'::jsonb) FROM "ActionTaken" t)
)::text;
'@

try {
  Invoke-Pg "pg_dump" @("-d", "toktickit_e2e", "-Fc", "-f", $dump) | Out-Null
  Write-Output "BACKUP_EXIT=0"
  Invoke-Pg "createdb" @("-T", "template0", $scratch) | Out-Null
  $scratchCreated = $true
  Write-Output "SCRATCH_CREATE_EXIT=0"
  Invoke-Pg "pg_restore" @("--no-owner", "--no-privileges", "-d", $scratch, $dump) | Out-Null
  Write-Output "RESTORE_EXIT=0"

  $sourceCounts = Invoke-Pg "psql" @("-X", "-At", "-d", "toktickit_e2e", "-c", $countsSql)
  $restoredCounts = Invoke-Pg "psql" @("-X", "-At", "-d", $scratch, "-c", $countsSql)
  $sourceSnapshot = Invoke-Pg "psql" @("-X", "-At", "-d", "toktickit_e2e", "-c", $snapshotSql)
  $restoredSnapshot = Invoke-Pg "psql" @("-X", "-At", "-d", $scratch, "-c", $snapshotSql)
  if ($sourceCounts -ne $restoredCounts -or $sourceSnapshot -ne $restoredSnapshot) {
    throw "Restored database differs from the test database."
  }
  Write-Output "SOURCE_COUNTS=$sourceCounts"
  Write-Output "RESTORED_COUNTS=$restoredCounts"
  Write-Output "ROW_SNAPSHOT_MATCH=true"
} finally {
  if ($scratchCreated -and $scratch -match '^toktickit_lab4_recovery_[0-9a-f]{8}$') {
    Invoke-Pg "dropdb" @($scratch) | Out-Null
    Write-Output "SCRATCH_DROP_EXIT=0"
  }
  if (Test-Path -LiteralPath $dump) {
    Remove-Item -LiteralPath $dump -Force
    Write-Output "TEMP_DUMP_REMOVED=true"
  }
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}
