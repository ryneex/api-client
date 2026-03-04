# @ryneex/api-client

Type-safe API client built on **Axios**, **Zod**, and **TanStack Query**. Define endpoints with request/response validation and get ready-to-use `call`, `queryOptions`, and `mutationOptions` for React Query.

---

## Installation

```bash
bun add @ryneex/api-client axios zod @tanstack/react-query
# or
npm i @ryneex/api-client axios zod @tanstack/react-query
```

**Peer dependencies:** `axios` ^1.13.2, `zod` ^4, `@tanstack/react-query` ^5, `typescript` ^5.

---

## Quick start

```ts
import axios from "axios";
import z from "zod";
import { createClient } from "@ryneex/api-client";

const axiosInstance = axios.create({
  baseURL: "https://api.example.com",
  headers: { "Content-Type": "application/json" },
});

const client = createClient(axiosInstance);

// Define a GET endpoint with validated response
const getUsers = client.create({
  method: "GET",
  path: "/users",
  outputSchema: z.object({
    users: z.array(
      z.object({ id: z.string(), name: z.string(), email: z.string() }),
    ),
  }),
});

// Call it (returns AxiosResponse<inferred output type>)
const res = await getUsers();
console.log(res.data.users);

// Or use with React Query
import { useQuery } from "@tanstack/react-query";
const { data } = useQuery(getUsers.queryOptions());
```

---

## Creating the client

Use any **Axios instance** (with base URL, auth, interceptors, etc.) with `createClient`:

```ts
import axios from "axios";
import { createClient } from "@ryneex/api-client";

const axiosInstance = axios.create({
  baseURL: "https://api.example.com/v1",
  timeout: 10_000,
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.API_TOKEN}`,
  },
});

const client = createClient(axiosInstance);
```

---

## Defining endpoints: `client.create`

`client.create` takes:

| Option            | Type                                    | Required | Description                                        |
| ----------------- | --------------------------------------- | -------- | -------------------------------------------------- |
| `method`          | `GET \| POST \| PUT \| PATCH \| DELETE` | Yes      | HTTP method.                                       |
| `path`            | `string \| (data) => string`            | Yes      | URL path (static or derived from input/variables). |
| `outputSchema`    | `z.ZodType`                             | Yes      | Zod schema for response body; type is inferred.    |
| `inputSchema`     | `z.ZodType`                             | No       | Schema for `data.input` (e.g. body for POST).      |
| `variablesSchema` | `z.ZodType`                             | No       | Schema for `data.variables` (e.g. path/query).     |
| `axiosOptions`    | `(data) => AxiosRequestConfig`          | No       | Extra Axios config (headers, params, data, etc.).  |
| `transform`       | `(data, payload) => TOutput`            | No       | Optional post-processing of parsed response data.  |

The returned endpoint is a **callable function** with helpers:

- **Direct call** — call `await endpoint(payload?)` to perform the request; returns `Promise<AxiosResponse<TOutput>>`.
- **`queryOptions(opts?)`** — `UseQueryOptions` for `useQuery`.
- **`mutationOptions(opts?)`** — `UseMutationOptions` for `useMutation`.
- **`config`** — `{ method, path, outputSchema, inputSchema?, variablesSchema? }`.

---

## Example: GET with no input

```ts
const getProducts = client.create({
  method: "GET",
  path: "/products",
  outputSchema: z.object({
    products: z.array(
      z.object({
        id: z.string(),
        title: z.string(),
        price: z.number(),
      }),
    ),
  }),
});

// Direct call
const { data } = await getProducts();
// data is { products: { id, title, price }[] }

// React Query
const { data } = useQuery(getProducts.queryOptions());
```

---

## Example: GET with variables (path/query)

Use `variablesSchema` and a **path function** when the URL or query depends on parameters:

```ts
const getUserById = client.create({
  method: "GET",
  path: (data) => `/users/${data.variables.userId}`,
  variablesSchema: z.object({ userId: z.string() }),
  outputSchema: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
  }),
});

// Direct call — pass { variables: { userId: "123" } }
const { data } = await getUserById({ variables: { userId: "123" } });

// React Query — must pass data so queryKey and queryFn get userId
const { data } = useQuery(
  getUserById.queryOptions({
    data: { variables: { userId: "123" } },
    staleTime: 60_000,
  }),
);
```

---

## Example: POST with request body (input)

Use `inputSchema` for the body and optionally `axiosOptions` to pass it to Axios:

```ts
const createUser = client.create({
  method: "POST",
  path: "/users",
  inputSchema: z.object({
    name: z.string().min(1),
    email: z.string().email(),
  }),
  outputSchema: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
  }),
  axiosOptions: (data) => ({
    data: data.input,
  }),
});

