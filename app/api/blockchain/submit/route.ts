// FILE: app/api/blockchain/submit/route.ts
// FEATURE: Feature 2 — Real Hyperledger on Oracle Cloud
// DEMO MODE: Returns fake TX hash, stores in Supabase
// REAL MODE: Submits to real Hyperledger Fabric on Oracle VM

import { NextRequest, NextResponse } from 'next/server';
import { withFallback } from '@/lib/mode/dualMode';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { function_name, args, channel } = await req.json();

    const result = await withFallback({
      service: 'blockchain',
      label: `Blockchain TX: ${function_name}`,

      realFn: async () => {
        const fabricResponse = await fetch(
          `http://${process.env.FABRIC_PEER_ENDPOINT}/submit`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              channel_id: channel ?? 'tenderchannel',
              chaincode_id: 'tendershield',
              function: function_name,
              args: (args as string[]).map(String),
            }),
          }
        );
        if (!fabricResponse.ok) throw new Error('Fabric submission failed');
        const data = await fabricResponse.json();
        return {
          tx_hash: data.transaction_id as string,
          block_number: data.block_number as number,
          timestamp_ist: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
          channel: channel ?? 'tenderchannel',
          verified: true,
          explorer_url: `http://${process.env.FABRIC_EXPLORER_URL}/transaction/${data.transaction_id}`,
        };
      },

      demoFn: (): any => {
        const txHash = '0x' + Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
        const blockNumber = 1200 + Math.floor(Math.random() * 300);
        return {
          tx_hash: txHash,
          block_number: blockNumber,
          timestamp_ist: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
          channel: channel ?? 'tenderchannel',
          verified: false,
          demo: true,
        };
      },
    });

    // Store TX record in Supabase (powers block explorer page)
    try {
      const d = result.data as { tx_hash: string; block_number: number; demo?: boolean };
      await supabase.from('blockchain_transactions').insert({
        tx_hash: d.tx_hash,
        block_number: d.block_number,
        function_name,
        args: JSON.stringify(args),
        channel: channel ?? 'tenderchannel',
        is_real: !d.demo,
        created_at: new Date().toISOString(),
      });
    } catch { /* non-critical — table might not exist yet */ }

    return NextResponse.json(result.data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
