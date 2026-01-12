const app = require('./app');

const PORT = 8000;

app.listen(PORT, () => {
  console.log(` API server running on port ${PORT}`);
});
