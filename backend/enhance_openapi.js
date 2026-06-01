const fs = require('fs');
const path = require('path');

const openapiPath = path.join(__dirname, 'openapi.json');
const routesDir = path.join(__dirname, 'src', 'routes');

let openapi = JSON.parse(fs.readFileSync(openapiPath, 'utf8'));

// Convert Express paths to OpenAPI paths
function expressToOpenAPI(expressPath, filePrefix) {
    let mount = filePrefix;
    if (filePrefix === 'usbAuth') mount = 'usb-auth';
    
    let p = path.join('/', 'api/v1', mount, expressPath).replace(/\\/g, '/');
    // convert :id to {id}
    p = p.replace(/:([a-zA-Z0-9_]+)/g, '{$1}');
    return p;
}

const routeFiles = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));

for (const file of routeFiles) {
    const filePrefix = file.replace('.js', '');
    const content = fs.readFileSync(path.join(routesDir, file), 'utf8');
    
    // Check global route.use(authenticate) or authorize
    const globalAuthMatch = content.match(/router\.use\((?:authenticate|authorize\((.*?)\))\)/);
    let globalRoles = [];
    let globalAuth = false;
    
    if (content.includes('router.use(authenticate)')) {
        globalAuth = true;
    }
    
    // Match router.get('/path', authorize('ADMIN', 'GRO'), handler)
    const routeRegex = /router\.(get|post|put|delete|patch)\(['"]([^'"]+)['"]([^;]+)\)/g;
    let match;
    
    while ((match = routeRegex.exec(content)) !== null) {
        const method = match[1];
        let expressPath = match[2];
        const restOfLine = match[3];
        
        let openapiPathStr = expressToOpenAPI(expressPath, filePrefix);
        // Fallback for paths with or without trailing slash
        let openapiPathStrNoSlash = openapiPathStr.endsWith('/') && openapiPathStr.length > 1 ? openapiPathStr.slice(0, -1) : openapiPathStr;
        let openapiPathStrSlash = !openapiPathStr.endsWith('/') ? openapiPathStr + '/' : openapiPathStr;
        
        // Find auth
        let isAuth = globalAuth || restOfLine.includes('authenticate');
        let roles = [...globalRoles];
        
        const authorizeMatch = restOfLine.match(/authorize\(([^)]+)\)/);
        if (authorizeMatch) {
            isAuth = true;
            const routeRoles = authorizeMatch[1].split(',').map(r => r.trim().replace(/['"]/g, ''));
            roles.push(...routeRoles);
        }
        
        let targetOpPath = null;
        if (openapi.paths[openapiPathStrNoSlash] && openapi.paths[openapiPathStrNoSlash][method]) targetOpPath = openapiPathStrNoSlash;
        else if (openapi.paths[openapiPathStrSlash] && openapi.paths[openapiPathStrSlash][method]) targetOpPath = openapiPathStrSlash;

        // Find it in openapi
        if (targetOpPath) {
            const op = openapi.paths[targetOpPath][method];
            
            // Set tags
            op.tags = [file.replace('.js', '').toUpperCase()];
            
            // Set security
            if (isAuth) {
                op.security = [{ bearerAuth: [] }];
            }
            
            // Set description
            let desc = '';
            if (roles.length > 0) {
                desc += `**Required Roles:** ${roles.join(', ')}\n`;
            } else if (isAuth) {
                desc += `**Required Roles:** ANY AUTHENTICATED USER\n`;
            } else {
                desc += `**Required Roles:** PUBLIC\n`;
            }
            
            op.description = desc;
        } else {
            console.log(`Path not found in openapi: ${method.toUpperCase()} ${openapiPathStr}`);
        }
    }
}

fs.writeFileSync(openapiPath, JSON.stringify(openapi, null, 2));
console.log('OpenAPI updated with roles and tags successfully.');
