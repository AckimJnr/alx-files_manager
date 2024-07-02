const express = require('express');
const indexRoutes = require('./routes/index');

const defaultPort = 5000;

const app = express();

app.use('/', indexRoutes);

app.listen(process.env.PORT || defaultPort, () => {
  console.log(`Server is running on port ${defaultPort}`);
});
