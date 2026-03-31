import type { AxiosRequestConfig } from "axios";
import type z from "zod";

export type ClientPayload<TInput, TVariables> = {} & (unknown extends TInput
  ? unknown
  : {
      input: TInput;
    }) &
  (unknown extends TVariables ? unknown : { variables: TVariables });

export type OptionalPayload<T> = object extends T ? void : T;

export type ClientOptions<
  TOutputSchema extends z.ZodType,
  TInputSchema extends z.ZodType,
  TVariablesSchema extends z.ZodType,
  TOutput = z.output<TOutputSchema>,
  TInputCoerced = z.output<TInputSchema>,
  TVariablesCoerced = z.output<TVariablesSchema>,
> = {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path:
    | string
    | ((
        payload: ClientPayload<TInputCoerced, TVariablesCoerced>,
      ) => string | Promise<string>);
  axiosOptions?: (
    payload: ClientPayload<TInputCoerced, TVariablesCoerced>,
  ) => AxiosRequestConfig | Promise<AxiosRequestConfig>;
  variablesSchema?: TVariablesSchema;
  inputSchema?: TInputSchema;
  outputSchema: TOutputSchema;
  transform?: (
    data: z.output<TOutputSchema>,
    payload: ClientPayload<TInputCoerced, TVariablesCoerced>,
  ) => TOutput | Promise<TOutput>;
};
