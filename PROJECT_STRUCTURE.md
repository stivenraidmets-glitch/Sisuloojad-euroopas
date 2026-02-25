# Paris → Tallinn Race – Project File Tree

```
euroopa-website/
├── .env.example
├── .env.local.example
├── README.md
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.ts
├── postcss.config.js
├── components.json          # shadcn
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                    # Home
│   │   ├── globals.css
│   │   ├── login/page.tsx
│   │   ├── team/[id]/page.tsx
│   │   ├── broadcast/page.tsx
│   │   ├── admin/
│   │   │   ├── layout.tsx              # admin auth guard
│   │   │   └── page.tsx
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/route.ts
│   │   │   ├── vote/route.ts
│   │   │   ├── broadcast/route.ts      # team location update
│   │   │   ├── stripe/checkout/route.ts
│   │   │   ├── stripe/webhook/route.ts
│   │   │   ├── wheel/spin/route.ts
│   │   │   └── ...
│   │   └── providers.tsx
│   ├── components/
│   │   ├── ui/                         # shadcn (Button, Card, Tabs, Dialog, Toast)
│   │   ├── map/
│   │   │   ├── RaceMap.tsx
│   │   │   └── TeamPin.tsx
│   │   ├── vote/
│   │   │   └── VoteModule.tsx
│   │   ├── shop/
│   │   │   └── PenaltyShop.tsx
│   │   ├── wheel/
│   │   │   └── WheelModal.tsx
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   └── ThemeToggle.tsx
│   │   └── admin/
│   │       └── ...
│   ├── lib/
│   │   ├── db.ts
│   │   ├── auth.ts
│   │   ├── stripe.ts
│   │   ├── pusher.ts
│   │   ├── validation.ts
│   │   └── utils.ts
│   └── types/
│       └── index.ts
└── public/
```
