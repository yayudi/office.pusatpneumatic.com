const fs = require('fs');

const liveStr = fs.readFileSync('.agent/context/dpvindon_wms(structure)-live.sql', 'utf8');

function extractTables(sql) {
  const tables = {};
  const regex = /CREATE TABLE \`([^\`]+)\` \(([\s\S]*?)\) ENGINE=/g;
  let match;
  while ((match = regex.exec(sql)) !== null) {
     tables[match[1]] = match[2];
  }
  return tables;
}

const tableLive = extractTables(liveStr);
console.log('Tables in live:');
Object.keys(tableLive).forEach(t => console.log(t));
