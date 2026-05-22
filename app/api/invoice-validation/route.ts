import { NextResponse } from 'next/server';
import { validateManualInvoice, type ManualInvoiceDraft } from '@/lib/matching';
import { seedWorkflowItems } from '@/lib/workflow-store';
import { seedPurchaseOrders } from '@/lib/purchase-orders';
import { demoData } from '@/lib/data';

export async function POST(request: Request) {
  try {
    const body = await request.json() as { invoice: ManualInvoiceDraft; existingInvoiceNumbers?: string[] };
    if (!body.invoice) {
      return NextResponse.json({ valid: false, errors: ['Invoice payload is required.'], status: 'Variance Detected', variances: [] }, { status: 400 });
    }

    const result = validateManualInvoice(
      body.invoice,
      seedWorkflowItems,
      body.existingInvoiceNumbers ?? [],
      demoData.vendors,
      seedPurchaseOrders,
    );
    return NextResponse.json(result, { status: result.valid ? 200 : 422 });
  } catch {
    return NextResponse.json({ valid: false, errors: ['Unable to validate invoice payload.'], status: 'Variance Detected', variances: [] }, { status: 400 });
  }
}
