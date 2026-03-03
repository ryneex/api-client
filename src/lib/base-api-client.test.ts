import { describe, expect, it } from "bun:test";
import { BaseApiClient } from "./base-api-client";
import axios from "axios";
import z from "zod";

describe("BaseApiClient", () => {
  const apiClient = new BaseApiClient(
    axios.create({
      baseURL: "https://jsonplaceholder.typicode.com",
    }),
  );

  it("should create a post", async () => {
    const createPost = apiClient.createEndpoint({
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

    const response = await createPost({ input: postContent });

    expect(response.status).toBe(201);
    expect(response.data).toEqual(postContent);
  });

  it("should create a post with variables", async () => {
    const createPost = apiClient.createEndpoint({
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

    const response = await createPost({ variables: postContent });

    expect(response.status).toBe(201);
    expect(response.data).toEqual(postContent);
  });

  it("should validate input with zod and reject invalid data", async () => {
    const createPost = apiClient.createEndpoint({
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

    expect(
      createPost({ input: { title: 123 } as unknown as { title: string } }),
    ).rejects.toThrow(z.ZodError);
  });

  it("should validate variables with zod and reject invalid data", async () => {
    const createPost = apiClient.createEndpoint({
      method: "POST",
      path: "/posts",
      variablesSchema: z.object({
        userId: z.number(),
      }),
      outputSchema: z.any(),
      axiosOptions: (data) => ({
        data: data.variables,
      }),
    });

    expect(
      createPost({
        variables: { userId: "1" } as unknown as { userId: number },
      }),
    ).rejects.toThrow(z.ZodError);
  });

  it("should validate output with zod and reject invalid data", async () => {
    const getPostById = apiClient.createEndpoint({
      method: "GET",
      path: "/posts/1",
      outputSchema: z.object({
        // Intentionally invalid: userId must be a number
        userId: z.string(),
      }),
    });

    expect(getPostById()).rejects.toThrow(z.ZodError);
  });

  it("should fetch a post by id using variables in the path", async () => {
    const getPostById = apiClient.createEndpoint({
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

    const response = await getPostById({ variables: { id: 1 } });

    expect(response.status).toBe(200);
    expect(response.data.id).toBe(1);
  });
});
