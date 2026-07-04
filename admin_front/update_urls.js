import fs from 'fs';
import path from 'path';

// Define the files that need to be updated
const filesToUpdate = [
  'src/pages/ModemGridPage.jsx',
  'src/layouts/Layout.jsx',
  'src/components/UsbSessionGuard.jsx',
  'src/api/axios.js'
];

// Define the replacement logic
const replacements = [
  {
    // Replace API base URLs
    regex: /['"`]http:\/\/localhost:8000\/api\/v1['"`]/g,
    replace: "`${import.meta.env.VITE_BACKEND_URL}/api/v1`"
  },
  {
    // Replace Socket.io connections
    regex: /socketIO\(['"`]http:\/\/localhost:8000['"`]/g,
    replace: "socketIO(import.meta.env.VITE_BACKEND_URL"
  },
  {
    // General fallback replacement (if you want to replace any other localhost:8000)
    regex: /['"`]http:\/\/localhost:8000['"`]/g,
    replace: "import.meta.env.VITE_BACKEND_URL"
  }
];

let updatedCount = 0;

filesToUpdate.forEach(filePath => {
  const absolutePath = path.resolve(filePath);
  
  if (fs.existsSync(absolutePath)) {
    let content = fs.readFileSync(absolutePath, 'utf-8');
    let hasChanges = false;

    replacements.forEach(({ regex, replace }) => {
      if (regex.test(content)) {
        content = content.replace(regex, replace);
        hasChanges = true;
      }
    });

    if (hasChanges) {
      fs.writeFileSync(absolutePath, content, 'utf-8');
      console.log(`✅ Updated ${filePath}`);
      updatedCount++;
    } else {
      console.log(`⚡ No changes needed in ${filePath}`);
    }
  } else {
    console.error(`❌ File not found: ${filePath}`);
  }
});

console.log(`\n🎉 Done! Updated ${updatedCount} files.`);
console.log(`\n⚠️ REMINDER FOR VITE:`);
console.log(`Environment variables in Vite are baked in at BUILD time.`);
console.log(`Before running 'npm run build' on your server, make sure to create a .env file with:`);
console.log(`VITE_BACKEND_URL=http://<YOUR_SERVER_IP>:8000`);
