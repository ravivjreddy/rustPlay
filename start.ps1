$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$vsDevCmd = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\2022\BuildTools\Common7\Tools\VsDevCmd.bat"

if (Test-Path $vsDevCmd) {
    $rustCmd = "cmd /c `"`"$vsDevCmd`" -arch=amd64 >nul && cd /d '$root\auth-api' && cargo run`""
} else {
    $rustCmd = "cd '$root\auth-api'; cargo run"
}

Start-Process powershell -ArgumentList "-NoExit", "-Command", $rustCmd
Start-Sleep -Seconds 3
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\web'; npm install; npm start"

Write-Host "Starting Rust auth API (port 8080) and Node.js web app (port 3000)..."
Write-Host "Open http://127.0.0.1:3000 when both servers are ready."
Write-Host "Demo login: demo / hello123"
