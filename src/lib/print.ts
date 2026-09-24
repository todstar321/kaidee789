import { formatMoney, formatThaiDate, formatThaiTime } from './utils';

/**
 * Universal thermal print function that writes into an isolated hidden iframe
 * ensuring 100% clean printing with zero white blank pages on any browser or printer.
 */
export function printReceiptHtml(htmlBody: string, title: string = 'เอกสารพิมพ์') {
  if (typeof window === 'undefined') return;

  // Clean up any existing print iframe
  const existingIframe = document.getElementById('thermal-print-iframe');
  if (existingIframe) {
    existingIframe.remove();
  }

  const iframe = document.createElement('iframe');
  iframe.id = 'thermal-print-iframe';
  iframe.style.position = 'fixed';
  iframe.style.top = '-9999px';
  iframe.style.left = '-9999px';
  iframe.style.width = '80mm';
  iframe.style.height = '100mm';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    window.print();
    return;
  }

  const fullHtml = `
    <!DOCTYPE html>
    <html lang="th">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${title}</title>
        <style>
          @page {
            size: auto;
            margin: 0;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            margin: 0;
            padding: 0;
            background: #ffffff !important;
            color: #000000 !important;
          }
          body {
            padding: 8px 6px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Courier New", Tahoma, sans-serif;
            font-size: 12px;
            line-height: 1.35;
            width: 76mm; /* Ideal width for both 58mm and 80mm thermal rolls */
            max-width: 100%;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          .font-black { font-weight: 900; }
          .flex-between { display: flex; justify-content: space-between; align-items: flex-start; }
          .divider { border-top: 1px dashed #000000; margin: 6px 0; }
          .bold-divider { border-top: 1.5px solid #000000; margin: 6px 0; }
          img { max-width: 100%; height: auto; display: block; margin: 0 auto; }
          @media print {
            body { width: 100%; }
          }
        </style>
      </head>
      <body>
        ${htmlBody}
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.focus();
              window.print();
              setTimeout(function() {
                try {
                  window.parent.document.body.removeChild(window.frameElement);
                } catch(e) {}
              }, 1500);
            }, 300);
          };
        </script>
      </body>
    </html>
  `;

  doc.open();
  doc.write(fullHtml);
  doc.close();
}

/**
 * 1. Render Table Slip HTML (ใบเปิดโต๊ะ 58mm/80mm)
 */
export function renderTableSlipHtml(data: {
  storeName?: string;
  tableNumber: string;
  zone?: string;
  qrDataUrl: string;
  openedAt?: string;
  guestCount?: number;
  memberName?: string;
}) {
  return `
    <div class="text-center" style="margin-bottom: 6px;">
      <h2 style="font-size: 16px; font-weight: bold; margin: 0;">${data.storeName || 'ร้านขายดี'}</h2>
      <div style="font-size: 13px; font-weight: bold; margin: 4px 0;">ใบเปิดโต๊ะ / TABLE SLIP</div>
      <div style="font-size: 22px; font-weight: 900; margin: 4px 0; border: 1.5px solid #000; padding: 4px 0;">
        ${data.tableNumber} ${data.zone ? `(${data.zone})` : ''}
      </div>
    </div>

    <div class="text-center" style="margin: 10px 0;">
      <img src="${data.qrDataUrl}" alt="QR Slip" style="width: 160px; height: 160px;" />
      <p style="font-size: 11px; font-weight: bold; margin-top: 4px;">สแกนสั่งอาหารผ่านมือถือ</p>
    </div>

    <div class="divider"></div>

    <div style="font-size: 11px;">
      <div class="flex-between">
        <span>เวลาเปิดโต๊ะ:</span>
        <span class="font-bold">${formatThaiTime(data.openedAt || new Date().toISOString())}</span>
      </div>
      ${data.guestCount ? `
        <div class="flex-between">
          <span>จำนวนลูกค้า:</span>
          <span class="font-bold">${data.guestCount} ท่าน</span>
        </div>
      ` : ''}
      ${data.memberName ? `
        <div class="flex-between" style="color: #000;">
          <span>สมาชิก:</span>
          <span class="font-bold">👑 ${data.memberName}</span>
        </div>
      ` : ''}
    </div>

    <div class="divider"></div>

    <div class="text-center" style="font-size: 10px; margin-top: 6px;">
      QR Code นี้ใช้เฉพาะรอบการทานนี้เท่านั้น<br/>
      จะหมดอายุอัตโนมัติเมื่อเช็กบิลปิดโต๊ะ
    </div>
  `;
}

/**
 * 2. Render Cashier Invoice Receipt HTML (ใบเสร็จรับเงิน 58mm/80mm)
 */
