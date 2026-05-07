import z from "zod";
import type {
  ClientOptions,
  ClientPayload,
  OptionalPayload,
  ReactQueryOptions,
  ReactMutationOptions,
  ClientError,
} from "@/types";
import type { AxiosInstance } from "axios";
import { callApi } from "@/lib";
import {
  type UseMutationOptions,
  type UseQueryOptions,
} from "@tanstack/react-query";

type CreateClientOptions = {
  beforeThrow?: (error: ClientError) => void | Promise<void>;
};

export function createClient(
  axios: AxiosInstance,
  { beforeThrow }: CreateClientOptions = {},
) {
  function create<
    TOutputSchema extends z.ZodType,
    TInputSchema extends z.ZodType,
    TVariablesSchema extends z.ZodType,
    TOutput = z.output<TOutputSchema>,
    TInput = z.input<TInputSchema>,
    TInputCoerced = z.output<TInputSchema>,
    TVariables = z.input<TVariablesSchema>,
    TVariablesCoerced = z.output<TVariablesSchema>,
  >(
    opts: ClientOptions<
      TOutputSchema,
      TInputSchema,
      TVariablesSchema,
      TOutput,
      TInputCoerced,
      TVariablesCoerced
    >,
  ) {
    const uuid = crypto.randomUUID();
    const apiOptionas = { ...opts, axios };

    const call = async (
      _payload: OptionalPayload<ClientPayload<TInput, TVariables>>,
    ) => {
      const payload = (_payload ?? {}) as ClientPayload<TInput, TVariables>;

      return callApi(apiOptionas, payload);
    };

    const queryKey = (data?: ClientPayload<TInput, TVariables>) =>
      data ? ["api-call", "query", uuid, data] : ["api-call", "query", uuid];
    const mutationKey = () => ["api-call", "mutation", uuid];

    const queryOptions = (
      _opts: object extends ClientPayload<TInput, TVariables>
        ? ReactQueryOptions<TOutput, TInput, TVariables> | void
        : ReactQueryOptions<TOutput, TInput, TVariables>,
    ): UseQueryOptions<TOutput, ClientError> => {
      const { data: _data, ...options } = (_opts ?? {}) as ReactQueryOptions<
        TOutput,
        TInput,
        TVariables
      > & {
        data?: ClientPayload<TInput, TVariables>;
      };

      const data = (_data ?? {}) as ClientPayload<TInput, TVariables>;

      return {
        queryFn: async (): Promise<TOutput> => {
          const result = await callApi(apiOptionas, data);

          if (result.success) {
            options.onSuccess?.(result.data, data);
            return result.data;
          }
          options.onError?.(result.error, data);
          await beforeThrow?.(result.error);
          throw result.error;
        },
        queryKey: queryKey(data),
        ...options,
      };
    };

    const mutationOptions = (
      _opts: ReactMutationOptions<TOutput, TInput, TVariables> | void,
    ): UseMutationOptions<
      TOutput,
      ClientError,
      object extends ClientPayload<TInput, TVariables>
        ? void
        : ClientPayload<TInput, TVariables>
    > => {
      const options = (_opts ?? {}) as ReactMutationOptions<
        TOutput,
        TInput,
        TVariables
      > & {
        data?: ClientPayload<TInput, TVariables>;
      };

      return {
        mutationFn: async (_data): Promise<TOutput> => {
          const data = (_data ?? {}) as ClientPayload<TInput, TVariables>;
          const result = await callApi(apiOptionas, data);
          if (result.success) return result.data;
          await beforeThrow?.(result.error);
          throw result.error;
        },
        mutationKey: mutationKey(),
        ...options,
      };
    };

    return Object.assign(call, {
      call,
      queryOptions,
      mutationOptions,
      queryKey,
      mutationKey,
      config: {
        ...apiOptionas,
        input: opts.input as TInputSchema,
        variables: opts.variables as TVariablesSchema,
        output: opts.output as TOutputSchema,
      },
    });
  }

  return { create };
}

export type Client = {
  call: unknown;
  queryOptions: unknown;
  mutationOptions: unknown;
  queryKey: unknown;
  mutationKey: unknown;
  config: unknown;
};

export type ClientGroup = {
  [key: string]: Client | ClientGroup;
};

export function createClientGroup<T extends ClientGroup>(group: T) {
  return group;
}
