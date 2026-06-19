import { FastifySchema } from "fastify";

const responseFormatSchema = {
  type: ["object", "null"],
  properties: {
    name: { type: "string" },
    data: {},
  },
} as const;

const clientMessageSchema = {
  type: "object",
  required: ["id", "type", "content"],
  properties: {
    id: { type: "string" },
    type: { type: "string" },
    content: { type: "string" },
    feedbackId: { type: "string" },
    format: responseFormatSchema,
  },
} as const;

export const createSessionSchema: FastifySchema = {
  response: {
    200: {
      type: "object",
      required: ["sessionId", "messages"],
      properties: {
        sessionId: { type: "string" },
        messages: {
          type: "array",
          items: clientMessageSchema,
        },
      },
    },
  },
};

// No response schema: this route streams Server-Sent Events on the raw socket.
export const sendMessageSchema: FastifySchema = {
  body: {
    type: "object",
    required: ["sessionId", "message", "sequenceId"],
    properties: {
      sessionId: { type: "string", minLength: 1 },
      message: { type: "string", minLength: 1 },
      sequenceId: { type: "number" },
    },
  },
};

export const endSessionSchema: FastifySchema = {
  body: {
    type: "object",
    required: ["sessionId"],
    properties: {
      sessionId: { type: "string" },
    },
  },
  response: {
    200: {
      type: "object",
      properties: {
        success: { type: "boolean" },
      },
    },
  },
};
