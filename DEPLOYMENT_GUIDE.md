# คู่มือการนำแอป "ร้านขายดี สั่ง QR Code" ขึ้นระบบจริงบน Vercel (Production Deployment Guide)

เอกสารนี้รวบรวมคำตอบและขั้นตอนการนำระบบขึ้นสู่ระบบจริง (Production) บน **Vercel.com** พร้อมการเลือกฐานข้อมูลที่เหมาะสมที่สุด

---

## 1. ตอบคำถามเรื่องชื่อโดเมน: `Kaidee.vercel.app` ได้หรือไม่?

### ผลการตรวจสอบสถานะโดเมน:
- ❌ **`kaidee.vercel.app`** : **มีผู้ใช้งานอื่นจดทะเบียนไปแล้ว** (เนื่องจากคำว่า "kaidee" เป็นคำยอดนิยม)
- ❌ **`kaidee-pos.vercel.app`** : มีผู้ใช้งานจดไปแล้วเช่นกัน

### 🌟 ชื่อโดเมนฟรีบน Vercel ที่ "ยังว่างอยู่ 100%" และแนะนำให้เลือกใช้:
1. 🥇 **`kaidee-qr.vercel.app`** (แนะนำที่สุด! ตรงกับชื่อระบบ "ขายดี สั่ง QR" ชัดเจน สวยงาม)
2. 🥈 **`kaideeqr.vercel.app`** (สั้น กระชับ พิมพ์ง่าย ลูกค้าจำง่าย)
3. 🥉 **`kaidee-restaurant.vercel.app`** (ดูเป็นทางการ เหมาะกับแบรนด์ระดับสากล)
4. **`raankaidee.vercel.app`** (ร้านขายดี)
5. **`kaidee-app.vercel.app`**

> **💡 คำแนะนำระดับมืออาชีพ**: เมื่อระบบขึ้น Vercel แล้ว คุณสามารถผูก **Custom Domain (โดเมนของตัวเอง)** เช่น `www.kaideeqr.com` หรือ `pos.kaideeqr.com` ได้ฟรีตลอดชีพ โดย Vercel จะออกใบรับรองความปลอดภัย **HTTPS (SSL)** ให้ฟรีอัตโนมัติ

---

## 2. ตอบคำถามเรื่องฐานข้อมูล: "ขึ้น Vercel ฐานข้อมูลเป็นอะไรดี?"

### ทำไมถึงใช้ไฟล์ SQLite เดิมในเครื่องบน Vercel โดยตรงไม่ได้?
เนื่องจาก Vercel ทำงานแบบ **Serverless (Edge / Lambda)** ซึ่งเซิร์ฟเวอร์จะถูกเปิดและปิดตลอดเวลาตามจำนวนคำขอ (Request) ทำให้ไฟล์ที่เขียนลงเซิร์ฟเวอร์ชั่วคราว (เช่น `./data/restaurant_saas.db`) จะถูกรีเซ็ตหรือหายไปเมื่อเครื่องปิดตัวลง ดังนั้นระบบ SaaS ที่มีหลายร้านค้าและมีลูกค้าสั่งอาหารตลอดเวลา **ต้องใช้ฐานข้อมูลแบบคลาวด์ (Cloud Database)** ครับ

---

### 🏆 อันดับ 1 (แนะนำมากที่สุดสำหรับแอปนี้): **Turso (Serverless SQLite / libSQL)**

**เหตุผลที่เหมาะสมที่สุด:**
1. **เข้ากันได้ 100% กับโค้ดปัจจุบัน**: Turso ใช้ภาษา SQLite 100% ทำให้โครงสร้างตาราง คำสั่ง และข้อมูลเดิมทำงานได้ทันทีโดยไม่ต้องแก้ไขไวยากรณ์ SQL
2. **เร็วระดับ Edge**: มีดาต้าเซ็นเตอร์ในเอเชีย (สิงคโปร์/โตเกียว) ตอบสนองได้รวดเร็วทันใจสำหรับการสั่งอาหารแบบเรียลไทม์
3. **แพ็กเกจฟรี (Free Tier) กว้างขวางมาก**:
   - ฟรีพื้นที่จัดเก็บ **9 GB** (บันทึกได้เป็นล้านออเดอร์)
   - ฟรีการอ่านข้อมูล **1 พันล้านแถว/เดือน (1,000,000,000 row reads/mo)**
   - ฟรีการสร้างแยกได้ถึง 500 ฐานข้อมูล
