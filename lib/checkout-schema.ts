import { z } from "zod";

export const checkoutSchema = z.object({
  fullName: z.string().trim().min(2, "Вкажи ім'я та прізвище"),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[\d\s()-]{10,}$/, "Невірний номер телефону"),
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
