<?xml version="1.0" encoding="UTF-8"?>
<invitus_website_implementation>

<project_context>
<overview>
You are a senior full-stack developer tasked with building a production-ready e-commerce website for INVITUS, a Ukrainian sport equipment brand specializing in powerlifting belts. The website combines a high-performance landing page with stunning parallax animations and a fully functional online shop with Strapi CMS integration.
</overview>

<target_audience>
- Powerlifters and strength athletes
- Fitness enthusiasts
- Gym owners and trainers
- Age: 18-45 years
- Tech-savvy, mobile-first users
- Ukrainian-speaking primary audience (with potential for multi-language expansion)
</target_audience>

<business_goals>
- Showcase brand identity with bold, athletic design
- Drive product sales through optimized conversion funnel
- Build trust through social proof and testimonials
- Provide seamless shopping experience
- Establish SEO dominance in Ukrainian fitness equipment market
</business_goals>
</project_context>

<technical_specifications>
<tech_stack>
<frontend>
- Framework: Next.js 14+ (App Router)
- UI Library: Shadcn UI
- Styling: Tailwind CSS
- State Management: Zustand
- Data Fetching: Axios + TanStack React Query
- Animations: Framer Motion + react-scroll-parallax
- Forms: React Hook Form + Zod validation
- SEO: next-seo + structured data
</frontend>

<backend>
- CMS: Strapi 4+ (Headless CMS)
- Database: PostgreSQL
- Image Optimization: Strapi Media Library + Next.js Image
- API: RESTful with Strapi
</backend>

<deployment>
- Frontend: Vercel (with ISR for product pages)
- Backend: Railway/DigitalOcean/AWS
- CDN: Cloudflare for static assets
- Analytics: Google Analytics 4 + Meta Pixel
</deployment>
</tech_stack>

<architecture_patterns>
- Feature-Sliced Design for frontend architecture
- Atomic Design for component organization
- Server Components for initial renders
- Client Components for interactive elements
- API Routes for serverless functions
- Incremental Static Regeneration for product pages
</architecture_patterns>
</technical_specifications>

<design_system>
<color_palette>
<primary>
<coral>#E74223</coral> <!-- Brand primary color for CTAs, accents -->
<coral_hover>#D93516</coral_hover>
<coral_pressed>#C12A0A</coral_pressed>
</primary>

<neutrals>
<white>#FFFFFF</white>
<black>#000000</black>
<gray_900>#212121</gray_900>
<gray_800>#2D2D2D</gray_800>
<gray_700>#3D3D3D</gray_700>
<gray_600>#525252</gray_600>
<gray_500>#737373</gray_500>
<gray_400>#A3A3A3</gray_400>
<gray_300>#D4D4D4</gray_300>
<gray_200>#E5E5E5</gray_200>
<gray_100>#F5F5F5</gray_100>
</neutrals>

<semantic>
<success>#10B981</success>
<warning>#F59E0B</warning>
<error>#EF4444</error>
<info>#3B82F6</info>
</semantic>
</color_palette>

<typography>
<font_families>
Primary: Archivo (headings, UI elements, paragraph text)
Display: Druk Wide Cyr (large headings, brand elements, hero text)
Body: Archivo (paragraph text, descriptions)
</font_families>

<type_scale>
<heading_1>72px / 1.1 / 800</heading_1>
<heading_2>56px / 1.2 / 800</heading_2>
<heading_3>40px / 1.3 / 700</heading_3>
<heading_4>32px / 1.4 / 700</heading_4>
<heading_5>24px / 1.4 / 600</heading_5>
<heading_6>20px / 1.5 / 600</heading_6>
<body_large>18px / 1.6 / 400</body_large>
<body>16px / 1.6 / 400</body>
<body_small>14px / 1.5 / 400</body_small>
<caption>12px / 1.4 / 400</caption>
</type_scale>

<mobile_adjustments>
Reduce heading sizes by 30-40% on mobile
Increase line-height slightly for better readability
Minimum touch target: 44x44px
</mobile_adjustments>
</typography>

<spacing_system>
Base unit: 4px (0.25rem)
Scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128px
Container max-width: 1440px
Content max-width: 1200px
Section vertical padding: 80px desktop, 48px mobile
</spacing_system>

