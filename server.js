const express = require('express');
const Client = require('pg').Client;

const client = new Client({
  database: 'reddit'
});

const server = express();
client.connect();

server.set('view engine', 'ejs');
server.set('views', __dirname + '/views');

server.use('/', express.static('files'));

server.get('/', (request, response) => {
  client.query('SELECT DISTINCT subreddit from posts')
    .then(result => {
      response.render('index', { subreddits: result.rows.map(sub => sub.subreddit) });
    })
});

server.get('/files/:name', (request, response) => {
  const template = request.params.name.split('.')[1] === 'gifv' ? 'image' : 'video';
  response.render(template, { name: request.params.name });
});

server.get('/:subreddit', (request, response) => {
  client.query('SELECT * FROM posts WHERE subreddit = $1', [request.params.subreddit])
    .then(result => response.json(result.rows).end());
});

server.listen(3000);
