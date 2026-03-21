// FILE: app/api/verify/email-domain/route.ts
// PURPOSE: Real-time email domain validation per role
// No external API needed — pure validation logic

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = await req.json();
  const { email, role } = body;

  if (!email || !role) {
    return Response.json({ valid: false, error: 'Email and role required' });
  }

  const lower = email.toLowerCase().trim();

  const validations: Record<string, { regex: RegExp; message: string }> = {
    MINISTRY_OFFICER: {
      regex: /^[a-z0-9._%+-]+@[a-z0-9.-]+\.(gov\.in|nic\.in)$/,
      message: 'Ministry officers must use a .gov.in or .nic.in email address',
    },
    SENIOR_OFFICER: {
      regex: /^[a-z0-9._%+-]+@[a-z0-9.-]+\.(gov\.in|nic\.in)$/,
      message: 'Senior officers must use a .gov.in or .nic.in email address',
    },
    CAG_AUDITOR: {
      regex: /^[a-z0-9._%+-]+@cag\.gov\.in$/,
      message: 'CAG auditors must use a @cag.gov.in email address only',
    },
    BIDDER: {
      regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: 'Please enter a valid email address',
    },
  };

  const validation = validations[role];
  if (!validation) {
    return Response.json({ valid: false, error: 'Invalid role' });
  }

  const isValid = validation.regex.test(lower);

  // Extract ministry from domain
  let ministry = null;
  if (isValid && (role === 'MINISTRY_OFFICER' || role === 'SENIOR_OFFICER')) {
    const domainMap: Record<string, string> = {
      'morth.gov.in': 'Ministry of Road Transport & Highways',
      'moh.gov.in': 'Ministry of Health & Family Welfare',
      'mohfw.gov.in': 'Ministry of Health & Family Welfare',
      'moe.gov.in': 'Ministry of Education',
      'mod.gov.in': 'Ministry of Defence',
      'finmin.gov.in': 'Ministry of Finance',
      'meity.gov.in': 'Ministry of Electronics & IT',
      'mohua.gov.in': 'Ministry of Housing & Urban Affairs',
      'rural.gov.in': 'Ministry of Rural Development',
      'commerce.gov.in': 'Ministry of Commerce & Industry',
      'nic.in': 'National Informatics Centre',
    };
    const domain = lower.split('@')[1];
    ministry = domainMap[domain] ?? 'Government of India';
  }

  return Response.json({
    valid: isValid,
    ministry,
    error: isValid ? null : validation.message,
  });
}
