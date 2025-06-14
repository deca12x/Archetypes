const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// Serve static files from the .next directory
app.use(express.static(path.join(__dirname, '.next/static')));
app.use(express.static(path.join(__dirname, 'public')));

// Handle specific routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '.next/server/app/page.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '.next/server/app/login/page.html'));
});

app.get('/game', (req, res) => {
  res.sendFile(path.join(__dirname, '.next/server/app/game/page.html'));
});

// Handle 404
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '.next/server/app/_not-found/page.html'));
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
  console.log(`Available routes:`);
  console.log(`- http://localhost:${port}/`);
  console.log(`- http://localhost:${port}/login`);
  console.log(`- http://localhost:${port}/game`);
}); 