// Direct call
const { data } = await createUser({
  input: { name: "Jane", email: "jane@example.com" },
});

// React Query mutation
const mutation = useMutation(
  createUser.mutationOptions({
    onSuccess: (user) => console.log("Created", user),
  }),
);
mutation.mutate({ input: { name: "Jane", email: "jane@example.com" } });
```

---

## Example: Dynamic path and query params

Combine variables with a path function and `axiosOptions` for query params:

```ts
const listUsers = client.create({
  method: "GET",
  path: "/users",
  variablesSchema: z.object({
    page: z.number().optional(),
    limit: z.number().optional(),
  }),
  outputSchema: z.object({
    users: z.array(z.object({ id: z.string(), name: z.string() })),
    total: z.number(),
  }),
  axiosOptions: (data) => ({
    params: data.variables,
  }),
});

const { data } = await listUsers({
  variables: { page: 1, limit: 10 },
});
```

---

## Example: PUT / PATCH / DELETE

Same pattern: use `inputSchema` for body and `axiosOptions` to pass it.

```ts
const updateUser = client.create({
  method: "PATCH",
  path: (data) => `/users/${data.variables.userId}`,
  variablesSchema: z.object({ userId: z.string() }),
  inputSchema: z.object({
    name: z.string().optional(),
    email: z.string().email().optional(),
  }),
  outputSchema: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
  }),
  axiosOptions: (data) => ({
    data: data.input,
  }),
});

await updateUser({
  variables: { userId: "123" },
  input: { name: "New Name" },
});
```

---

## Using with React Query

### Queries (GET)

- Use **`queryOptions({ data?, ...useQueryOptions })`**.
- If the endpoint has **input or variables**, pass **`data`** so both `queryKey` and `queryFn` receive it.
- You can pass any `useQuery` options (`staleTime`, `enabled`, etc.) and optional **`onSuccess`** / **`onError`** with the same payload shape.

```ts
// No input/variables
useQuery(getProducts.queryOptions({ staleTime: 60_000 }));

// With variables (e.g. GET by id)
useQuery(
  getUserById.queryOptions({
    data: { variables: { userId: "123" } },
    enabled: !!userId,
    onSuccess: (user) => {},
    onError: (err, { variables }) => {},
  }),
);
```

### Mutations (POST / PUT / PATCH / DELETE)

- Use **`mutationOptions(options?)`** with `useMutation`.
- **`mutation.mutate(data)`** must match the endpoint’s `input`/`variables` shape.

```ts
const mutation = useMutation(
  createUser.mutationOptions({
    onSuccess: (user) => {},
    onError: (error, variables) => {},
  }),
);

mutation.mutate({
  input: { name: "Jane", email: "jane@example.com" },
});
```

---

## Validation and errors

- **Input** and **variables** are validated with Zod before the request; invalid data throws **`ZodError`**.
- **Response** is parsed with `outputSchema` after the request; invalid response throws **`ZodError`**.
- Network or server errors are **AxiosError**.

So the callable and React Query helpers can throw **`ZodError | AxiosError`**. Handle both in `onError` or in try/catch:

```ts
import { AxiosError } from "axios";
import { ZodError } from "zod";

const { data, error } = useQuery(
  getUsers.queryOptions({
    onError: (err) => {
      if (err instanceof ZodError) {
        console.error("Validation failed", err.flatten());
      } else if (err instanceof AxiosError) {
        console.error("Request failed", err.response?.status);
      }
    },
  }),
);
```

---

## Full example: small API module

```ts
import axios from "axios";
import z from "zod";
import { createClient } from "@ryneex/api-client";

const axiosInstance = axios.create({
  baseURL: "https://api.example.com",
  headers: { "Content-Type": "application/json" },
});

const client = createClient(axiosInstance);

// Schemas
const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
});

// GET /users
export const getUsers = client.create({
  method: "GET",
  path: "/users",
  outputSchema: z.object({ users: z.array(userSchema) }),
});

// GET /users/:id
export const getUser = client.create({
  method: "GET",
  path: (d) => `/users/${d.variables.id}`,
  variablesSchema: z.object({ id: z.string() }),
  outputSchema: userSchema,
});

// POST /users
export const createUser = client.create({
  method: "POST",
  path: "/users",
  inputSchema: z.object({
    name: z.string(),
    email: z.string().email(),
  }),
  outputSchema: userSchema,
  axiosOptions: (d) => ({ data: d.input }),
});

// Usage in a component
// const { data } = useQuery(getUsers.queryOptions());
// const { data } = useQuery(getUser.queryOptions({ data: { variables: { id: "1" } } }));
// const mutation = useMutation(createUser.mutationOptions());
// mutation.mutate({ input: { name: "Jane", email: "jane@example.com" } });
```
