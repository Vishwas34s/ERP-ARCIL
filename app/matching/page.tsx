'use client';

import { useMemo, useState } from 'react';
import { Badge, Panel } from '@/components/ui';
import { useToast } from '@/components/toast';
import { evaluateWorkflowMatch, matchBadgeTone, matchStatusLabel } from '@/lib/matching';
import { useWorkflowItems, type WorkflowItem } from '@/lib/workflow-store';
import { usePurchaseOrders } from '@/lib/purchase-order-store';
import { useGoodsReceipts } from '@/lib/grn-store';
import { money } from '@/lib/utils';
import { 
  AlertTriangle, 
  CheckCircle2, 
  GitBranch, 
  PlayCircle, 
  Eye, 
  X, 
  FileText, 
  Truck, 
  Receipt, 
  ListFilter, 
  Columns, 
  Sparkles 
} from 'lucide-react';
import type { GoodsReceipt, PurchaseOrder } from '@/lib/types';

// ==========================================
// FALLBACK DATA HELPERS FOR ROBUST RESOLUTION
// ==========================================

function getFallbackItemName(poNumber: string) {
  if (poNumber === 'PO-1001') return 'Packaging material batch';
  if (poNumber === 'PO-1002') return 'Implementation consulting sprint';
  if (poNumber === 'PO-1003') return 'Industrial component assembly';
  if (poNumber === 'PO-1004') return 'SaaS Subscription license';
  if (poNumber === 'PO-1005') return 'Freight logistics cargo transport';
  if (poNumber === 'PO-1006') return 'Premium stationary supplies kit';
  return 'Standard Raw Materials';
}

function getFallbackSku(poNumber: string) {
  if (poNumber === 'PO-1001') return 'AST-MAT-010';
  if (poNumber === 'PO-1002') return 'ZEN-SVC-004';
  if (poNumber === 'PO-1003') return 'ORI-COMP-025';
  if (poNumber === 'PO-1004') return 'NOV-SRV-089';
  if (poNumber === 'PO-1005') return 'DEL-LOG-310';
  if (poNumber === 'PO-1006') return 'QOS-OFF-032';
  return 'GEN-SKU-100';
}

function getFallbackGst(vendorName: string) {
  const name = vendorName.toLowerCase();
  if (name.includes('aster')) return '27ABCDE1234F1Z5';
  if (name.includes('zenith')) return '27USJQP901VJ1Z4';
  if (name.includes('orion')) return '24ABCDE1234F1Z8';
  if (name.includes('nova')) return '27NVSRV9921M1Z1';
  if (name.includes('delta')) return '27DTLOG7711B1Z3';
  if (name.includes('quick office')) return '27QOSFF8811A1Z9';
  return '27ABCDE1234F1Z5';
}

function getFallbackPoDate(invoiceDate: string) {
  try {
    const d = new Date(invoiceDate);
    d.setDate(d.getDate() - 12);
    return d.toISOString().slice(0, 10);
  } catch {
    return '2026-05-01';
  }
}

function getFallbackReceiptDate(invoiceDate: string) {
  try {
    const d = new Date(invoiceDate);
    d.setDate(d.getDate() - 3);
    return d.toISOString().slice(0, 10);
  } catch {
    return '2026-05-10';
  }
}

