import https from 'https';

const data = JSON.stringify({
  query: `query { boards(ids: 5085312780) { name columns { id title type } items_page(limit: 5) { items { id name column_values { id text } } } } }`
});

const options = {
  hostname: 'api.monday.com',
  path: '/v2',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjU0MjY1MzMxNSwiYWFpIjoxMSwidWlkIjo2MzE1NjM4MSwiaWFkIjoiMjAyNS0wNy0yNFQwNjo1NTo0OS4wMDBaIiwicGVyIjoibWU6d3JpdGUiLCJhY3RpZCI6MjQzMTc3MTIsInJnbiI6ImV1YzEifQ.zbuLE1JfiQuWVdMIvFVPPC06HqfW0Q6qDZ8dAmTn-H8',
    'API-Version': '2024-01'
  }
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => console.log(JSON.stringify(JSON.parse(body), null, 2)));
});

req.on('error', (e) => console.error(e));
req.write(data);
req.end();
