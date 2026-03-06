import { describe, expect, it } from "bun:test";
import axios from "axios";
import z from "zod";
import { createClient, ValidationError } from "@/lib";

describe("ApiClient", () => {
  const client = createClient(
    axios.create({
      baseURL: "https://jsonplaceholder.typicode.com",
    }),
  );

  it("should create a post", async () => {
    const createPost = client.create({
      method: "POST",
      path: "/posts",
      inputSchema: z.object({
        title: z.string(),
        body: z.string(),
        userId: z.number(),
      }),
      outputSchema: z.object({
        title: z.string(),
        body: z.string(),
        userId: z.number(),
      }),
      axiosOptions: (data) => ({
        data: data.input,
      }),
    });

    const postContent = {
      title: "Test Post",
      body: "This is a test post",
      userId: 1,
    };

    const result = await createPost({ input: postContent });

    if (!result.success) throw result.error;
    expect(result.response.status).toBe(201);
    expect(result.data).toEqual(postContent);
  });

  it("should create a post with variables", async () => {
    const createPost = client.create({
      method: "POST",
      path: "/posts",
      variablesSchema: z.object({
        userId: z.number(),
        title: z.string(),
        body: z.string(),
      }),
      outputSchema: z.object({
        title: z.string(),
        body: z.string(),
        userId: z.number(),
      }),
      axiosOptions: (data) => ({
        data: data.variables,
      }),
    });

    const postContent = {
      userId: 1,
      title: "Test Post",
      body: "This is a test post",
    };

    const result = await createPost({ variables: postContent });

    if (!result.success) throw result.error;
    expect(result.response.status).toBe(201);
    expect(result.data).toEqual(postContent);
  });

  it("should validate input with zod and reject invalid data", async () => {
    const createPost = client.create({
      method: "POST",
      path: "/posts",
      inputSchema: z.object({
        title: z.string(),
      }),
      outputSchema: z.any(),
      axiosOptions: (data) => ({
        data: data.input,
      }),
    });

    const result = await createPost({
      input: { title: 123 } as unknown as { title: string },
    });

    if (result.success) throw new Error("Expected failure");
    expect(result.error).toBeInstanceOf(ValidationError);
  });

  it("should validate variables with zod and reject invalid data", async () => {
    const createPost = client.create({
      method: "POST",
      path: "/posts",
      variablesSchema: z.object({
        userId: z.number(),
      }),
      outputSchema: z.unknown(),
      axiosOptions: (data) => ({
        data: data.variables,
      }),
    });

    const result = await createPost({
      variables: { userId: "1" } as unknown as { userId: number },
    });

    if (result.success) throw new Error("Expected failure");
    expect(result.error).toBeInstanceOf(ValidationError);
  });

  it("should validate output with zod and reject invalid data", async () => {
    const getPostById = client.create({
      method: "GET",
      path: "/posts/1",
      outputSchema: z.object({
        // Intentionally invalid: userId must be a number
        userId: z.string(),
      }),
    });

    const result = await getPostById();
    if (result.success) throw new Error("Expected failure");
    expect(result.error).toBeInstanceOf(ValidationError);
  });

  it("should fetch a post by id using variables in the path", async () => {
    const getPostById = client.create({
      method: "GET",
      path: ({ variables }) => `/posts/${variables.id}`,
      variablesSchema: z.object({
        id: z.number(),
      }),
      outputSchema: z.object({
        userId: z.number(),
        id: z.number(),
        title: z.string(),
        body: z.string(),
      }),
    });

    const result = await getPostById({ variables: { id: 1 } });

    if (!result.success) throw result.error;
    expect(result.response.status).toBe(200);
    expect(result.data.id).toBe(1);
  });
});