<component_styling>
<buttons>
<primary>
Background: #E74223
Text: #FFFFFF
Padding: 16px 32px
Border-radius: 8px
Font: 16px / 600
Hover: scale(1.02) + shadow
</primary>

<secondary>
Background: transparent
Border: 2px solid #E74223
Text: #E74223
Same padding and interactions as primary
</secondary>

<ghost>
Background: transparent
Text: #FFFFFF or #212121 (context-dependent)
Hover: slight background tint
</ghost>
</buttons>

<cards>
Background: #FFFFFF or rgba(255, 255, 255, 0.05) for dark sections
Border-radius: 16px
Padding: 24px
Shadow: subtle elevation
Hover: lift effect + border highlight
</cards>

<inputs>
Border: 2px solid #E5E5E5
Border-radius: 8px
Padding: 12px 16px
Focus: border-color #E74223, ring effect
Error: border-color #EF4444
</inputs>
</component_styling>

<animation_principles>
<timing>
Fast: 150ms (micro-interactions)
Medium: 300ms (most transitions)
Slow: 500ms (page transitions, complex animations)
Easing: cubic-bezier(0.4, 0, 0.2, 1) - smooth ease-out
</timing>

<scroll_animations>
Parallax sections: different scroll speeds for depth
Reveal animations: fade-in + slide-up on scroll
Stagger animations: sequential reveals for lists
</scroll_animations>
</animation_principles>
</design_system>

<landing_page_sections>
<section_1_hero>
<purpose>
Capture attention immediately, communicate brand essence, drive primary action
</purpose>

<content>
- Large heading: "Твій Gym Bro на кожному підході" (or similar powerful tagline)
- Subheading: Brief value proposition
- Primary CTA: "Забрати свій пояс" (orange button)
- Background: Dark (#212121) with subtle texture or gradient
- Hero image/video: Athletic imagery or product showcase
</content>

<technical_implementation>
- Full viewport height (100vh)
- Parallax background image/video
- Animated text reveal on load (stagger effect)
- CTA button with pulse/glow animation
- Scroll indicator at bottom
- Optimized video loading (poster image + lazy load)
</technical_implementation>

<animation_sequence>
1. Background fade-in (0ms)
2. Logo fade-in (200ms)
3. Heading slide-up + fade-in (400ms)
4. Subheading slide-up + fade-in (600ms)
5. CTA slide-up + fade-in (800ms)
6. Scroll indicator fade-in (1200ms)
</animation_sequence>
</section_1_hero>

<section_2_product_showcase>
<purpose>
Immediately showcase main product line, enable quick browsing
</purpose>

<content>
- Section heading: "Твій Gym Bro на кожному підході"
- Product grid: 4 lifting belts
  - Berserk Lifting Belt (4 100 ₴)
  - Tiger Lifting Belt (4 100 ₴)
  - Koi Lifting Belt (4 100 ₴)
  - Poseidon Lifting Belt (4 100 ₴)
- Product cards: Image, name, price
- "Чекнути усе" button (outline style)
</content>

<technical_implementation>
- Grid layout: 4 columns desktop, 2 mobile
- Product images: optimized WebP/AVIF format
- Hover effects: image zoom, card lift
- Price formatting: Ukrainian locale
- Link to individual product pages
- Skeleton loading states
- Data fetched from Strapi CMS
</technical_implementation>

<parallax_effect>
Product cards appear with stagger animation on scroll
Background elements move at different speeds
Section title parallax effect
</parallax_effect>
</section_2_product_showcase>

<section_3_why_section>
<purpose>
Build credibility, address objections, highlight unique value
</purpose>

<content>
- Section heading: "Чому наші пояси — це база"
- Feature card with illustration: "Фіксація в один клік" + description
- Video showcase: "Ми знаємо, що тобі потрібно"
- Feature grid with custom illustrations:
  - "+20 кг до рекорду" - barbell with belt illustration
  - "Запланий захист попереку" - castle tower with belt
  - "10 років гарантії" - cracked hourglass with belt
</content>

<technical_implementation>
- Alternating layout: text left/right, media opposite
- Custom SVG illustrations (inline for animation)
- Video player with custom controls
- Lazy loading for video content
- Illustration animations on scroll (scale, rotate)
- Responsive grid: 3 columns desktop, 1 mobile
</technical_implementation>

<custom_illustrations>
Create or commission unique illustrations matching the design style:
- Bold, monochrome line art on coral background
- Belt integrated into each concept
- Broken/shattered elements showing strength
- Consistent style across all three
</custom_illustrations>
</section_3_why_section>

<section_4_testimonials>
<purpose>
Social proof through user-generated content, build trust
</purpose>

<content>
- Section heading: "Ті, хто вже рвуть рекорди"
- Carousel of testimonial videos/images
- Navigation arrows (left/right)
</content>

<technical_implementation>
- Embla Carousel or Swiper.js integration
- Autoplay with pause on hover
- Touch/swipe support
- Video playback on view
- Thumbnail navigation
- Lazy loading for carousel items
</technical_implementation>

<data_structure>
Testimonial type:
- media_url: string
- media_type: 'video' | 'image'
- author_name: string
- author_handle?: string
- content?: string
- featured: boolean
</data_structure>
</section_4_testimonials>

<section_5_shop_cta>
<purpose>
Transition to shopping, showcase product variety
</purpose>

<content>
- Section heading: "Обирай екіп для нових рекордів"
- Product cards grid (same as section 2)
- "Чекнути усе" CTA button
- Coral background section for contrast
</content>

<technical_implementation>
- Same product card component as section 2 (reusable)
- Different background color for visual separation
- Fetch latest/featured products from Strapi
- Link to shop page
</technical_implementation>
</section_5_shop_cta>

<section_6_faq>
<purpose>
Address common questions, reduce support burden, improve SEO
</purpose>

<content>
- Section heading: "Щось неясно? Розповідаємо як є"
- Accordion-style FAQ items:
  - "Чи можлива доставка закордон?"
  - "Чи можна замовити пояс з власним дизайном?"
  - "Як правильно підібрати розмір поясу?"
  - "Коли з'являться в наявності нові товари?"
  - "Як з вами зв'язатися?"
</content>

<technical_implementation>
- Shadcn Accordion component
- Smooth expand/collapse animations
- Single-open mode (one question at a time)
- Down arrow icon animation on expand
- FAQ Schema.org structured data for SEO
- Content manageable via Strapi
</technical_implementation>

<structured_data_example>
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [...]
}
</structured_data_example>
</section_6_faq>

