import https from 'https';
const apiKey = "eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjU0MjY1MzMxNSwiYWFpIjoxMSwidWlkIjo2MzE1NjM4MSwiaWFkIjoiMjAyNS0wNy0yNFQwNjo1NTo0OS4wMDBaIiwicGVyIjoibWU6d3JpdGUiLCJhY3RpZCI6MjQzMTc3MTIsInJnbiI6ImV1YzEifQ.zbuLE1JfiQuWVdMIvFVPPC06HqfW0Q6qDZ8dAmTn-H8";

const data = JSON.stringify({
  query: `query { boards(ids: 5085312780) { groups { id title } columns { id title type } } }`
});

const options = {
  hostname: 'api.monday.com',
  path: '/v2',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': apiKey,
    'API-Version': '2024-01'
  }
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => console.log(JSON.stringify(JSON.parse(body), null, 2)));
});
req.write(data);
req.end();
