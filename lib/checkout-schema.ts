import { z } from "zod";
import { isValidPhone } from "./phone.ts";

export const checkoutSchema = z.object({
  fullName: z.string().trim().min(2, "Вкажи ім'я та прізвище"),
  // Real validation via libphonenumber (lib/phone.ts): UA national numbers
  // and any international "+xx…" number a foreign customer may enter.
  // Runs on blur first (form mode "onTouched"), then on change.
  phone: z
    .string()
    .trim()
    .refine((v) => isValidPhone(v), "Невірний номер телефону"),
  // Required, and required for cash on delivery too. It is the only written
  // record the customer keeps of what they ordered — on an online payment it is
  // also the address Monobank's receipt goes to (see `customerEmails` in
  // app/api/orders/route.ts), and on any order it is how KeyCRM can reach them
  // for something a phone call cannot carry.
  //
  // `min(1)` runs before `email()` so an untouched field is told it is missing
  // rather than that it is malformed.
  // `max` matches the bound the order endpoint enforces (app/api/orders/route.ts).
  // Without it an over-long address passes the form and comes back as a generic
  // 400 with nothing to point the customer at.
  email: z
    .string({ error: "Вкажи email" })
    .trim()
    .min(1, "Вкажи email")
    .email("Невірний email")
    .max(320, "Занадто довгий email"),
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
