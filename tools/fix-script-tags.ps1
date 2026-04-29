Get-ChildItem -Path . -Filter *.html | ForEach-Object {
  $content = Get-Content $_.FullName -Raw
  $from = '</script>`r`n    <script src="assets/js/data.js"></script>'
  $to = "</script>`r`n    <script src=""assets/js/data.js""></script>"
  $updated = $content.Replace($from, $to)
  if ($updated -ne $content) {
    Set-Content -Path $_.FullName -Value $updated -Encoding UTF8
  }
}
