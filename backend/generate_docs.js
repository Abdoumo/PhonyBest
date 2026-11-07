const fs = require('fs');

const openapi = JSON.parse(fs.readFileSync('openapi.json', 'utf8'));

let md = `# Flexy GSM Backend API Documentation\n\n`;
md += `**Version:** ${openapi.info.version}\n`;
md += `**Description:** ${openapi.info.description || 'Flexy GSM Platform Backend API'}\n\n`;

md += `## Table of Contents\n`;

const paths = openapi.paths;
const groups = {};

// Group paths by their first URL segment
for (const [path, methods] of Object.entries(paths)) {
  const segment = path.split('/')[3] || path.split('/')[2] || 'misc'; // /api/v1/group/...
  if (!groups[segment]) groups[segment] = [];
  groups[segment].push({ path, methods });
}

for (const group of Object.keys(groups)) {
  md += `- [${group.toUpperCase()}](#${group})\n`;
}

md += `\n---\n\n`;

for (const [group, endpoints] of Object.entries(groups)) {
  md += `## ${group.toUpperCase()}\n\n`;
  
  for (const endpoint of endpoints) {
    const { path, methods } = endpoint;
    for (const [method, details] of Object.entries(methods)) {
      md += `### ${method.toUpperCase()} \`${path}\`\n\n`;
      if (details.summary) md += `**Summary:** ${details.summary}\n\n`;
      if (details.description) md += `**Description:** ${details.description}\n\n`;
      
      if (details.parameters && details.parameters.length > 0) {
        md += `**Parameters:**\n`;
        md += `| Name | In | Required | Type |\n`;
        md += `|------|----|----------|------|\n`;
        for (const p of details.parameters) {
          const type = p.schema ? p.schema.type : p.type;
          md += `| ${p.name} | ${p.in} | ${p.required ? 'Yes' : 'No'} | ${type} |\n`;
        }
        md += `\n`;
      }
      
      if (details.requestBody && details.requestBody.content && details.requestBody.content['application/json']) {
        md += `**Request Body (application/json):**\n`;
        const schema = details.requestBody.content['application/json'].schema;
        if (schema.properties) {
          md += `| Property | Type | Description |\n`;
          md += `|----------|------|-------------|\n`;
          for (const [propName, propInfo] of Object.entries(schema.properties)) {
            md += `| ${propName} | ${propInfo.type} | ${propInfo.description || ''} |\n`;
          }
        }
        md += `\n`;
      }
      
      if (details.responses) {
        md += `**Responses:**\n`;
        for (const [code, response] of Object.entries(details.responses)) {
          md += `- **${code}**: ${response.description}\n`;
        }
        md += `\n`;
      }
      
      if (details.security) {
        md += `**Security:** Requires Authentication\n\n`;
      }
      md += `---\n\n`;
    }
  }
}

fs.writeFileSync('BACKEND_API_DOCS.md', md);
console.log('Successfully generated BACKEND_API_DOCS.md');
