# Remove all existing watermarks and reapply a single one
Get-ChildItem -Path F:\Projects\SphereConnect -Recurse -Include *.py,*.sql,*.md -Exclude docs/ | ForEach-Object {
    $content = Get-Content $_.FullName
    # Define watermark based on file type
    if ($_.Extension -eq '.sql') {
        $header = "-- Copyright 2025 Federico Arce. All Rights Reserved.`n-- Confidential - Do Not Distribute Without Permission.`n`n"
        $pattern = '-- Copyright 2025 Federico Arce\. All Rights Reserved\.\s*-- Confidential - Do Not Distribute Without Permission\.'
    } else {
        $header = "# Copyright 2025 Federico Arce. All Rights Reserved.`n# Confidential - Do Not Distribute Without Permission.`n`n"
        $pattern = '# Copyright 2025 Federico Arce\. All Rights Reserved\.\s*# Confidential - Do Not Distribute Without Permission\.'
    }
    # Remove all instances of watermark (fixed to filter array of lines)
    $clean_content = $content | Where-Object { $_ -notmatch $pattern }
    # Add single watermark at top
    Set-Content $_.FullName -Value ($header + ($clean_content -join "`n"))
}

# Verify no duplicates remain (fixed parameter name)
Select-String -Path F:\Projects\SphereConnect\* -Pattern "Copyright 2025 Federico Arce" -Recurse -Exclude docs/ | Group-Object Filename | Where-Object { $_.Count -gt 1 }