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

type ReactQueryOptions<TResponse, TData = void> = Omit<
  UseQueryOptions<TResponse, ZodError<TResponse> | AxiosError>,
  "queryFn" | "queryKey"
> & { queryKey?: unknown[] } & (TData extends void
    ? { data?: void }
    : { data: TData }) & {
    onSuccess?: (data: TResponse, variables: TData) => void;
    onError?: (
      error: ZodError<TResponse> | AxiosError,
      variables: TData,
    ) => void;
  };

type ReactMutationOptions<TResponse, TData = void> = Omit<
  UseMutationOptions<TResponse, ZodError<TResponse> | AxiosError, TData>,
  "mutationFn" | "mutationKey"
> & {
  mutationKey?: unknown[];
};

export class BaseApiClient {
  readonly axios: AxiosInstance;

  constructor(axios: AxiosInstance) {
    this.axios = axios;
  }

  createEndpoint<TResponse, TData = void>({
    method,
    path,
    axiosOptions: axiosOptionsFn,
    dataSchema,
    responseSchema,
  }: {
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    path: string | ((data: TData) => string);
    axiosOptions?: (data: TData) => AxiosRequestConfig;
    dataSchema?: z.ZodType<TData>;
    responseSchema: z.ZodType<TResponse>;
  }) {
    const uuid = crypto.randomUUID();

    const call = async (data: TData): Promise<AxiosResponse<TResponse>> => {
      if (dataSchema) {
        dataSchema.parse(data);
      }

      const axiosOptions = axiosOptionsFn?.(data);

      const url = typeof path === "function" ? path(data) : path;

      if (method === "GET") {
        const response = await this.axios.get<TResponse>(url, axiosOptions);
        responseSchema.parse(response.data);
        return response;
      }

      if (method === "POST") {
        const response = await this.axios.post<TResponse>(
          url,
          axiosOptions?.data,
          axiosOptions,
        );
        responseSchema.parse(response.data);
        return response;
      }

      if (method === "PUT") {
        const response = await this.axios.put<TResponse>(
          url,
          axiosOptions?.data,
          axiosOptions,
        );
        responseSchema.parse(response.data);
        return response;
      }

      if (method === "PATCH") {
        const response = await this.axios.patch<TResponse>(
          url,
          axiosOptions?.data,
          axiosOptions,
        );
        responseSchema.parse(response.data);
        return response;
      }

      if (method === "DELETE") {
        const response = await this.axios.delete<TResponse>(url, axiosOptions);
        responseSchema.parse(response.data);
        return response;
      }

      throw new Error(`API SDK: Unsupported method: ${method}`);
    };

    const queryKey = (data: TData) => ["api-call", "query", uuid, data];
    const mutationKey = () => ["api-call", "mutation", uuid];

    const queryOptions = (
      opts: TData extends void
        ? ReactQueryOptions<TResponse> | void
        : ReactQueryOptions<TResponse, TData>,
    ): UseQueryOptions<TResponse, ZodError<TResponse> | AxiosError> => {
      const { data, ...options } = (opts ?? {}) as ReactQueryOptions<
        TResponse,
        TData
      >;

      return {
        queryFn: async (): Promise<TResponse> => {
          try {
            const response = await call(data as TData);
            options.onSuccess?.(response.data, data as TData);
            return response.data;
          } catch (error) {
            options.onError?.(
              error as ZodError<TResponse> | AxiosError,
              data as TData,
            );
            throw error;
          }
        },
        queryKey: queryKey(data as TData),
        ...options,
      };
    };

    const mutationOptions = (
      opts: ReactMutationOptions<TResponse, TData> | void,
    ): UseMutationOptions<
      TResponse,
      ZodError<TResponse> | AxiosError,
      TData
    > => {
      const options = (opts ?? {}) as ReactMutationOptions<TResponse, TData>;

      return {
        mutationFn: async (data): Promise<TResponse> => {
          const response = await call(data);
          return response.data;
        },
        mutationKey: mutationKey(),
        ...options,
      };
    };

    return {
      id: uuid,
      call,
      queryKey,
      queryOptions,
      mutationKey,
      mutationOptions,
    };
  }
}
