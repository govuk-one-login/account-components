import * as v from "valibot";

export const getFormErrorsFromValueAndSchema = (
  value: unknown,
  schema: v.ObjectSchema<v.ObjectEntries, string | undefined>,
) => {
  const result = v.safeParse(schema, value, {
    abortEarly: false,
    abortPipeEarly: true,
  });

  if (!result.success) {
    return getFormErrors(
      result.issues.map((issue) => ({
        msg: issue.message,
        fieldId: v.getDotPath(issue) ?? "",
      })),
    );
  }

  return undefined;
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
