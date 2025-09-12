Get-ChildItem -Path F:\Projects\SphereConnect -Recurse -Include *.py,*.sql,*.md -Exclude docs/ | ForEach-Object {
    $content = Get-Content $_.FullName
    $header = "# Copyright 2025 Federico Arce. All Rights Reserved.`n# Confidential - Do Not Distribute Without Permission.`n`n"
    Set-Content $_.FullName -Value ($header + ($content -join "`n"))
}