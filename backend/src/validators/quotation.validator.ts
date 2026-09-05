import { z } from "zod";

export const createQuotationSchema = z.object({
  body: z.object({
    customerId: z.string().uuid(),

    salesRepId: z.string().uuid(),

    items: z
      .array(
        z.object({
          productId: z.string().uuid(),

          quantity: z.number().positive(),

          discountPercent: z.number().min(0).max(100),
        }),
      )
      .min(1),
  }),
});
