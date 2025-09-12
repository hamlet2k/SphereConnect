# Remove all instances of watermarks from .py, .sql, .md files (excluding docs/)
Get-ChildItem -Path F:\Projects\SphereConnect -Recurse -Include *.py,*.sql,*.md -Exclude docs/ | ForEach-Object {
    $content = Get-Content $_.FullName
    # Patterns for both # and -- watermarks
    $patterns = @(
        '# Copyright 2025 Federico Arce\. All Rights Reserved\.\s*# Confidential - Do Not Distribute Without Permission\.',
        '-- Copyright 2025 Federico Arce\. All Rights Reserved\.\s*-- Confidential - Do Not Distribute Without Permission\.'
    )
    # Remove all watermark lines
    $clean_content = $content | Where-Object { $line = $_; -not ($patterns | ForEach-Object { $line -match $_ }) }
    # Write back cleaned content
    Set-Content $_.FullName -Value ($clean_content -join "`n")
}