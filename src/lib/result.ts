import type z from "zod";
import { ZodError } from "zod";
import type { Err, Ok } from "@/types";
import type { AxiosResponse } from "axios";

export const VALIDATION_ERROR_NAMES = {
  input: "InputValidationError",
  variable: "VariableValidationError",
  output: "OutputValidationError",
} as const;

export type ValidationErrorType = keyof typeof VALIDATION_ERROR_NAMES;

export type ApiClientErrorProps = {
  type: ValidationErrorType;
  issues: z.core.$ZodIssue[];
};

export class ValidationError extends ZodError {
  override type: ValidationErrorType;

  constructor({ type, issues }: ApiClientErrorProps) {
    super(issues);

    this.type = type;
    this.name = VALIDATION_ERROR_NAMES[type];
  }
}

export function ok<T>(data: T, response: AxiosResponse): Ok<T> {
  return { success: true, data, response };
}

export function err<E>(error: E): Err<E> {
  return { success: false, error };
}
