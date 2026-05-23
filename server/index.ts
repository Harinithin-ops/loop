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
import prisma from './graphql/utils/db';

async function autoFixRLS() {
  console.log("🛠️ Running automatic RLS policy configuration for messages table...");
  try {
    // 1. Enable RLS on messages table
    await prisma.$executeRawUnsafe(`ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;`);
    
    // 2. Drop any potentially conflicting or outdated policies
    const policies = [
      "Allow users to read their own messages",
      "Allow users to send messages",
      "Allow receivers to update messages",
      "Users can view their messages",
      "Users can send messages",
      "Receivers can mark as read",
      "Allow anyone to view messages",
      "Allow anyone to send messages",
      "Allow anyone to update messages"
    ];
    for (const p of policies) {
      try {
        await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS "${p}" ON public.messages;`);
      } catch (e) {}
    }

    // 3. Create permissive public policies for seamless cross-device chat sync
    await prisma.$executeRawUnsafe(`
      CREATE POLICY "Allow anyone to view messages"
        ON public.messages FOR SELECT
        TO public
        USING (true);
    `);
    await prisma.$executeRawUnsafe(`
      CREATE POLICY "Allow anyone to send messages"
        ON public.messages FOR INSERT
        TO public
        WITH CHECK (true);
    `);
    await prisma.$executeRawUnsafe(`
      CREATE POLICY "Allow anyone to update messages"
        ON public.messages FOR UPDATE
        TO public
        USING (true);
    `);
    console.log("✅ Automatic RLS policy configuration completed successfully!");
  } catch (error: any) {
    console.warn("⚠️ RLS policy configuration notice (Server may be offline or database not fully reachable):", error.message || error);
  }
}

async function startServer() {
  // Execute database RLS self-heal task on startup
  autoFixRLS().catch(err => console.error("RLS fix startup background error:", err));

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
