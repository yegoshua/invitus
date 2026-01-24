# INVITUS Font Setup Guide

## Font Stack

- **Primary Font**: Archivo (Google Fonts) - For body text, UI elements, small headings
- **Display Font**: Druk Wide Cyr - For large headings, hero text, brand elements

## Installation

### 1. Install Archivo from Google Fonts

```typescript
// src/app/layout.tsx
import { Archivo } from 'next/font/google';

const archivo = Archivo({ 
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-archivo',
  display: 'swap',
});
```

### 2. Install Druk Wide Cyr (Self-hosted)

Since Druk Wide Cyr is a commercial font, you'll need to purchase and self-host it:

```bash
# Place font files in public/fonts/
public/
  fonts/
    DrukWideCyr-Bold.woff2
    DrukWideCyr-Bold.woff
    DrukWideCyr-Heavy.woff2
    DrukWideCyr-Heavy.woff
```

### 3. Define Font Faces

```css
/* src/app/globals.css */
@font-face {
  font-family: 'Druk Wide Cyr';
  src: url('/fonts/DrukWideCyr-Bold.woff2') format('woff2'),
       url('/fonts/DrukWideCyr-Bold.woff') format('woff');
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Druk Wide Cyr';
  src: url('/fonts/DrukWideCyr-Heavy.woff2') format('woff2'),
       url('/fonts/DrukWideCyr-Heavy.woff') format('woff');
  font-weight: 800;
  font-style: normal;
  font-display: swap;
}

@layer base {
  :root {
    --font-archivo: 'Archivo', sans-serif;
    --font-druk: 'Druk Wide Cyr', sans-serif;
  }
}
```

## Updated Tailwind Configuration

```typescript
// tailwind.config.ts
import type { Config } from "tailwindcss"

const config = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#E74223",
          hover: "#D93516",
          pressed: "#C12A0A",
        },
        coral: {
          DEFAULT: "#E74223",
          50: "#FEF2F0",
          100: "#FDE6E1",
          200: "#FBCCC3",
          300: "#F9B3A5",
          400: "#F79987",
          500: "#E74223",
          600: "#D93516",
          700: "#C12A0A",
          800: "#9A2208",
          900: "#731A06",
        },
        neutral: {
          DEFAULT: "#212121",
          50: "#F5F5F5",
          100: "#E5E5E5",
          200: "#D4D4D4",
          300: "#A3A3A3",
          400: "#737373",
          500: "#525252",
          600: "#3D3D3D",
          700: "#2D2D2D",
          800: "#212121",
          900: "#000000",
        },
      },
      fontFamily: {
        sans: ['var(--font-archivo)', 'Archivo', 'sans-serif'],
        display: ['var(--font-druk)', 'Druk Wide Cyr', 'sans-serif'],
      },
      fontSize: {
        // Display sizes (Druk Wide Cyr)
        'display-1': ['72px', { lineHeight: '1.1', fontWeight: '800', letterSpacing: '-0.02em' }],
        'display-2': ['56px', { lineHeight: '1.2', fontWeight: '800', letterSpacing: '-0.02em' }],
        'display-3': ['40px', { lineHeight: '1.3', fontWeight: '700', letterSpacing: '-0.01em' }],
        
        // Heading sizes (Archivo)
        'heading-1': ['32px', { lineHeight: '1.4', fontWeight: '700' }],
        'heading-2': ['24px', { lineHeight: '1.4', fontWeight: '600' }],
        'heading-3': ['20px', { lineHeight: '1.5', fontWeight: '600' }],
        
        // Body sizes (Archivo)
        'body-large': ['18px', { lineHeight: '1.6', fontWeight: '400' }],
        'body': ['16px', { lineHeight: '1.6', fontWeight: '400' }],
        'body-small': ['14px', { lineHeight: '1.5', fontWeight: '400' }],
        'caption': ['12px', { lineHeight: '1.4', fontWeight: '400' }],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-up": {
          from: { transform: "translateY(20px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.5s ease-out",
        "slide-up": "slide-up 0.5s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
```

## Updated Layout Configuration

```typescript
// src/app/layout.tsx
import { Archivo } from 'next/font/google';
import { Providers } from './providers';
import './globals.css';

const archivo = Archivo({ 
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-archivo',
  display: 'swap',
});

export const metadata = {
  title: 'INVITUS - Атлетичні пояси для нових рекордів',
  description: 'Преміальні пояси для пауерліфтингу та важкої атлетики. 10 років гарантії.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="uk" className={archivo.variable}>
      <body className={archivo.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
```

## Font Usage Guidelines

### When to Use Druk Wide Cyr (Display Font)

```tsx
// Large hero headings
<h1 className="font-display text-display-1 font-bold">
  Твій Gym Bro на кожному підході
</h1>

// Major section headings
<h2 className="font-display text-display-2 font-bold">
  Чому наші пояси — це база
</h2>

// Large display numbers or stats
<span className="font-display text-display-3 font-bold">
  4 100 ₴
</span>

// Brand/logo text
<div className="font-display text-2xl font-bold tracking-tight">
  INVITUS
</div>
```

### When to Use Archivo (Primary Font)

```tsx
// Body text
<p className="font-sans text-body text-neutral-300">
  Преміальні пояси для пауерліфтингу та важкої атлетики
</p>

// UI elements (buttons, labels, inputs)
<button className="font-sans text-body font-semibold">
  Додати в кошик
</button>

// Smaller headings
<h3 className="font-sans text-heading-2 font-semibold">
  Berserk Lifting Belt
</h3>

// Navigation
<nav className="font-sans text-body font-medium">
  <a href="/shop">Магазин</a>
</nav>
```