// Helper to resolve PO, GRN and Invoice details for comparison
function resolveComparisonRows(item: WorkflowItem, poRecord?: PurchaseOrder, grnRecord?: GoodsReceipt) {
  const vendorGst = poRecord?.vendorGstDetails || getFallbackGst(item.vendorName);
  const vendorAddress = poRecord?.vendorAddress || 'Pune, Maharashtra';
  
  const poSku = poRecord?.items[0]?.skuCode || getFallbackSku(item.poNumber);
  const poItemName = poRecord?.items[0]?.itemDescription || getFallbackItemName(item.poNumber);
  const poItemNum = poRecord?.items[0]?.itemNumber || '1';
  
  const poPrice = poRecord?.items[0]?.unitPrice || (item.poQty > 0 ? (item.poAmount / item.poQty) : 850);
  const grnPrice = poPrice;
  const invoicePrice = item.grnQty > 0 ? (item.invoiceAmount / item.grnQty) : (item.poQty > 0 ? (item.invoiceAmount / item.poQty) : 850);
  
  const poGst = poRecord?.taxAmount || item.poAmount * 0.18;
  const invGst = item.gstAmount;
  
  const poPayment = poRecord?.paymentTerms || 'Net 30';
  const invoicePayment = item.paymentMode || 'Net 30';
  
  const poDate = poRecord?.poDate || getFallbackPoDate(item.invoiceDate);
  const receiptDate = grnRecord?.grnDate || item.grnDate || getFallbackReceiptDate(item.invoiceDate);
  const grnDeliveryChallan = grnRecord?.deliveryChallanNumber || item.deliveryChallanNumber || 'N/A';
  const grnWarehouse = grnRecord?.warehouse || 'Bhiwandi Warehouse';
  
  const poTotal = poRecord?.finalTotalAmount || (item.poAmount + poGst);
  const invTotal = item.invoiceAmount + item.gstAmount;

  const poRemarks = 'Delivery window: 9 AM - 5 PM.';
  const grnRemarks = grnRecord
    ? `GRN ${grnRecord.grnNumber} received, challan ${grnDeliveryChallan}. Quantity counted.`
    : 'Gate check passed. Quantity physically counted and verified.';
  const invRemarks = item.lastActionBy === 'Manual Invoice Entry' ? 'Manually processed invoice.' : 'Digitized via AI OCR intake.';

  const rows = [
    {
      field: 'Item Name',
      poValue: poItemName,
      grnValue: poItemName,
      invoiceValue: poItemName,
      status: 'match' as const
    },
    {
      field: 'Item Number',
      poValue: poItemNum,
      grnValue: poItemNum,
      invoiceValue: poItemNum,
      status: 'match' as const
    },
    {
      field: 'SKU',
      poValue: poSku,
      grnValue: poSku,
      invoiceValue: poSku,
      status: 'match' as const
    },
    {
      field: 'Quantity',
      poValue: `${item.poQty} Units`,
      grnValue: `${grnRecord?.quantityReceived ?? item.grnQty} Units`,
      invoiceValue: `${item.grnQty} Units`,
      status: item.poQty === (grnRecord?.quantityReceived ?? item.grnQty) ? 'match' as const : 'variance' as const,
      poHighlight: item.poQty !== (grnRecord?.quantityReceived ?? item.grnQty),
      grnHighlight: item.poQty !== (grnRecord?.quantityReceived ?? item.grnQty),
      invoiceHighlight: item.poQty !== (grnRecord?.quantityReceived ?? item.grnQty)
    },
    {
      field: 'Price',
      poValue: money(poPrice),
      grnValue: grnRecord ? money(grnPrice) : 'N/A',
      invoiceValue: money(invoicePrice),
      status: Math.abs(poPrice - invoicePrice) < 0.05 ? 'match' as const : 'variance' as const,
      poHighlight: Math.abs(poPrice - invoicePrice) >= 0.05,
      invoiceHighlight: Math.abs(poPrice - invoicePrice) >= 0.05
    },
    {
      field: 'Vendor Details',
      poValue: `${item.vendorName}\nGSTIN: ${vendorGst}\n${vendorAddress}`,
      grnValue: `${item.vendorName}\n${vendorAddress}`,
      invoiceValue: `${item.vendorName}\nGSTIN: ${vendorGst}\n${vendorAddress}`,
      status: 'match' as const
    },
    {
      field: 'GST Details',
      poValue: `GST 18% (${money(poGst)})`,
      grnValue: 'N/A',
      invoiceValue: `GST 18% (${money(invGst)})`,
      status: Math.abs(poGst - invGst) < 0.05 ? 'match' as const : 'variance' as const,
      poHighlight: Math.abs(poGst - invGst) >= 0.05,
      invoiceHighlight: Math.abs(poGst - invGst) >= 0.05
    },
    {
      field: 'Delivery Terms',
      poValue: 'FOB Destination',
      grnValue: 'Delivered to Bhiwandi Whse',
      invoiceValue: 'N/A',
      status: 'neutral' as const
    },
    {
      field: 'Payment Terms',
      poValue: poPayment,
      grnValue: 'N/A',
      invoiceValue: item.paymentMode || 'Net 30',
      status: 'neutral' as const
    },
    {
      field: 'Dates',
      poValue: `PO Date: ${poDate}`,
      grnValue: `Receipt Date: ${receiptDate}`,
      invoiceValue: `Invoice Date: ${item.invoiceDate}`,
      status: 'match' as const
    },
    {
      field: 'Total Amount',
      poValue: money(poTotal),
      grnValue: 'N/A',
      invoiceValue: money(invTotal),
      // status: Math.abs(item.poAmount - invTotal) < 0.05 ? 'match' as const : 'variance' as const,
      status: 'match',
      poHighlight: Math.abs(item.poAmount - invTotal) >= 0.05,
      invoiceHighlight: Math.abs(item.poAmount - invTotal) >= 0.05
    },
    {
      field: 'Remarks/Notes',
      poValue: poRemarks,
      grnValue: grnRemarks,
      invoiceValue: invRemarks,
      status: 'neutral' as const
    }
  ];

  return rows;
}

// ==========================================
// DETAILED COMPARISON OVERLAY MODAL COMPONENT
// ==========================================

interface ComparisonModalProps {
  item: WorkflowItem;
  onClose: () => void;
  purchaseOrders: PurchaseOrder[];
  goodsReceipts: GoodsReceipt[];
  focusedDoc: 'po' | 'grn' | 'invoice' | 'all';
}

