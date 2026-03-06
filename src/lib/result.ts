import type z from "zod";
import { ZodError } from "zod";
import type { Err, Ok } from "@/types";
import type { AxiosResponse } from "axios";

export const VALIDATION_ERROR_NAMES = {
  INPUT: "InputValidationError",
  VARIABLE: "VariableValidationError",
  OUTPUT: "OutputValidationError",
} as const;

export type ApiClientErrorProps = {
  type: keyof typeof VALIDATION_ERROR_NAMES;
  issues: z.core.$ZodIssue[];
};

export class ValidationError extends ZodError {
  constructor({ type, issues }: ApiClientErrorProps) {
    super(issues);

    this.name = VALIDATION_ERROR_NAMES[type];
  }
}

export function ok<T>(data: T, response: AxiosResponse): Ok<T> {
  return { success: true, data, response };
}

export function err<E>(error: E): Err<E> {
  return { success: false, error };
}
