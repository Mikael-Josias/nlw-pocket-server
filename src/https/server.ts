import fastify from 'fastify';

const SERVER_PORT = 3333;

const app = fastify();

app
  .listen({
    port: SERVER_PORT,
  })
  .then(() => {
    console.log('HTTP Server running');
  });
