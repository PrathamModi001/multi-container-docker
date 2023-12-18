const keys = require('./keys');

const redis = require('redis');

const redisClient = redis.createClient({
    host: keys.redisHost,
    port: keys.redisPort,

    // If we ever lose connection to Redis, try to reconnect every 1 second
    retry_strategy: () => 1000
});

// We need to duplicate the connection because according to the Redis docs, if we ever have a client that is listening or publishing information, we have to make sure that it is not used for other purposes. So we have to make a duplicate connection.
const sub = redisClient.duplicate();

// This is the actual Fibonacci calculation. It's a recursive function that takes in an index and returns the Fibonacci value at that index.
function fib(index) {
    if (index < 2) return 1;
    return fib(index - 1) + fib(index - 2);
}

// Whenever we get a new value inserted into Redis, we're going to calculate a new Fibonacci value and insert that into a hash of values. The hash key is going to be the index that was inserted into Redis and the hash value is going to be the Fibonacci value that we calculated.
sub.on('message', (channel, message) => {
    redisClient.hset('values', message, fib(parseInt(message)));
}
);

// Whenever someone inserts a new value into Redis, we're going to get a message and we're going to run the callback function that we just defined.
sub.subscribe('insert');

