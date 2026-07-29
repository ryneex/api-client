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
  output: z.object({
    users: z.array(
      z.object({ id: z.string(), name: z.string(), email: z.string() }),
    ),
  }),
});

// Call it — returns a Result (success | error)
const result = await getUsers();
if (result.success) {
  console.log(result.data.users);
  console.log(result.response.status);
} else {
  console.error(result.error);
}

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

// Optional: run before React Query helpers throw on failure
const clientWithHook = createClient(axiosInstance, {
  beforeThrow: async (error) => {
    // e.g. toast, logging, redirect on 401
    console.error(error);
  },
});
```

`beforeThrow` runs in `queryOptions` / `mutationOptions` after a failed call and before the error is thrown to React Query. Direct `call` / `endpoint()` returns never throw for API failures — they return a `Result` instead.

---

## Defining endpoints: `client.create`

`client.create` takes:

| Option         | Type                                           | Required | Description                                        |
| -------------- | ---------------------------------------------- | -------- | -------------------------------------------------- |
| `method`       | `GET \| POST \| PUT \| PATCH \| DELETE`        | Yes      | HTTP method.                                       |
| `path`         | `string \| (data) => string \| Promise<string>` | Yes     | URL path (static or derived from input/variables). |
| `output`       | `z.ZodType`                                    | Yes      | Zod schema for response body; type is inferred.    |
| `input`        | `z.ZodType`                                    | No       | Schema for `data.input` (e.g. body for POST).      |
| `variables`    | `z.ZodType`                                    | No       | Schema for `data.variables` (e.g. path/query).     |
| `axiosOptions` | `(data) => AxiosRequestConfig \| Promise<…>`   | No       | Extra Axios config (headers, params, data, etc.).  |
| `transform`    | `(data, payload) => TOutput \| Promise<…>`     | No       | Optional post-processing of parsed response data.  |

`path`, `axiosOptions`, and `transform` may be async.

The returned endpoint is a **callable function** with helpers:

- **Direct call** — `await endpoint(payload?)` returns `Promise<Result<TOutput, ClientError>>`.
  - Success: `{ success: true, data, response }` (`response` is the Axios response).
  - Failure: `{ success: false, error }` (`ValidationError` or `AxiosError`).
- **`call(payload?)`** — same as the direct call.
- **`queryOptions(opts?)`** — `UseQueryOptions` for `useQuery` (throws `ClientError` on failure).
- **`mutationOptions(opts?)`** — `UseMutationOptions` for `useMutation` (throws `ClientError` on failure).
- **`queryKey(data?)`** / **`mutationKey()`** — stable keys for cache invalidation.
- **`config`** — `{ method, path, output, input?, variables?, axios, … }`.

---

## Example: GET with no input

```ts
const getProducts = client.create({
  method: "GET",
  path: "/products",
  output: z.object({
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
const result = await getProducts();
if (!result.success) throw result.error;
// result.data is { products: { id, title, price }[] }

// React Query
const { data } = useQuery(getProducts.queryOptions());
```

---

## Example: GET with variables (path/query)

Use `variables` and a **path function** when the URL or query depends on parameters:

```ts
const getUserById = client.create({
  method: "GET",
  path: (data) => `/users/${data.variables.userId}`,
  variables: z.object({ userId: z.string() }),
  output: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
  }),
});

// Direct call — pass { variables: { userId: "123" } }
const result = await getUserById({ variables: { userId: "123" } });
if (!result.success) throw result.error;

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

Use `input` for the body and optionally `axiosOptions` to pass it to Axios:

```ts
const createUser = client.create({
  method: "POST",
  path: "/users",
  input: z.object({
    name: z.string().min(1),
    email: z.string().email(),
  }),
  output: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
  }),
  axiosOptions: (data) => ({
    data: data.input,
  }),
});

// Direct call
const result = await createUser({
  input: { name: "Jane", email: "jane@example.com" },
});
if (!result.success) throw result.error;

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
  variables: z.object({
    page: z.number().optional(),
    limit: z.number().optional(),
  }),
  output: z.object({
    users: z.array(z.object({ id: z.string(), name: z.string() })),
    total: z.number(),
  }),
  axiosOptions: (data) => ({
    params: data.variables,
  }),
});

const result = await listUsers({
  variables: { page: 1, limit: 10 },
});
if (!result.success) throw result.error;
```

---

## Example: PUT / PATCH / DELETE

Same pattern: use `input` for body and `axiosOptions` to pass it.

```ts
const updateUser = client.create({
  method: "PATCH",
  path: (data) => `/users/${data.variables.userId}`,
  variables: z.object({ userId: z.string() }),
  input: z.object({
    name: z.string().optional(),
    email: z.string().email().optional(),
  }),
  output: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
  }),
  axiosOptions: (data) => ({
    data: data.input,
  }),
});

const result = await updateUser({
  variables: { userId: "123" },
  input: { name: "New Name" },
});
if (!result.success) throw result.error;
```

---

## Grouping endpoints: `createClientGroup`

Organize related endpoints into a typed tree:

```ts
import { createClient, createClientGroup } from "@ryneex/api-client";

const client = createClient(axiosInstance);

export const api = createClientGroup({
  users: {
    list: client.create({
      method: "GET",
      path: "/users",
      output: z.object({ users: z.array(userSchema) }),
    }),
    get: client.create({
      method: "GET",
      path: (d) => `/users/${d.variables.id}`,
      variables: z.object({ id: z.string() }),
      output: userSchema,
    }),
    create: client.create({
      method: "POST",
      path: "/users",
      input: z.object({ name: z.string(), email: z.string().email() }),
      output: userSchema,
      axiosOptions: (d) => ({ data: d.input }),
    }),
  },
});

// api.users.list(), api.users.get({ variables: { id: "1" } }), …
```

`createClientGroup` is a typed identity helper — it returns the same object with a `ClientGroup` type for nesting.

---

## Using with React Query

### Queries (GET)

- Use **`queryOptions({ data?, ...useQueryOptions })`**.
- If the endpoint has **input or variables**, pass **`data`** so both `queryKey` and `queryFn` receive it.
- You can pass any `useQuery` options (`staleTime`, `enabled`, etc.) and optional **`onSuccess`** / **`onError`** with the same payload shape.
- Use **`endpoint.queryKey(data?)`** when invalidating or prefetching.

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

// Invalidate
queryClient.invalidateQueries({ queryKey: getUserById.queryKey() });
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

Direct calls return a **Result** instead of throwing:

| Outcome                         | Shape                                      |
| ------------------------------- | ------------------------------------------ |
| Success                         | `{ success: true, data, response }`        |
| Input / variables / output fail | `{ success: false, error: ValidationError }` |
| Network / HTTP error            | `{ success: false, error: AxiosError }`    |

`ValidationError` extends Zod’s `ZodError` and sets:

| `error.type` | `error.name`                 |
| ------------ | ---------------------------- |
| `"input"`    | `"InputValidationError"`     |
| `"variable"` | `"VariableValidationError"`  |
| `"output"`   | `"OutputValidationError"`    |

React Query helpers (`queryOptions` / `mutationOptions`) unwrap the Result and **throw** `ClientError` (`ValidationError | AxiosError`) so `useQuery` / `useMutation` error handling works as usual. If you passed `beforeThrow` to `createClient`, it runs first.

```ts
import { AxiosError } from "axios";
import { ValidationError } from "@ryneex/api-client";

const result = await getUsers();
if (!result.success) {
  if (result.error instanceof ValidationError) {
    console.error(result.error.type, result.error.flatten());
  } else if (result.error instanceof AxiosError) {
    console.error("Request failed", result.error.response?.status);
  }
}

// With React Query
useQuery(
  getUsers.queryOptions({
    onError: (err) => {
      if (err instanceof ValidationError) {
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
import { createClient, createClientGroup } from "@ryneex/api-client";

const axiosInstance = axios.create({
  baseURL: "https://api.example.com",
  headers: { "Content-Type": "application/json" },
});

const client = createClient(axiosInstance);

const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
});

export const api = createClientGroup({
  users: {
    list: client.create({
      method: "GET",
      path: "/users",
      output: z.object({ users: z.array(userSchema) }),
    }),
    get: client.create({
      method: "GET",
      path: (d) => `/users/${d.variables.id}`,
      variables: z.object({ id: z.string() }),
      output: userSchema,
    }),
    create: client.create({
      method: "POST",
      path: "/users",
      input: z.object({
        name: z.string(),
        email: z.string().email(),
      }),
      output: userSchema,
      axiosOptions: (d) => ({ data: d.input }),
    }),
  },
});

// Usage in a component
// const { data } = useQuery(api.users.list.queryOptions());
// const { data } = useQuery(
//   api.users.get.queryOptions({ data: { variables: { id: "1" } } }),
// );
// const mutation = useMutation(api.users.create.mutationOptions());
// mutation.mutate({ input: { name: "Jane", email: "jane@example.com" } });
```
