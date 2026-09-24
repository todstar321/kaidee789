import { formatMoney, formatThaiDate, formatThaiTime } from './utils';

export type PrintPaperFormat = 'a4' | 'thermal';

/**
 * Universal print function that writes into an isolated hidden iframe
 * ensuring 100% clean printing with zero white blank pages on any browser or printer.
 * Supports both full-page standard paper (A4) and compact thermal receipt rolls (58mm/80mm).
 */
export function printReceiptHtml(
  htmlBody: string,
  title: string = 'เอกสารพิมพ์',
  paperFormat: PrintPaperFormat = 'a4'
) {
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
  iframe.style.width = paperFormat === 'a4' ? '210mm' : '80mm';
  iframe.style.height = paperFormat === 'a4' ? '297mm' : '100mm';
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
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            margin: 0;
            padding: 0;
            background: #ffffff !important;
            color: #0f172a !important;
            width: 100% !important;
          }
          body {
            font-family: 'Sarabun', 'Prompt', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Thai", "Thonburi", sans-serif;
            -webkit-font-smoothing: antialiased;
          }
          ${paperFormat === 'a4' ? `
            @page {
              size: A4 portrait;
              margin: 12mm 15mm;
            }
            body {
              padding: 10px 8px;
              font-size: 16px;
              line-height: 1.5;
            }
            .page-container {
              width: 100%;
              max-width: 180mm;
              margin: 0 auto;
            }
            @media print {
              body { padding: 0 !important; }
              .page-container { width: 100% !important; max-width: 100% !important; margin: 0 auto !important; }
            }
          ` : `
            @page {
              size: auto;
              margin: 0;
            }
            body {
              padding: 10px 8px;
              font-size: 15px;
              line-height: 1.45;
            }
            .page-container {
              width: 100%;
              max-width: 80mm;
              margin: 0 auto;
            }
            @media print {
              body { padding: 6px 4px !important; }
              .page-container { width: 100% !important; max-width: 80mm !important; margin: 0 auto !important; }
            }
          `}
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
        </style>
      </head>
      <body>
        <div class="page-container">
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
 * 1. Render Table Slip HTML (ใบเปิดโต๊ะ / TABLE QR STAND)
 * Supports both full-page standard paper (A4) and compact thermal receipt rolls (80mm).
 */
