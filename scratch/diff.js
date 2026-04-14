const fs = require('fs');

const schemaStr = fs.readFileSync('.agent/context/schema.sql', 'utf8');
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

const tableSchema = extractTables(schemaStr);
const tableLive = extractTables(liveStr);

console.log("Checking missing items in LIVE relative to SCHEMA...");
for (const t in tableSchema) {
  if (!tableLive[t]) {
    console.log('[ MISSING TABLE ]', t);
  } else {
    const linesSchema = tableSchema[t].split('\n').map(l => l.trim().replace(/,$/, '')).filter(l => l && !l.startsWith('PRIMARY KEY') && !l.startsWith('KEY') && !l.startsWith('UNIQUE KEY') && !l.startsWith('CONSTRAINT'));
    const linesLive = tableLive[t].split('\n').map(l => l.trim().replace(/,$/, '')).filter(l => l && !l.startsWith('PRIMARY KEY') && !l.startsWith('KEY') && !l.startsWith('UNIQUE KEY') && !l.startsWith('CONSTRAINT'));
    
    linesSchema.forEach(ls => {
      const colNameMatch = ls.match(/^\`([^\`]+)\`/);
      if (colNameMatch) {
         const colName = colNameMatch[1];
         const existsInLive = linesLive.some(ll => ll.startsWith(`\`${colName}\``));
         if (!existsInLive) {
            console.log(`[ MISSING COLUMN ] in ${t}: ${colName}`);
         }
      }
    });
  }
}
