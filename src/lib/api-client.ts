import z, { ZodError } from "zod";
import type {
  ClientOptions,
  ClientPayload,
  OptionalPayload,
  ReactQueryOptions,
  ReactMutationOptions,
} from "../types";
import type { AxiosError, AxiosInstance } from "axios";
import { callApi } from "./call-api";
import {
  type UseMutationOptions,
  type UseQueryOptions,
} from "@tanstack/react-query";

export function createClient(axios: AxiosInstance) {
  function create<
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
    ): UseQueryOptions<TOutput, ZodError<TOutput> | AxiosError> => {
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
          try {
            const response = await callApi(apiOptionas, data);
            options.onSuccess?.(response.data, data);
            return response.data;
          } catch (error) {
            options.onError?.(error as ZodError<TOutput> | AxiosError, data);
            throw error;
          }
        },
        queryKey: queryKey(data),
        ...options,
      };
    };

    const mutationOptions = (
      _opts: ReactMutationOptions<TOutput, TInput, TVariables> | void,
    ): UseMutationOptions<
      TOutput,
      ZodError<TOutput> | AxiosError,
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
          const response = await callApi(apiOptionas, data);
          return response.data;
        },
        mutationKey: mutationKey(),
        ...options,
      };
    };

    return Object.assign(call, {
      queryOptions,
      mutationOptions,
      config: {
        ...apiOptionas,
        inputSchema: opts.inputSchema as undefined extends TInputSchema
          ? undefined
          : NonNullable<TInputSchema>,
        variablesSchema:
          opts.variablesSchema as undefined extends TVariablesSchema
            ? undefined
            : NonNullable<TVariablesSchema>,
      },
    });
  }

  return { create };
}
