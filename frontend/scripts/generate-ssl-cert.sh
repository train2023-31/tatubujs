#!/bin/bash
# Generate SSL certificate for localhost development

# Check if OpenSSL is installed
if ! command -v openssl &> /dev/null; then
    echo "OpenSSL is not installed. Please install it first."
    echo "On Windows, you can install it via:"
    echo "  - Git Bash (includes OpenSSL)"
    echo "  - Chocolatey: choco install openssl"
    echo "  - WSL: sudo apt-get install openssl"
    exit 1
fi

# Generate private key
openssl genrsa -out localhost.key 2048

# Generate certificate signing request
openssl req -new -key localhost.key -out localhost.csr -subj "/CN=localhost"

# Generate self-signed certificate (valid for 365 days)
openssl x509 -req -days 365 -in localhost.csr -signkey localhost.key -out localhost.crt

# Remove CSR file (not needed)
rm localhost.csr

echo "SSL certificates generated successfully!"
echo "Files created:"
echo "  - localhost.crt"
echo "  - localhost.key"
echo ""
echo "Note: You may need to trust the certificate in your browser."
echo "For Chrome/Edge: Import localhost.crt in Certificate Manager"

