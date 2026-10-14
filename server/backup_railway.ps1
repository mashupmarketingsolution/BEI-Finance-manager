$u = [Uri]$env:MYSQL_PUBLIC_URL
$cred = $u.UserInfo.Split(':', 2)
$db = $u.AbsolutePath.TrimStart('/')

& "C:\xampp\mysql\bin\mysqldump.exe" `
  --no-tablespaces `
  --single-transaction `
  --routines `
  --triggers `
  --events `
  "--host=$($u.Host)" `
  "--port=$($u.Port)" `
  "--user=$($cred[0])" `
  "--password=$($cred[1])" `
  $db |
  Out-File -Encoding utf8 "BEI_Railway_Pre_Quotation_Revision_2026-09-24.sql"

if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}
