import implants from "@/assets/t-implants.jpg";
import zirconium from "@/assets/t-zirconium.jpg";
import veneers from "@/assets/t-veneers.jpg";
import whitening from "@/assets/t-whitening.jpg";
import general from "@/assets/t-general.jpg";
import type { Lang } from "./i18n";

export type ServiceSlug = "implants" | "zirconium" | "veneers" | "whitening" | "general-dentistry";

type Copy = {
  name: string;
  short: string;
  seoTitle: string;
  seoDescription: string;
  intro: string;
  alt: string;
  details: { title: string; body: string }[];
  steps: { title: string; body: string }[];
  goodFit: string[];
  considerFirst: string[];
  faqs: { q: string; a: string }[];
};

export type Service = { slug: ServiceSlug; image: string; index: string; copy: Record<Lang, Copy> };

export const SERVICES: Service[] = [
  {
    slug: "implants",
    index: "01",
    image: implants,
    copy: {
      en: {
        name: "Dental Implants",
        short: "A titanium post placed in the jawbone as an artificial root, later supporting a natural-looking crown or bridge.",
        seoTitle: "Dental Implants in Istanbul — Dr. Emir Aksu",
        seoDescription: "Replace missing teeth with dental implants planned by Dr. Emir Aksu in Istanbul. Process, candidacy, healing time and FAQs. Consult on WhatsApp.",
        intro: "An implant replaces the root of a missing tooth. Once it has integrated with the bone, it supports a crown or bridge designed to blend with your smile. Whether implants suit you depends on your bone, gums and general health — which is exactly what the first consultation looks at.",
        alt: "Gloved hands holding a dental implant model showing a titanium post and crown between natural teeth",
        details: [
          { title: "What it replaces", body: "One missing tooth, several teeth, or — in suitable cases — a full arch supported by multiple implants." },
          { title: "How it works", body: "A titanium post is placed in the jawbone. During a healing period it bonds with the bone, then an abutment and final crown or bridge are fitted." },
          { title: "Time in Istanbul", body: "Implant treatment is usually split into stages with a healing interval between them. Your plan will state how many visits are needed." },
        ],
        steps: [
          { title: "Assessment", body: "Photos, history and any existing X-rays are reviewed; in clinic, imaging confirms bone volume." },
          { title: "Placement", body: "The implant is placed under local anaesthesia." },
          { title: "Healing", body: "The bone integrates with the implant; a temporary solution may be used." },
          { title: "Final restoration", body: "A custom crown or bridge is fitted and your bite is checked." },
        ],
        goodFit: ["You are missing one or more teeth", "Your gums are healthy or can be treated first", "You have enough bone, or are open to grafting if advised", "You can attend more than one visit"],
        considerFirst: ["Uncontrolled diabetes or some medical conditions", "Heavy smoking, which can affect healing", "Active gum disease"],
        faqs: [
          { q: "Is implant placement painful?", a: "It is done under local anaesthesia. Some tenderness afterwards is normal and is managed with the aftercare guidance you receive." },
          { q: "How many trips will I need?", a: "Usually at least two stages separated by healing time. The exact plan depends on your assessment." },
          { q: "Can everyone get implants?", a: "No. Bone quantity, gum health and medical history all matter. Dr. Aksu will tell you honestly if another option suits you better." },
        ],
      },
      ar: {
        name: "زراعة الأسنان",
        short: "دعامة من التيتانيوم تُزرع في عظم الفك كجذر صناعي، تحمل لاحقاً تاجاً أو جسراً بمظهر طبيعي.",
        seoTitle: "زراعة الأسنان في إسطنبول — د. أمير أكسو",
        seoDescription: "عوّض الأسنان المفقودة بزراعة يخطط لها د. أمير أكسو في إسطنبول. المراحل، من يناسبه العلاج، مدة الالتئام والأسئلة الشائعة. استشر عبر واتساب.",
        intro: "تعوّض الزرعة جذر السن المفقود. بعد اندماجها مع العظم تحمل تاجاً أو جسراً مصمماً لينسجم مع ابتسامتك. مدى ملاءمة الزراعة لك يعتمد على العظم واللثة وصحتك العامة، وهذا بالضبط ما تقيّمه الاستشارة الأولى.",
        alt: "يدان بقفازات تحملان نموذج زرعة سنية يظهر دعامة التيتانيوم والتاج بين أسنان طبيعية",
        details: [
          { title: "ماذا تعوّض", body: "سناً واحدة أو عدة أسنان، أو فكاً كاملاً مدعوماً بعدة زرعات في الحالات المناسبة." },
          { title: "كيف تعمل", body: "تُزرع دعامة التيتانيوم في عظم الفك، وخلال فترة الالتئام تندمج مع العظم، ثم يُركّب الوصل والتاج أو الجسر النهائي." },
          { title: "المدة في إسطنبول", body: "تتم الزراعة عادة على مراحل تفصل بينها فترة التئام، وتوضح خطتك عدد الزيارات اللازمة." },
        ],
        steps: [
          { title: "التقييم", body: "مراجعة الصور والتاريخ الطبي وأي أشعة سابقة، ثم تأكيد حجم العظم بالتصوير في العيادة." },
          { title: "الزرع", body: "توضع الزرعة تحت تخدير موضعي." },
          { title: "الالتئام", body: "يندمج العظم مع الزرعة، وقد يُستخدم حل مؤقت خلال هذه الفترة." },
          { title: "التركيب النهائي", body: "يُركّب تاج أو جسر مخصص ويتم فحص الإطباق." },
        ],
        goodFit: ["تفقد سناً أو أكثر", "لثتك سليمة أو يمكن علاجها أولاً", "لديك عظم كافٍ أو تقبل الترقيع إن نُصح به", "يمكنك الحضور لأكثر من زيارة"],
        considerFirst: ["السكري غير المنضبط أو بعض الحالات الطبية", "التدخين الكثيف الذي قد يؤثر على الالتئام", "التهاب اللثة النشط"],
        faqs: [
          { q: "هل زراعة الأسنان مؤلمة؟", a: "تتم تحت تخدير موضعي. بعض الحساسية بعدها أمر طبيعي ويُدار بإرشادات العناية التي تحصل عليها." },
          { q: "كم رحلة سأحتاج؟", a: "عادة مرحلتان على الأقل تفصل بينهما فترة التئام، والخطة الدقيقة تعتمد على تقييمك." },
          { q: "هل يمكن للجميع إجراء الزراعة؟", a: "لا. كمية العظم وصحة اللثة والتاريخ الطبي كلها مهمة، وسيخبرك د. أكسو بصراحة إن كان هناك خيار أنسب لك." },
        ],
      },
    },
  },
  {
    slug: "zirconium",
    index: "02",
    image: zirconium,
    copy: {
      en: {
        name: "Zirconium Crowns · Hollywood Smile",
        short: "Custom zirconium crowns that change tooth colour, shape and alignment — strong, biocompatible and durable.",
        seoTitle: "Zirconium Crowns & Hollywood Smile in Istanbul — Dr. Emir Aksu",
        seoDescription: "Hollywood Smile with custom zirconium crowns in Istanbul, guided by Dr. Emir Aksu. Who it suits, how it works, crowns vs veneers. WhatsApp consultation.",
        intro: "Zirconium crowns cover the whole visible tooth. They are custom-made to improve colour, shape and the look of alignment, and the material is strong and biocompatible. Because crowns require more preparation than veneers, they are usually recommended where teeth are worn, heavily filled, broken or root-treated.",
        alt: "Row of glossy zirconium dental crowns on a white tray in a dental lab",
        details: [
          { title: "Why zirconium", body: "A strong, biocompatible ceramic suited to teeth that need protection as well as a new appearance." },
          { title: "Hollywood Smile", body: "A set of crowns designed together so colour, length and proportion work as one smile, in harmony with your face." },
          { title: "Preparation", body: "Teeth are reshaped to make space for the crown. This is irreversible, so it should be a considered, clinical choice." },
        ],
        steps: [
          { title: "Smile analysis", body: "Photos and goals are discussed; colour and shape are planned with you." },
          { title: "Preparation", body: "Teeth are prepared under local anaesthesia and impressions or scans are taken." },
          { title: "Try-in", body: "You see and approve the design before final fitting." },
          { title: "Fitting & bite check", body: "Crowns are cemented and the bite is refined." },
        ],
        goodFit: ["Teeth that are worn, broken or heavily restored", "Root-canal treated teeth that need protection", "Strong colour or shape changes", "Healthy gums"],
        considerFirst: ["Healthy, minimally damaged teeth may suit veneers better", "Teeth grinding needs to be discussed and managed", "Untreated decay or gum disease must be treated first"],
        faqs: [
          { q: "Will my crowns look natural?", a: "The shade and shape are chosen with you and checked at try-in so the result suits your face, not a template." },
          { q: "Crowns or veneers?", a: "Veneers preserve more natural tooth; crowns protect teeth that are already compromised. See the comparison on our home page — the final answer comes from examination." },
          { q: "How long does it take?", a: "Often several days in Istanbul, depending on the number of teeth and any preliminary treatment." },
        ],
      },
      ar: {
        name: "تيجان الزيركونيوم · ابتسامة هوليوود",
        short: "تيجان زيركونيوم مخصصة تغيّر لون الأسنان وشكلها ومظهر اصطفافها — قوية ومتوافقة حيوياً ومتينة.",
        seoTitle: "تيجان الزيركونيوم وابتسامة هوليوود في إسطنبول — د. أمير أكسو",
        seoDescription: "ابتسامة هوليوود بتيجان زيركونيوم مخصصة في إسطنبول بإشراف د. أمير أكسو. لمن تناسب، كيف تتم، والمقارنة مع القشور. استشارة عبر واتساب.",
        intro: "تغطي تيجان الزيركونيوم السن المرئي بالكامل، وتُصنع خصيصاً لتحسين اللون والشكل ومظهر الاصطفاف، والمادة قوية ومتوافقة حيوياً. ولأن التيجان تتطلب تحضيراً أكثر من القشور، يُنصح بها غالباً للأسنان المتآكلة أو المكسورة أو كثيرة الحشوات أو المعالجة عصبياً.",
        alt: "صف من تيجان الزيركونيوم اللامعة على صينية بيضاء في مختبر أسنان",
        details: [
          { title: "لماذا الزيركونيوم", body: "سيراميك قوي ومتوافق حيوياً يناسب الأسنان التي تحتاج حماية إلى جانب مظهر جديد." },
          { title: "ابتسامة هوليوود", body: "مجموعة تيجان تُصمم معاً ليعمل اللون والطول والتناسب كابتسامة واحدة منسجمة مع وجهك." },
          { title: "التحضير", body: "يُعاد تشكيل الأسنان لإفساح المجال للتاج، وهذا غير قابل للعكس، لذا يجب أن يكون قراراً طبياً مدروساً." },
        ],
        steps: [
          { title: "تحليل الابتسامة", body: "مناقشة الصور والأهداف وتخطيط اللون والشكل معك." },
          { title: "التحضير", body: "تحضير الأسنان تحت تخدير موضعي وأخذ الطبعات أو المسح الرقمي." },
          { title: "التجربة", body: "ترى التصميم وتوافق عليه قبل التركيب النهائي." },
          { title: "التركيب وفحص الإطباق", body: "تثبيت التيجان وضبط الإطباق." },
        ],
        goodFit: ["أسنان متآكلة أو مكسورة أو كثيرة الترميم", "أسنان معالجة عصبياً تحتاج حماية", "تغيير كبير في اللون أو الشكل", "لثة سليمة"],
        considerFirst: ["الأسنان السليمة قليلة الضرر قد تناسبها القشور أكثر", "صرير الأسنان يحتاج نقاشاً وإدارة", "يجب علاج التسوس أو أمراض اللثة أولاً"],
        faqs: [
          { q: "هل ستبدو التيجان طبيعية؟", a: "يُختار اللون والشكل معك ويُراجعان في مرحلة التجربة لتناسب النتيجة وجهك لا قالباً جاهزاً." },
          { q: "تيجان أم قشور؟", a: "القشور تحافظ على جزء أكبر من السن الطبيعي، والتيجان تحمي الأسنان المتضررة. راجع المقارنة في الصفحة الرئيسية — والقرار النهائي بعد الفحص." },
          { q: "كم تستغرق؟", a: "غالباً عدة أيام في إسطنبول حسب عدد الأسنان وأي علاج تمهيدي." },
        ],
      },
    },
  },
  {
    slug: "veneers",
    index: "03",
    image: veneers,
    copy: {
      en: {
        name: "E-max Veneers",
        short: "Ultra-thin, high-translucency ceramic shells bonded to the front of teeth, with minimal enamel removal.",
        seoTitle: "E-max Veneers in Istanbul — Dr. Emir Aksu",
        seoDescription: "Thin, translucent E-max veneers in Istanbul designed by Dr. Emir Aksu. Minimal preparation, candidacy, steps and FAQs. Start on WhatsApp.",
        intro: "E-max veneers are thin ceramic shells bonded to the front surface of your teeth. Their translucency mimics natural enamel, and they can correct shape, small gaps and mild alignment issues with minimal enamel removal. They work best on teeth that are healthy and structurally sound.",
        alt: "Thin translucent ceramic veneers on a white surface beside a dental shade guide",
        details: [
          { title: "Minimal preparation", body: "Only a thin layer of enamel is typically adjusted, preserving more of your natural tooth than a crown." },
          { title: "Natural light play", body: "High translucency lets light pass through the ceramic much like enamel." },
          { title: "What it corrects", body: "Shape, chips, small gaps, discolouration resistant to whitening, and mild irregularities." },
        ],
        steps: [
          { title: "Design consultation", body: "Goals, photos and proportions are discussed." },
          { title: "Preparation", body: "Light enamel adjustment and precise scans or impressions." },
          { title: "Try-in", body: "You preview the veneers before bonding." },
          { title: "Bonding", body: "Veneers are bonded and polished; bite and comfort are checked." },
        ],
        goodFit: ["Healthy teeth with cosmetic concerns", "Chips, small gaps or uneven edges", "Staining that whitening cannot fix", "Good oral hygiene"],
        considerFirst: ["Severe crowding may need orthodontics", "Heavy grinding can stress thin ceramics", "Large fillings may point towards crowns"],
        faqs: [
          { q: "Are veneers reversible?", a: "No. Even minimal preparation alters enamel, so veneers should be a considered decision." },
          { q: "Do veneers stain?", a: "The ceramic itself resists staining; your natural teeth and gums still need normal care." },
          { q: "How many veneers do I need?", a: "That depends on how many teeth show when you smile and your goals. It is decided during smile analysis." },
        ],
      },
      ar: {
        name: "قشور الإيماكس",
        short: "قشور خزفية رقيقة جداً وعالية الشفافية تُلصق على واجهة الأسنان مع إزالة قليلة للمينا.",
        seoTitle: "قشور الإيماكس في إسطنبول — د. أمير أكسو",
        seoDescription: "قشور إيماكس رقيقة وشفافة في إسطنبول بتصميم د. أمير أكسو. تحضير بسيط، لمن تناسب، المراحل والأسئلة الشائعة. ابدأ عبر واتساب.",
        intro: "قشور الإيماكس طبقات خزفية رقيقة تُلصق على السطح الأمامي للأسنان. تحاكي شفافيتها المينا الطبيعية، ويمكنها تصحيح الشكل والفراغات الصغيرة ومشكلات الاصطفاف البسيطة مع إزالة قليلة للمينا. تعمل بشكل أفضل على الأسنان السليمة.",
        alt: "قشور خزفية رقيقة وشفافة على سطح أبيض بجانب دليل ألوان الأسنان",
        details: [
          { title: "تحضير بسيط", body: "عادة تُعدّل طبقة رقيقة فقط من المينا، مما يحافظ على جزء أكبر من السن مقارنة بالتاج." },
          { title: "انعكاس طبيعي للضوء", body: "الشفافية العالية تسمح بمرور الضوء عبر الخزف كما في المينا." },
          { title: "ماذا تصحح", body: "الشكل والكسور الصغيرة والفراغات والتصبغات التي لا يزيلها التبييض والتعرجات البسيطة." },
        ],
        steps: [
          { title: "استشارة التصميم", body: "مناقشة الأهداف والصور والتناسب." },
          { title: "التحضير", body: "تعديل خفيف للمينا ومسح أو طبعات دقيقة." },
          { title: "التجربة", body: "تعاين القشور قبل اللصق." },
          { title: "اللصق", body: "تُلصق القشور وتُصقل ويُفحص الإطباق والراحة." },
        ],
        goodFit: ["أسنان سليمة مع ملاحظات تجميلية", "كسور صغيرة أو فراغات أو حواف غير متساوية", "تصبغات لا يزيلها التبييض", "عناية جيدة بالفم"],
        considerFirst: ["التزاحم الشديد قد يحتاج تقويماً", "الصرير الشديد قد يجهد الخزف الرقيق", "الحشوات الكبيرة قد تجعل التيجان أنسب"],
        faqs: [
          { q: "هل القشور قابلة للإزالة؟", a: "لا. حتى التحضير البسيط يغيّر المينا، لذا يجب أن يكون القرار مدروساً." },
          { q: "هل تتصبغ القشور؟", a: "الخزف نفسه مقاوم للتصبغ، لكن أسنانك ولثتك تحتاج العناية المعتادة." },
          { q: "كم قشرة أحتاج؟", a: "يعتمد ذلك على عدد الأسنان الظاهرة عند الابتسام وعلى أهدافك، ويُحدد أثناء تحليل الابتسامة." },
        ],
      },
    },
  },
  {
    slug: "whitening",
    index: "04",
    image: whitening,
    copy: {
      en: {
        name: "Professional Teeth Whitening",
        short: "In-clinic whitening that safely lifts stains from food, drinks and ageing — quick and gentle.",
        seoTitle: "Professional Teeth Whitening in Istanbul — Dr. Emir Aksu",
        seoDescription: "In-clinic professional teeth whitening in Istanbul with Dr. Emir Aksu. Who it suits, sensitivity, what to expect. Book via WhatsApp.",
        intro: "Professional whitening lightens natural teeth by lifting stains caused by food, drinks or ageing. The clinic describes results of up to 8 shades; how much your teeth lighten depends on their starting colour and the type of staining. Whitening does not change the colour of crowns, veneers or fillings.",
        alt: "Smiling man in a blue dental chair while a clinician holds a tooth shade guide",
        details: [
          { title: "In-clinic", body: "A professional whitening gel is applied under supervision, with gums protected." },
          { title: "Realistic expectations", body: "Results vary; deep or internal discolouration may respond less and could suit veneers instead." },
          { title: "Restorations", body: "Existing crowns, veneers and fillings will not whiten and may need matching afterwards." },
        ],
        steps: [
          { title: "Shade check", body: "Your starting shade is recorded and suitability confirmed." },
          { title: "Protection", body: "Gums and soft tissues are isolated." },
          { title: "Whitening", body: "Gel is applied in cycles during one appointment." },
          { title: "Aftercare", body: "Guidance on sensitivity and foods to avoid for the first days." },
        ],
        goodFit: ["Natural teeth with surface or age-related staining", "Healthy gums and no untreated decay", "Realistic expectations"],
        considerFirst: ["Pregnancy or breastfeeding", "Significant sensitivity or exposed roots", "Front teeth with crowns or veneers"],
        faqs: [
          { q: "Does whitening hurt?", a: "Most people feel little or nothing; temporary sensitivity can occur and usually settles." },
          { q: "How long does it last?", a: "It depends on habits such as coffee, tea and smoking. Good care helps it last longer." },
          { q: "Can I whiten before veneers?", a: "Often yes — it can set a brighter base shade for matching restorations." },
        ],
      },
      ar: {
        name: "تبييض الأسنان الاحترافي",
        short: "تبييض داخل العيادة يزيل بأمان التصبغات الناتجة عن الطعام والمشروبات والتقدم في العمر — سريع ولطيف.",
        seoTitle: "تبييض الأسنان الاحترافي في إسطنبول — د. أمير أكسو",
        seoDescription: "تبييض أسنان احترافي داخل العيادة في إسطنبول مع د. أمير أكسو. لمن يناسب، الحساسية، وماذا تتوقع. احجز عبر واتساب.",
        intro: "يفتّح التبييض الاحترافي الأسنان الطبيعية بإزالة التصبغات الناتجة عن الطعام أو المشروبات أو العمر. تذكر العيادة نتائج تصل إلى 8 درجات، ومقدار التفتيح لديك يعتمد على لونك الأساسي ونوع التصبغ. التبييض لا يغيّر لون التيجان أو القشور أو الحشوات.",
        alt: "رجل مبتسم على كرسي أسنان أزرق بينما تحمل الطبيبة دليل ألوان الأسنان",
        details: [
          { title: "داخل العيادة", body: "يُطبق جل تبييض احترافي تحت الإشراف مع حماية اللثة." },
          { title: "توقعات واقعية", body: "النتائج تختلف، والتصبغات العميقة قد تستجيب أقل وقد تناسبها القشور." },
          { title: "الترميمات", body: "التيجان والقشور والحشوات الموجودة لا تبيض وقد تحتاج مطابقة لاحقاً." },
        ],
        steps: [
          { title: "قياس اللون", body: "تسجيل لونك الأساسي وتأكيد الملاءمة." },
          { title: "الحماية", body: "عزل اللثة والأنسجة الرخوة." },
          { title: "التبييض", body: "تطبيق الجل على دورات خلال موعد واحد." },
          { title: "العناية بعد الجلسة", body: "إرشادات للحساسية والأطعمة التي يجب تجنبها في الأيام الأولى." },
        ],
        goodFit: ["أسنان طبيعية بتصبغات سطحية أو مرتبطة بالعمر", "لثة سليمة ولا تسوس غير معالج", "توقعات واقعية"],
        considerFirst: ["الحمل أو الرضاعة", "حساسية شديدة أو جذور مكشوفة", "أسنان أمامية عليها تيجان أو قشور"],
        faqs: [
          { q: "هل التبييض مؤلم؟", a: "معظم الناس يشعرون بالقليل أو لا شيء، وقد تحدث حساسية مؤقتة تزول عادة." },
          { q: "كم تدوم النتيجة؟", a: "يعتمد ذلك على عادات مثل القهوة والشاي والتدخين، والعناية الجيدة تطيل مدتها." },
          { q: "هل يمكنني التبييض قبل القشور؟", a: "غالباً نعم، فهو يحدد لوناً أساسياً أفتح لمطابقة الترميمات." },
        ],
      },
    },
  },
  {
    slug: "general-dentistry",
    index: "05",
    image: general,
    copy: {
      en: {
        name: "General Dentistry",
        short: "Cleanings, fillings, root canal therapy and extractions — the healthy foundation every smile needs.",
        seoTitle: "General Dentistry in Istanbul — Cleaning, Fillings, Root Canal | Dr. Emir Aksu",
        seoDescription: "Dental cleaning, fillings, root canal treatment and extractions in Istanbul with Dr. Emir Aksu. Care for visitors and residents. WhatsApp to book.",
        intro: "Cosmetic work lasts only on a healthy base. General dentistry covers cleanings, fillings, root canal therapy and extractions, and is often the first part of a larger smile plan — or simply the care you need while in Istanbul.",
        alt: "Bright modern dental treatment room with a blue dental chair and a window overlooking the city",
        details: [
          { title: "Cleaning", body: "Removal of plaque and tartar, and a check of gum health." },
          { title: "Fillings & root canals", body: "Treating decay and infected nerves to save natural teeth where possible." },
          { title: "Extractions", body: "When a tooth cannot be saved, removal is planned with the next step — such as an implant — in mind." },
        ],
        steps: [
          { title: "Check-up", body: "Examination and, where needed, X-rays." },
          { title: "Explanation", body: "Findings and options are explained clearly before anything is done." },
          { title: "Treatment", body: "Care is performed under local anaesthesia where appropriate." },
          { title: "Prevention", body: "Home-care advice to keep results healthy." },
        ],
        goodFit: ["Toothache, sensitivity or a broken filling", "Preparing for veneers, crowns or implants", "A routine clean during your stay"],
        considerFirst: ["Dental emergencies with swelling or fever need prompt contact", "Bring a list of medications you take"],
        faqs: [
          { q: "Can I get emergency care?", a: "Message the clinic on WhatsApp describing your symptoms so the team can advise you on timing." },
          { q: "Do I need a cleaning before cosmetic work?", a: "Healthy gums are important before veneers or crowns; a cleaning is often part of the plan." },
          { q: "Is a root canal painful?", a: "It is done under local anaesthesia and is meant to relieve the pain caused by infection." },
        ],
      },
      ar: {
        name: "طب الأسنان العام",
        short: "التنظيف والحشوات وعلاج العصب والخلع — الأساس الصحي الذي تحتاجه كل ابتسامة.",
        seoTitle: "طب الأسنان العام في إسطنبول — تنظيف، حشوات، علاج عصب | د. أمير أكسو",
        seoDescription: "تنظيف الأسنان والحشوات وعلاج العصب والخلع في إسطنبول مع د. أمير أكسو. رعاية للزوار والمقيمين. احجز عبر واتساب.",
        intro: "العمل التجميلي يدوم فقط على أساس صحي. يشمل طب الأسنان العام التنظيف والحشوات وعلاج العصب والخلع، وغالباً ما يكون الجزء الأول من خطة ابتسامة أكبر، أو ببساطة الرعاية التي تحتاجها أثناء وجودك في إسطنبول.",
        alt: "غرفة علاج أسنان حديثة ومشرقة مع كرسي أزرق ونافذة تطل على المدينة",
        details: [
          { title: "التنظيف", body: "إزالة البلاك والجير وفحص صحة اللثة." },
          { title: "الحشوات وعلاج العصب", body: "علاج التسوس والأعصاب الملتهبة لإنقاذ الأسنان الطبيعية قدر الإمكان." },
          { title: "الخلع", body: "عندما لا يمكن إنقاذ السن، يُخطط للخلع مع مراعاة الخطوة التالية مثل الزراعة." },
        ],
        steps: [
          { title: "الفحص", body: "فحص سريري وأشعة عند الحاجة." },
          { title: "الشرح", body: "توضيح النتائج والخيارات بوضوح قبل أي إجراء." },
          { title: "العلاج", body: "يتم تحت تخدير موضعي عند الحاجة." },
          { title: "الوقاية", body: "نصائح العناية المنزلية للحفاظ على النتائج." },
        ],
        goodFit: ["ألم أو حساسية أو حشوة مكسورة", "التحضير للقشور أو التيجان أو الزراعة", "تنظيف دوري أثناء إقامتك"],
        considerFirst: ["حالات الطوارئ مع تورم أو حرارة تحتاج تواصلاً سريعاً", "أحضر قائمة بالأدوية التي تتناولها"],
        faqs: [
          { q: "هل يمكنني الحصول على رعاية طارئة؟", a: "راسل العيادة عبر واتساب واصفاً الأعراض ليرشدك الفريق بشأن التوقيت." },
          { q: "هل أحتاج تنظيفاً قبل العلاج التجميلي؟", a: "صحة اللثة مهمة قبل القشور أو التيجان، والتنظيف غالباً جزء من الخطة." },
          { q: "هل علاج العصب مؤلم؟", a: "يتم تحت تخدير موضعي، وهدفه تخفيف الألم الناتج عن الالتهاب." },
        ],
      },
    },
  },
];

export const getService = (slug: string) => SERVICES.find((s) => s.slug === slug);