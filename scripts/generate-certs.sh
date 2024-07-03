#!/usr/bin/env bash

ROOT_DIR=$(git rev-parse --show-toplevel)

# Load .env values into the environment
set -o allexport
. "$ROOT_DIR/.env"
set +o allexport

openssl req -x509 -newkey rsa:4096 -keyout $SSL_KEY_FILE -out $SSL_CRT_FILE -sha256 -days 1826 -nodes \
  -subj "/CN=localhost/O=Bitwarden Contributing Docs Local Development" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"

chmod +rw $SSL_CRT_FILE
chmod +rw $SSL_KEY_FILE

printf "Certificate generated! When prompted, enter your password to update your system's secure store with the Certificate Authority.\n\n"
printf "Alternatively, you can manually add it with:\n"

# Mac OSX
if [[ "$OSTYPE" == "darwin"* ]]; then
    printf "\e[30m\e[44m sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain $SSL_CRT_FILE \e[0m\n"

    sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain ssl.crt
# If not Mac OS, assume *nix
else
    printf "\e[30m\e[44m sudo cp $SSL_CRT_FILE /usr/local/share/ca-certificates/ && sudo update-ca-certificates \e[0m\n\n"
    printf "Important Note! Chromium doesn't use 'ca-certificates' on *nix. Instead it uses nssdb for cert storage, and depending on your configuration, may be in the shared system store at '\$HOME/.pki/nssdb', in Chromium's local snap store (e.g. '\$HOME/snap/chromium/current/.pki/nssdb'), or elsewhere. You will need to install the appropriate binary for your distro to run 'certutil -d sql:\$CHROMIUM_SECURE_STORE -A -t "CP,CP," -n DocsLocalDevelopmentSSL -i ./$SSL_CRT_FILE' from the project root."

    sudo cp $SSL_CRT_FILE /usr/local/share/ca-certificates/
    sudo update-ca-certificates
fi
