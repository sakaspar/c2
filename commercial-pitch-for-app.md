# C2 — Buy Now, Pay Later. Built for Tunisia.

**C2** is a modern BNPL platform that lets Tunisian shoppers split purchases into installments while giving merchants instant settlement and admins full risk control.

---

## The problem

Most Tunisians don't have credit cards. Even those who do face rigid bank loans, paperwork, and weeks of waiting. Merchants lose sales because customers can't pay upfront. There's no digital-first, identity-verified installment solution in the market.

## What C2 does

A customer walks into a store (or browses online), picks a product, and checks out with C2. They pay a fraction now, the rest over 3-4 installments. The merchant gets the full amount immediately. C2 handles identity verification, credit scoring, repayment tracking, and collections.

## How it works — three simple steps

1. **Register in 10 seconds.** Sign up with Google. Pick a username. Done.
2. **Verify your identity.** Upload your CIN, a selfie, and proof of address. If you're employed, add 3 months of bank statements for a higher credit limit.
3. **Shop and pay later.** Browse products, check out with BNPL, repay in installments.

## For merchants

- **Zero integration friction.** Products are listed through a simple API or admin panel.
- **Instant settlement.** You get paid the full amount at checkout — C2 takes the repayment risk.
- **More sales.** Customers who couldn't afford upfront now convert.

## For admins

- **Full KYC dashboard.** Review identity documents, employment status, and bank statements before approving clients.
- **Automated credit scoring.** Risk engine calculates limits based on employment, income, and repayment history.
- **Loan monitoring.** Track every active loan, repayment rate, default rate, and outstanding exposure in real time.

## Built with

- **Backend:** NestJS + TypeScript, file-based JSON data lake (zero database setup)
- **Frontend:** Next.js 14 with TailwindCSS, Google OAuth
- **Architecture:** Monorepo (pnpm workspaces), shared types package, clean domain modules

## Why it wins

| Traditional lending | C2 |
|---|---|
| Weeks to approve | 10-second registration |
| Paper forms | Google sign-in + photo upload |
| Bank visit required | Entirely digital |
| Credit card needed | No card required |
| Opaque decisions | Transparent credit scoring |
| Merchant waits for payment | Merchant paid instantly |

## Current state

Fully functional MVP with:
- Google OAuth registration and local login
- KYC document upload and admin review/approval flow
- Merchant and product management
- Loan origination, checkout, and installment repayment
- Automated credit scoring engine
- Admin analytics dashboard
- End-to-end API test suite

## Next steps

- Payment gateway integration (D17 or similar Tunisian processor)
- SMS/email notification delivery
- Production deployment
- Merchant self-service portal

---

**C2 — Credit where credit is due.**
