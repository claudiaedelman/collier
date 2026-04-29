$ErrorActionPreference = 'Stop'

$csvPath = 'c:\Users\claudede\Downloads\wc-product-export-29-4-2026-1777446609387.csv'
$outPath = 'd:\collier\assets\js\wordpress-products.js'
$rows = Import-Csv $csvPath -Encoding UTF8

function Clean-Text([string]$text) {
  if ([string]::IsNullOrWhiteSpace($text)) { return '' }
  $t = $text -replace '<[^>]+>', ' '
  $t = $t -replace '&nbsp;', ' '
  $t = $t -replace '&quot;', '"'
  $t = $t -replace '&amp;', '&'
  $t = $t -replace '\\n', ' '
  $t = $t -replace '\s+', ' '
  return $t.Trim()
}

function Escape-Js([string]$text) {
  if ($null -eq $text) { return '' }
  return ($text.Replace('\\', '\\\\').Replace('"', '\\"'))
}

function Map-Category([string]$categoryText, [string]$typeText) {
  $categoryPart = if ($null -eq $categoryText) { '' } else { $categoryText }
  $typePart = if ($null -eq $typeText) { '' } else { $typeText }
  $src = ($categoryPart + ' ' + $typePart).ToLowerInvariant()

  if (
    $src.Contains('booking') -or $src.Contains('gift-card') -or $src.Contains('appointment')
  ) { return 'appointments' }
  if ($src.Contains('ring')) { return 'rings' }
  if ($src.Contains('necklace')) { return 'necklaces' }
  if ($src.Contains('bracelet')) { return 'bracelets' }
  if (
    $src.Contains('earring') -or $src.Contains('piercing')
  ) { return 'earrings' }
  return 'earrings'
}

$baseRows = $rows | Where-Object { $_.סוג -notmatch 'variation' -and $_.פורסם -eq '1' }
$enByGroup = @{}
$baseRows | Where-Object { $_.שפה -eq 'en' } | ForEach-Object {
  if ($_."קבוצת תרגום") { $enByGroup[$_."קבוצת תרגום"] = $_ }
}

$heRows = $baseRows | Where-Object { $_.שפה -eq 'he' }
$builder = New-Object System.Text.StringBuilder
[void]$builder.AppendLine('const WORDPRESS_PRODUCTS = [')

$id = 100
$index = 0
foreach ($he in $heRows) {
  $group = $he."קבוצת תרגום"
  $en = $null
  if ($group -and $enByGroup.ContainsKey($group)) { $en = $enByGroup[$group] }

  $nameHe = Clean-Text $he.שם
  $nameEn = if ($en) { Clean-Text $en.שם } else { $nameHe }

  $descHe = Clean-Text ($(if ($he.'תיאור קצר') { $he.'תיאור קצר' } else { $he.תיאור }))
  $descEn = if ($en) { Clean-Text ($(if ($en.'תיאור קצר') { $en.'תיאור קצר' } else { $en.תיאור })) } else { $descHe }
  if ($descHe.Length -gt 260) { $descHe = $descHe.Substring(0, 260).Trim() + '...' }
  if ($descEn.Length -gt 260) { $descEn = $descEn.Substring(0, 260).Trim() + '...' }

  $images = [string]$he.תמונות
  $image = ''
  if ($images) { $image = ($images -split ',')[0].Trim() }

  $priceRaw = if ($he.'מחיר מבצע') { $he.'מחיר מבצע' } else { $he.'מחיר רגיל' }
  $price = 0.0
  if ($priceRaw) { [void][double]::TryParse(($priceRaw -replace '[^0-9\.]', ''), [ref]$price) }
  $priceInt = [int][Math]::Round($price)

  $categorySource = if ($en -and $en.קטגוריות) { [string]$en.קטגוריות } else { [string]$he.קטגוריות }
  $typeSource = if ($en -and $en.סוג) { [string]$en.סוג } else { [string]$he.סוג }
  $cat = Map-Category -categoryText $categorySource -typeText $typeSource
  $createdAt = (Get-Date '2026-01-01').AddMinutes($index).ToString('yyyy-MM-ddTHH:mm:ssZ')

  $attrParts = @()
  foreach ($k in 1..4) {
    $nameHeAttr = Clean-Text $he."שיוך $k שמות"
    if (-not $nameHeAttr) { continue }
    $valHe = Clean-Text $he."שיוך $k ערכים"
    $nameEnAttr = if ($en) { Clean-Text $en."שיוך $k שמות" } else { $nameHeAttr }
    $valEn = if ($en) { Clean-Text $en."שיוך $k ערכים" } else { $valHe }
    if (-not $valHe -and -not $valEn) { continue }

    $attrParts += ('{ name: { he: "' + (Escape-Js $nameHeAttr) + '", en: "' + (Escape-Js $nameEnAttr) + '" }, value: { he: "' + (Escape-Js $valHe) + '", en: "' + (Escape-Js $valEn) + '" } }')
  }

  $line = @"
  {
    id: "$id",
    category: "$cat",
    createdAt: "$createdAt",
    price: $priceInt,
    image: "$(Escape-Js $image)",
    name: { he: "$(Escape-Js $nameHe)", en: "$(Escape-Js $nameEn)" },
    description: {
      he: "$(Escape-Js $descHe)",
      en: "$(Escape-Js $descEn)"
    },
    attributes: [$(($attrParts -join ', '))]
  },
"@
  [void]$builder.Append($line)
  $id++
  $index++
}

[void]$builder.AppendLine(']')
[void]$builder.AppendLine(';')
Set-Content -Path $outPath -Value $builder.ToString() -Encoding UTF8

Write-Output "Generated $($heRows.Count) products into $outPath"
