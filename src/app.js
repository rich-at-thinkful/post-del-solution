require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const uuid = require('uuid/v4');

const { NODE_ENV, API_TOKEN } = require('./config');
const jsonParser = express.json();

const app = express();

const morganOption = (NODE_ENV === 'production')
  ? 'common'
  : 'dev';

app.use(morgan(morganOption));
app.use(cors());
app.use(helmet());

function validateBearerToken(req, res, next) {
  const authVal = req.get('Authorization') || '';
  if (!authVal.startsWith('Bearer ')) {
    return res.status(400).json({ error: 'Missing or malformed Authorization header' });
  }

  const token = authVal.split(' ')[1];
  if (token !== API_TOKEN) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  next();
}

app.get('/', (req, res) => {
  res.send('Hello, world!');
});

const addresses = [];

app.get('/address', (req, res) => {
  res.json(addresses);
});

app.post('/address', validateBearerToken, jsonParser, (req, res) => {
  const requiredFields = ['firstName','lastName','address1','city','state','zip'];
  for (const field of requiredFields) {
    if (!req.body[field]) {
      return res.status(400).json({ error: `Missing required field "${field}"`});
    }
  }

  const { firstName, lastName, address1, address2, city, state, zip } = req.body;

  if (state.length !== 2) {
    return res.status(400).json({ error: 'Field "state" must be two characters length' });
  }

  const zipAsNum = Number(zip);
  if (Number.isNaN(zipAsNum) || zipAsNum < 10000 || zipAsNum > 99999 ) {
    return res.status(400).json({
      error: 'Field "zip" must be exactly 5 digit number'
    });
  }

  const newAddress = {
    id: uuid(),
    firstName,
    lastName,
    address1,
    address2,
    city,
    state,
    zip,
  };

  addresses.push(newAddress);
  res.json(newAddress);
});

app.delete('/address/:id', validateBearerToken, (req, res) => {
  const addressIndex = addresses.findIndex(a => a.id === req.params.id);

  if (addressIndex === -1) {
    return res.status(404).json({ error: 'Address not found' });
  }

  addresses.splice(addressIndex, 1);
  res.status(204).json({});
});

app.use(function errorHandler(error, req, res, next) {
  let response;
  if (NODE_ENV === 'production') {
    response = { error: { message: 'server error ' }};
  } else {
    console.error(error);
    response = { message: error.message, error };
  }
  res.status(500).json(response);
});

module.exports = app;