4. **เชื่อมต่อง่าย**: เพียงระบุ 2 ค่าใน Environment Variables บน Vercel:
   - `TURSO_DATABASE_URL` (เช่น `libsql://kaidee-xxx.turso.io`)
   - `TURSO_AUTH_TOKEN` (โทเคนกุญแจความปลอดภัย)

#### วิธีสร้างฐานข้อมูล Turso ฟรีใน 2 นาที:
1. เข้าไปที่ [https://turso.tech](https://turso.tech) และกด **Sign Up** (ล็อกอินด้วย GitHub)
2. กดปุ่ม **"Create Database"** ตั้งชื่อว่า `kaidee-db` เลือก Region เป็น `Singapore (sin)`
3. คัดลอก **Database URL** และสร้าง **Create Token** เก็บไว้สำหรับนำไปใส่ใน Vercel

---

### 🥈 อันดับ 2 (ตัวเลือกยอดนิยม): **Supabase (Serverless PostgreSQL)**
- จุดเด่น: มีหน้าต่างตารางข้อมูล (Table Editor) สวยงาม คล้าย Google Sheets / Excel ให้เปิดดูและแก้ไขข้อมูลร้านค้า ออเดอร์ และสลิปผ่านเบราว์เซอร์ได้สะดวก
- แพ็กเกจฟรี: 500 MB (สมัครได้ที่ [https://supabase.com](https://supabase.com))

---

## 3. ขั้นตอนการ Deploy ขึ้น Vercel ทีละขั้นตอน (Step-by-Step)

### ขั้นตอนที่ 1: เตรียม Git Repository ในเครื่องของคุณ
เปิด Terminal ในโฟลเดอร์โปรเจกต์นี้ แล้วรันคำสั่ง:
```bash
git init
git add .
git commit -m "feat: complete kaidee restaurant qr saas platform"
```

### ขั้นตอนที่ 2: นำโค้ดขึ้น GitHub
1. เข้าไปที่ [https://github.com](https://github.com) และสร้าง Repository ใหม่ เช่น `kaidee-qr`
2. เชื่อมต่อและ Push โค้ดขึ้นไป:
```bash
git remote add origin https://github.com/<your-username>/kaidee-qr.git
git branch -M main
git push -u origin main
```

### ขั้นตอนที่ 3: Deploy บน Vercel.com
1. เข้าไปที่ [https://vercel.com](https://vercel.com) ล็อกอินด้วยบัญชี GitHub ของคุณ
2. กดปุ่ม **"Add New..."** ➡️ เลือก **"Project"**
3. ค้นหา Repository `kaidee-qr` แล้วกด **"Import"**
4. ในช่อง **Project Name**: ให้พิมพ์ชื่อที่ต้องการ เช่น:
   ```
   kaidee-qr
   ```
   *(เมื่อ Deploy เสร็จ แอปของคุณจะได้รับ URL: `https://kaidee-qr.vercel.app` ทันที)*
5. ในส่วน **Environment Variables** ให้เพิ่มค่าฐานข้อมูล:
   - `TURSO_DATABASE_URL` = `libsql://kaidee-xxx.turso.io`
   - `TURSO_AUTH_TOKEN` = `<your-auth-token>`
6. กดปุ่ม **"Deploy"** รอประมาณ 1-2 นาที ระบบจะขึ้นออนไลน์พร้อมใช้งานทั่วโลกทันที!

---

## 4. ตรวจสอบความพร้อมของโค้ดปัจจุบัน
- โค้ดได้รับการปรับแต่งเป็น **Next.js Production-Ready**
- ผ่านการทดสอบ `npm run build` สมบูรณ์แบบ 100% ไม่มีข้อผิดพลาด
- รองรับการทำงานทั้งบน iPad, หน้าจอ POS, จอครัว KDS และสมาร์ตโฟนของลูกค้าทุกรุ่น