<section_7_benefits_grid>
<purpose>
Final value reinforcement before footer
</purpose>

<content>
Three benefit cards with icons:
- "Підтримка" - Доповможемо, навіть якщо на годинниках вже 18:01
- "Доставка" - Зробимо відправлення, навіть якщо на вулиці спека 40 градусів
- "Повернення" - Відділу гроші назад, навіть якщо вже пройшло 15 днів
</content>

<technical_implementation>
- Grid: 3 columns desktop, 1 column mobile
- Icon + heading + description structure
- Custom icons or icon library (Lucide React)
- Hover effects on cards
</technical_implementation>
</section_7_benefits_grid>
</landing_page_sections>

<shop_functionality>
<pages_structure>
<shop_page>
- Product grid with filtering
- Category sidebar/tabs
- Sort options (price, name, newest)
- Pagination or infinite scroll
- Quick view modal
- Add to cart functionality
</shop_page>

<product_page>
- Image gallery with zoom
- Product title, price, SKU
- Size/variant selector
- Quantity input
- Add to cart button
- Product description tabs (Опис, Характеристики, Відгуки)
- Related products
- Structured data for products
</product_page>

<cart_page>
- Cart items list
- Quantity adjustment
- Remove item
- Subtotal, shipping, total
- Promo code input
- Checkout button
- Empty cart state
</cart_page>

<checkout_page>
- Multi-step form (Contact → Shipping → Payment)
- Form validation
- Payment integration (placeholder for now)
- Order summary sidebar
- Loading states
- Success/error handling
</checkout_page>
</pages_structure>

<category_structure>
Main categories:
- Атлетичні пояси (Lifting Belts)
- Футболки (T-shirts)
- Кистові бинти (Wrist Wraps)
- Лямки-всмки (Lifting Straps)
- Наколінники (Knee Sleeves)

Each category should support:
- Subcategories
- Custom descriptions
- Featured image
- SEO metadata
</category_structure>

