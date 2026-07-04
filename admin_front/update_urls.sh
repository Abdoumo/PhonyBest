#!/bin/bash

# Make sure we are in the admin_front directory
if [ ! -d "src" ]; then
  echo "❌ Error: Please run this script from inside the admin_front directory."
  exit 1
fi

echo "🔍 Updating frontend files to use environment variables..."

# 1. Update axios.js
if [ -f "src/api/axios.js" ]; then
  # Replace baseURL string with template literal
  sed -i "s|'http://localhost:8000/api/v1'|\`\${import.meta.env.VITE_BACKEND_URL}/api/v1\`|g" src/api/axios.js
  echo "✅ Updated src/api/axios.js"
fi

# 2. Update UsbSessionGuard.jsx
if [ -f "src/components/UsbSessionGuard.jsx" ]; then
  sed -i "s|'http://localhost:8000/api/v1'|\`\${import.meta.env.VITE_BACKEND_URL}/api/v1\`|g" src/components/UsbSessionGuard.jsx
  echo "✅ Updated src/components/UsbSessionGuard.jsx"
fi

# 3. Update ModemGridPage.jsx
if [ -f "src/pages/ModemGridPage.jsx" ]; then
  sed -i "s|'http://localhost:8000'|import.meta.env.VITE_BACKEND_URL|g" src/pages/ModemGridPage.jsx
  echo "✅ Updated src/pages/ModemGridPage.jsx"
fi

# 4. Update Layout.jsx
if [ -f "src/layouts/Layout.jsx" ]; then
  sed -i "s|'http://localhost:8000'|import.meta.env.VITE_BACKEND_URL|g" src/layouts/Layout.jsx
  echo "✅ Updated src/layouts/Layout.jsx"
fi

echo ""
echo "🎉 Done! URLs have been replaced."
echo "⚠️  REMINDER:"
echo "Create your .env file before building!"
echo "Run: echo \"VITE_BACKEND_URL=http://YOUR_SERVER_IP:8000\" > .env"
echo "Then run: npm install && npm run build"
