import * as v from "valibot";

export const checkValueForFormErrors = <
  TSchema extends v.ObjectSchema<v.ObjectEntries, string | undefined>,
>(
  value: unknown,
  schema: TSchema,
) => {
  const result = v.safeParse(schema, value, {
    abortEarly: false,
    abortPipeEarly: true,
  });

  if (!result.success) {
    return {
      success: false,
      parsedValue: undefined,
      formErrors: getFormErrors(
        result.issues.map((issue) => ({
          msg: issue.message,
          fieldId: v.getDotPath(issue) ?? "",
        })),
      ),
    } as const;
  }

  return {
    success: true,
    parsedValue: result.output,
    formErrors: undefined,
  } as const;
};

export const getFormErrors = (errors: { msg: string; fieldId: string }[]) => {
  const errorObj: Record<
    string,
    {
      text: string;
      href: `#${string}`;
    }
  > = {};
  errors.forEach((error) => {
    errorObj[error.fieldId] = {
      text: error.msg,
      href: `#${error.fieldId}`,
    };
  });
  return errorObj;
};

export const getFormErrorsList = (errors: ReturnType<typeof getFormErrors>) => {
  return Object.values(errors);
};
