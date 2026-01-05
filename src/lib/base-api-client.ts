import {
  type UseMutationOptions,
  type UseQueryOptions,
} from "@tanstack/react-query";
import type {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
} from "axios";
import z, { ZodError } from "zod";

type ReactQueryOptions<TOutput, TInput, TVariables> = Omit<
  UseQueryOptions<TOutput, ZodError<TOutput> | AxiosError>,
  "queryFn" | "queryKey"
> & { queryKey?: unknown[] } & (object extends TData<TInput, TVariables>
    ? { data?: undefined }
    : { data: TData<TInput, TVariables> }) & {
    onSuccess?: (
      data: TOutput,
      payload: object extends TData<TInput, TVariables>
        ? void
        : TData<TInput, TVariables>,
    ) => void;
    onError?: (
      error: ZodError<TOutput> | AxiosError,
      payload: object extends TData<TInput, TVariables>
        ? void
        : TData<TInput, TVariables>,
    ) => void;
  };

type ReactMutationOptions<TOutput, TInput, TVariables> = Omit<
  UseMutationOptions<
    TOutput,
    ZodError<TOutput> | AxiosError,
    OptionalTData<TInput, TVariables>
  >,
  "mutationFn" | "mutationKey"
> & {
  mutationKey?: unknown[];
};

type TData<TInput, TVariables> = {} & (TInput extends void
  ? { input?: undefined }
  : { input: TInput }) &
  (TVariables extends void
    ? { variables?: undefined }
    : { variables: TVariables });

type OptionalTData<TInput, TVariables> =
  object extends TData<TInput, TVariables> ? void : TData<TInput, TVariables>;

export class BaseApiClient {
  readonly axios: AxiosInstance;

  constructor(axios: AxiosInstance) {
    this.axios = axios;
  }

  createEndpoint<
    TOutputSchema extends z.ZodType,
    TInputSchema extends z.ZodType | undefined,
    TVariablesSchema extends z.ZodType | undefined,
    TOutput = z.infer<TOutputSchema>,
    TInput = undefined extends TInputSchema ? void : z.infer<TInputSchema>,
    TVariables = undefined extends TVariablesSchema
      ? void
      : z.infer<TVariablesSchema>,
  >({
    method,
    path,
    axiosOptions: axiosOptionsFn,
    variablesSchema,
    inputSchema,
    outputSchema,
  }: {
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    path: string | ((data: TData<TInput, TVariables>) => string);
    axiosOptions?: (data: TData<TInput, TVariables>) => AxiosRequestConfig;
    variablesSchema?: TVariablesSchema;
    inputSchema?: TInputSchema;
    outputSchema: TOutputSchema;
  }) {
    const uuid = crypto.randomUUID();

    const call = async (
      opts: OptionalTData<TInput, TVariables>,
    ): Promise<AxiosResponse<TOutput>> => {
      const data = (opts ?? {}) as TData<TInput, TVariables>;

      if (inputSchema) {
        inputSchema.parse(data.input);
      }

      if (variablesSchema) {
        variablesSchema.parse(data.variables);
      }

      const axiosOptions = axiosOptionsFn?.(data);

      const url = typeof path === "function" ? path(data) : path;

      if (method === "GET") {
        const response = await this.axios.get<TOutput>(url, axiosOptions);
        outputSchema.parse(response.data);
        return response;
      }

      if (method === "POST") {
        const response = await this.axios.post<TOutput>(
          url,
          axiosOptions?.data,
          axiosOptions,
        );
        outputSchema.parse(response.data);
        return response;
      }

      if (method === "PUT") {
        const response = await this.axios.put<TOutput>(
          url,
          axiosOptions?.data,
          axiosOptions,
        );
        outputSchema.parse(response.data);
        return response;
      }

      if (method === "PATCH") {
        const response = await this.axios.patch<TOutput>(
          url,
          axiosOptions?.data,
          axiosOptions,
        );
        outputSchema.parse(response.data);
        return response;
      }

      if (method === "DELETE") {
        const response = await this.axios.delete<TOutput>(url, axiosOptions);
        outputSchema.parse(response.data);
        return response;
      }

      throw new Error(`API SDK: Unsupported method: ${method}`);
    };

    const queryKey = (data: TInput | void) =>
      data ? ["api-call", "query", uuid, data] : ["api-call", "query", uuid];
    const mutationKey = () => ["api-call", "mutation", uuid];

    const queryOptions = (
      opts: object extends TData<TInput, TVariables>
        ? ReactQueryOptions<TOutput, TInput, TVariables> | void
        : ReactQueryOptions<TOutput, TInput, TVariables>,
    ): UseQueryOptions<TOutput, ZodError<TOutput> | AxiosError> => {
      const { data, ...options } = (opts ?? {}) as ReactQueryOptions<
        TOutput,
        TInput,
        TVariables
      >;

      return {
        queryFn: async (): Promise<TOutput> => {
          try {
            const response = await call(
              data as OptionalTData<TInput, TVariables>,
            );
            options.onSuccess?.(
              response.data,
              data as OptionalTData<TInput, TVariables>,
            );
            return response.data;
          } catch (error) {
            options.onError?.(
              error as ZodError<TOutput> | AxiosError,
              data as OptionalTData<TInput, TVariables>,
            );
            throw error;
          }
        },
        queryKey: queryKey(data as TInput),
        ...options,
      };
    };

    const mutationOptions = (
      opts: ReactMutationOptions<TOutput, TInput, TVariables> | void,
    ): UseMutationOptions<
      TOutput,
      ZodError<TOutput> | AxiosError,
      OptionalTData<TInput, TVariables>
    > => {
      const options = (opts ?? {}) as ReactMutationOptions<
        TOutput,
        TInput,
        TVariables
      >;

      return {
        mutationFn: async (data): Promise<TOutput> => {
          const response = await call(data);
          return response.data;
        },
        mutationKey: mutationKey(),
        ...options,
      };
    };

    return Object.assign(call, {
      queryKey,
      queryOptions,
      mutationKey,
      mutationOptions,
      config: {
        variablesSchema: variablesSchema as undefined extends TVariablesSchema
          ? undefined
          : NonNullable<TVariablesSchema>,
        inputSchema: inputSchema as undefined extends TInputSchema
          ? undefined
          : NonNullable<TInputSchema>,
        outputSchema,
        method,
        path,
      },
    });
  }
}
