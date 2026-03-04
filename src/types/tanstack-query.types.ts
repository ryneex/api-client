import type {
  UseMutationOptions,
  UseQueryOptions,
} from "@tanstack/react-query";
import type { AxiosError } from "axios";
import type { ZodError } from "zod";
import type { ClientPayload } from "./client.types";

export type ReactQueryOptions<TOutput, TInput, TVariables> = Omit<
  UseQueryOptions<TOutput, ZodError<TOutput> | AxiosError>,
  "queryFn" | "queryKey"
> & { queryKey?: unknown[] } & (object extends ClientPayload<TInput, TVariables>
    ? unknown
    : { data: ClientPayload<TInput, TVariables> }) & {
    onSuccess?: (
      data: TOutput,
      payload: ClientPayload<TInput, TVariables>,
    ) => void;
    onError?: (
      error: ZodError<TOutput> | AxiosError,
      payload: ClientPayload<TInput, TVariables>,
    ) => void;
  };

export type ReactMutationOptions<TOutput, TInput, TVariables> = Omit<
  UseMutationOptions<
    TOutput,
    ZodError<TOutput> | AxiosError,
    object extends ClientPayload<TInput, TVariables>
      ? void
      : ClientPayload<TInput, TVariables>
  >,
  "mutationFn"
> & {};
