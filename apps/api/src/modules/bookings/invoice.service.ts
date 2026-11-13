import PDFDocument from 'pdfkit';

export interface InvoiceBooking {
  id: string;
  bookingNumber: string;
  startDate: Date;
  endDate: Date;
  fulfillmentMethod: string;
  customer: {
    fullName: string;
    email: string;
  };
  provider: {
    businessName: string;
    gstNumber: string | null;
    businessAddress: string;
    city: string;
    state: string;
  };
  items: {
    quantity: number;
    unitRate: { toString(): string };
    durationCount: number;
    subtotal: { toString(): string };
    listing: { title: string };
  }[];
  priceBreakdown: {
    rentalSubtotal: { toString(): string };
    discountAmount: { toString(): string };
    deliveryCharge: { toString(): string };
    pickupCharge: { toString(): string };
    setupOrServiceFee: { toString(): string };
    taxableAmount: { toString(): string };
    taxAmount: { toString(): string };
    securityDeposit: { toString(): string };
    totalPayable: { toString(): string };
    currency: string;
  } | null;
  payments: {
    status: string;
    paidAt: Date | null;
  }[];
  securityDeposit: { status: string } | null;
}

const money = (value: { toString(): string } | number, currency = 'INR') =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(Number(value));

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(date);

function drawTableHeader(doc: PDFKit.PDFDocument, y: number): number {
  doc.rect(48, y, 499, 24).fill('#eef2ff');
  doc.fillColor('#1e293b').font('Helvetica-Bold').fontSize(9);
  doc.text('Description', 56, y + 7, { width: 252 });
  doc.text('Qty', 310, y + 7, { width: 34, align: 'right' });
  doc.text('Duration', 350, y + 7, { width: 58, align: 'right' });
  doc.text('Amount', 414, y + 7, { width: 125, align: 'right' });
  return y + 24;
}

