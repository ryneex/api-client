import type {
  UseMutationOptions,
  UseQueryOptions,
} from "@tanstack/react-query";
import type { ClientError, ClientPayload } from "@/types";

export type ReactQueryOptions<TOutput, TInput, TVariables> = Omit<
  UseQueryOptions<TOutput, ClientError>,
  "queryFn" | "queryKey"
> & { queryKey?: unknown[] } & (object extends ClientPayload<TInput, TVariables>
    ? unknown
    : { data: ClientPayload<TInput, TVariables> }) & {
    onSuccess?: (
      data: TOutput,
      payload: ClientPayload<TInput, TVariables>,
    ) => void;
    onError?: (
      error: ClientError,
      payload: ClientPayload<TInput, TVariables>,
    ) => void;
  };

export type ReactMutationOptions<TOutput, TInput, TVariables> = Omit<
  UseMutationOptions<
    TOutput,
    ClientError,
    object extends ClientPayload<TInput, TVariables>
      ? void
      : ClientPayload<TInput, TVariables>
  >,
  "mutationFn"
> & {};
