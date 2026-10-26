# CI-only acceptance test for the Growth OS Windows installer (disposable GitHub runner).
# Installs silently, checks shortcuts, launches the app, drives the real page through
# WebView2's debug port (adds a project), restarts, confirms the project persisted,
# records startup time / memory / installed size, then uninstalls.
param([Parameter(Mandatory)] [string] $Installer)
$ErrorActionPreference = 'Stop'
if ($env:GITHUB_ACTIONS -ne 'true') { throw 'Run only on a disposable GitHub Actions Windows runner.' }
$report = Join-Path $PWD 'ci-desktop-report.txt'
$lines = [System.Collections.Generic.List[string]]::new()
function Note([string] $s) { Write-Host "::notice title=Desktop test::$s"; $lines.Add($s) }
$installDir = Join-Path $env:LOCALAPPDATA 'Growth OS'
$dataDir = Join-Path $env:LOCALAPPDATA 'com.jprograms.growthos'
$port = 9333
$env:GROWTHOS_TEST_DEBUG_PORT = "$port"

function Invoke-Page([string] $expression) {
  $deadline = (Get-Date).AddSeconds(30)
  do {
    try { $page = Invoke-RestMethod "http://127.0.0.1:$port/json/list" -TimeoutSec 3 | Where-Object { $_.type -eq 'page' } | Select-Object -First 1 } catch { $page = $null }
    if ($page) { break }
    Start-Sleep -Milliseconds 500
  } while ((Get-Date) -lt $deadline)
  if (-not $page) { throw 'WebView2 page not reachable on the debug port' }
  $ws = [System.Net.WebSockets.ClientWebSocket]::new()
  $ct = [Threading.CancellationToken]::None
  $ws.ConnectAsync([uri]$page.webSocketDebuggerUrl, $ct).Wait()
  $msg = @{ id = 1; method = 'Runtime.evaluate'; params = @{ expression = $expression; returnByValue = $true; awaitPromise = $true } } | ConvertTo-Json -Depth 6 -Compress
  $bytes = [Text.Encoding]::UTF8.GetBytes($msg)
  $ws.SendAsync([ArraySegment[byte]]::new($bytes), 'Text', $true, $ct).Wait()
  $buffer = New-Object byte[] 65536; $sb = [Text.StringBuilder]::new()
  do {
    $r = $ws.ReceiveAsync([ArraySegment[byte]]::new($buffer), $ct).Result
    [void]$sb.Append([Text.Encoding]::UTF8.GetString($buffer, 0, $r.Count))
    $done = $r.EndOfMessage -and ($sb.ToString() -match '"id":1')
  } while (-not $done)
  $ws.Dispose()
  $resp = $sb.ToString() | ConvertFrom-Json
  if ($resp.result.exceptionDetails) { throw "Page script error: $($resp.result.exceptionDetails.text)" }
  return $resp.result.result.value
}
function Wait-Page([string] $expression, [string] $expect, [int] $seconds = 30) {
  $deadline = (Get-Date).AddSeconds($seconds); $last = $null
  do { try { $last = Invoke-Page $expression } catch { $last = "error: $($_.Exception.Message)" }; if ("$last" -eq $expect) { return }; Start-Sleep -Milliseconds 500 } while ((Get-Date) -lt $deadline)
  throw "Page check '$expression' expected '$expect' but got '$last'"
}
function Start-App {
  $exe = Get-ChildItem $installDir -Filter 'GrowthOS.exe' -Recurse | Select-Object -First 1
  if (-not $exe) { throw "GrowthOS.exe not found under $installDir" }
  $sw = [Diagnostics.Stopwatch]::StartNew()
  $p = Start-Process -FilePath $exe.FullName -PassThru
  do { Start-Sleep -Milliseconds 100; $p.Refresh() } while ($p.MainWindowHandle -eq 0 -and -not $p.HasExited -and $sw.ElapsedMilliseconds -lt 30000)
  if ($p.HasExited) { throw "App exited during startup (code $($p.ExitCode))" }
  if ($p.MainWindowHandle -eq 0) { throw 'App window did not appear within 30 s' }
  return @{ Process = $p; WindowMs = $sw.ElapsedMilliseconds; Exe = $exe.FullName }
}
function Stop-App($app) {
  Stop-Process -Id $app.Process.Id -Force -ErrorAction SilentlyContinue
  Get-CimInstance Win32_Process -Filter "Name='msedgewebview2.exe'" | Where-Object { $_.CommandLine -like '*com.jprograms.growthos*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
  Start-Sleep -Seconds 2
}

try {
  Note "Installer: $(Split-Path $Installer -Leaf) ($([math]::Round((Get-Item $Installer).Length / 1MB, 2)) MB)"
  Write-Host '1/6 Silent install (current user, no admin)'
  $i = Start-Process -FilePath $Installer -ArgumentList '/S' -Wait -PassThru
  if ($i.ExitCode -ne 0) { throw "Installer exit code $($i.ExitCode)" }
  $exePath = Join-Path $installDir 'GrowthOS.exe'
  if (-not (Test-Path $exePath)) { throw "Installed app missing at $exePath" }
  $sizeMb = [math]::Round(((Get-ChildItem $installDir -Recurse -File | Measure-Object Length -Sum).Sum) / 1MB, 2)
  Note "Installed size: $sizeMb MB"
  $startLnk = Get-ChildItem ([Environment]::GetFolderPath('Programs')) -Filter 'Growth OS.lnk' -Recurse | Select-Object -First 1
  $deskLnk = Join-Path ([Environment]::GetFolderPath('DesktopDirectory')) 'Growth OS.lnk'
  if (-not $startLnk) { throw 'Start menu shortcut missing' }
  if (-not (Test-Path $deskLnk)) { throw 'Desktop shortcut missing' }
  Note 'Shortcuts: Start menu and Desktop present'

  Write-Host '2/6 First launch: window opens and the dashboard renders'
  $app = Start-App
  Note "Window visible after: $($app.WindowMs) ms"
  Wait-Page "document.title" 'J-Programs | Growth OS'
  Wait-Page "document.getElementById('count').textContent" '10'
  Wait-Page "document.getElementById('cards').querySelectorAll('article').length" '10'
  Note 'Dashboard rendered: 10 seed projects, scripts allowed by the app CSP'

  Write-Host '3/6 Add a project through the real form'
  Invoke-Page "(function(){var n=document.getElementById('new-name');n.value='CI Desktop Check ✅';document.getElementById('add-form').requestSubmit();return document.getElementById('count').textContent;})()" | Out-Null
  Wait-Page "document.getElementById('count').textContent" '11'
  Wait-Page "document.getElementById('weekly-review') !== null && document.getElementById('backup') !== null" 'True'
  Start-Sleep -Seconds 4
  $mem = (Get-Process -Id $app.Process.Id).WorkingSet64
  Get-CimInstance Win32_Process -Filter "Name='msedgewebview2.exe'" | Where-Object { $_.CommandLine -like '*com.jprograms.growthos*' } | ForEach-Object { $mem += (Get-Process -Id $_.ProcessId -ErrorAction SilentlyContinue).WorkingSet64 }
  Note "Memory after load (app + its WebView2 processes): $([math]::Round($mem / 1MB, 1)) MB"
  Stop-App $app

  Write-Host '4/6 Restart: project must still be there'
  $app = Start-App
  Note "Window visible after restart: $($app.WindowMs) ms"
  Wait-Page "document.getElementById('count').textContent" '11'
  Wait-Page "[...document.querySelectorAll('#cards h3')].some(function(h){return h.textContent==='CI Desktop Check ✅'})" 'True'
  Note 'Persistence: added project survived restart'
  Stop-App $app

  Write-Host '5/6 Silent uninstall'
  $un = Get-ChildItem $installDir -Filter 'uninstall*.exe' | Select-Object -First 1
  if (-not $un) { throw 'Uninstaller missing' }
  Start-Process -FilePath $un.FullName -ArgumentList '/S' -Wait | Out-Null
  $deadline = (Get-Date).AddSeconds(90)
  while ((Test-Path $exePath) -and (Get-Date) -lt $deadline) { Start-Sleep -Seconds 2 }
  if (Test-Path $exePath) { throw 'Uninstall left the app behind' }
  if (Test-Path $deskLnk) { throw 'Uninstall left the desktop shortcut' }
  Note 'Uninstall: app and shortcuts removed'

  Write-Host '6/6 Data behaviour after uninstall'
  if (Test-Path $dataDir) { Note "Saved projects kept after uninstall (in $dataDir); reinstalling restores them" } else { Note 'Saved projects removed by uninstall' }
  $lines.Insert(0, 'PASS: install, shortcuts, launch, dashboard render, add project, restart persistence, uninstall.')
  $lines.Add('Not covered: real user PC, keyboard/high-DPI review, offline CI-monitor behaviour, download prompts.')
} catch {
  $lines.Insert(0, "FAIL: $($_.Exception.Message)")
  Write-Host "::error title=Desktop test failed::$($_.Exception.Message) (line $($_.InvocationInfo.ScriptLineNumber))"
  $found = Get-ChildItem $env:LOCALAPPDATA, ([Environment]::GetFolderPath('DesktopDirectory')), ([Environment]::GetFolderPath('Programs')) -Recurse -Depth 2 -ErrorAction SilentlyContinue | Where-Object { $_.Name -like '*Growth*' } | ForEach-Object { $_.FullName }
  Write-Host "::notice title=Desktop test diagnostics::Files named Growth*: $($found -join ' | ')"
  throw
} finally {
  $lines | Set-Content $report -Encoding utf8
  $lines | ForEach-Object { Add-Content -Path $env:GITHUB_STEP_SUMMARY -Value "- $_" }
}
