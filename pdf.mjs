import {reviewerIds,reviewerNames,criteria,allResults} from './core.mjs';
let libraryPromise;
async function pdfLib(){if(window.PDFLib)return window.PDFLib;if(!libraryPromise)libraryPromise=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';script.onload=()=>resolve(window.PDFLib);script.onerror=()=>reject(Error('Library pdf-lib tidak dapat dimuat; koneksi internet dibutuhkan'));document.head.append(script)});return libraryPromise}
const clean=s=>String(s??'').replace(/[\u2010-\u2015]/g,'-').replace(/[\u2018\u2019]/g,"'").replace(/[\u201C\u201D]/g,'"').replace(/\u2713/g,'V').normalize('NFKD').replace(/[^\x20-\x7E\n]/g,'?');
function wrap(text,font,size,width){let out=[];for(const para of clean(text).split('\n')){if(!para.trim()){out.push('');continue}let line='';for(const word of para.split(/\s+/)){const next=line?line+' '+word:word;if(font.widthOfTextAtSize(next,size)<=width){line=next;continue}if(line)out.push(line);line=word;while(line.length>1&&font.widthOfTextAtSize(line,size)>width){let k=line.length-1;while(k>1&&font.widthOfTextAtSize(line.slice(0,k),size)>width)k--;out.push(line.slice(0,k));line=line.slice(k)}}if(line)out.push(line)}return out}
// Pemetaan disusun per PDF sumber; koordinat satuan titik, origin kiri-bawah.
// Overlay hanya pada area kosong KE-2, bukan nilai dan tanda tangan KE-1.
const pageMappings={
 retno:{scoreX:[628,642.3,656.6,671], rows:[{page:0,y:351},{page:0,y:288},{page:0,y:221},{page:0,y:156},{page:0,y:100},{page:1,y:439},{page:1,y:379},{page:1,y:325},{page:1,y:265}],recommendationX:{DITERIMA:248,DIPERTIMBANGKAN:360,DITOLAK:532},recommendationY:409},
 debora:{scoreX:[628,642.3,656.6,671], rows:[{page:0,y:351},{page:0,y:288},{page:0,y:221},{page:0,y:156},{page:0,y:100},{page:1,y:439},{page:1,y:379},{page:1,y:325},{page:1,y:265}],recommendationX:{DITERIMA:248,DIPERTIMBANGKAN:360,DITOLAK:532},recommendationY:444},
 gumelar:{scoreX:[628,642.3,656.6,671], rows:[{page:0,y:351},{page:0,y:288},{page:0,y:221},{page:0,y:156},{page:0,y:100},{page:1,y:439},{page:1,y:379},{page:1,y:325},{page:1,y:265}],recommendationX:{DITERIMA:248,DIPERTIMBANGKAN:360,DITOLAK:532},recommendationY:397},
 hetty:{scoreX:[628,642.3,656.6,671], rows:[{page:0,y:351},{page:0,y:288},{page:0,y:221},{page:0,y:156},{page:0,y:100},{page:1,y:439},{page:1,y:379},{page:1,y:325},{page:1,y:265}],recommendationX:{DITERIMA:248,DIPERTIMBANGKAN:360,DITOLAK:532},recommendationY:420}
};
function drawCheck(page,x,y,color){page.drawLine({start:{x:x-3,y:y-1},end:{x:x-0.5,y:y-4},thickness:1.35,color});page.drawLine({start:{x:x-0.5,y:y-4},end:{x:x+4,y:y+4},thickness:1.35,color});}
function stampOriginalPages(pages,item,lib,font,bold,ink){
 const id=String(item.candidate.id||'').toLowerCase();const map=pageMappings[id];
 if(!map)throw Error('Pemetaan koordinat PDF kandidat belum tersedia: '+item.candidate.name);
 const results=allResults(item.assessments,item.decisions,item.decisionApprovals||{});
 const isFinal=Boolean(item.final?.validation==='SERVER_VERIFIED_V1' && item.final?.sourceSha256===item.candidate.sha256 && item.final?.summaryVersion===item.summary?.versionId && Array.isArray(item.final?.scores)&&item.final.scores.length===9 && results.every((r,i)=>r.final===item.final.scores[i]));
 for(const r of results){if(!Number.isInteger(r.final)||r.final<1||r.final>4)continue;const pos=map.rows[r.i];drawCheck(pages[pos.page],map.scoreX[r.final-1],pos.y,ink)}
 // DRAF merupakan penanda tambahan, tidak mengganti isi halaman sumber.
 if(!isFinal)for(const p of pages){p.drawText('DRAF - BELUM FINAL', {x:660,y:564,font:bold,size:10,color:lib.rgb(.75,.13,.12)})}
 // Kolom Kesimpulan Akhir hanya dicentang setelah finalisasi dan otorisasi tanda tangan.
 const consent=isFinal&&item.summaryApprovals?.alfian?.versionId===item.summary?.versionId&&item.summaryApprovals?.alfian?.authorizeFinalSignature===true;
 if(consent && Object.hasOwn(map.recommendationX,item.summary?.recommendation))drawCheck(pages[3],map.recommendationX[item.summary.recommendation],map.recommendationY,ink);
 // Tanda tangan akhir di area yang memang tersedia pada halaman ke-4, hanya setelah otorisasi.
 return {consent,isFinal};
}
export async function makePdf(items){const lib=await pdfLib();const doc=await lib.PDFDocument.create(),normal=await doc.embedFont(lib.StandardFonts.Helvetica),bold=await doc.embedFont(lib.StandardFonts.HelveticaBold),ink=lib.rgb(.10,.20,.32),sub=lib.rgb(.4,.46,.55);const W=841.89,H=595.28;
for(const item of items){const orig=await lib.PDFDocument.load(item.source);if(orig.getPageCount()!==4)throw Error('Jumlah halaman PDF sumber tidak sesuai: '+item.candidate.name);const copied=await doc.copyPages(orig,orig.getPageIndices());copied.forEach(p=>doc.addPage(p));const status=stampOriginalPages(copied,item,lib,normal,bold,ink);let p,y;
const newPage=title=>{p=doc.addPage([W,H]);y=H-44;p.drawText(clean(title),{x:43,y,font:bold,size:15,color:ink});y-=29;p.drawText(clean(`${item.candidate.name} | ${item.candidate.position}`),{x:43,y,font:normal,size:10,color:sub});y-=32;p.drawText('Lampiran: halaman PDF sumber tetap utuh tanpa perubahan.',{x:43,y:25,font:normal,size:8,color:sub})};
const ensure=(n=25)=>{if(y-n<47)newPage('LAMPIRAN PENILAIAN - LANJUTAN')};
const line=(text,size=10,emphasis=false,indent=0)=>{const font=emphasis?bold:normal;for(const ln of wrap(text,font,size,740-indent)){ensure(size+6);if(ln)p.drawText(ln,{x:43+indent,y,font,size,color:ink});y-=size+6}};
newPage('LAMPIRAN KOMENTAR INDIVIDUAL - ARSIP');
line('Penilaian akhir mengacu pada REKAP MAYORITAS, bukan skor salah satu pewawancara.',9,true);
line('Komentar dan rekomendasi masing-masing penilai ditampilkan utuh sebagai jejak audit.',9);y-=12;
for(const id of reviewerIds){const a=item.assessments[id]||{};ensure(75);line(reviewerNames[id],12,true);line('Rekomendasi individual: '+(a.recommendation||'Belum tersedia'),9);line('Komentar asli:',9,true);line(a.comment||'(belum ada komentar)',10);y-=15;}
newPage('LAMPIRAN REKAPITULASI MAYORITAS');const groups={};Object.entries(item.decisionApprovals||{}).forEach(([k,v])=>{groups[k]=v});const rows=allResults(item.assessments,item.decisions,groups);line('Isian kolom KE-2 pada halaman 1-2 adalah skor REKAP MAYORITAS tiga penilai.',9,true);line('Metode keputusan: mayoritas 2 dari 3 suara. Nilai berbeda membutuhkan persetujuan bersama.',9);y-=8;
for(const r of rows){ensure(30);line(`${r.i+1}. ${r.name} | Alfian: ${r.votes[0]??'-'} | Dekki: ${r.votes[1]??'-'} | Raka: ${r.votes[2]??'-'} | Final: ${r.final??'-'} (${r.status})`,9)}y-=12;line('Skor final di atas merupakan nilai hasil mayoritas 2 dari 3 atau keputusan bersama yang disetujui.',9);line('Total skor/bobot hanya diisi bila rumus asli sudah dipetakan dan diverifikasi.',9);y-=15;
line('REKAP KOMENTAR KAMI - KOMENTAR INDIVIDUAL TETAP ASLI',11,true);for(const id of reviewerIds){line(reviewerNames[id]+':',10,true);line(item.assessments[id]?.comment||'(belum ada komentar)',9);y-=8}
ensure(120);line('KESIMPULAN DAN REKOMENDASI KAMI',13,true);line(item.summary?.summary||'(belum disusun)',10);y-=8;line('Perbedaan pendapat:',10,true);line(item.summary?.differences||'Tidak dicatat.',10);y-=8;line('Rekomendasi Kami: '+(item.summary?.recommendation||'BELUM FINAL'),11,true);line('Status final: '+(item.final?.validation==='SERVER_VERIFIED_V1'?'FINAL TERVERIFIKASI SERVER '+item.final.at:'DRAF - BELUM FINAL'),9);
line('Tanggal wawancara (dari data kandidat): '+(item.candidate.firstDate||'Belum tercatat'),9);
line('Tanggal finalisasi server: '+(item.final?.at||'Belum final'),9);
const alfian=item.assessments.alfian||{};
const authSignature=Boolean(status.consent);
ensure(140);line('PENANDATANGAN AKHIR: ALFIAN NUGRAHA',11,true);
if(authSignature&&alfian.signature?.startsWith('data:image/')){
 try{const sig=alfian.signature.startsWith('data:image/png')?await doc.embedPng(alfian.signature):await doc.embedJpg(alfian.signature),dim=sig.scaleToFit(220,72);ensure(95);p.drawImage(sig,{x:43,y:y-78,width:dim.width,height:dim.height});y-=94;line('Tanda tangan Alfian diotorisasi untuk versi Kesimpulan Kami ini.',9)}
 catch{throw Error('Tanda tangan akhir Alfian tidak bisa dirender; PDF final dibatalkan')}
}else{line('Tanda tangan akhir belum diotorisasi. Draf ini tidak dapat digunakan sebagai PDF final.',9)}
line('Persetujuan versi Kami: '+reviewerIds.map(id=>reviewerNames[id]+': '+(item.summaryApprovals[id]?.versionId===item.summary?.versionId?'setuju':'belum')).join('; '),8);
}
return new Blob([await doc.save()],{type:'application/pdf'})}
