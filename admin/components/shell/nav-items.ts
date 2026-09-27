import { ExpensesIcon, OrdersIcon, OverviewIcon, ProductsIcon, TrafficIcon } from "@/components/icons";

export const NAV = [
  { href: "/", label: "Огляд", icon: OverviewIcon },
  { href: "/orders", label: "Замовлення", icon: OrdersIcon },
  { href: "/products", label: "Товари", icon: ProductsIcon },
  { href: "/traffic", label: "Трафік", icon: TrafficIcon },
  { href: "/expenses", label: "Витрати", icon: ExpensesIcon },
] as const;
