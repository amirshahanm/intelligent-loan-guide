import { z } from "zod";

const nationalCode = z.string().regex(/^\d{10}$/);
const birthDate = z.string().regex(/^1[34]\d{2}\/(?:0?[1-9]|1[0-2])\/(?:0?[1-9]|[12]\d|3[01])$/);
const schemas = {
  Shahkar: z
    .object({ nationalCode, mobile: z.string().regex(/^09\d{9}$/), isCompany: z.literal(false) })
    .strict(),
  CardMatch: z
    .object({ nationalCode, birthDate, cardNumber: z.string().regex(/^\d{16}$/) })
    .strict(),
  IbanMatch: z.object({ nationalCode, birthDate, iban: z.string().regex(/^IR\d{24}$/) }).strict(),
};
type Service = keyof typeof schemas;
type Request<S extends Service> = z.infer<(typeof schemas)[S]>;
type ExecutionContext = { caseId: string; inquiryId: string };

/** Internal only; caller must authorize ownership, scoped consent and reserve billing atomically. */
export function createApiirMatchingAdapter(options: {
  token: string;
  authorize: (service: Service, context: ExecutionContext) => Promise<void>;
  transport?: typeof fetch;
}) {
  if (!options.token.trim() || /[\r\n]/.test(options.token))
    throw new Error("apiir_not_configured");
  const transport = options.transport ?? fetch;
  return {
    async check<S extends Service>(service: S, input: Request<S>, context: ExecutionContext) {
      if (!Object.hasOwn(schemas, service)) throw new Error("apiir_unsupported_service");
      const body = schemas[service].parse(input);
      z.object({ caseId: z.string().uuid(), inquiryId: z.string().uuid() }).strict().parse(context);
      await options.authorize(service, context);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);
      try {
        const response = await transport(`https://s.api.ir/api/sw1/${service}`, {
          method: "POST",
          headers: { authorization: `Bearer ${options.token}`, "content-type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal,
          redirect: "error",
        });
        if (!response.ok) throw new Error("apiir_inquiry_failed");
        const payload: unknown = await response.json();
        const result = z.object({ success: z.literal(true), data: z.boolean() }).safeParse(payload);
        if (!result.success) throw new Error("apiir_inquiry_failed");
        return {
          matched: result.data.data,
          source: "api.ir" as const,
          service,
          asOf: new Date().toISOString(),
          inquiryId: context.inquiryId,
          demo: false as const,
        };
      } catch {
        // Unknown transport outcome is not a mismatch. Never retry a potentially billed inquiry.
        throw new Error("apiir_inquiry_failed");
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}