export function generateInvoicePdf(
  doc: PDFKit.PDFDocument,
  booking: InvoiceBooking
): void {
  const breakdown = booking.priceBreakdown;
  if (!breakdown) {
    throw new Error('Booking price breakdown is missing.');
  }
  const currency = breakdown.currency || 'INR';
  const taxAmount = Number(breakdown.taxAmount);
  const cgst = Math.round((taxAmount / 2) * 100) / 100;
  const sgst = Math.round((taxAmount - cgst) * 100) / 100;
  const rentalTotal = Number(breakdown.rentalSubtotal);
  const discount = Number(breakdown.discountAmount);
  const taxableFees =
    Number(breakdown.deliveryCharge) +
    Number(breakdown.pickupCharge) +
    Number(breakdown.setupOrServiceFee);
  const invoiceTotal = Number(breakdown.taxableAmount) + taxAmount;
  let y = 48;

  doc.info.Title = `GST Tax Invoice ${booking.bookingNumber}`;
  doc.info.Subject = 'Rental Vala rental invoice';
  doc.info.Creator = 'Rental Vala';

  doc.fillColor('#4338ca').font('Helvetica-Bold').fontSize(22).text('RENTAL VALA', 48, y);
  doc.fillColor('#0f172a').fontSize(16).text('GST TAX INVOICE', 48, y + 34);
  doc.fillColor('#475569').font('Helvetica').fontSize(9);
  doc.text(`Invoice / Booking No: ${booking.bookingNumber}`, 48, y + 60);
  doc.text(`Booking ID: ${booking.id}`, 48, y + 74, { width: 330 });
  doc.text(`Invoice date: ${formatDate(new Date())}`, 365, y + 60, { width: 182, align: 'right' });
  doc.text(`Payment status: ${booking.payments.map((payment) => payment.status).join(', ') || 'NOT PAID'}`, 365, y + 74, {
    width: 182,
    align: 'right',
  });
  y += 108;

  doc.moveTo(48, y).lineTo(547, y).strokeColor('#cbd5e1').stroke();
  y += 14;
  doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(10).text('Billed to', 48, y);
  doc.text('Supplier', 310, y);
  y += 16;
  doc.font('Helvetica').fontSize(9).fillColor('#334155');
  doc.text(booking.customer.fullName, 48, y, { width: 235 });
  doc.text(booking.provider.businessName, 310, y, { width: 237 });
  y += 13;
  doc.text(booking.customer.email, 48, y, { width: 235 });
  doc.text(booking.provider.businessAddress, 310, y, { width: 237 });
  y += 13;
  doc.text(`Rental period: ${formatDate(booking.startDate)} - ${formatDate(booking.endDate)}`, 48, y, {
    width: 250,
  });
  doc.text(`${booking.provider.city}, ${booking.provider.state}`, 310, y);
  y += 13;
  doc.text(`Fulfillment: ${booking.fulfillmentMethod}`, 48, y);
  doc.text(`GSTIN: ${booking.provider.gstNumber || 'Not provided'}`, 310, y);
  y += 24;

  y = drawTableHeader(doc, y);
  for (const item of booking.items) {
    doc.font('Helvetica').fontSize(9);
    const titleHeight = doc.heightOfString(item.listing.title, { width: 245 });
    const rowHeight = Math.max(26, titleHeight + 14);
    if (y + rowHeight > 700) {
      doc.addPage();
      y = drawTableHeader(doc, 48);
    }
    doc.font('Helvetica').fontSize(9).fillColor('#0f172a');
    doc.text(item.listing.title, 56, y + 7, { width: 245 });
    doc.text(String(item.quantity), 310, y + 7, { width: 34, align: 'right' });
    doc.text(`${item.durationCount} day(s)`, 350, y + 7, { width: 58, align: 'right' });
    doc.text(money(item.subtotal, currency), 414, y + 7, { width: 125, align: 'right' });
    doc.moveTo(48, y + rowHeight).lineTo(547, y + rowHeight).strokeColor('#e2e8f0').stroke();
    y += rowHeight;
  }

  y += 12;
  const totals: [string, number][] = [
    ['Rental subtotal (net of discount)', rentalTotal],
    ...(Number(breakdown.deliveryCharge)
      ? [['Delivery fee', Number(breakdown.deliveryCharge)] as [string, number]]
      : []),
    ...(Number(breakdown.pickupCharge)
      ? [['Pickup fee', Number(breakdown.pickupCharge)] as [string, number]]
      : []),
    ...(Number(breakdown.setupOrServiceFee)
      ? [['Delivery / setup fees', Number(breakdown.setupOrServiceFee)] as [string, number]]
      : []),
    ['Taxable value (SAC 9973)', Number(breakdown.taxableAmount)],
    ['CGST @ 9%', cgst],
    ['SGST @ 9%', sgst],
  ];
  const amountX = 404;
  for (const [label, amount] of totals) {
    if (y > 710) {
      doc.addPage();
      y = 48;
    }
    doc.font(label.startsWith('Taxable') ? 'Helvetica-Bold' : 'Helvetica').fontSize(9);
    doc.fillColor('#475569').text(label, 300, y, { width: 170 });
    doc.fillColor('#0f172a').text(money(amount, currency), amountX, y, { width: 143, align: 'right' });
    y += 16;
  }
  doc.moveTo(300, y + 1).lineTo(547, y + 1).strokeColor('#94a3b8').stroke();
  y += 8;
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#0f172a');
  doc.text('Invoice total (incl. GST)', 300, y, { width: 170 });
  doc.text(money(invoiceTotal, currency), amountX, y, { width: 143, align: 'right' });
  y += 26;

  if (y > 690) {
    doc.addPage();
    y = 48;
  }
  const deposit = Number(breakdown.securityDeposit);
  const depositIsHeld = booking.securityDeposit?.status === 'HELD';
  doc.roundedRect(48, y, 499, 60, 6).fill('#f8fafc');
  doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(10);
  doc.text(
    `Refundable security deposit: ${money(deposit, currency)} (${booking.securityDeposit?.status ?? 'NOT YET HELD'})`,
    60,
    y + 11
  );
  doc.fillColor('#475569').font('Helvetica').fontSize(8);
  doc.text(
    depositIsHeld
      ? 'This refundable deposit is held in escrow separately as rental security. It is not consideration for the rental service and is excluded from the taxable invoice value.'
      : 'This refundable deposit will be held in escrow when payment is captured. It is not consideration for the rental service and is excluded from the taxable invoice value.',
    60,
    y + 28,
    { width: 475 }
  );
  y += 72;
  doc.fillColor('#334155').font('Helvetica').fontSize(9);
  doc.text(`Booking amount including deposit: ${money(breakdown.totalPayable, currency)}`, 48, y);
  if (discount > 0) {
    doc.text(`Rental discount applied: ${money(discount, currency)}`, 48, y + 14);
  }
  if (taxableFees > 0) {
    doc.text(`Delivery / setup / pickup fees: ${money(taxableFees, currency)}`, 48, y + (discount > 0 ? 28 : 14));
  }
  doc.fillColor('#64748b').fontSize(8).text(
    'GST split is shown as CGST 9% + SGST 9% as requested. This invoice is generated from the booking record.',
    48,
    y + 36,
    { width: 499, align: 'center' }
  );
  doc.end();
}
