$source = "C:\Users\pauli\.gemini\antigravity\scratch\leadfinder-saas"
$destination = "C:\Users\pauli\Downloads\leadfinder-saas-full.zip"
if (Test-Path $destination) { Remove-Item $destination }
$files = Get-ChildItem -Path $source -Exclude "node_modules"
Compress-Archive -Path $files.FullName -DestinationPath $destination -Force
Write-Host "ZIP Full criado com sucesso!"