## Component Examples

### Hero Section with Proper Fonts

```tsx
// src/components/sections/hero-section.tsx
'use client';

import { Parallax } from 'react-scroll-parallax';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export function HeroSection() {
  return (
    <section className="relative h-screen overflow-hidden bg-neutral-900">
      <Parallax speed={-20} className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 via-neutral-800 to-black" />
      </Parallax>

      <div className="container relative z-10 flex h-full flex-col items-center justify-center text-center">
        {/* Main heading - Druk Wide Cyr */}
        <motion.h1
          className="mb-6 font-display text-display-2 font-bold text-white md:text-display-1"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          Твій Gym Bro <br />
          на кожному підході
        </motion.h1>

        {/* Subheading - Archivo */}
        <motion.p
          className="mb-8 max-w-2xl font-sans text-body-large text-neutral-300"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          Преміальні пояси для пауерліфтингу, що допоможуть тобі встановити нові рекорди
        </motion.p>

        {/* Button - Archivo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <Button 
            size="lg" 
            className="bg-primary hover:bg-primary-hover font-sans text-lg font-semibold px-8"
          >
            Забрати свій пояс
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
```

### Product Card with Proper Fonts

```tsx
// src/components/features/product-card.tsx
'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import type { Product } from '@/types/product';
import { Button } from '@/components/ui/button';

interface ProductCardProps {
  product: Product;
  index: number;
}

export function ProductCard({ product, index }: ProductCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="group"
    >
      <Link href={`/product/${product.slug}`}>
        <div className="relative overflow-hidden rounded-lg bg-neutral-800">
          <div className="aspect-square relative">
            {product.images[0] && (
              <Image
                src={product.images[0].url}
                alt={product.images[0].alt || product.name}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-110"
              />
            )}
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {/* Product name - Archivo */}
          <h3 className="font-sans text-lg font-semibold text-white group-hover:text-primary transition-colors">
            {product.name}
          </h3>
          
          {/* Price - Druk Wide Cyr for emphasis */}
          <div className="flex items-center gap-2">
            <span className="font-display text-xl font-bold text-primary">
              {product.price} ₴
            </span>
          </div>

          {/* Button - Archivo */}
          <Button className="w-full bg-primary hover:bg-primary-hover font-sans font-semibold">
            Додати в кошик
          </Button>
        </div>
      </Link>
    </motion.div>
  );
}
```

## Font Optimization Tips

### 1. Preload Critical Fonts

```tsx
// src/app/layout.tsx - Add to head
<link
  rel="preload"
  href="/fonts/DrukWideCyr-Bold.woff2"
  as="font"
  type="font/woff2"
  crossOrigin="anonymous"
/>
```

### 2. Use Font Display Swap

Already configured in both Google Fonts and @font-face declarations with `font-display: swap;`

### 3. Subset Fonts

For Archivo, we're loading both Latin and Cyrillic subsets (needed for Ukrainian text).

### 4. Reduce Font Weights

Only load the weights you actually use:
- Archivo: 400, 500, 600, 700, 800
- Druk Wide Cyr: 700 (Bold), 800 (Heavy)

## Font Pairing Guidelines

### Hierarchy Rules

```
Display (Druk Wide Cyr):
- Hero headlines (72px - 40px)
- Major section titles (56px - 40px)
- Large numerical displays
- Logo/brand text

Body (Archivo):
- All paragraph text (18px - 14px)
- UI elements (buttons, forms, navigation)
- Smaller headings (32px and below)
- Captions and labels
```

### Responsive Adjustments

```css
/* Mobile adjustments */
@media (max-width: 768px) {
  .text-display-1 {
    font-size: 40px;
    line-height: 1.2;
  }
  
  .text-display-2 {
    font-size: 32px;
    line-height: 1.2;
  }
  
  .text-display-3 {
    font-size: 28px;
    line-height: 1.3;
  }
}
```

## Alternative: If Druk Wide Cyr is Unavailable

If you can't access Druk Wide Cyr, these are good alternatives:

```typescript
// Alternative 1: Bebas Neue (Free, similar width)
import { Bebas_Neue } from 'next/font/google';

const bebasNeue = Bebas_Neue({ 
  weight: '400',
  subsets: ['latin'],
  variable: '--font-display',
});

// Alternative 2: Anton (Free, bold and wide)
import { Anton } from 'next/font/google';

const anton = Anton({ 
  weight: '400',
  subsets: ['latin', 'cyrillic'],
  variable: '--font-display',
});

// Alternative 3: Oswald (Free, condensed but bold)
import { Oswald } from 'next/font/google';

const oswald = Oswald({ 
  weight: ['700', '800'],
  subsets: ['latin', 'cyrillic'],
  variable: '--font-display',
});
```

## Performance Checklist

- ✅ Font files converted to WOFF2 (best compression)
- ✅ font-display: swap enabled
- ✅ Only necessary weights loaded
- ✅ Cyrillic subset included for Ukrainian text
- ✅ Fonts preloaded for critical text
- ✅ CSS font-face declarations optimized
- ✅ Fallback fonts specified

## Testing

Test your fonts across:
- Different browsers (Chrome, Firefox, Safari, Edge)
- Mobile devices (iOS Safari, Android Chrome)
- Different screen sizes
- Light and dark backgrounds
- Various text sizes

Verify that:
- Ukrainian characters render correctly
- Font weights appear as expected
- No layout shift during font loading
- Fallback fonts look acceptable during load