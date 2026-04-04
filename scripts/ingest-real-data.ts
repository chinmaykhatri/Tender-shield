/**
 * Real Data Ingestion Script — TenderShield
 * ═══════════════════════════════════════════
 * 
 * Converts real procurement CSV data into the format expected by
 * the ML training pipeline. Supports:
 *   - GeM exported CSVs
 *   - CPPP tender data
 *   - Custom CSV with column mapping
 * 
 * Usage:
 *   npx tsx scripts/ingest-real-data.ts --input data/real-tenders/*.csv
 *   npx tsx scripts/ingest-real-data.ts --input data/real-tenders/ --output data/processed/
 */

import * as fs from 'fs';
import * as path from 'path';

interface RawTenderRow {
  tender_id?: string;
  title?: string;
  ministry?: string;
  department?: string;
  estimated_value?: string;
  category?: string;
  num_bidders?: string;
  bid_amounts?: string;  // comma-separated
  winning_amount?: string;
  is_fraud?: string;     // 1/0 or true/false
  [key: string]: string | undefined;
}

interface ProcessedSample {
  tender_id: string;
  ministry: string;
  category: string;
  estimated_value_crore: number;
  num_bidders: number;
  bid_amounts: number[];
  bid_times_hours: number[];
  bidder_pans: string[];
  winning_amount: number;
  historical_winner_count: number;
  is_repeat_winner: boolean;
  is_fraud: boolean;
}

// ─── Column Mapping (handles different CSV formats) ───────────────
const COLUMN_ALIASES: Record<string, string[]> = {
  tender_id: ['tender_id', 'tenderid', 'id', 'tender_no', 'tender_number', 'reference_no'],
  title: ['title', 'tender_title', 'description', 'subject'],
  ministry: ['ministry', 'ministry_name', 'org_name', 'department', 'buyer_org'],
  estimated_value: ['estimated_value', 'estimated_cost', 'tender_value', 'tender_value_in_rs', 'estimated_value_crore'],
  category: ['category', 'tender_type', 'procurement_type', 'product_category'],
  num_bidders: ['num_bidders', 'no_of_bidders', 'bidder_count', 'total_bids'],
  bid_amounts: ['bid_amounts', 'bid_values', 'quoted_amounts'],
  winning_amount: ['winning_amount', 'awarded_value', 'contract_value', 'l1_amount'],
  is_fraud: ['is_fraud', 'fraud_flag', 'suspicious', 'flagged'],
};

function resolveColumn(row: Record<string, string>, field: string): string | undefined {
  const aliases = COLUMN_ALIASES[field] || [field];
  for (const alias of aliases) {
    const key = Object.keys(row).find(k => k.toLowerCase().trim() === alias.toLowerCase());
    if (key && row[key]) return row[key];
  }
  return undefined;
}

function parseCSV(content: string): Record<string, string>[] {
  const lines = content.split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] || ''; });
    return row;
  });
}

function processRow(row: Record<string, string>, index: number): ProcessedSample | null {
  try {
    const tenderId = resolveColumn(row, 'tender_id') || `REAL-${index}`;
    const ministry = resolveColumn(row, 'ministry') || 'UNKNOWN';
    const category = resolveColumn(row, 'category') || 'GOODS';
    
    let estimatedValue = parseFloat(resolveColumn(row, 'estimated_value') || '0');
    // Convert from Rs to Crore if value is > 10000 (likely in Rs, not Crore)
    if (estimatedValue > 10000) estimatedValue = estimatedValue / 10_000_000;
    
    const numBidders = parseInt(resolveColumn(row, 'num_bidders') || '3', 10);
    
    // Parse bid amounts (comma-separated) or generate from winning amount
    let bidAmounts: number[] = [];
    const bidAmountsStr = resolveColumn(row, 'bid_amounts');
    if (bidAmountsStr) {
      bidAmounts = bidAmountsStr.split(';').map(Number).filter(n => !isNaN(n));
    }
    
    let winningAmount = parseFloat(resolveColumn(row, 'winning_amount') || '0');
    if (winningAmount > 10000) winningAmount = winningAmount / 10_000_000;
    
    // If no bid amounts but we have winning amount, generate realistic bids
    if (bidAmounts.length === 0 && winningAmount > 0) {
      bidAmounts = [winningAmount];
      for (let i = 1; i < numBidders; i++) {
        bidAmounts.push(winningAmount * (1 + Math.random() * 0.3));
      }
    }
    
    if (estimatedValue <= 0) return null;
    
    const fraudStr = resolveColumn(row, 'is_fraud');
    const isFraud = fraudStr === '1' || fraudStr?.toLowerCase() === 'true' || fraudStr?.toLowerCase() === 'yes';
    
    return {
      tender_id: tenderId,
      ministry,
      category,
      estimated_value_crore: estimatedValue,
      num_bidders: numBidders,
      bid_amounts: bidAmounts,
      bid_times_hours: Array.from({ length: Math.max(0, numBidders - 1) }, () => Math.random() * 48),
      bidder_pans: Array.from({ length: numBidders }, (_, i) => `PAN${tenderId}${i}`),
      winning_amount: winningAmount || Math.min(...bidAmounts),
      historical_winner_count: 1,
      is_repeat_winner: false,
      is_fraud: isFraud,
    };
  } catch {
    return null;
  }
}

