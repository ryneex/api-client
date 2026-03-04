import z from "zod";
import type { ClientPayload, ClientOptions } from "../types";
import type { AxiosInstance, AxiosResponse } from "axios";

export async function callApi<
  TOutputSchema extends z.ZodType,
  TInputSchema extends z.ZodType,
  TVariablesSchema extends z.ZodType,
  TOutput = z.infer<TOutputSchema>,
  TInput = z.infer<TInputSchema>,
  TVariables = z.infer<TVariablesSchema>,
>(
  opts: ClientOptions<
    TOutputSchema,
    TInputSchema,
    TVariablesSchema,
    TOutput,
    TInput,
    TVariables
  > & { axios: AxiosInstance },
  data: ClientPayload<TInput, TVariables>,
) {
  if (typeof data !== "object")
    throw new Error("API SDK: Data must be an object");

  if (opts.inputSchema && "input" in data) {
    opts.inputSchema.parse(data.input);
  }

  if (opts.variablesSchema && "variables" in data) {
    opts.variablesSchema.parse(data.variables);
  }

  const axiosOptions = opts.axiosOptions?.(data);
  const url = typeof opts.path === "function" ? opts.path(data) : opts.path;

  if (opts.method === "GET") {
    const response = await opts.axios.get<TOutput>(url, axiosOptions);
    return getResponse(opts, data, response);
  }

  if (opts.method === "POST") {
    const response = await opts.axios.post<TOutput>(
      url,
      axiosOptions?.data,
      axiosOptions,
    );
    return getResponse(opts, data, response);
  }

  if (opts.method === "PUT") {
    const response = await opts.axios.put<TOutput>(
      url,
      axiosOptions?.data,
      axiosOptions,
    );
    return getResponse(opts, data, response);
  }

  if (opts.method === "PATCH") {
    const response = await opts.axios.patch<TOutput>(
      url,
      axiosOptions?.data,
      axiosOptions,
    );
    return getResponse(opts, data, response);
  }

  if (opts.method === "DELETE") {
    const response = await opts.axios.delete<TOutput>(url, axiosOptions);
    return getResponse(opts, data, response);
  }

  throw new Error(`API SDK: Unsupported method: ${opts.method}`);
}

export function getResponse<
  TOutputSchema extends z.ZodType,
  TInputSchema extends z.ZodType,
  TVariablesSchema extends z.ZodType,
  TOutput = z.infer<TOutputSchema>,
  TInput = z.infer<TInputSchema>,
  TVariables = z.infer<TVariablesSchema>,
>(
  opts: ClientOptions<
    TOutputSchema,
    TInputSchema,
    TVariablesSchema,
    TOutput,
    TInput,
    TVariables
  >,
  payload: ClientPayload<TInput, TVariables>,
  response: AxiosResponse<TOutput>,
): AxiosResponse<TOutput> {
  const parsedData = opts.outputSchema.parse(response.data);

  if (opts.transform) {
    return { ...response, data: opts.transform(parsedData, payload) };
  }

  return { ...response, data: parsedData as TOutput };
}