export function renderInvoiceReceiptHtml(data: {
  storeName?: string;
  storeAddress?: string;
  storePhone?: string;
  invoiceId: string;
  tableNumber: string;
  paidAt: string;
  memberName?: string;
  buffetDetails?: { name: string; price: number; count: number; total: number } | null;
  items?: { id: string; item_name: string; quantity: number; price: number }[];
  subtotal: number;
  discountAmount?: number;
  discountDetails?: string;
  serviceCharge?: number;
  vatAmount?: number;
  grandTotal: number;
  paymentMethod: string;
  cashReceived?: number;
  changeGiven?: number;
}) {
  const isCash = data.paymentMethod === 'cash' || !data.paymentMethod;

  return `
    <div class="text-center" style="margin-bottom: 6px;">
      <h2 style="font-size: 16px; font-weight: bold; margin: 0;">${data.storeName || 'ร้านอาหาร'}</h2>
      ${data.storeAddress ? `<p style="font-size: 10px; margin: 2px 0;">${data.storeAddress}</p>` : ''}
      ${data.storePhone ? `<p style="font-size: 10px; margin: 2px 0;">โทร: ${data.storePhone}</p>` : ''}
      <div style="font-size: 13px; font-weight: bold; margin: 6px 0; border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 4px 0;">
        ใบเสร็จรับเงิน / RECEIPT
      </div>
    </div>

    <div style="font-size: 10px; margin-bottom: 6px;">
      <div class="flex-between">
        <span>โต๊ะ: <strong>${data.tableNumber}</strong></span>
        <span>เลขที่: <strong>${data.invoiceId}</strong></span>
      </div>
      <div class="flex-between">
        <span>วันที่: ${formatThaiDate(data.paidAt)}</span>
        <span>เวลา: ${formatThaiTime(data.paidAt)}</span>
      </div>
      ${data.memberName ? `<div>สมาชิก: <strong>${data.memberName}</strong></div>` : ''}
    </div>

    <div class="divider"></div>

    <div style="font-size: 11px;">
      ${data.buffetDetails ? `
        <div class="flex-between font-bold" style="margin-bottom: 4px;">
          <span>${data.buffetDetails.name} x${data.buffetDetails.count}</span>
          <span>${formatMoney(data.buffetDetails.total)}</span>
        </div>
      ` : ''}

      ${(data.items || []).map(it => `
        <div class="flex-between" style="margin-bottom: 3px;">
          <span>${it.item_name} x${it.quantity}</span>
          <span>${formatMoney(it.price * it.quantity)}</span>
        </div>
      `).join('')}
    </div>

    <div class="divider"></div>

    <div style="font-size: 11px;">
      <div class="flex-between">
        <span>1. รวมค่าอาหาร:</span>
        <span>${formatMoney(data.subtotal)}</span>
      </div>

      ${(data.discountAmount || 0) > 0 ? `
        <div class="flex-between">
          <span>2. ส่วนลด ${data.discountDetails ? `(${data.discountDetails})` : ''}:</span>
          <span>-${formatMoney(data.discountAmount || 0)}</span>
        </div>
      ` : ''}

      ${(data.serviceCharge || 0) > 0 ? `
        <div class="flex-between">
          <span>3. ค่าบริการ (Service Charge):</span>
          <span>+${formatMoney(data.serviceCharge || 0)}</span>
        </div>
      ` : ''}

      ${(data.vatAmount || 0) > 0 ? `
        <div class="flex-between">
          <span>4. ภาษีมูลค่าเพิ่ม (VAT 7%):</span>
          <span>+${formatMoney(data.vatAmount || 0)}</span>
        </div>
      ` : ''}

      <div class="bold-divider"></div>

      <div class="flex-between" style="font-size: 14px; font-weight: 900;">
        <span>5. ยอดชำระสุทธิ:</span>
        <span>${formatMoney(data.grandTotal)}</span>
      </div>

      <div class="flex-between" style="margin-top: 4px; font-size: 11px;">
        <span>วิธีชำระเงิน:</span>
        <span class="font-bold">${data.paymentMethod.toUpperCase()}</span>
      </div>

      ${isCash && data.cashReceived ? `
        <div class="flex-between" style="font-size: 11px;">
          <span>รับเงินสดมา:</span>
          <span>${formatMoney(data.cashReceived)}</span>
        </div>
        <div class="flex-between font-bold" style="font-size: 11px;">
          <span>เงินทอน:</span>
          <span>${formatMoney(data.changeGiven || 0)}</span>
        </div>
      ` : ''}
    </div>

    <div class="divider"></div>

    <div class="text-center" style="font-size: 10px; margin-top: 6px;">
      ขอบคุณที่อุดหนุน โอกาสหน้าเชิญใหม่ครับ
    </div>
  `;
}

/**
 * 3. Render Kitchen Ticket HTML (ใบสั่งอาหารเข้าครัว KDS)
 */
export function renderKitchenTicketHtml(data: {
  storeName?: string;
  tableTitle: string;
  time?: string;
  items: {
    item_name: string;
    quantity: number;
    guest_label?: string;
    guest_nickname?: string;
    notes?: string;
  }[];
}) {
  return `
    <div class="text-center" style="margin-bottom: 6px;">
      <h2 style="font-size: 15px; font-weight: bold; margin: 0;">ใบสั่งอาหารเข้าครัว</h2>
      <div style="font-size: 11px; margin: 2px 0;">KITCHEN ORDER TICKET</div>
      <div style="font-size: 20px; font-weight: 900; margin: 4px 0; border: 1.5px solid #000; padding: 4px 0;">
        ${data.tableTitle}
      </div>
      <div style="font-size: 10px; color: #333;">
        เวลาสั่ง: ${formatThaiTime(data.time || new Date().toISOString())}
      </div>
    </div>

    <div class="bold-divider"></div>

    <div style="font-size: 13px;">
      ${data.items.map(it => `
        <div style="margin-bottom: 8px; border-bottom: 1px dashed #ccc; padding-bottom: 4px;">
          <div class="flex-between">
            <span class="font-black" style="font-size: 14px;">${it.item_name}</span>
            <span class="font-black" style="font-size: 16px;">x${it.quantity}</span>
          </div>
          ${it.guest_label ? `
            <div style="font-size: 10px; color: #555;">
              สั่งโดย: ${it.guest_label} ${it.guest_nickname ? `(${it.guest_nickname})` : ''}
            </div>
          ` : ''}
          ${it.notes ? `
            <div style="font-size: 11px; font-weight: bold; color: #000; margin-top: 2px;">
              ⚠️ หมายเหตุ: ${it.notes}
            </div>
          ` : ''}
        </div>
      `).join('')}
    </div>

    <div class="divider"></div>

    <div class="text-center" style="font-size: 11px; font-weight: bold;">
      รวม ${data.items.length} รายการ
    </div>
  `;
}
