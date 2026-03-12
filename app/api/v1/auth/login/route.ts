import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    // Sign in with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return NextResponse.json({ detail: error.message }, { status: 401 });
    }

    // Get profile for role/org info
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    return NextResponse.json({
      access_token: data.session.access_token,
      role: profile?.role || 'BIDDER',
      org: profile?.org || 'BidderOrg',
      name: profile?.name || email.split('@')[0],
    });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message || 'Login failed' }, { status: 500 });
  }
}