<product_data_model>
Product attributes:
- id: unique identifier
- name: product name (multilingual support)
- slug: URL-friendly name
- description: rich text
- price: number
- sale_price?: number
- currency: UAH
- sku: string
- images: array of image objects
- category: relation to category
- sizes?: array of size options
- colors?: array of color options
- stock: number
- featured: boolean
- meta_title: string
- meta_description: string
- specifications: flexible JSON structure
</product_data_model>

<cart_state_management>
Zustand store structure:
```typescript
interface CartItem {
  productId: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  size?: string;
  color?: string;
}

interface CartStore {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
}
```
Persist to localStorage
</cart_state_management>

<checkout_flow>
Step 1: Contact Information
- Full name
- Email
- Phone number

Step 2: Shipping Address
- Address line 1
- Address line 2
- City
- Postal code
- Country (default: Ukraine)

Step 3: Payment Method
- Credit/debit card (Stripe/PayPal placeholder)
- Cash on delivery
- Bank transfer

Validation: React Hook Form + Zod schema
Error handling: toast notifications
Success: redirect to thank you page with order number
</checkout_flow>
</shop_functionality>

<strapi_cms_setup>
<content_types>
<product>
Fields:
- name: Text (required)
- slug: UID (required)
- description: Rich Text
- short_description: Text
- price: Number (required)
- sale_price: Number
- sku: Text (required, unique)
- images: Media (multiple)
- category: Relation (many-to-one)
- sizes: Component (repeatable)
- colors: Component (repeatable)
- stock: Number (default: 0)
- featured: Boolean
- specifications: JSON
- seo: Component (single)
</product>

<category>
Fields:
- name: Text (required)
- slug: UID (required)
- description: Text
- image: Media (single)
- parent: Relation (self-referencing)
- products: Relation (one-to-many)
- seo: Component (single)
</category>

<testimonial>
Fields:
- author_name: Text
- author_handle: Text
- content: Text
- media: Media (single)
- media_type: Enumeration (video, image)
- featured: Boolean
- order: Number
</testimonial>

<faq_item>
Fields:
- question: Text (required)
- answer: Rich Text (required)
- category: Text
- order: Number
</faq_item>

<page_content>
For managing homepage sections dynamically:
- section_type: Enumeration
- title: Text
- content: Rich Text
- image: Media
- cta_text: Text
- cta_link: Text
- order: Number
</page_content>
</content_types>

<api_configuration>
Enable CORS for frontend domain
Set up API tokens for secure access
Configure media library (max file size, allowed types)
Enable GraphQL (optional, for complex queries)
Set up webhooks for cache invalidation
</api_configuration>

<media_optimization>
- Image formats: WebP, AVIF with fallbacks
- Responsive images: multiple sizes
- Lazy loading configuration
- CDN integration (Cloudflare)
- Automatic image optimization on upload
</media_optimization>
</strapi_cms_setup>

<seo_optimization>
<technical_seo>
- Next.js metadata API for all pages
- Canonical URLs
- Open Graph tags
- Twitter Card tags
- XML sitemap generation
- Robots.txt configuration
- Structured data (JSON-LD) for:
  - Organization
  - Products
  - FAQs
  - Breadcrumbs
  - Reviews
</technical_seo>

<on_page_seo>
Landing page:
- Title: "INVITUS - Атлетичні пояси для нових рекордів | Україна"
- Description: "Преміальні пояси для пауерліфтингу та важкої атлетики. 10 років гарантії. Безкоштовна доставка по Україні. Замовляйте екіп для ваших рекордів!"
- H1: "Твій Gym Bro на кожному підході"
- Alt text for all images
- Semantic HTML structure

Product pages:
- Title: "[Product Name] - [Price] UAH | INVITUS"
- Description: Product-specific
- H1: Product name
- Product schema markup
- Image alt text with product details
</on_page_seo>

<performance_targets>
- Lighthouse score: 90+ on all metrics
- First Contentful Paint: < 1.5s
- Largest Contentful Paint: < 2.5s
- Time to Interactive: < 3.5s
- Cumulative Layout Shift: < 0.1
</performance_targets>

<internationalization_ready>
Set up for future expansion:
- i18n routing structure (/uk, /en)
- Language switcher component
- Content translation in Strapi
- Currency conversion support
</internationalization_ready>
</seo_optimization>

