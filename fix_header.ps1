# Fix the header file
 = Get-Content 'components/layout/header.tsx' -Raw
 =  -replace 'router.push\(/products\?search=\)', 'router.push(/products?search= + encodeURIComponent(searchQuery.trim()))'
Set-Content 'components/layout/header.tsx' -Value  -NoNewline
