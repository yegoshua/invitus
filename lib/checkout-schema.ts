import { z } from "zod";
import { isValidPhone } from "@/lib/phone";

export const checkoutSchema = z.object({
  fullName: z.string().trim().min(2, "Вкажи ім'я та прізвище"),
  // Real validation via libphonenumber (lib/phone.ts): UA national numbers
  // and any international "+xx…" number a foreign customer may enter.
  // Runs on blur first (form mode "onTouched"), then on change.
  phone: z
    .string()
    .trim()
    .refine((v) => isValidPhone(v), "Невірний номер телефону"),
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
