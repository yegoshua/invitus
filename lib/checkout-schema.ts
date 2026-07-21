import { z } from "zod";

export const checkoutSchema = z.object({
  fullName: z.string().trim().min(2, "Вкажи ім'я та прізвище"),
  // The input formats as-you-type to "+380 67 123 45 67" (lib/phone.ts),
  // so a complete number always matches this exact shape.
  phone: z
    .string()
    .trim()
    .regex(/^\+380 \d{2} \d{3} \d{2} \d{2}$/, "Невірний номер телефону"),
  email: z
    .string()
    .trim()
    .email("Невірний email")
    .optional()
    .or(z.literal("")),
  cityRef: z.string().min(1, "Обери місто зі списку"),
  cityName: z.string(),
  branchRef: z.string().min(1, "Вкажи відділення або поштомат"),
  branchName: z.string(),
  paymentMethod: z.enum(["online", "cod"]),
});

export type CheckoutFormData = z.infer<typeof checkoutSchema>;

export const checkoutDefaults: CheckoutFormData = {
  fullName: "",
  phone: "",
  email: "",
  cityRef: "",
  cityName: "",
  branchRef: "",
  branchName: "",
  paymentMethod: "online",
};
