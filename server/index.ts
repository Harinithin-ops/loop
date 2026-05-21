import express from 'express';
import cors from 'cors';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';
import http from 'http';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/use/ws';

import { typeDefs } from './graphql/schema';
import { resolvers } from './graphql/resolvers';

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);

  // Create the executable schema for both HTTP and WebSocket
  const schema = makeExecutableSchema({ typeDefs, resolvers });

  // Setup WebSocket server for subscriptions
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql',
  });
  const serverCleanup = useServer({ schema }, wsServer);

  // Setup Apollo Server
  const server = new ApolloServer({
    schema,
    plugins: [
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await serverCleanup.dispose();
            },
          };
        },
      },
    ],
  });

  await server.start();

  app.use(cors({
    origin: true, // Allow all origins for multi-user deployment (restrict in production as needed)
    credentials: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }));
  app.use(express.json({ limit: "10mb" }));
  
  // Register Apollo Server middleware for Express 5
  app.use('/graphql', expressMiddleware(server, {
    context: async ({ req }) => ({
      // Pass auth headers into context so resolvers can identify users
      authToken: req.headers.authorization || null,
    }),
  }));

  // Use a different port if 4000 is taken, but stick to 4000 as default
  const PORT = parseInt(process.env.PORT || "4000", 10);
  const HOST = process.env.HOST || "0.0.0.0"; // Bind to all interfaces for multi-user deployment
  
  httpServer.listen(PORT, HOST, () => {
    console.log(`🚀 Loop AI Server ready at http://${HOST}:${PORT}/graphql`);
    console.log(`🚀 Subscriptions ready at ws://${HOST}:${PORT}/graphql`);
    console.log(`📡 Accepting connections from all network interfaces`);
  });
}

startServer().catch((err) => {
  console.error('Error starting server:', err);
});
