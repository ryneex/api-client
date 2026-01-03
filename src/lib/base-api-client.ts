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

type ReactQueryOptions<TOutput, TInput = void> = Omit<
  UseQueryOptions<TOutput, ZodError<TOutput> | AxiosError>,
  "queryFn" | "queryKey"
> & { queryKey?: unknown[] } & (TInput extends void
    ? { data?: void }
    : { data: TInput }) & {
    onSuccess?: (data: TOutput, variables: TInput) => void;
    onError?: (
      error: ZodError<TOutput> | AxiosError,
      variables: TInput,
    ) => void;
  };

type ReactMutationOptions<TOutput, TInput = void> = Omit<
  UseMutationOptions<TOutput, ZodError<TOutput> | AxiosError, TInput>,
  "mutationFn" | "mutationKey"
> & {
  mutationKey?: unknown[];
};

export class BaseApiClient {
  readonly axios: AxiosInstance;

  constructor(axios: AxiosInstance) {
    this.axios = axios;
  }

  createEndpoint<
    TOutputSchema extends z.ZodType,
    TInputSchema extends z.ZodType | undefined,
    TOutput = z.infer<TOutputSchema>,
    TInput = undefined extends TInputSchema ? void : z.infer<TInputSchema>,
  >({
    method,
    path,
    axiosOptions: axiosOptionsFn,
    inputSchema,
    outputSchema,
  }: {
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    path: string | ((data: TInput) => string);
    axiosOptions?: (data: TInput) => AxiosRequestConfig;
    inputSchema?: TInputSchema;
    outputSchema: TOutputSchema;
  }) {
    const uuid = crypto.randomUUID();

    const call = async (data: TInput): Promise<AxiosResponse<TOutput>> => {
      if (inputSchema) {
        inputSchema.parse(data);
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
      opts: TInput extends void
        ? ReactQueryOptions<TOutput> | void
        : ReactQueryOptions<TOutput, TInput>,
    ): UseQueryOptions<TOutput, ZodError<TOutput> | AxiosError> => {
      const { data, ...options } = (opts ?? {}) as ReactQueryOptions<
        TOutput,
        TInput
      >;

      return {
        queryFn: async (): Promise<TOutput> => {
          try {
            const response = await call(data as TInput);
            options.onSuccess?.(response.data, data as TInput);
            return response.data;
          } catch (error) {
            options.onError?.(
              error as ZodError<TOutput> | AxiosError,
              data as TInput,
            );
            throw error;
          }
        },
        queryKey: queryKey(data as TInput),
        ...options,
      };
    };

    const mutationOptions = (
      opts: ReactMutationOptions<TOutput, TInput> | void,
    ): UseMutationOptions<TOutput, ZodError<TOutput> | AxiosError, TInput> => {
      const options = (opts ?? {}) as ReactMutationOptions<TOutput, TInput>;

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
