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
            width: 100% !important;
          }
          body {
            padding: 10px 8px;
            font-family: 'Sarabun', 'Prompt', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Thai", "Thonburi", sans-serif;
            font-size: 15px;
            line-height: 1.45;
          }
          .receipt-container {
            width: 100%;
            max-width: 80mm;
            margin: 0 auto;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          .font-black { font-weight: 900; }
          .no-wrap { white-space: nowrap; }
          .flex-between { 
            display: flex; 
            justify-content: space-between; 
            align-items: flex-start; 
            gap: 8px; 
          }
          .divider { border-top: 1.5px dashed #000000; margin: 8px 0; }
          .bold-divider { border-top: 2px solid #000000; margin: 8px 0; }
          img { max-width: 100%; height: auto; display: block; margin: 0 auto; }
          @media print {
            body { 
              padding: 6px 4px !important; 
            }
            .receipt-container {
              width: 100% !important;
              max-width: 80mm !important;
              margin: 0 auto !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="receipt-container">
          ${htmlBody}
        </div>
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
 * - Optimized typography: Large table number, large crisp QR code, readable Thai metadata
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
    <div class="text-center" style="margin-bottom: 8px;">
      <h1 style="font-size: 22px; font-weight: 900; margin: 0 0 4px 0; line-height: 1.2;">
        ${data.storeName || 'ร้านอาหาร'}
      </h1>
      <div style="font-size: 15px; font-weight: bold; color: #222; margin-bottom: 6px;">
        ใบเปิดโต๊ะ / TABLE SLIP
      </div>
      <div style="font-size: 32px; font-weight: 900; border: 2.5px solid #000; border-radius: 8px; padding: 8px 4px; margin: 8px 0; line-height: 1.2; letter-spacing: 0.5px;">
        ${data.tableNumber} ${data.zone ? `<span style="font-size: 18px; font-weight: bold;">(${data.zone})</span>` : ''}
      </div>
    </div>

    <div class="text-center" style="margin: 12px 0;">
      <div style="display: inline-block; padding: 6px; border: 1.5px solid #000; border-radius: 8px; background: #fff;">
        <img src="${data.qrDataUrl}" alt="QR Slip" style="width: 215px; height: 215px; display: block; margin: 0 auto;" />
      </div>
      <div style="font-size: 16px; font-weight: 900; margin-top: 8px; letter-spacing: 0.5px;">
        📱 สแกนเพื่อสั่งอาหารผ่านมือถือ
      </div>
      <div style="font-size: 13px; color: #444; margin-top: 2px;">
        Scan QR code to order food
      </div>
    </div>

    <div class="bold-divider"></div>

    <div style="font-size: 15px; line-height: 1.6; margin: 6px 0;">
      <div class="flex-between">
        <span style="color: #444;">เวลาเปิดโต๊ะ:</span>
        <span class="font-bold">${formatThaiTime(data.openedAt || new Date().toISOString())} น.</span>
      </div>
      ${data.guestCount ? `
        <div class="flex-between">
          <span style="color: #444;">จำนวนลูกค้า:</span>
          <span class="font-bold">${data.guestCount} ท่าน</span>
        </div>
      ` : ''}
      ${data.memberName ? `
        <div class="flex-between" style="border: 1px solid #000; padding: 3px 6px; border-radius: 6px; margin-top: 4px;">
          <span>สมาชิก (VIP):</span>
          <span class="font-black">👑 ${data.memberName}</span>
        </div>
      ` : ''}
    </div>

    <div class="divider"></div>

    <div class="text-center" style="font-size: 13px; color: #444; margin-top: 8px; line-height: 1.4;">
      * QR Code นี้ใช้เฉพาะรอบการทานนี้เท่านั้น<br/>
      จะหมดอายุอัตโนมัติเมื่อเช็กบิลปิดโต๊ะ
    </div>
  `;
}

/**
 * 2. Render Cashier Invoice Receipt HTML (ใบเสร็จรับเงิน 58mm/80mm)
 * - Optimized typography: Clear item rows, bold quantities, grand total highlight
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
    <div class="text-center" style="margin-bottom: 8px;">
      <h1 style="font-size: 22px; font-weight: 900; margin: 0 0 4px 0; line-height: 1.2;">
        ${data.storeName || 'ร้านอาหาร'}
      </h1>
      ${data.storeAddress ? `<div style="font-size: 13px; color: #444; margin: 2px 0;">${data.storeAddress}</div>` : ''}
      ${data.storePhone ? `<div style="font-size: 13px; color: #444; margin: 2px 0;">โทร: ${data.storePhone}</div>` : ''}
      
      <div style="font-size: 16px; font-weight: 900; margin: 8px 0 4px 0; border-top: 1.5px dashed #000; border-bottom: 1.5px dashed #000; padding: 6px 0;">
        ใบเสร็จรับเงิน / RECEIPT
      </div>
    </div>

    <div style="font-size: 14px; line-height: 1.5; margin-bottom: 6px;">
      <div class="flex-between">
        <span>โต๊ะ: <strong style="font-size: 18px;">${data.tableNumber}</strong></span>
        <span>เลขที่: <strong>${data.invoiceId}</strong></span>
      </div>
      <div class="flex-between" style="color: #444;">
        <span>วันที่: ${formatThaiDate(data.paidAt)}</span>
        <span>เวลา: ${formatThaiTime(data.paidAt)} น.</span>
      </div>
      ${data.memberName ? `
        <div style="margin-top: 2px; font-weight: bold;">
          สมาชิก: 👑 ${data.memberName}
        </div>
      ` : ''}
    </div>

    <div class="bold-divider"></div>

    <!-- Item List Header -->
    <div class="flex-between font-bold" style="font-size: 14px; border-bottom: 1px solid #000; padding-bottom: 4px; margin-bottom: 6px;">
      <span>รายการอาหาร</span>
      <span>จำนวนเงิน</span>
    </div>

    <div style="font-size: 15px; line-height: 1.5;">
      ${data.buffetDetails ? `
        <div class="flex-between font-bold" style="margin-bottom: 6px;">
          <span>${data.buffetDetails.name} <span style="font-size: 16px;">x${data.buffetDetails.count}</span></span>
          <span class="no-wrap font-black">${formatMoney(data.buffetDetails.total)}</span>
        </div>
      ` : ''}

      ${(data.items || []).map(it => `
        <div class="flex-between" style="margin-bottom: 5px;">
          <span style="flex: 1; padding-right: 8px;">
            <strong>${it.item_name}</strong> 
            <span style="font-size: 16px; font-weight: 900; margin-left: 4px;">x${it.quantity}</span>
          </span>
          <span class="no-wrap font-bold">${formatMoney(it.price * it.quantity)}</span>
        </div>
      `).join('')}
    </div>

    <div class="bold-divider"></div>

    <!-- Price Breakdown -->
    <div style="font-size: 15px; line-height: 1.6;">
      <div class="flex-between">
        <span>รวมค่าอาหาร:</span>
        <span class="font-bold">${formatMoney(data.subtotal)}</span>
      </div>

      ${(data.discountAmount || 0) > 0 ? `
        <div class="flex-between" style="color: #000;">
          <span>ส่วนลด ${data.discountDetails ? `(${data.discountDetails})` : ''}:</span>
          <span class="font-bold">-${formatMoney(data.discountAmount || 0)}</span>
        </div>
      ` : ''}

      ${(data.serviceCharge || 0) > 0 ? `
        <div class="flex-between">
          <span>ค่าบริการ (Service Charge):</span>
          <span class="font-bold">+${formatMoney(data.serviceCharge || 0)}</span>
        </div>
      ` : ''}

      ${(data.vatAmount || 0) > 0 ? `
        <div class="flex-between">
          <span>ภาษีมูลค่าเพิ่ม (VAT 7%):</span>
          <span class="font-bold">+${formatMoney(data.vatAmount || 0)}</span>
        </div>
      ` : ''}

      <div style="border-top: 2px solid #000; border-bottom: 2px solid #000; padding: 8px 0; margin: 8px 0;">
        <div class="flex-between" style="font-size: 22px; font-weight: 900;">
          <span>ยอดชำระสุทธิ:</span>
          <span>${formatMoney(data.grandTotal)}</span>
        </div>
      </div>

      <div class="flex-between" style="font-size: 15px; margin-top: 4px;">
        <span>วิธีชำระเงิน:</span>
        <span class="font-bold" style="font-size: 16px;">${data.paymentMethod.toUpperCase()}</span>
      </div>

      ${isCash && data.cashReceived ? `
        <div class="flex-between" style="font-size: 15px; margin-top: 2px;">
          <span>รับเงินสดมา:</span>
          <span class="font-bold">${formatMoney(data.cashReceived)}</span>
        </div>
        <div class="flex-between font-bold" style="font-size: 16px; margin-top: 2px;">
          <span>เงินทอน:</span>
          <span class="font-black" style="font-size: 18px;">${formatMoney(data.changeGiven || 0)}</span>
        </div>
      ` : ''}
    </div>

    <div class="divider"></div>

    <div class="text-center" style="font-size: 13px; font-weight: bold; margin-top: 10px; line-height: 1.4;">
      ขอบคุณที่อุดหนุน โอกาสหน้าเชิญใหม่ครับ 🙏<br/>
      <span style="font-size: 11px; font-weight: normal; color: #555;">Thank you for your visit</span>
    </div>
  `;
}

/**
 * 3. Render Kitchen Ticket HTML (ใบสั่งอาหารเข้าครัว KDS)
 * - Optimized typography: Giant table title, large dish names & quantities, highlighted notes for chefs
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
    <div class="text-center" style="margin-bottom: 8px;">
      <div style="font-size: 16px; font-weight: bold; color: #333;">
        ${data.storeName || 'ห้องครัว (KITCHEN)'}
      </div>
      <h1 style="font-size: 22px; font-weight: 900; margin: 2px 0 6px 0;">
        ใบสั่งอาหารเข้าครัว
      </h1>
      
      <div style="font-size: 34px; font-weight: 900; border: 3px solid #000; border-radius: 8px; padding: 8px 4px; margin: 6px 0; background: #fff; line-height: 1.1;">
        ${data.tableTitle}
      </div>
      
      <div style="font-size: 14px; font-weight: bold; color: #333; margin-top: 4px;">
        เวลาสั่ง: ${formatThaiTime(data.time || new Date().toISOString())} น.
      </div>
    </div>

    <div class="bold-divider"></div>

    <div style="margin: 8px 0;">
      ${data.items.map((it, idx) => `
        <div style="margin-bottom: 12px; border-bottom: 1.5px dashed #000; padding-bottom: 8px;">
          <div class="flex-between" style="align-items: center;">
            <span style="font-size: 20px; font-weight: 900; flex: 1; padding-right: 8px; line-height: 1.3;">
              ${idx + 1}. ${it.item_name}
            </span>
            <span class="no-wrap font-black" style="font-size: 26px; border: 2px solid #000; padding: 2px 8px; border-radius: 6px; background: #fff;">
              x${it.quantity}
            </span>
          </div>
          
          ${it.guest_label ? `
            <div style="font-size: 13px; color: #555; margin-top: 3px; font-weight: 500;">
              👤 สั่งโดย: <strong>${it.guest_label}</strong> ${it.guest_nickname ? `(${it.guest_nickname})` : ''}
            </div>
          ` : ''}

          ${it.notes ? `
            <div style="font-size: 16px; font-weight: 900; color: #000; margin-top: 6px; border: 2px solid #000; padding: 4px 8px; border-radius: 6px; background: #fff;">
              ⚠️ พิเศษ/หมายเหตุ: ${it.notes}
            </div>
          ` : ''}
        </div>
      `).join('')}
    </div>

    <div class="bold-divider"></div>

    <div class="flex-between" style="font-size: 16px; font-weight: 900; padding: 4px 0;">
      <span>รวมรายการอาหารทั้งหมด:</span>
      <span style="font-size: 18px;">${data.items.length} รายการ</span>
    </div>
  `;
}