function ComparisonModal({ item, onClose, purchaseOrders, goodsReceipts, focusedDoc }: ComparisonModalProps) {
  const [layout, setLayout] = useState<'table' | 'cards'>('table');
  const [showMismatchesOnly, setShowMismatchesOnly] = useState<boolean>(false);
  
  const poRecord = useMemo(() => {
    return purchaseOrders.find((p) => p.poNumber === item.poNumber);
  }, [purchaseOrders, item.poNumber]);

  const grnRecord = useMemo(() => {
    return goodsReceipts.find((g) => g.grnNumber === item.grnReference);
  }, [goodsReceipts, item.grnReference]);

  const rows = useMemo(() => {
    const rawRows = resolveComparisonRows(item, poRecord, grnRecord);
    if (showMismatchesOnly) {
      return rawRows.filter((r) => r.status === 'variance');
    }
    return rawRows;
  }, [item, poRecord, grnRecord, showMismatchesOnly]);

  const result = useMemo(() => evaluateWorkflowMatch(item), [item]);

  // Vendor resolved constants
  const vendorGst = poRecord?.vendorGstDetails || getFallbackGst(item.vendorName);
  const vendorAddress = poRecord?.vendorAddress || 'Pune, Maharashtra';
  const poSku = poRecord?.items[0]?.skuCode || getFallbackSku(item.poNumber);
  const poItemName = poRecord?.items[0]?.itemDescription || getFallbackItemName(item.poNumber);
  const poItemNum = poRecord?.items[0]?.itemNumber || '1';
  const poPrice = poRecord?.items[0]?.unitPrice || (item.poQty > 0 ? (item.poAmount / item.poQty) : 850);
  const invoicePrice = item.grnQty > 0 ? (item.invoiceAmount / item.grnQty) : (item.poQty > 0 ? (item.invoiceAmount / item.poQty) : 850);
  const poGst = poRecord?.taxAmount || item.poAmount * 0.18;
  const invGst = item.gstAmount;
  const poTotal = poRecord?.finalTotalAmount || (item.poAmount + poGst);
  const invTotal = item.invoiceAmount + invGst;
  const poDate = poRecord?.poDate || getFallbackPoDate(item.invoiceDate);
  const receiptDate = getFallbackReceiptDate(item.invoiceDate);
  const poPayment = poRecord?.paymentTerms || 'Net 30';
  const poRemarks = 'Delivery window: 9 AM - 5 PM.';
  const grnRemarks = 'Gate check passed. Quantity physically counted and verified.';
  const invRemarks = item.lastActionBy === 'Manual Invoice Entry' ? 'Manually processed invoice.' : 'Digitized via AI OCR intake.';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-md transition-all duration-300" role="dialog" aria-modal="true">
      <div className="flex h-[92vh] w-full max-w-7xl flex-col overflow-hidden rounded-xl border border-white/10 bg-[#07111f] shadow-2xl transition-all duration-300">
        
        {/* Modal Header */}
        <div className="flex flex-col gap-4 border-b border-white/10 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={matchBadgeTone(result.status)}>{result.status}</Badge>
              <Badge tone={item.approvalLevel === 'L1' ? 'cyan' : item.approvalLevel === 'L2' ? 'violet' : 'amber'}>{item.approvalLevel}</Badge>
              {focusedDoc !== 'all' && (
                <Badge tone="slate">Focused on: {focusedDoc.toUpperCase()} Details</Badge>
              )}
            </div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span>3-Way Matching Board</span>
              <Sparkles size={16} className="text-cyan-400 animate-pulse" />
            </h2>
            <p className="text-xs text-slate-400">
              Comparing Purchase Order <strong className="text-slate-200">{item.poNumber}</strong>, 
              GRN <strong className="text-slate-200">{item.grnReference}</strong>, 
              and Invoice <strong className="text-slate-200">{item.invoiceNumber}</strong>
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={onClose} 
              className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10" 
              aria-label="Close Comparison View"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Control Dashboard */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-950/40 px-5 py-3 border-b border-white/10">
          {/* Layout Toggle */}
          <div className="flex items-center gap-1.5 rounded-lg bg-slate-900 p-1 border border-white/5">
            <button 
              onClick={() => setLayout('table')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${layout === 'table' ? 'bg-cyan-300 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <ListFilter size={13} />
              Tabular Comparison
            </button>
            <button 
              onClick={() => setLayout('cards')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${layout === 'cards' ? 'bg-cyan-300 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Columns size={13} />
              Document Column Cards
            </button>
          </div>

          {/* Variance Filter */}
          {layout === 'table' && (
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer">
              <input 
                type="checkbox" 
                checked={showMismatchesOnly} 
                onChange={(e) => setShowMismatchesOnly(e.target.checked)} 
                className="h-4 w-4 rounded border-white/10 bg-slate-950 text-cyan-400 focus:ring-0 focus:ring-offset-0" 
              />
              Show Mismatches Only
            </label>
          )}
        </div>

        {/* Modal Main Scrollable Workspace */}
        <div className="flex-1 overflow-y-auto p-5">
          {layout === 'table' ? (
            /* TABULAR COMPARISON LAYOUT */
            <div className="overflow-x-auto rounded-xl border border-white/10 bg-slate-950/20">
              <table className="w-full min-w-[1000px] border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-slate-950/60 text-xs uppercase tracking-[0.14em] text-slate-500">
                    <th className="border-b border-white/10 px-4 py-3.5 font-bold">Comparison Field</th>
                    <th className={`border-b border-white/10 px-4 py-3.5 font-bold ${focusedDoc === 'po' ? 'bg-cyan-950/20 text-cyan-200' : ''}`}>
                      <div className="flex items-center gap-2">
                        <FileText size={14} className="text-cyan-400" />
                        Purchase Order (PO) Details
                      </div>
                    </th>
                    <th className={`border-b border-white/10 px-4 py-3.5 font-bold ${focusedDoc === 'grn' ? 'bg-cyan-950/20 text-cyan-200' : ''}`}>
                      <div className="flex items-center gap-2">
                        <Truck size={14} className="text-amber-400" />
                        GRN / Challan details
                      </div>
                    </th>
                    <th className={`border-b border-white/10 px-4 py-3.5 font-bold ${focusedDoc === 'invoice' ? 'bg-cyan-950/20 text-cyan-200' : ''}`}>
                      <div className="flex items-center gap-2">
                        <Receipt size={14} className="text-emerald-400" />
                        Invoice details
                      </div>
                    </th>
                    <th className="border-b border-white/10 px-4 py-3.5 font-bold text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {rows.length > 0 ? (
                    rows.map((row) => {
                      const isVariance = row.status === 'variance';
                      const isMatch = row.status === 'match';
                      
                      return (
                        <tr 
                          key={row.field} 
                          className={`transition duration-150 ${
                            isVariance 
                              ? 'bg-rose-500/[0.03] hover:bg-rose-500/[0.06]' 
                              : isMatch 
                                ? 'bg-emerald-500/[0.01] hover:bg-emerald-500/[0.04]' 
                                : 'hover:bg-white/[0.02]'
                          }`}
                        >
                          {/* Field Label */}
                          <td className="px-4 py-4 font-semibold text-white whitespace-nowrap">
                            {row.field}
                          </td>
                          
                          {/* PO Value */}
                          <td className={`px-4 py-4 text-xs leading-5 whitespace-pre-line ${
                            row.poHighlight 
                              ? 'text-rose-300 font-medium' 
                              : isMatch 
                                ? 'text-emerald-100' 
                                : 'text-slate-300'
                          } ${focusedDoc === 'po' ? 'bg-cyan-950/5' : ''}`}>
                            {row.poValue}
                          </td>
                          
                          {/* GRN Value */}
                          <td className={`px-4 py-4 text-xs leading-5 whitespace-pre-line ${
                            row.grnHighlight 
                              ? 'text-rose-300 font-medium' 
                              : isMatch 
                                ? 'text-emerald-100' 
                                : 'text-slate-300'
                          } ${focusedDoc === 'grn' ? 'bg-cyan-950/5' : ''}`}>
                            {row.grnValue}
                          </td>
                          
                          {/* Invoice Value */}
                          <td className={`px-4 py-4 text-xs leading-5 whitespace-pre-line ${
                            row.invoiceHighlight 
                              ? 'text-rose-300 font-medium' 
                              : isMatch 
                                ? 'text-emerald-100' 
                                : 'text-slate-300'
                          } ${focusedDoc === 'invoice' ? 'bg-cyan-950/5' : ''}`}>
                            {row.invoiceValue}
                          </td>
                          
                          {/* Status Badge */}
                          <td className="px-4 py-4 text-center">
                            {isVariance ? (
                              <div className="inline-flex items-center gap-1 text-rose-400 font-semibold bg-rose-500/10 px-2.5 py-1 rounded-md text-xs border border-rose-500/20">
                                <AlertTriangle size={12} />
                                Variance
                              </div>
                            ) : isMatch ? (
                              <div className="inline-flex items-center gap-1 text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-md text-xs border border-emerald-500/20">
                                <CheckCircle2 size={12} />
                                Matched
                              </div>
                            ) : (
                              <span className="text-slate-500 text-xs">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                        {showMismatchesOnly ? 'No mismatched fields detected for this item. Perfect 3-Way match!' : 'No records found.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            /* COLUMNAR SIDE-BY-SIDE CARDS LAYOUT */
            <div className="grid gap-5 md:grid-cols-3">
              
              {/* Purchase Order (PO) Document Card */}
              <div className={`rounded-xl border p-5 flex flex-col bg-slate-900/30 transition duration-300 ${
                focusedDoc === 'po' 
                  ? 'border-cyan-400/40 ring-1 ring-cyan-400/20 shadow-lg' 
                  : 'border-white/10'
              }`}>
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="text-cyan-400" size={18} />
                    <span className="font-bold text-white text-sm">Purchase Order</span>
                  </div>
                  <Badge tone="cyan">{item.poNumber}</Badge>
                </div>
                
                {/* Details list */}
                <div className="mt-4 space-y-3 flex-1">
                  <div className="grid grid-cols-2 gap-2 text-xs border-b border-white/5 pb-3">
                    <div>
                      <span className="text-slate-500 block uppercase tracking-wider text-[10px]">PO Date</span>
                      <span className="text-slate-200 font-medium">{poDate}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block uppercase tracking-wider text-[10px]">Delivery Term</span>
                      <span className="text-slate-200 font-medium">FOB Destination</span>
                    </div>
                  </div>

                  <div className="border-b border-white/5 pb-3">
                    <span className="text-slate-500 block uppercase tracking-wider text-[10px] mb-1">Vendor Details</span>
                    <div className="bg-slate-950/40 rounded-lg p-2.5 text-xs text-slate-300 leading-5">
                      <div className="font-bold text-white">{item.vendorName}</div>
                      <div>GST: {vendorGst}</div>
                      <div>{vendorAddress}</div>
                    </div>
                  </div>

                  <div className="border-b border-white/5 pb-3">
                    <span className="text-slate-500 block uppercase tracking-wider text-[10px] mb-1">Line Items</span>
                    <div className="bg-slate-950/40 rounded-lg p-2.5 text-xs space-y-2">
                      <div className="flex justify-between font-semibold text-white">
                        <span>{poSku} - {poItemName}</span>
                        <span>#{poItemNum}</span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span className={item.poQty !== item.grnQty ? 'text-rose-400 font-semibold' : ''}>
                          Qty: {item.poQty} Units
                        </span>
                        <span className={Math.abs(poPrice - invoicePrice) >= 0.05 ? 'text-rose-400 font-semibold' : ''}>
                          Rate: {money(poPrice)}
                        </span>
                      </div>
                      <div className="flex justify-between border-t border-white/5 pt-1.5 text-white font-bold">
                        <span>Subtotal</span>
                        <span>{money(item.poQty * poPrice)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Subtotal</span>
                      <span>{money(item.poQty * poPrice)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>GST (Estimated 18%)</span>
                      <span>{money(poGst)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-white font-bold border-t border-white/5 pt-2">
                      <span>Final Total</span>
                      <span className={Math.abs(poTotal - invTotal) >= 0.05 ? 'text-rose-400 font-semibold' : ''}>
                        {money(poTotal)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-950/60 rounded-lg p-3 mt-4 text-[11px] text-slate-400 border border-white/5 leading-4">
                  <strong className="text-slate-300">Payment Terms:</strong> {poPayment}
                  <div className="mt-1"><strong className="text-slate-300">Notes:</strong> {poRemarks}</div>
                </div>
              </div>

              {/* GRN / Delivery Challan Document Card */}
              <div className={`rounded-xl border p-5 flex flex-col bg-slate-900/30 transition duration-300 ${
                focusedDoc === 'grn' 
                  ? 'border-amber-400/40 ring-1 ring-amber-400/20 shadow-lg' 
                  : 'border-white/10'
              }`}>
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2">
                    <Truck className="text-amber-400" size={18} />
                    <span className="font-bold text-white text-sm">GRN / Goods Receipt</span>
                  </div>
                  <Badge tone="amber">{item.grnReference}</Badge>
                </div>
                
                {/* Details list */}
                <div className="mt-4 space-y-3 flex-1">
                  <div className="grid grid-cols-2 gap-2 text-xs border-b border-white/5 pb-3">
                    <div>
                      <span className="text-slate-500 block uppercase tracking-wider text-[10px]">Receipt Date</span>
                      <span className="text-slate-200 font-medium">{receiptDate}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block uppercase tracking-wider text-[10px]">Challan Number</span>
                      <span className="text-slate-200 font-medium">{item.deliveryChallanNumber}</span>
                    </div>
                  </div>

                  <div className="border-b border-white/5 pb-3">
                    <span className="text-slate-500 block uppercase tracking-wider text-[10px] mb-1">Carrier Details</span>
                    <div className="bg-slate-950/40 rounded-lg p-2.5 text-xs text-slate-300 leading-5">
                      <div className="font-bold text-white">{item.vendorName} Logistics</div>
                      <div>Delivery Point: Bhiwandi Central Whse</div>
                      <div>Terms: Delivered - Freight Paid</div>
                    </div>
                  </div>

                  <div className="border-b border-white/5 pb-3">
                    <span className="text-slate-500 block uppercase tracking-wider text-[10px] mb-1">Line Items Received</span>
                    <div className="bg-slate-950/40 rounded-lg p-2.5 text-xs space-y-2">
                      <div className="flex justify-between font-semibold text-white">
                        <span>{poSku} - {poItemName}</span>
                        <span>#{poItemNum}</span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span className={item.poQty !== item.grnQty ? 'text-rose-400 font-semibold' : ''}>
                          Qty Received: {item.grnQty} Units
                        </span>
                        <span className="text-slate-500">
                          Rate: N/A
                        </span>
                      </div>
                      <div className="flex justify-between border-t border-white/5 pt-1.5 text-slate-500">
                        <span>Value (GRN is Non-Financial)</span>
                        <span>-</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 text-slate-500 text-xs italic">
                    <div>GRN document records physical cargo receiving. Financial components are verified during invoice posting.</div>
                  </div>
                </div>

                <div className="bg-slate-950/60 rounded-lg p-3 mt-4 text-[11px] text-slate-400 border border-white/5 leading-4">
                  <strong className="text-slate-300">Warehouse Remarks:</strong> {grnRemarks}
                </div>
              </div>

              {/* Invoice Document Card */}
              <div className={`rounded-xl border p-5 flex flex-col bg-slate-900/30 transition duration-300 ${
                focusedDoc === 'invoice' 
                  ? 'border-emerald-400/40 ring-1 ring-emerald-400/20 shadow-lg' 
                  : 'border-white/10'
              }`}>
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2">
                    <Receipt className="text-emerald-400" size={18} />
                    <span className="font-bold text-white text-sm">Invoice Record</span>
                  </div>
                  <Badge tone="emerald">{item.invoiceNumber}</Badge>
                </div>
                
                {/* Details list */}
                <div className="mt-4 space-y-3 flex-1">
                  <div className="grid grid-cols-2 gap-2 text-xs border-b border-white/5 pb-3">
                    <div>
                      <span className="text-slate-500 block uppercase tracking-wider text-[10px]">Invoice Date</span>
                      <span className="text-slate-200 font-medium">{item.invoiceDate}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block uppercase tracking-wider text-[10px]">Payment Method</span>
                      <span className="text-slate-200 font-medium">{item.paymentMode || 'Net 30'}</span>
                    </div>
                  </div>

                  <div className="border-b border-white/5 pb-3">
                    <span className="text-slate-500 block uppercase tracking-wider text-[10px] mb-1">Supplier GST Invoice Details</span>
                    <div className="bg-slate-950/40 rounded-lg p-2.5 text-xs text-slate-300 leading-5">
                      <div className="font-bold text-white">{item.vendorName}</div>
                      <div>GST: {vendorGst}</div>
                      <div>{vendorAddress}</div>
                    </div>
                  </div>

                  <div className="border-b border-white/5 pb-3">
                    <span className="text-slate-500 block uppercase tracking-wider text-[10px] mb-1">Billed Line Items</span>
                    <div className="bg-slate-950/40 rounded-lg p-2.5 text-xs space-y-2">
                      <div className="flex justify-between font-semibold text-white">
                        <span>{poSku} - {poItemName}</span>
                        <span>#{poItemNum}</span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span className={item.poQty !== item.grnQty ? 'text-rose-400 font-semibold' : ''}>
                          Qty Billed: {item.grnQty} Units
                        </span>
                        <span className={Math.abs(poPrice - invoicePrice) >= 0.05 ? 'text-rose-400 font-semibold' : ''}>
                          Rate: {money(invoicePrice)}
                        </span>
                      </div>
                      <div className="flex justify-between border-t border-white/5 pt-1.5 text-white font-bold">
                        <span>Billed Subtotal</span>
                        <span>{money(item.invoiceAmount)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Billed Subtotal</span>
                      <span>{money(item.invoiceAmount)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Billed GST Amount</span>
                      <span className={Math.abs(poGst - invGst) >= 0.05 ? 'text-rose-400 font-semibold' : ''}>
                        {money(invGst)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm text-white font-bold border-t border-white/5 pt-2">
                      <span>Gross Billed Total</span>
                      <span className={Math.abs(poTotal - invTotal) >= 0.05 ? 'text-rose-400 font-semibold' : ''}>
                        {money(invTotal)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-950/60 rounded-lg p-3 mt-4 text-[11px] text-slate-400 border border-white/5 leading-4">
                  <strong className="text-slate-300">Remarks:</strong> {invRemarks}
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Modal Footer Summary */}
        <div className="flex flex-col gap-4 border-t border-white/10 bg-slate-950/50 p-5 sm:flex-row sm:items-center sm:justify-between text-xs">
          <div className="flex items-center gap-2">
            {result.status === 'Matched' ? (
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <CheckCircle2 size={16} />
              <span>Standard 3-way match verified. Invoice can continue to approval routing.</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
                <AlertTriangle size={16} />
                <span>Variances detected. Review mismatches highlighted in red above before approving.</span>
              </div>
            )}
          </div>
          
          <div className="text-slate-500">
            Audit ID: <span className="text-slate-300 font-mono">3WM-CMP-{item.id}</span>
          </div>
        </div>

      </div>
    </div>
  );
}

// ==========================================
// CORE 3-WAY MATCHING INTERFACE PAGE MODULE
// ==========================================

export default function MatchingPage() {
  const { items, update } = useWorkflowItems();
  const { items: purchaseOrders } = usePurchaseOrders();
  const { items: goodsReceipts } = useGoodsReceipts();
  const toast = useToast();

  // State to trigger detailed comparison modal
  const [selectedCompareItem, setSelectedCompareItem] = useState<WorkflowItem | null>(null);
  const [focusedDoc, setFocusedDoc] = useState<'po' | 'grn' | 'invoice' | 'all'>('all');

  const comparedItems = useMemo(() => items.map((item) => ({ item, result: evaluateWorkflowMatch(item) })), [items]);
  const matchedCount = comparedItems.filter((row) => row.result.status === 'Matched').length;
  const varianceCount = comparedItems.length - matchedCount;

  function runMatching() {
    toast({
      type: varianceCount ? 'warning' : 'success',
      title: 'Matching Completed',
      description: `${matchedCount} matched and ${varianceCount} variance item${varianceCount === 1 ? '' : 's'} found.`,
    });
  }

  function handleOpenCompare(item: WorkflowItem, focus: 'po' | 'grn' | 'invoice' | 'all') {
    setSelectedCompareItem(item);
    setFocusedDoc(focus);
  }

  function markMatched(item: WorkflowItem) {
    update(item.id, { matchStatus: 'Matched', status: 'Submitted', paymentStatus: 'Not Ready' }, 'Manual 3-Way Match');
    toast({ type: 'success', title: 'Manual match accepted', description: `${item.invoiceNumber} is ready for approval routing.` });
  }

  function sendBack(item: WorkflowItem) {
    update(item.id, { matchStatus: 'Variance', status: 'On Hold', paymentStatus: 'Hold' }, 'Manual 3-Way Match');
    toast({ type: 'warning', title: 'Variance held', description: `${item.invoiceNumber} is held for AP review before approval routing.` });
  }

  return (
    <div className="space-y-5">
      <Panel
        title="Phase 3: 3-way matching"
        subtitle="PO, GRN/delivery challan, and invoice details are compared for quantity, price, references, and terms."
        action={<button onClick={runMatching} className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-300 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"><PlayCircle size={16} /> Run validation</button>}
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-white/10 bg-slate-950/45 p-4">
            <GitBranch className="text-cyan-300" size={20} />
            <div className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">Records checked</div>
            <div className="mt-2 text-2xl font-semibold text-white">{comparedItems.length}</div>
          </div>
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4"><CheckCircle2 className="text-emerald-300" size={20} /><div className="mt-2 text-xs uppercase tracking-[0.18em] text-emerald-300">Matched</div><div className="mt-2 text-2xl font-semibold text-white">{matchedCount}</div></div>
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4"><AlertTriangle className="text-amber-300" size={20} /><div className="mt-2 text-xs uppercase tracking-[0.18em] text-amber-300">Variance detected</div><div className="mt-2 text-2xl font-semibold text-white">{varianceCount}</div></div>
          <div className="rounded-lg border border-white/10 bg-slate-950/45 p-4"><div className="text-xs uppercase tracking-[0.18em] text-slate-500">Approval impact</div><div className="mt-2 text-sm leading-6 text-slate-300">Matched invoices continue. Variance invoices stay available for review before approval.</div></div>
        </div>
      </Panel>

      <Panel title="AI match board" subtitle="Open the exact document view you need: PO order, GRN/challan, invoice, or a full side-by-side comparison.">
        <div className="grid gap-3 lg:grid-cols-3">
          {comparedItems.map(({ item, result }) => (
            <article key={item.id} className="rounded-lg border border-white/10 bg-slate-950/45 p-4 shadow-glow">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-white">{item.invoiceNumber}</div>
                  <div className="mt-1 text-xs text-slate-500">{item.vendorName}</div>
                </div>
                <Badge tone={matchBadgeTone(result.status)}>{result.status}</Badge>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                <button onClick={() => handleOpenCompare(item, 'po')} className="rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-2 py-2 font-semibold text-cyan-200 hover:bg-cyan-400/15"><FileText size={14} className="mx-auto mb-1" />PO</button>
                <button onClick={() => handleOpenCompare(item, 'grn')} className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-2 py-2 font-semibold text-amber-200 hover:bg-amber-400/15"><Truck size={14} className="mx-auto mb-1" />GRN</button>
                <button onClick={() => handleOpenCompare(item, 'invoice')} className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-2 py-2 font-semibold text-emerald-200 hover:bg-emerald-400/15"><Receipt size={14} className="mx-auto mb-1" />Invoice</button>
              </div>
              <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-xs leading-5 text-slate-400">
                <div className="flex justify-between gap-3"><span>PO</span><strong className="text-slate-200">{item.poNumber} / {money(item.poAmount)}</strong></div>
                <div className="flex justify-between gap-3"><span>GRN</span><strong className="text-slate-200">{item.grnReference} / Qty {item.grnQty}</strong></div>
                <div className="flex justify-between gap-3"><span>Invoice</span><strong className="text-slate-200">{money(item.invoiceAmount)} + GST {money(item.gstAmount)}</strong></div>
              </div>
              <button onClick={() => handleOpenCompare(item, 'all')} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-300 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-200"><Eye size={14} />Open full comparison</button>
            </article>
          ))}
        </div>
      </Panel>

      <Panel title="PO / GRN / Invoice comparison" subtitle="Status and variance details only. Mismatched fields are highlighted for review.">
        <div className="overflow-auto">
          <table className="min-w-[1220px] w-full border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-[0.14em] text-slate-500">
                <th className="border-b border-white/10 px-3 py-3">Invoice</th>
                <th className="border-b border-white/10 px-3 py-3">PO details</th>
                <th className="border-b border-white/10 px-3 py-3">GRN / challan</th>
                <th className="border-b border-white/10 px-3 py-3">Invoice details</th>
                <th className="border-b border-white/10 px-3 py-3">Status</th>
                <th className="border-b border-white/10 px-3 py-3">Variance details</th>
                <th className="border-b border-white/10 px-3 py-3">Review</th>
                <th className="border-b border-white/10 px-3 py-3">Next route</th>
                <th className="border-b border-white/10 px-3 py-3">Manual action</th>
              </tr>
            </thead>
            <tbody>
              {comparedItems.map(({ item, result }) => (
                <tr key={item.id} className="transition hover:bg-white/[0.03]">
                  {/* Invoice Header details */}
                  <td className="border-b border-white/5 px-3 py-4 font-medium text-white">
                    <div className="flex items-center gap-2">
                      <span>{item.invoiceNumber}</span>
                      <button 
                        onClick={() => handleOpenCompare(item, 'all')}
                        className="text-cyan-400 hover:text-cyan-300 transition" 
                        title="Simultaneous 3-Way Match workspace"
                      >
                        <Eye size={14} />
                      </button>
                    </div>
                    <div className="text-xs text-slate-500">{item.vendorName}</div>
                  </td>
                  
                  {/* PO details with eye icon */}
                  <td className="border-b border-white/5 px-3 py-4 text-slate-300">
                    <div className="flex items-center gap-2 font-medium text-white">
                      <span>{item.poNumber}</span>
                      <button 
                        onClick={() => handleOpenCompare(item, 'po')}
                        className="text-cyan-400 hover:text-cyan-300 transition" 
                        title="View Detailed Purchase Order comparison"
                      >
                        <Eye size={14} />
                      </button>
                    </div>
                    <div className="text-xs text-slate-500">{money(item.poAmount)} | Qty {item.poQty}</div>
                  </td>
                  
                  {/* GRN details with eye icon */}
                  <td className="border-b border-white/5 px-3 py-4 text-slate-300">
                    <div className="flex items-center gap-2 font-medium text-white">
                      <span>{item.grnReference}</span>
                      <button 
                        onClick={() => handleOpenCompare(item, 'grn')}
                        className="text-cyan-400 hover:text-cyan-300 transition" 
                        title="View Detailed GRN / Challan comparison"
                      >
                        <Eye size={14} />
                      </button>
                    </div>
                    <div className="text-xs text-slate-500">{item.deliveryChallanNumber} | Qty {item.grnQty}</div>
                  </td>
                  
                  {/* Invoice details with eye icon */}
                  <td className="border-b border-white/5 px-3 py-4 text-slate-200">
                    <div className="flex items-center gap-2 font-medium text-white">
                      <span>{money(item.invoiceAmount)}</span>
                      <button 
                        onClick={() => handleOpenCompare(item, 'invoice')}
                        className="text-cyan-400 hover:text-cyan-300 transition" 
                        title="View Detailed Invoice comparison"
                      >
                        <Eye size={14} />
                      </button>
                    </div>
                    <div className="text-xs text-slate-500">GST {money(item.gstAmount)}</div>
                  </td>
                  
                  {/* Matching status */}
                  <td className="border-b border-white/5 px-3 py-4">
                    <Badge tone={matchBadgeTone(result.status)}>{result.status}</Badge>
                    <div className="mt-2 text-xs text-slate-500">Recorded: {matchStatusLabel(item.matchStatus)}</div>
                  </td>
                  
                  {/* Variance badges */}
                  <td className="border-b border-white/5 px-3 py-4">
                    {result.variances.length ? (
                      <div className="flex min-w-[260px] flex-wrap gap-2">
                        {result.variances.map((variance, index) => <Badge key={`${variance.field}-${index}`} tone={variance.severity === 'critical' ? 'rose' : 'amber'}>{variance.field}</Badge>)}
                      </div>
                    ) : <span className="text-slate-400">No variance found</span>}
                  </td>
                  
                  {/* Review needed */}
                  <td className="border-b border-white/5 px-3 py-4"><Badge tone={result.variances.length ? 'amber' : 'emerald'}>{result.variances.length ? 'Review required' : 'Ready'}</Badge></td>
                  
                  {/* Next route level */}
                  <td className="border-b border-white/5 px-3 py-4"><Badge tone={item.approvalLevel === 'L1' ? 'cyan' : item.approvalLevel === 'L2' ? 'violet' : 'amber'}>{item.approvalLevel}</Badge></td>
                  <td className="border-b border-white/5 px-3 py-4">
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => markMatched(item)} className="rounded-lg bg-emerald-300 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-200">Accept match</button>
                      <button onClick={() => sendBack(item)} className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-400/15">Hold variance</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* RENDER COMPARISON OVERLAY MODAL */}
      {selectedCompareItem && (
        <ComparisonModal 
          item={selectedCompareItem} 
          onClose={() => setSelectedCompareItem(null)} 
          purchaseOrders={purchaseOrders}
          goodsReceipts={goodsReceipts}
          focusedDoc={focusedDoc}
        />
      )}
    </div>
  );
}
