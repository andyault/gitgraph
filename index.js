const express = require('express');
const fs = require('fs');
const util = require('util');
const path = require('path');
const cheerio = require('cheerio');

//
const app = express();

const readFilePromise = util.promisify(fs.readFile);
const htmlPromise = readFilePromise(path.join(__dirname, 'index.html'), 'utf8');

app.get('/favicon.ico', (req, res) => res.send(''));

app.get('/:graph', (req, res, next) => {
  const filePath = path.join(__dirname, 'graphs', req.params.graph + '.js');

  if (!fs.existsSync(filePath)) return next();

  const promises = [htmlPromise, readFilePromise(filePath, 'utf8')];

  Promise.all(promises)
    .then(([html, graphjs]) => {
      const $ = cheerio.load(html);
      const script = `<script>${graphjs}</script>`;

      $(script).insertBefore('#init');

      const ret = $.html();
      res.send(ret);
    })
    .catch(error => {
      console.error(error);
      res.status(500).json(error);
    });
});

app.all('*', (req, res) => res.status(404).send('404'));

//
const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
