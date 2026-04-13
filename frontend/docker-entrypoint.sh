#!/bin/sh
set -e

mkdir -p /etc/nginx/ssl

# Use SERVER_IP env var; fall back to localhost for local dev
IP="${SERVER_IP:-localhost}"

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/key.pem \
  -out    /etc/nginx/ssl/cert.pem \
  -subj   "/CN=urbancare" \
  -addext "subjectAltName=IP:${IP}" \
  2>/dev/null

exec nginx -g "daemon off;"
