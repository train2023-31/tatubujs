# PowerShell script to generate SSL certificate for localhost development on Windows

Write-Host "Generating SSL certificate for localhost..." -ForegroundColor Green

# Check if running as Administrator (required for certificate generation on Windows)
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "Warning: Not running as Administrator. Certificate generation may fail." -ForegroundColor Yellow
    Write-Host "For best results, run PowerShell as Administrator." -ForegroundColor Yellow
}

# Method 1: Using PowerShell New-SelfSignedCertificate (Windows 10/11)
try {
    Write-Host "Attempting to generate certificate using New-SelfSignedCertificate..." -ForegroundColor Cyan
    
    # Generate certificate
    $cert = New-SelfSignedCertificate `
        -DnsName "localhost", "127.0.0.1" `
        -CertStoreLocation "cert:\LocalMachine\My" `
        -NotAfter (Get-Date).AddYears(1)
    
    # Export certificate
    $certPath = "cert:\LocalMachine\My\$($cert.Thumbprint)"
    Export-Certificate -Cert $certPath -FilePath "localhost.crt" | Out-Null
    
    # Export private key (requires certificate to be exportable)
    $password = ConvertTo-SecureString -String "password" -Force -AsPlainText
    Export-PfxCertificate -Cert $certPath -FilePath "localhost.pfx" -Password $password | Out-Null
    
    # Extract private key from PFX
    Write-Host "Note: For react-scripts, we'll use HTTPS=true which generates its own certificates." -ForegroundColor Yellow
    Write-Host "The Windows certificate has been created in the certificate store." -ForegroundColor Yellow
    
    Write-Host "Certificate generated successfully!" -ForegroundColor Green
    Write-Host "Certificate Thumbprint: $($cert.Thumbprint)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "However, for Create React App, the easiest way is to use:" -ForegroundColor Yellow
    Write-Host "  npm run start:https" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Or manually generate using OpenSSL (if installed):" -ForegroundColor Yellow
    Write-Host "  openssl genrsa -out localhost.key 2048" -ForegroundColor Cyan
    Write-Host "  openssl req -new -key localhost.key -out localhost.csr -subj \"/CN=localhost\"" -ForegroundColor Cyan
    Write-Host "  openssl x509 -req -days 365 -in localhost.csr -signkey localhost.key -out localhost.crt" -ForegroundColor Cyan
    
} catch {
    Write-Host "Error generating certificate: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Alternative: Install OpenSSL and run:" -ForegroundColor Yellow
    Write-Host "  openssl genrsa -out localhost.key 2048" -ForegroundColor Cyan
    Write-Host "  openssl req -new -key localhost.key -out localhost.csr -subj \"/CN=localhost\"" -ForegroundColor Cyan
    Write-Host "  openssl x509 -req -days 365 -in localhost.csr -signkey localhost.key -out localhost.crt" -ForegroundColor Cyan
}