<parallax_animation_implementation>
<library_choice>
Primary: react-scroll-parallax
- Lightweight and performant
- Easy-to-use hooks and components
- Good SSR support with Next.js

Supplementary: Framer Motion
- For complex animations
- Page transitions
- Interactive elements
</library_choice>

<parallax_effects>
Hero section:
- Background image: slower scroll speed (0.5x)
- Content: normal speed (1x)
- Decorative elements: faster speed (1.5x)

Product showcase:
- Section background: 0.3x
- Product cards: stagger reveal on scroll
- Individual card parallax on hover

Why section:
- Illustrations: rotate + scale on scroll
- Background shapes: 0.4x speed
- Text blocks: fade + slide on scroll

Full-page sections:
- Each major section with different background colors
- Smooth scroll snap points
- Section indicators/progress bar
</parallax_effects>

<performance_considerations>
- Use CSS transforms (translateY, scale) instead of top/left
- Implement Intersection Observer for scroll triggers
- Debounce scroll events
- Disable parallax on mobile if performance issues
- Use will-change CSS property sparingly
- GPU acceleration for animations
</performance_considerations>

<code_example>
```tsx
import { Parallax } from 'react-scroll-parallax';

export function HeroSection() {
  return (
    <section className="relative h-screen overflow-hidden">
      <Parallax speed={-20} className="absolute inset-0">
        <Image 
          src="/hero-bg.jpg" 
          alt="Hero background" 
          fill 
          className="object-cover"
        />
      </Parallax>
      
      <div className="relative z-10">
        <Parallax speed={10}>
          <h1>Твій Gym Bro на кожному підході</h1>
        </Parallax>
      </div>
    </section>
  );
}
```
</code_example>
</parallax_animation_implementation>

<responsive_design>
<breakpoints>
- Mobile: 320px - 767px
- Tablet: 768px - 1023px
- Desktop: 1024px - 1439px
- Large Desktop: 1440px+
</breakpoints>

<mobile_optimizations>
- Hamburger navigation menu
- Touch-friendly interactions (44px minimum)
- Simplified layouts (single column)
- Reduced animation complexity
- Bottom sheet for product quick view
- Sticky add-to-cart bar on product pages
- Optimized image sizes for mobile networks
</mobile_optimizations>

<tablet_adaptations>
- 2-column product grids
- Sidebar navigation instead of hamburger
- Maintained animations but lighter
- Optimized touch targets
</tablet_adaptations>

<testing_checklist>
- Test on real devices (iOS Safari, Android Chrome)
- Verify touch interactions
- Check font scaling and readability
- Test with slow 3G connection
- Verify forms are usable on small screens
- Test landscape orientation
- Accessibility testing (screen readers)
</testing_checklist>
</responsive_design>

<implementation_phases>
<phase_1_foundation>
Duration: 1-2 weeks

Tasks:
1. Project setup and configuration
   - Initialize Next.js project with TypeScript
   - Configure Tailwind CSS and Shadcn UI
   - Set up ESLint and Prettier
   - Configure Zustand stores
   
2. Design system implementation
   - Create theme configuration
   - Build reusable component library
   - Implement typography system
   - Set up color palette with CSS variables
   
3. Core layout components
   - Header with navigation
   - Footer
   - Page layouts
   - Responsive grid system

Deliverable: Styled component library and core layout
</phase_1_foundation>

<phase_2_landing_page>
Duration: 2-3 weeks

Tasks:
1. Hero section with parallax
2. Product showcase section
3. Why section with custom illustrations
4. Testimonials carousel
5. FAQ accordion
6. Benefits grid
7. Implement all animations and transitions
8. Mobile responsive optimizations

Deliverable: Fully functional, animated landing page
</phase_2_landing_page>

<phase_3_shop_functionality>
Duration: 2-3 weeks

Tasks:
1. Shop page with filtering and sorting
2. Product detail pages
3. Cart functionality
4. Checkout flow
5. Strapi CMS integration
6. Product data fetching and caching
7. Cart state management
8. Payment integration (placeholder)

Deliverable: Complete e-commerce functionality
</phase_3_shop_functionality>

<phase_4_cms_and_content>
Duration: 1 week

Tasks:
1. Set up Strapi CMS
2. Configure content types
3. Create API endpoints
4. Populate initial content
5. Connect frontend to CMS
6. Test data flow

