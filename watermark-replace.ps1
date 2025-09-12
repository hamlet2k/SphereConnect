Get-ChildItem -Path F:\Projects\SphereConnect -Recurse -Include *.py,*.sql,*.md -Exclude docs/ | ForEach-Object {
    (Get-Content $_.FullName) -replace '\[Your Legal Name\]', 'Federico Arce' | Set-Content $_.FullName
}