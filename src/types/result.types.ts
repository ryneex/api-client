import type { AxiosError, AxiosResponse } from "axios";
import type { ValidationError } from "@/lib";

export type Ok<T> = {
  success: true;
  data: T;
  response: AxiosResponse;
};

export type ClientError = ValidationError | AxiosError;

export type Err<E> = {
  success: false;
  error: E;
};

export type Result<T, E> = Ok<T> | Err<E>;

export type InferOk<T> = T extends Ok<infer K> ? K : never;
export type InferErr<T> = T extends Err<infer K> ? K : never;
