//for each file in the graphs directory, require and map to exports
const fs = require('fs');
const path = require('path');

const indexFilename = path.basename(__filename);
const siblings = fs.readdirSync(__dirname);

for (let i = 0; i < siblings.length; i++) {
  const { base, name } = path.parse(siblings[i]);

  if (base !== indexFilename) module.exports[name] = require('./' + base);
}
