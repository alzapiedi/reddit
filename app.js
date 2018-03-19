const fs = require('fs');
const  Client = require('pg').Client;
const superagent = require('superagent');

let count = 0;
let filesDownloadStarted = 0;
let filesDownloadCompleted = 0;


const baseUrl = 'https://www.reddit.com/r/watchpeopledie/top.json?limit=100&t=all';
const client = new Client({
  database: 'reddit'
});

client.connect();

function request(after = '') {
  return superagent.get(baseUrl)
    .query({ after })
    .then(handleResponse)
}


function handleResponse(res) {
  count += res.body.data.dist;
  res.body.data.children.forEach(post => {
    const { title, url, subreddit } = post.data;
    if (url.match(/vid.me/g)) return;
    if (url.match(/imgur.com/g)) downloadImgur(post);
    if (url.match(/gfycat.com/g)) downloadGfyCat(post);
    client.query('INSERT INTO posts (title, url, subreddit) VALUES($1, $2, $3)', [title, url, subreddit])
  });
  console.log(`${count} entries processed`);
  if (count === 500) return;
  if (res.body.data.after) request(res.body.data.after);
}

function downloadImgur(post) {
  const { title, url } = post.data;
  console.log(`DOWNLOAD #${++filesDownloadStarted} STARTED`);
  const splitUrl = url.split('/');
  const imgurCode = splitUrl[splitUrl.length - 1].split('.')[0];
  const file = fs.createWriteStream(__dirname + '/files/' + imgurCode + '.gifv');
  superagent.get('https://imgur.com/download/' + imgurCode).pipe(file);

  file.on('finish', () => {
    console.log(`DOWNLOAD #${++filesDownloadCompleted} COMPLETED`);
    client.query('UPDATE posts SET localUrl = $1 WHERE title = $2 AND url = $3', [imgurCode + '.gifv', title, url]);
  });
}

function downloadGfyCat(post) {
  const { title, url } = post.data;
  console.log(`DOWNLOAD #${++filesDownloadStarted} STARTED`);
  const splitUrl = url.split('/');
  const gfyCode = splitUrl[splitUrl.length - 1];
  const file = fs.createWriteStream(__dirname + '/files/' + gfyCode + '.webm');
  superagent.get('https://giant.gfycat.com/' + gfyCode + '.webm').pipe(file);

  file.on('finish', () => {
    console.log(`DOWNLOAD #${++filesDownloadCompleted} COMPLETED`);
    client.query('UPDATE posts SET localUrl = $1 WHERE title = $2 AND url = $3', [gfyCode + '.webm', title, url]);
  });
}

request();
