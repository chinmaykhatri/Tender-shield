/**
 * TenderShield — IPFS Document Upload API
 * ========================================
 * POST /api/ipfs — Pin a tender document to IPFS
 * GET  /api/ipfs?cid=... — Get gateway URL for a CID
 *
 * Integrates with the blockchain: the returned CID is stored in the
 * Tender.DocumentsIPFSHash field on the Fabric ledger.
 */

import { NextRequest, NextResponse } from 'next/server';
import { pinTenderDocument, pinDocument, getGatewayURL, verifyDocumentIntegrity } from '@/lib/ipfs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action = 'pin-tender', tender_id, title, specifications, estimated_value, ministry, content, filename } = body;

    if (action === 'pin-tender') {
      // Pin a tender specification document
      if (!tender_id || !title) {
        return NextResponse.json({ error: 'tender_id and title are required' }, { status: 400 });
      }

      const result = await pinTenderDocument(
        tender_id,
        title,
        specifications || '',
        estimated_value || 0,
        ministry || 'UNKNOWN'
      );

      return NextResponse.json({
        success: result.success,
        cid: result.cid,
        size: result.size,
        pinned_via: result.pinned_via,
        gateway_url: result.url,
        timestamp: result.timestamp,
        blockchain_field: 'Tender.DocumentsIPFSHash',
        instructions: 'Store this CID in the tender record and on the blockchain ledger',
      });
    }

    if (action === 'pin-raw') {
      // Pin arbitrary content
      if (!content || !filename) {
        return NextResponse.json({ error: 'content and filename are required' }, { status: 400 });
      }

      const result = await pinDocument(content, filename);

      return NextResponse.json({
        success: result.success,
        cid: result.cid,
        size: result.size,
        pinned_via: result.pinned_via,
        gateway_url: result.url,
        timestamp: result.timestamp,
      });
    }

    if (action === 'verify') {
      // Verify document integrity against CID
      if (!content || !body.cid) {
        return NextResponse.json({ error: 'content and cid are required' }, { status: 400 });
      }

      const isValid = verifyDocumentIntegrity(content, body.cid);

      return NextResponse.json({
        success: true,
        valid: isValid,
        cid: body.cid,
        message: isValid
          ? 'Document integrity verified — content matches the IPFS CID'
          : 'Document TAMPERED — content does not match the stored CID',
      });
    }

    return NextResponse.json({ error: 'Unknown action. Use: pin-tender, pin-raw, verify' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const cid = req.nextUrl.searchParams.get('cid');
  if (!cid) {
    return NextResponse.json({
      service: 'TenderShield IPFS',
      supported_actions: ['pin-tender', 'pin-raw', 'verify'],
      strategies: ['Pinata Cloud', 'Local IPFS Daemon', 'SHA-256 Fallback'],
      env_vars: {
        PINATA_JWT: '(optional) Pinata JWT token for cloud pinning',
        PINATA_API_KEY: '(optional) Pinata API key',
        IPFS_API_URL: '(optional) Local IPFS daemon URL, default: http://localhost:5001',
      },
    });
  }

  return NextResponse.json({
    cid,
    gateway_url: getGatewayURL(cid),
    instructions: 'Use the gateway URL to retrieve the pinned document',
  });
}
