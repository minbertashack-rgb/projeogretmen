$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not $env:DJANGO_SECRET_KEY -or $env:DJANGO_SECRET_KEY.Trim() -eq "") {
  $env:DJANGO_SECRET_KEY = (python -c "import secrets; print(secrets.token_urlsafe(50))")
}
$env:DJANGO_DEBUG="1"
$env:DJANGO_ALLOWED_HOSTS="127.0.0.1,localhost"

python manage.py show_urls | findstr dashboard

