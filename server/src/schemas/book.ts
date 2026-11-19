// Response schema: Fastify compiles it into a fast serializer and drops any field not listed.
export const bookSchema = {
  $id: "Book",
  type: "object",
  required: ["id", "title", "author", "page_count", "metadata"],
  properties: {
    id: { type: "integer" },
    title: { type: "string" },
    author: { type: "string" },
    isbn: { type: ["string", "null"] },
    page_count: { type: "integer" },
    published_on: { type: ["string", "null"], format: "date" },
    description: { type: ["string", "null"] },
    metadata: { type: "object", additionalProperties: true },
  },
} as const;