export function renderTableSlipHtml(
  data: {
    storeName?: string;
    tableNumber: string;
    zone?: string;
    qrDataUrl: string;
    openedAt?: string;
    guestCount?: number;
    memberName?: string;
  },
  format: PrintPaperFormat = 'a4'
) {
  if (format === 'a4') {
    return `
      <div style="border: 2.5px solid #0f172a; border-radius: 24px; padding: 40px 44px; background: #ffffff; width: 100%; margin: 0 auto; box-sizing: border-box;">
        
        <!-- Header: Restaurant Name & Title -->
        <div style="text-align: center; border-bottom: 2px dashed #cbd5e1; padding-bottom: 24px; margin-bottom: 24px;">
          <div style="font-size: 15px; font-weight: 800; color: #ea580c; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 6px;">
            🍽️ RESTAURANT QR ORDERING SYSTEM
          </div>
          <h1 style="font-size: 36px; font-weight: 900; color: #0f172a; margin: 0 0 6px 0; line-height: 1.2;">
            ${data.storeName || 'ร้านอาหารขายดี'}
          </h1>
          <div style="display: inline-block; background: #0f172a; color: #ffffff; font-size: 18px; font-weight: 800; padding: 6px 28px; border-radius: 9999px; margin-top: 10px; letter-spacing: 1px;">
            ใบเปิดโต๊ะ / TABLE QR STAND
          </div>
        </div>

        <!-- Giant Table Name Highlight Banner -->
        <div style="background: #f8fafc; border: 3px solid #0f172a; border-radius: 18px; padding: 18px 24px; margin-bottom: 28px; text-align: center;">
          <div style="font-size: 52px; font-weight: 900; color: #0f172a; line-height: 1.1;">
            ${data.tableNumber} ${data.zone ? `<span style="font-size: 30px; font-weight: 700; color: #ea580c;">(${data.zone})</span>` : ''}
          </div>
          <div style="display: flex; justify-content: center; gap: 36px; margin-top: 14px; font-size: 18px; font-weight: 700; color: #334155; border-top: 1.5px solid #e2e8f0; padding-top: 14px;">
            <span>🕒 เวลาเปิดโต๊ะ: <strong>${formatThaiTime(data.openedAt || new Date().toISOString())} น.</strong></span>
            ${data.guestCount ? `<span>👥 จำนวนลูกค้า: <strong>${data.guestCount} ท่าน</strong></span>` : ''}
            ${data.memberName ? `<span>👑 สมาชิก VIP: <strong style="color: #ea580c;">${data.memberName}</strong></span>` : ''}
          </div>
        </div>

        <!-- QR Code & Call to Action -->
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="display: inline-block; padding: 18px; border: 3.5px solid #0f172a; border-radius: 24px; background: #ffffff; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);">
            <img src="${data.qrDataUrl}" alt="QR Code" style="width: 280px; height: 280px; display: block; margin: 0 auto;" />
          </div>
          <div style="font-size: 26px; font-weight: 900; color: #0f172a; margin-top: 16px; letter-spacing: 0.5px;">
            📱 สแกน QR Code ด้วยมือถือเพื่อสั่งอาหาร
          </div>
          <div style="font-size: 16px; color: #64748b; margin-top: 4px; font-weight: 500;">
            Scan QR Code with your smartphone camera to view menu & place orders
          </div>
        </div>

        <!-- 3 Steps Guide -->
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 18px; margin-bottom: 28px; text-align: left;">
          <div style="background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 14px; padding: 18px;">
            <div style="font-size: 20px; font-weight: 900; color: #ea580c; margin-bottom: 6px;">1. สแกน QR</div>
            <div style="font-size: 14px; color: #475569; line-height: 1.4;">เปิดกล้องมือถือสแกนภาพ QR Code ไม่ต้องโหลดแอปพลิเคชัน</div>
          </div>
          <div style="background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 14px; padding: 18px;">
            <div style="font-size: 20px; font-weight: 900; color: #ea580c; margin-bottom: 6px;">2. เลือกอาหาร</div>
            <div style="font-size: 14px; color: #475569; line-height: 1.4;">เลือกเมนูที่ถูกใจ ปรับระดับความเผ็ด และเพิ่มข้อความพิเศษได้ตามชอบ</div>
          </div>
          <div style="background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 14px; padding: 18px;">
            <div style="font-size: 20px; font-weight: 900; color: #ea580c; margin-bottom: 6px;">3. รอเสิร์ฟ</div>
            <div style="font-size: 14px; color: #475569; line-height: 1.4;">กดยืนยันออเดอร์ ออเดอร์จะส่งตรงเข้าห้องครัวทันที และติดตามสถานะสดได้</div>
          </div>
        </div>

        <!-- Footer Notice -->
        <div style="text-align: center; border-top: 2px dashed #cbd5e1; padding-top: 18px;">
          <div style="font-size: 14px; color: #64748b; margin-bottom: 4px;">
            * QR Code นี้ใช้เฉพาะรอบการทานนี้เท่านั้น และจะหมดอายุอัตโนมัติเมื่อเช็กบิลปิดโต๊ะ
          </div>
          <div style="font-size: 16px; font-weight: 700; color: #0f172a;">
            ขอให้ทุกท่านมีความสุขและเพลิดเพลินกับมื้ออาหารแสนอร่อยครับ 🙏
          </div>
        </div>
      </div>
    `;
  }

  // Thermal 80mm format
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
 * 2. Render Cashier Invoice Receipt HTML (ใบเสร็จรับเงิน / RECEIPT)
 * Supports both full-page standard paper (A4) and compact thermal receipt rolls (80mm).
 */
export function renderInvoiceReceiptHtml(
  data: {
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
  },
  format: PrintPaperFormat = 'a4'
) {
  const isCash = data.paymentMethod === 'cash' || !data.paymentMethod;

  if (format === 'a4') {
    return `
      <div style="width: 100%; margin: 0 auto; box-sizing: border-box; font-family: inherit;">
        
        <!-- Header: Store Info & Receipt Title -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #0f172a; padding-bottom: 20px; margin-bottom: 24px;">
          <div>
            <h1 style="font-size: 34px; font-weight: 900; color: #0f172a; margin: 0 0 6px 0; line-height: 1.2;">
              ${data.storeName || 'ร้านอาหารขายดี'}
            </h1>
            ${data.storeAddress ? `<div style="font-size: 15px; color: #475569; margin-bottom: 3px;">📍 ${data.storeAddress}</div>` : ''}
            ${data.storePhone ? `<div style="font-size: 15px; color: #475569;">📞 โทร: ${data.storePhone}</div>` : ''}
          </div>
          <div style="text-align: right;">
            <div style="font-size: 30px; font-weight: 900; color: #0f172a; letter-spacing: 0.5px;">
              ใบเสร็จรับเงิน
            </div>
            <div style="font-size: 15px; font-weight: 700; color: #64748b; margin-top: 2px;">
              RECEIPT / TAX INVOICE (ABB)
            </div>
            <div style="font-size: 16px; font-weight: 700; color: #0f172a; margin-top: 8px;">
              เลขที่ใบเสร็จ: <span style="font-family: monospace; font-size: 18px; color: #ea580c;">${data.invoiceId}</span>
            </div>
          </div>
        </div>

        <!-- Meta Info Grid -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 18px 24px; margin-bottom: 28px; font-size: 16px;">
          <div>
            <div style="margin-bottom: 8px;">
              <span style="color: #64748b; font-weight: 600;">หมายเลขโต๊ะ:</span> 
              <strong style="font-size: 22px; color: #0f172a; margin-left: 8px;">${data.tableNumber}</strong>
            </div>
            <div>
              <span style="color: #64748b; font-weight: 600;">สมาชิก:</span> 
              <strong style="color: #0f172a; margin-left: 8px;">${data.memberName ? `👑 ${data.memberName}` : 'ลูกค้าทั่วไป'}</strong>
            </div>
          </div>
          <div style="text-align: right;">
            <div style="margin-bottom: 8px;">
              <span style="color: #64748b; font-weight: 600;">วันที่ออกใบเสร็จ:</span> 
              <strong style="color: #0f172a; margin-left: 8px;">${formatThaiDate(data.paidAt)}</strong>
            </div>
            <div>
              <span style="color: #64748b; font-weight: 600;">เวลา:</span> 
              <strong style="color: #0f172a; margin-left: 8px;">${formatThaiTime(data.paidAt)} น.</strong>
            </div>
          </div>
        </div>

        <!-- Invoice Items Table -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 28px; font-size: 16px;">
          <thead>
            <tr style="background: #f1f5f9; border-top: 2px solid #0f172a; border-bottom: 2px solid #0f172a;">
              <th style="padding: 12px 10px; text-align: center; width: 8%; font-weight: 900; color: #0f172a;">ลำดับ</th>
              <th style="padding: 12px 14px; text-align: left; width: 48%; font-weight: 900; color: #0f172a;">รายการอาหาร / สินค้า</th>
              <th style="padding: 12px 10px; text-align: center; width: 12%; font-weight: 900; color: #0f172a;">จำนวน</th>
              <th style="padding: 12px 10px; text-align: right; width: 16%; font-weight: 900; color: #0f172a;">ราคา/หน่วย</th>
              <th style="padding: 12px 14px; text-align: right; width: 16%; font-weight: 900; color: #0f172a;">จำนวนเงิน (บาท)</th>
            </tr>
          </thead>
          <tbody>
            ${data.buffetDetails ? `
              <tr style="border-bottom: 1px solid #e2e8f0; font-weight: bold; background: #fff7ed;">
                <td style="padding: 14px 10px; text-align: center; color: #64748b;">1</td>
                <td style="padding: 14px;">
                  <div style="font-size: 18px; color: #0f172a;">บุฟเฟต์: ${data.buffetDetails.name}</div>
                </td>
                <td style="padding: 14px 10px; text-align: center; font-size: 18px;">${data.buffetDetails.count}</td>
                <td style="padding: 14px 10px; text-align: right;">${formatMoney(data.buffetDetails.price)}</td>
                <td style="padding: 14px; text-align: right; font-weight: 900; font-size: 18px; color: #0f172a;">
                  ${formatMoney(data.buffetDetails.total)}
                </td>
              </tr>
            ` : ''}

            ${(data.items || []).map((it, idx) => `
              <tr style="border-bottom: 1px solid #e2e8f0; ${idx % 2 === 1 ? 'background: #f8fafc;' : ''}">
                <td style="padding: 14px 10px; text-align: center; color: #64748b;">
                  ${(data.buffetDetails ? 2 : 1) + idx}
                </td>
                <td style="padding: 14px;">
                  <div style="font-size: 17px; font-weight: 700; color: #0f172a;">${it.item_name}</div>
                </td>
                <td style="padding: 14px 10px; text-align: center; font-size: 17px; font-weight: 700;">
                  ${it.quantity}
                </td>
                <td style="padding: 14px 10px; text-align: right; color: #475569;">
                  ${formatMoney(it.price)}
                </td>
                <td style="padding: 14px; text-align: right; font-weight: 900; font-size: 17px; color: #0f172a;">
                  ${formatMoney(it.price * it.quantity)}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <!-- Financial Summary & Payment Breakdown -->
        <div style="display: flex; justify-content: flex-end; margin-bottom: 32px;">
          <div style="width: 380px; background: #f8fafc; border: 2px solid #0f172a; border-radius: 14px; padding: 20px 24px; font-size: 16px; line-height: 1.6;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
              <span style="color: #475569;">รวมค่าอาหาร (Subtotal):</span>
              <span style="font-weight: 700;">${formatMoney(data.subtotal)} บาท</span>
            </div>

            ${(data.discountAmount || 0) > 0 ? `
              <div style="display: flex; justify-content: space-between; margin-bottom: 6px; color: #dc2626;">
                <span>ส่วนลด ${data.discountDetails ? `(${data.discountDetails})` : ''}:</span>
                <span style="font-weight: 700;">-${formatMoney(data.discountAmount || 0)} บาท</span>
              </div>
            ` : ''}

            ${(data.serviceCharge || 0) > 0 ? `
              <div style="display: flex; justify-content: space-between; margin-bottom: 6px; color: #475569;">
                <span>ค่าบริการ (Service Charge):</span>
                <span style="font-weight: 700;">+${formatMoney(data.serviceCharge || 0)} บาท</span>
              </div>
            ` : ''}

            ${(data.vatAmount || 0) > 0 ? `
              <div style="display: flex; justify-content: space-between; margin-bottom: 6px; color: #475569;">
                <span>ภาษีมูลค่าเพิ่ม (VAT 7%):</span>
                <span style="font-weight: 700;">+${formatMoney(data.vatAmount || 0)} บาท</span>
              </div>
            ` : ''}

            <div style="border-top: 2px solid #0f172a; border-bottom: 2px solid #0f172a; padding: 10px 0; margin: 10px 0;">
              <div style="display: flex; justify-content: space-between; font-size: 24px; font-weight: 900; color: #0f172a;">
                <span>ยอดชำระสุทธิ:</span>
                <span style="color: #ea580c;">${formatMoney(data.grandTotal)} บาท</span>
              </div>
            </div>

            <div style="display: flex; justify-content: space-between; font-size: 15px; margin-top: 6px;">
              <span style="color: #475569;">วิธีชำระเงิน:</span>
              <span style="font-weight: 700; color: #0f172a;">${data.paymentMethod.toUpperCase()}</span>
            </div>

            ${isCash && data.cashReceived ? `
              <div style="display: flex; justify-content: space-between; font-size: 15px; margin-top: 4px;">
                <span style="color: #475569;">รับเงินสดมา:</span>
                <span style="font-weight: 700;">${formatMoney(data.cashReceived)} บาท</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: 900; margin-top: 4px; color: #0f172a;">
                <span>เงินทอน:</span>
                <span>${formatMoney(data.changeGiven || 0)} บาท</span>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Signatures & Thank you -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 24px; font-size: 15px; color: #475569; border-top: 1.5px dashed #cbd5e1; padding-top: 20px;">
          <div style="text-align: center;">
            <div style="margin-bottom: 40px;">ผู้รับเงิน / พนักงานแคชเชียร์</div>
            <div>ลงชื่อ: ....................................................................</div>
          </div>
          <div style="text-align: center;">
            <div style="margin-bottom: 40px;">ผู้จ่ายเงิน / ลูกค้า</div>
            <div>ลงชื่อ: ....................................................................</div>
          </div>
        </div>

        <div style="text-align: center; margin-top: 28px; font-size: 16px; font-weight: 700; color: #0f172a;">
          ขอบคุณที่อุดหนุนและไว้วางใจใช้บริการ โอกาสหน้าเชิญใหม่ครับ 🙏<br/>
          <span style="font-size: 14px; font-weight: normal; color: #64748b;">Thank you for dining with us!</span>
        </div>
      </div>
    `;
  }

  // Thermal 80mm format
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
 * 3. Render Kitchen Ticket HTML (ใบสั่งอาหารเข้าห้องครัว KDS)
 * Supports both full-page standard paper (A4) and compact thermal receipt rolls (80mm).
 */
export function renderKitchenTicketHtml(
  data: {
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
  },
  format: PrintPaperFormat = 'a4'
) {
  if (format === 'a4') {
    return `
      <div style="width: 100%; margin: 0 auto; box-sizing: border-box; font-family: inherit;">
        
        <!-- Header Banner -->
        <div style="display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #0f172a; padding-bottom: 16px; margin-bottom: 24px;">
          <div>
            <div style="font-size: 16px; font-weight: 800; color: #ea580c; letter-spacing: 1px;">
              👨‍🍳 KITCHEN ORDER TICKET (จอห้องครัว)
            </div>
            <h1 style="font-size: 34px; font-weight: 900; color: #0f172a; margin: 4px 0 0 0;">
              ใบสั่งอาหารเข้าห้องครัว
            </h1>
            <div style="font-size: 16px; color: #64748b; font-weight: 600; margin-top: 4px;">
              ${data.storeName || 'ร้านอาหารขายดี'}
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 20px; font-weight: 900; color: #0f172a;">
              เวลาสั่ง: <span style="color: #ea580c;">${formatThaiTime(data.time || new Date().toISOString())} น.</span>
            </div>
            <div style="font-size: 15px; color: #64748b; font-weight: 600; margin-top: 4px;">
              วันที่: ${formatThaiDate(data.time || new Date().toISOString())}
            </div>
          </div>
        </div>

        <!-- Giant Table Box -->
        <div style="background: #0f172a; color: #ffffff; border-radius: 16px; padding: 20px 28px; margin-bottom: 28px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-size: 16px; color: #94a3b8; font-weight: 700; text-transform: uppercase;">
              หมายเลขโต๊ะ / ที่นั่ง
            </div>
            <div style="font-size: 52px; font-weight: 900; line-height: 1.1; margin-top: 4px;">
              ${data.tableTitle}
            </div>
          </div>
          <div style="text-align: right; background: rgba(255,255,255,0.1); padding: 12px 24px; border-radius: 12px; border: 1.5px solid rgba(255,255,255,0.2);">
            <div style="font-size: 14px; color: #cbd5e1; font-weight: 600;">สถานะครัว</div>
            <div style="font-size: 24px; font-weight: 900; color: #38bdf8;">🔥 ปรุงทันที</div>
          </div>
        </div>

        <!-- Items Table (Full Width Table) -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 32px; font-size: 18px;">
          <thead>
            <tr style="background: #f1f5f9; border-top: 2.5px solid #0f172a; border-bottom: 2.5px solid #0f172a;">
              <th style="padding: 14px 12px; text-align: center; width: 8%; font-weight: 900; color: #0f172a;">ลำดับ</th>
              <th style="padding: 14px 16px; text-align: left; width: 45%; font-weight: 900; color: #0f172a;">รายการอาหารที่สั่ง</th>
              <th style="padding: 14px 12px; text-align: center; width: 15%; font-weight: 900; color: #0f172a;">จำนวน</th>
              <th style="padding: 14px 12px; text-align: left; width: 20%; font-weight: 900; color: #0f172a;">สั่งโดย</th>
              <th style="padding: 14px 12px; text-align: center; width: 12%; font-weight: 900; color: #0f172a;">ตรวจรับ</th>
            </tr>
          </thead>
          <tbody>
            ${data.items.map((it, idx) => `
              <tr style="border-bottom: 1.5px solid #e2e8f0; ${idx % 2 === 1 ? 'background: #f8fafc;' : ''}">
                <td style="padding: 16px 12px; text-align: center; font-weight: 900; font-size: 20px; color: #64748b; vertical-align: top;">
                  ${idx + 1}
                </td>
                <td style="padding: 16px; vertical-align: top;">
                  <div style="font-size: 24px; font-weight: 900; color: #0f172a; line-height: 1.3;">
                    ${it.item_name}
                  </div>
                  ${it.notes ? `
                    <div style="margin-top: 8px; display: inline-block; background: #fef2f2; border: 2px solid #ef4444; border-radius: 8px; padding: 6px 14px; font-size: 18px; font-weight: 900; color: #b91c1c;">
                      ⚠️ พิเศษ/หมายเหตุ: ${it.notes}
                    </div>
                  ` : ''}
                </td>
                <td style="padding: 16px 12px; text-align: center; vertical-align: top;">
                  <span style="display: inline-block; font-size: 32px; font-weight: 900; background: #0f172a; color: #ffffff; padding: 4px 20px; border-radius: 10px;">
                    x${it.quantity}
                  </span>
                </td>
                <td style="padding: 16px 12px; vertical-align: top;">
                  <div style="font-size: 16px; font-weight: 700; color: #334155;">
                    👤 ${it.guest_label || '-'}
                  </div>
                  ${it.guest_nickname ? `
                    <div style="font-size: 14px; color: #64748b; font-weight: 600;">(${it.guest_nickname})</div>
                  ` : ''}
                </td>
                <td style="padding: 16px 12px; text-align: center; vertical-align: top;">
                  <div style="width: 32px; height: 32px; border: 2.5px solid #0f172a; border-radius: 8px; margin: 4px auto 0 auto;"></div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <!-- Bottom Summary & Chef Signatures -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 2.5px solid #0f172a; border-bottom: 2.5px solid #0f172a; padding: 18px 24px; background: #f8fafc; border-radius: 12px; margin-bottom: 32px;">
          <div style="font-size: 22px; font-weight: 900; color: #0f172a;">
            รวมรายการอาหารทั้งหมดในชุดนี้:
          </div>
          <div style="font-size: 28px; font-weight: 900; color: #ea580c;">
            ${data.items.length} รายการ (รวม ${data.items.reduce((acc, it) => acc + (it.quantity || 1), 0)} จาน)
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 20px; font-size: 16px; color: #475569;">
          <div style="border-bottom: 1.5px dashed #94a3b8; padding-bottom: 8px;">
            ผู้ปรุงอาหาร (Chef): ........................................................................
          </div>
          <div style="border-bottom: 1.5px dashed #94a3b8; padding-bottom: 8px;">
            ผู้ตรวจสอบและเสิร์ฟ (Checker): .....................................................
          </div>
        </div>
      </div>
    `;
  }

  // Thermal 80mm format
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