// ─── Main ──────────────────────────────────────────────────────────
function main() {
  const args = process.argv.slice(2);
  const inputIdx = args.indexOf('--input');
  const outputIdx = args.indexOf('--output');
  
  const inputPath = inputIdx >= 0 ? args[inputIdx + 1] : 'data/real-tenders';
  const outputPath = outputIdx >= 0 ? args[outputIdx + 1] : 'data/processed';
  
  console.log(`\n🔄 TenderShield Real Data Ingestion`);
  console.log(`   Input:  ${inputPath}`);
  console.log(`   Output: ${outputPath}\n`);
  
  // Find CSV files
  let csvFiles: string[] = [];
  if (fs.existsSync(inputPath)) {
    const stat = fs.statSync(inputPath);
    if (stat.isDirectory()) {
      csvFiles = fs.readdirSync(inputPath)
        .filter(f => f.endsWith('.csv'))
        .map(f => path.join(inputPath, f));
    } else {
      csvFiles = [inputPath];
    }
  }
  
  if (csvFiles.length === 0) {
    console.log(`⚠️  No CSV files found in ${inputPath}`);
    console.log(`   Create a CSV with columns: tender_id, ministry, estimated_value, num_bidders, winning_amount, is_fraud`);
    console.log(`   Place it in: data/real-tenders/`);
    
    // Create sample CSV
    const sampleDir = 'data/real-tenders';
    fs.mkdirSync(sampleDir, { recursive: true });
    const sampleCSV = `tender_id,ministry,estimated_value,category,num_bidders,winning_amount,is_fraud
TDR-MoHFW-001,MoHFW,50000000,GOODS,5,45000000,0
TDR-MoRTH-002,MoRTH,200000000,WORKS,3,180000000,1
TDR-MoD-003,MoD,80000000,SERVICES,4,72000000,0`;
    fs.writeFileSync(path.join(sampleDir, 'sample.csv'), sampleCSV);
    console.log(`\n✅ Created sample CSV at ${sampleDir}/sample.csv`);
    console.log(`   Edit it with your real data and re-run.`);
    return;
  }
  
  // Process all CSVs
  const allSamples: ProcessedSample[] = [];
  
  for (const file of csvFiles) {
    console.log(`📄 Processing: ${path.basename(file)}`);
    const content = fs.readFileSync(file, 'utf-8');
    const rows = parseCSV(content);
    
    let processed = 0;
    let skipped = 0;
    
    for (let i = 0; i < rows.length; i++) {
      const sample = processRow(rows[i], allSamples.length + i);
      if (sample) {
        allSamples.push(sample);
        processed++;
      } else {
        skipped++;
      }
    }
    
    console.log(`   ✅ ${processed} samples processed, ${skipped} skipped`);
  }
  
  // Save processed data
  fs.mkdirSync(outputPath, { recursive: true });
  const outputFile = path.join(outputPath, 'training-data.json');
  fs.writeFileSync(outputFile, JSON.stringify(allSamples, null, 2));
  
  const fraudCount = allSamples.filter(s => s.is_fraud).length;
  const cleanCount = allSamples.length - fraudCount;
  
  console.log(`\n════════════════════════════════════════`);
  console.log(`📊 Ingestion Complete`);
  console.log(`   Total samples: ${allSamples.length}`);
  console.log(`   Fraud:         ${fraudCount} (${(fraudCount / allSamples.length * 100).toFixed(1)}%)`);
  console.log(`   Clean:         ${cleanCount} (${(cleanCount / allSamples.length * 100).toFixed(1)}%)`);
  console.log(`   Output:        ${outputFile}`);
  console.log(`\n   Next step: npx tsx scripts/train-model.ts --source real`);
  console.log(`════════════════════════════════════════\n`);
}

main();
