import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { email, password, name, role, org } = await req.json();

    // Sign up with Supabase Auth
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      return NextResponse.json({ detail: error.message }, { status: 400 });
    }

    if (data.user) {
      // Create profile
      const userRole = role || 'BIDDER';
      const userOrg = org || (
        email.includes('gov.in') ? 'MinistryOrg' :
        email.includes('cag') ? 'AuditorOrg' :
        email.includes('nic') ? 'NICOrg' : 'BidderOrg'
      );
      const detectedRole = role || (
        email.includes('gov.in') ? 'OFFICER' :
        email.includes('cag') ? 'AUDITOR' :
        email.includes('nic') ? 'NIC_ADMIN' : 'BIDDER'
      );

      await supabase.from('profiles').upsert({
        id: data.user.id,
        email,
        name: name || email.split('@')[0],
        role: detectedRole,
        org: userOrg,
      });

      // Auto sign in after registration
      const { data: loginData } = await supabase.auth.signInWithPassword({ email, password });

      if (loginData?.session) {
        return NextResponse.json({
          access_token: loginData.session.access_token,
          role: detectedRole,
          org: userOrg,
          name: name || email.split('@')[0],
          message: 'Account created successfully!',
        });
      }
    }

    return NextResponse.json({
      message: 'Account created! Please check your email to verify, then log in.',
      requires_verification: true,
    });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message || 'Registration failed' }, { status: 500 });
  }
}
