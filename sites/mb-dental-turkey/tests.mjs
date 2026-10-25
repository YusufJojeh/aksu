import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";
const html=fs.readFileSync("index.html","utf8");
const js=fs.readFileSync("landing.js","utf8");
const css=fs.readFileSync("landing.css","utf8");
const site=JSON.parse(html.match(/window\.SITE=([\s\S]*?);<\/script>/)[1]);
assert.doesNotThrow(()=>new vm.Script(js));
assert(html.includes('content="noindex,nofollow"'));
assert(css.includes("prefers-reduced-motion:reduce"));
assert(css.includes(".tour-aksu")&&css.includes(".tour-mb"));
class Fields {
 constructor(){this.entries=new Map([["name","Test Patient"],["phone","+447700900123"],["treatment","implants"],["package","1"],["currency","EUR"],["units","2"],["country","United Kingdom"],["month","2027-03"],["note","Quote request"]]);}
 get(k){return this.entries.get(k)??"";}
}
for(const locale of ["en","ar"]){
 let root={innerHTML:""},handlers=new Map(),opened=[];
 const el=id=>{
  if(!handlers.has(id))handlers.set(id,{id,innerHTML:"",hidden:false,textContent:"",value:"",checked:true,elements:{},scrollIntoView(){},addEventListener(k,cb){this[k]=cb;}});
  return handlers.get(id);
 };
 let document={documentElement:{},body:{},getElementById:id=>id==="app"?root:el(id),querySelectorAll:()=>[],title:""};
 let cookies={getItem:()=> "accepted",setItem(){}};
 let ads={getItem:()=>null,setItem(){}};
 let window={SITE:site,dataLayer:[],open(url){opened.push(url)}};
 let context=vm.createContext({window,document,location:{pathname:"/"+locale,search:"?utm_source=google&utm_campaign=medical-tourism"},sessionStorage:ads,localStorage:cookies,URLSearchParams,FormData:Fields});
 vm.runInContext(js,context);
 const body=root.innerHTML;
 assert.equal(document.documentElement.dir,locale==="ar"?"rtl":"ltr");
 assert.equal((body.match(/class="t-service"/g)||[]).length,5);
 assert.equal((body.match(/class="t-plan /g)||[]).length,3);
 assert.equal((body.match(/class="t-faq"/g)||[]).length,4);
 for(const id of ["treatments","pricing","travel","quote","faq"])assert(body.includes('id="'+id+'"'),id);
 assert(body.includes("wa.me/"+site.wa));
 assert(!body.includes("€500")&&!body.includes("Guaranteed results"));
 const submit=el("tour-form").submit;
 assert.equal(typeof submit,"function");
 submit({preventDefault(){},currentTarget:{}});
 assert.equal(opened.length,1);
 assert(opened[0].startsWith("https://wa.me/"+site.wa+"?text="));
 let msg=decodeURIComponent(opened[0].split("text=")[1]);
 assert(msg.includes("Test Patient")&&msg.includes("+447700900123")&&msg.includes("implant"));
 assert.equal(window.dataLayer[0].event,"quote_intent");
 console.log("PASS "+site.site+" "+locale+" landing sections, form and WhatsApp");
}
console.log("ALL PASS");
