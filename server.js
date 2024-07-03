const express = require('express');
const bodyParser = require('body-parser');
const indexRoutes = require('./routes/index');

const port = process.env.PORT || 5000;

const app = express();

app.use(bodyParser.json());

app.use('/', indexRoutes);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
