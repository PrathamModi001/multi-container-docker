const keys = require('./keys');

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();

// Allow cross-origin requests
app.use(cors());
// Parse incoming requests from React app
app.use(bodyParser.json());

// Postgres client setup
const { Pool } = require('pg');
const pgClient = new Pool({
    user: keys.pgUser,
    host: keys.pgHost,
    database: keys.pgDatabase,
    password: keys.pgPassword,
    port: keys.pgPort,
    ssl:
        process.env.NODE_ENV !== 'production'
            ? false
            : { rejectUnauthorized: false },
});

pgClient.on("connect", (client) => {
    client
        .query("CREATE TABLE IF NOT EXISTS values (number INT)")
        .catch((err) => console.error(err));
});

// Redis client setup
const redis = require('redis');
const redisClient = redis.createClient({
    host: keys.redisHost,
    port: keys.redisPort,

    // If we ever lose connection to Redis, try to reconnect every 1 second
    retry_strategy: () => 1000
});

// We need to duplicate the connection because according to the Redis docs, if we ever have a client that is listening or publishing information, we have to make sure that it is not used for other purposes. So we have to make a duplicate connection.
const redisPublisher = redisClient.duplicate();

// Express route handlers

// Get all values from Postgres
app.get('/', (req, res) => {
    res.send('Hi');
});

// Get all values from Postgres
app.get('/values/all', async (req, res) => {
    const values = await pgClient.query('SELECT * from values');
    res.send(values.rows);
});

// Get all values from Redis
app.get('/values/current', async (req, res) => {
    redisClient.hgetall('values', (err, values) => {
        res.send(values);
    }
    );
});

// This is the actual Fibonacci calculation. It's a recursive function that takes in an index and returns the Fibonacci value at that index.
app.get('/values', async (req, res) => {
    const index = req.body.index;

    // If the index is greater than 40, return an error
    if (parseInt(index) > 40) {
        return res.status(422).send('Index too high');
    }

    // Insert the index into Redis
    redisClient.hset('values', index, 'Nothing yet!');
    // Publish an insert event to the worker
    redisPublisher.publish('insert', index);
    // Insert the index into Postgres
    pgClient.query('INSERT INTO values(number) VALUES($1)', [index]);

    res.send({ working: true });
}
);

// Listen on port 5000
app.listen(5000, err => {
    console.log('Listening');
}
);