Deliverable: Integrated CMS with populated content
</phase_4_cms_and_content>

<phase_5_seo_and_optimization>
Duration: 1 week

Tasks:
1. Implement metadata for all pages
2. Add structured data
3. Generate sitemap
4. Configure robots.txt
5. Performance optimization
6. Lighthouse audits and fixes
7. Image optimization
8. Code splitting and lazy loading

Deliverable: SEO-optimized, performant website
</phase_5_seo_and_optimization>

<phase_6_testing_and_launch>
Duration: 1 week

Tasks:
1. Cross-browser testing
2. Mobile device testing
3. Accessibility audit
4. User acceptance testing
5. Bug fixes
6. Deployment configuration
7. Launch checklist
8. Post-launch monitoring setup

Deliverable: Production-ready website
</phase_6_testing_and_launch>
</implementation_phases>

<code_quality_standards>
<typescript_requirements>
- Strict mode enabled
- No implicit any
- Proper type definitions for all props
- Type-safe API responses
- Shared types for Strapi data models
</typescript_requirements>

<component_structure>
- Use Server Components by default
- Client Components only when needed (interactivity, hooks)
- Atomic design principles
- Single responsibility principle
- Reusable, composable components
</component_structure>

<file_organization>
```
src/
├── app/                    # Next.js App Router
│   ├── (marketing)/       # Landing page route group
│   ├── shop/              # Shop pages
│   ├── product/[slug]/    # Dynamic product pages
│   └── api/               # API routes
├── components/
│   ├── ui/                # Shadcn components
│   ├── layout/            # Layout components
│   ├── sections/          # Page sections
│   └── features/          # Feature-specific components
├── lib/
│   ├── strapi.ts          # Strapi client
│   ├── api/               # API functions
│   └── utils.ts           # Utility functions
├── stores/
│   ├── cart.ts            # Cart store
│   └── ui.ts              # UI state store
├── types/                 # TypeScript types
├── styles/                # Global styles
└── hooks/                 # Custom React hooks
```
</file_organization>

<testing_requirements>
- Unit tests for utility functions
- Component tests for critical UI
- E2E tests for checkout flow
- Performance regression tests
- Accessibility testing
</testing_requirements>

<documentation_requirements>
- README with setup instructions
- Component Storybook (optional but recommended)
- API documentation
- Deployment guide
- Content management guide for Strapi
</documentation_requirements>
</code_quality_standards>

<deployment_checklist>
<pre_deployment>
- [ ] All tests passing
- [ ] Lighthouse scores > 90
- [ ] No console errors
- [ ] Environment variables configured
- [ ] Database backups set up
- [ ] SSL certificates configured
- [ ] CDN configured for static assets
- [ ] Error monitoring set up (Sentry)
- [ ] Analytics implemented (GA4, Meta Pixel)
</pre_deployment>

<vercel_configuration>
- [ ] Production domain connected
- [ ] Environment variables set
- [ ] ISR configured for product pages
- [ ] Edge functions enabled for API routes
- [ ] Image optimization enabled
- [ ] Analytics enabled
</vercel_configuration>

<strapi_deployment>
- [ ] Database provisioned (PostgreSQL)
- [ ] Environment variables set
- [ ] Admin panel secured
- [ ] Backups scheduled
- [ ] Media storage configured (S3/Cloudflare)
- [ ] API rate limiting configured
</strapi_deployment>

<post_deployment>
- [ ] Smoke tests on production
- [ ] Monitor error rates
- [ ] Check Core Web Vitals
- [ ] Verify payment processing (when implemented)
- [ ] Test order flow end-to-end
- [ ] Set up uptime monitoring
</post_deployment>
</deployment_checklist>

<future_enhancements>
<phase_2_features>
- User accounts and authentication
- Order history and tracking
- Wishlist functionality
- Product reviews and ratings
- Advanced filtering (price range, features)
- Size guide with measurements
- Live chat support
- Newsletter subscription
</phase_2_features>

<phase_3_features>
- Multi-language support (English, Polish)
- Multi-currency support
- Loyalty program
- Referral system
- Blog/content marketing section
- Advanced analytics dashboard
- Inventory management integration
- Automated email marketing
</phase_3_features>
</future_enhancements>

</invitus_website_implementation>