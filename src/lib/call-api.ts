import z from "zod";
import type {
  ClientPayload,
  ClientOptions,
  Result,
  ClientError,
} from "@/types";
import type { AxiosError, AxiosInstance, AxiosResponse } from "axios";
import { err, ok, ValidationError } from "@/lib";

export async function callApi<
  TOutputSchema extends z.ZodType,
  TInputSchema extends z.ZodType,
  TVariablesSchema extends z.ZodType,
  TOutput = z.output<TOutputSchema>,
  TInputCoerced = z.output<TInputSchema>,
  TInput = z.input<TInputSchema>,
  TVariablesCoerced = z.output<TVariablesSchema>,
  TVariables = z.input<TVariablesSchema>,
>(
  opts: ClientOptions<
    TOutputSchema,
    TInputSchema,
    TVariablesSchema,
    TOutput,
    TInputCoerced,
    TVariablesCoerced
  > & { axios: AxiosInstance },
  _data: ClientPayload<TInput, TVariables>,
): Promise<Result<TOutput, ClientError>> {
  const data = {} as ClientPayload<TInputCoerced, TVariablesCoerced>;

  if (typeof _data !== "object")
    throw new Error("API_CLIENT_INTERNAL_ERROR: Data must be an object");

  if (opts.inputSchema && "input" in _data) {
    const parsedResult = opts.inputSchema.safeParse(_data.input);
    if (!parsedResult.success)
      return err(
        new ValidationError({
          type: "INPUT",
          issues: parsedResult.error.issues,
        }),
      );

    // @ts-expect-error - This is a hack to get the data into the data object
    data.input = parsedResult.data;
  }

  if (opts.variablesSchema && "variables" in _data) {
    const parsedResult = opts.variablesSchema.safeParse(_data.variables);
    if (!parsedResult.success)
      return err(
        new ValidationError({
          type: "VARIABLE",
          issues: parsedResult.error.issues,
        }),
      );

    // @ts-expect-error - This is a hack to get the data into the data object
    data.variables = parsedResult.data;
  }

  const axiosOptions = await opts.axiosOptions?.(data);
  const url =
    typeof opts.path === "function" ? await opts.path(data) : opts.path;

  if (opts.method === "GET") {
    return await getResponse(
      opts.axios.get<TOutput>(url, axiosOptions),
      opts,
      data,
    );
  }

  if (opts.method === "POST") {
    return await getResponse(
      opts.axios.post<TOutput>(url, axiosOptions?.data, axiosOptions),
      opts,
      data,
    );
  }

  if (opts.method === "PUT") {
    return await getResponse(
      opts.axios.put<TOutput>(url, axiosOptions?.data, axiosOptions),
      opts,
      data,
    );
  }

  if (opts.method === "PATCH") {
    return await getResponse(
      opts.axios.patch<TOutput>(url, axiosOptions?.data, axiosOptions),
      opts,
      data,
    );
  }

  if (opts.method === "DELETE") {
    return await getResponse(
      opts.axios.delete<TOutput>(url, axiosOptions),
      opts,
      data,
    );
  }

  throw new Error(`API SDK: Unsupported method: ${opts.method}`);
}

export async function getResponse<
  TOutputSchema extends z.ZodType,
  TInputSchema extends z.ZodType,
  TVariablesSchema extends z.ZodType,
  TOutput = z.output<TOutputSchema>,
  TInputCoerced = z.output<TInputSchema>,
  TVariablesCoerced = z.output<TVariablesSchema>,
>(
  request: Promise<AxiosResponse<TOutput>>,
  opts: ClientOptions<
    TOutputSchema,
    TInputSchema,
    TVariablesSchema,
    TOutput,
    TInputCoerced,
    TVariablesCoerced
  >,
  payload: ClientPayload<TInputCoerced, TVariablesCoerced>,
): Promise<Result<TOutput, ClientError>> {
  try {
    const response = await request;

    const parsedResult = opts.outputSchema.safeParse(response.data);

    if (!parsedResult.success)
      return err(
        new ValidationError({
          type: "OUTPUT",
          issues: parsedResult.error.issues,
        }),
      );

    if (opts.transform) {
      return ok(await opts.transform(parsedResult.data, payload), response);
    }

    return ok(parsedResult.data as TOutput, response);
  } catch (error) {
    return err(error as AxiosError);
  }
}
