import fastify from "fastify";
import cors from "@fastify/cors";
import dotenv from "dotenv";
import path from "node:path";
import fastifyStatic from "@fastify/static";
import agentRoutes from "./routes.js";

dotenv.config();

const PORT = Number(process.env.PORT) || 8080;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

const server = fastify({
  logger: true,
});

async function start() {
  try {
    await server.register(fastifyStatic, {
      root: path.join(process.cwd(), "dist"),
      prefix: "/",
    });

    await server.register(cors, {
      origin: [CLIENT_ORIGIN],
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"],
      credentials: true,
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "Accept",
        "Origin",
        "X-Requested-With",
      ],
      exposedHeaders: ["*"],
      maxAge: 86400,
    });

    await server.register(agentRoutes, { prefix: "/api" });

    server.setNotFoundHandler((request, reply) => {
      return reply.sendFile("index.html");
    });

    await server.listen({ port: PORT });
    console.log(`Server running at http://localhost:${PORT}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

start();
