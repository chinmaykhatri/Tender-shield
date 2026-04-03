# TenderShield — Supabase Configuration

## Row Level Security (RLS)

The `rls-policies.sql` file contains RLS policies that must be applied via the Supabase Dashboard.

### How to Apply

1. Go to your Supabase project → **SQL Editor**
2. Paste the contents of `rls-policies.sql`
3. Click **Run**

### What it Does

| Table | Policy | Description |
|-------|--------|-------------|
| `tenders` | Select published | Anyone can view published/open/awarded tenders |
| `tenders` | Insert officers | Only MINISTRY_OFFICER and ADMIN can create tenders |
| `tenders` | Update own | Officers can update their own tenders |
| `bids` | Select own | Bidders see their own bids; auditors/admins see all |
| `bids` | Insert own | Bidders can submit bids |
| `user_verifications` | Select own | Users can only view their own verification status |
| `audit_logs` | Select auditors | Only CAG_AUDITOR and ADMIN can read audit logs |

### Important

- RLS policies work **alongside** application-layer authentication
- The service role key bypasses RLS — use only in server-side API routes
- Test policies in the Supabase Dashboard before deploying to production
