import { chromium } from '@playwright/test'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

const pageImage = pathToFileURL(resolve('public/templates/aksu/ar-pages/page-3.png')).href
const arabicFont = pathToFileURL(resolve('public/fonts/NotoSansArabic-Regular.woff')).href
const output = resolve('public/templates/aksu/ar-pages/page-3.png')

const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <style>
    @font-face { font-family: TreatmentArabic; src: url("${arabicFont}") format("woff"); font-weight: 400; }
    html, body { margin: 0; width: 1487px; height: 2106px; overflow: hidden; background: white; }
    .page { position: relative; width: 1487px; height: 2106px; font-family: TreatmentArabic, Arial, sans-serif; color: #383536; }
    img { position: absolute; inset: 0; width: 1487px; height: 2106px; }
    .cover { position: absolute; background: white; }
    .text { position: absolute; display: flex; align-items: center; justify-content: center; text-align: center; direction: rtl; line-height: 1.18; }
    .title { font-size: 54px; }
    .body { font-size: 35px; }
    .service-title { font-size: 50px; }
    .bullet { font-size: 29px; line-height: 1.22; }
  </style>
</head>
<body>
  <div class="page">
    <img src="${pageImage}" />
    <div class="cover" style="left:390px; top:185px; width:710px; height:285px"></div>
    <div class="text title" style="left:0; top:178px; width:1487px; height:70px">سياسة الدفع</div>
    <div class="text body" style="left:0; top:265px; width:1487px; height:165px">
      يُقبل الدفع نقداً فقط. التحويل المصرفي<br />
      سيخضع لرسوم إضافية<br />
      بنسبة 20% من المبلغ الإجمالي.
    </div>
    <div class="cover" style="left:380px; top:520px; width:725px; height:70px"></div>
    <div class="text service-title" style="left:0; top:510px; width:1487px; height:85px">الخدمات المشمولة</div>
    <div class="cover" style="left:55px; top:646px; width:625px; height:72px"></div>
    <div class="cover" style="left:770px; top:636px; width:585px; height:100px"></div>
    <div class="cover" style="left:140px; top:790px; width:540px; height:58px"></div>
    <div class="cover" style="left:855px; top:785px; width:480px; height:58px"></div>
    <div class="text bullet" style="left:80px; top:635px; width:560px; height:90px">مساعدة من مترجم شخصي خلال زيارات العيادة.</div>
    <div class="text bullet" style="left:810px; top:625px; width:500px; height:110px">ضمان لمدة عشر سنوات على تيجان الزركونيا<br />وقشور الأسنان من نوع إي-ماكس.</div>
    <div class="text bullet" style="left:160px; top:770px; width:485px; height:90px">ضمان مدى الحياة على زراعة الأسنان.</div>
    <div class="text bullet" style="left:870px; top:770px; width:430px; height:90px">متابعة ورعاية شاملة بعد العلاج.</div>
  </div>
</body>
</html>`

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1487, height: 2106 }, deviceScaleFactor: 1 })
await page.setContent(html, { waitUntil: 'networkidle' })
await page.screenshot({ path: output, fullPage: false })
await browser.close()
