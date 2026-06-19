$ErrorActionPreference = 'Stop'

# Load values from server/.env
$envPath = Join-Path $PSScriptRoot 'server\.env'
$cfg = @{}
Get-Content $envPath | ForEach-Object {
  if ($_ -match '^\s*([^#][^=]*)=(.*)$') { $cfg[$matches[1].Trim()] = $matches[2].Trim() }
}

$tokenUri = "$($cfg.SF_MY_DOMAIN_URL)/services/oauth2/token"
$body = @{
  grant_type    = 'client_credentials'
  client_id     = $cfg.SF_CLIENT_ID
  client_secret = $cfg.SF_CLIENT_SECRET
}

Write-Host '=== 1) OAuth client_credentials token ==='
try {
  $tok = Invoke-RestMethod -Method Post -Uri $tokenUri -Body $body -ContentType 'application/x-www-form-urlencoded'
  Write-Host 'TOKEN OK'
  Write-Host ("  api_instance_url : " + $tok.api_instance_url)
  Write-Host ("  token_type       : " + $tok.token_type)
  Write-Host ("  access_token_len : " + $tok.access_token.Length)
} catch {
  Write-Host 'TOKEN FAILED'
  if ($_.Exception.Response) {
    Write-Host ("  HTTP " + [int]$_.Exception.Response.StatusCode)
    $sr = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    Write-Host ("  Body: " + $sr.ReadToEnd())
  } else {
    Write-Host ("  " + $_.Exception.Message)
  }
  exit 1
}

$accessToken = $tok.access_token
$apiHost = if ($cfg.SF_API_HOST) { $cfg.SF_API_HOST } else { 'https://api.salesforce.com' }

Write-Host ''
Write-Host '=== 2) Create Agent session ==='
$sessionUri = "$apiHost/einstein/ai-agent/v1/agents/$($cfg.SF_AGENT_ID)/sessions"
$sessionBody = @{
  externalSessionKey     = [guid]::NewGuid().ToString()
  instanceConfig         = @{ endpoint = $cfg.SF_MY_DOMAIN_URL }
  streamingCapabilities  = @{ chunkTypes = @('Text') }
  surfaceConfig          = @{ surfaceType = ($cfg.SF_SURFACE_TYPE) }
  bypassUser             = $true
} | ConvertTo-Json -Depth 6

$headers = @{ Authorization = "Bearer $accessToken" }
try {
  $session = Invoke-RestMethod -Method Post -Uri $sessionUri -Headers $headers -Body $sessionBody -ContentType 'application/json'
  Write-Host 'SESSION OK'
  Write-Host ("  sessionId : " + $session.sessionId)
  $script:SessionId = $session.sessionId
  if ($session.messages) {
    foreach ($m in $session.messages) { Write-Host ("  greeting  : " + $m.message) }
  }
} catch {
  Write-Host 'SESSION FAILED'
  if ($_.Exception.Response) {
    Write-Host ("  HTTP " + [int]$_.Exception.Response.StatusCode)
    $sr = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    Write-Host ("  Body: " + $sr.ReadToEnd())
  } else {
    Write-Host ("  " + $_.Exception.Message)
  }
  exit 1
}

Write-Host ''
Write-Host '=== 3) Send a test message (non-streaming) ==='
$msgUri = "$apiHost/einstein/ai-agent/v1/sessions/$($script:SessionId)/messages"
$msgBody = @{
  message = @{
    sequenceId = 1
    type       = 'Text'
    text       = 'Hello! This is a connectivity test. Please reply with a short greeting.'
  }
} | ConvertTo-Json -Depth 6

try {
  $resp = Invoke-RestMethod -Method Post -Uri $msgUri -Headers $headers -Body $msgBody -ContentType 'application/json'
  Write-Host 'MESSAGE OK'
  if ($resp.messages) {
    foreach ($m in $resp.messages) {
      if ($m.message) { Write-Host ("  agent: " + $m.message) }
    }
  } else {
    Write-Host ("  raw: " + ($resp | ConvertTo-Json -Depth 8))
  }
} catch {
  Write-Host 'MESSAGE FAILED'
  if ($_.Exception.Response) {
    Write-Host ("  HTTP " + [int]$_.Exception.Response.StatusCode)
    $sr = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    Write-Host ("  Body: " + $sr.ReadToEnd())
  } else {
    Write-Host ("  " + $_.Exception.Message)
  }
}

Write-Host ''
Write-Host '=== 4) End session ==='
$endUri = "$apiHost/einstein/ai-agent/v1/sessions/$($script:SessionId)"
try {
  Invoke-RestMethod -Method Delete -Uri $endUri -Headers (@{ Authorization = "Bearer $accessToken"; 'x-session-end-reason' = 'UserRequest' }) | Out-Null
  Write-Host 'SESSION ENDED'
} catch {
  Write-Host ('  (end session non-fatal) ' + $_.Exception.Message)
}
