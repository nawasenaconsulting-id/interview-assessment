import {reviewerIds,reviewerNames,criteria,allResults} from './core.mjs';
let libraryPromise;
async function pdfLib(){if(window.PDFLib)return window.PDFLib;if(!libraryPromise)libraryPromise=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';script.onload=()=>resolve(window.PDFLib);script.onerror=()=>reject(Error('Library pdf-lib tidak dapat dimuat; koneksi internet dibutuhkan'));document.head.append(script)});return libraryPromise}
const clean=s=>String(s??'').replace(/[\u2010-\u2015]/g,'-').replace(/[\u2018\u2019]/g,"'").replace(/[\u201C\u201D]/g,'"').replace(/\u2713/g,'V').normalize('NFKD').replace(/[^\x20-\x7E\n]/g,'?');
function wrap(text,font,size,width){let out=[];for(const para of clean(text).split('\n')){if(!para.trim()){out.push('');continue}let line='';for(const word of para.split(/\s+/)){const next=line?line+' '+word:word;if(font.widthOfTextAtSize(next,size)<=width){line=next;continue}if(line)out.push(line);line=word;while(line.length>1&&font.widthOfTextAtSize(line,size)>width){let k=line.length-1;while(k>1&&font.widthOfTextAtSize(line.slice(0,k),size)>width)k--;out.push(line.slice(0,k));line=line.slice(k)}}if(line)out.push(line)}return out}
// Pemetaan disusun per PDF sumber; koordinat satuan titik, origin kiri-bawah.
// Overlay hanya pada area kosong KE-2, bukan nilai dan tanda tangan KE-1.
const pageMappings={
 retno:{scoreX:[628,642.3,656.6,671], rows:[{page:0,y:351},{page:0,y:288},{page:0,y:221},{page:0,y:156},{page:0,y:100},{page:1,y:439},{page:1,y:379},{page:1,y:325},{page:1,y:265}],recommendationX:{DITERIMA:248,DIPERTIMBANGKAN:360,DITOLAK:532},recommendationY:409,w2Top:359},
 debora:{scoreX:[628,642.3,656.6,671], rows:[{page:0,y:351},{page:0,y:288},{page:0,y:221},{page:0,y:156},{page:0,y:100},{page:1,y:439},{page:1,y:379},{page:1,y:325},{page:1,y:265}],recommendationX:{DITERIMA:248,DIPERTIMBANGKAN:360,DITOLAK:532},recommendationY:444,w2Top:323},
 gumelar:{scoreX:[628,642.3,656.6,671], rows:[{page:0,y:351},{page:0,y:288},{page:0,y:221},{page:0,y:156},{page:0,y:100},{page:1,y:439},{page:1,y:379},{page:1,y:325},{page:1,y:265}],recommendationX:{DITERIMA:248,DIPERTIMBANGKAN:360,DITOLAK:532},recommendationY:397,w2Top:371},
 hetty:{scoreX:[628,642.3,656.6,671], rows:[{page:0,y:351},{page:0,y:288},{page:0,y:221},{page:0,y:156},{page:0,y:100},{page:1,y:439},{page:1,y:379},{page:1,y:325},{page:1,y:265}],recommendationX:{DITERIMA:248,DIPERTIMBANGKAN:360,DITOLAK:532},recommendationY:420,w2Top:347}
};
// Rata kiri-kanan per baris di area Saran/Komentar. Baris terakhir tetap rata kiri.
function drawJustifiedLines(page,lines,font,size,x,rightX,firstY,lineHeight,color){
 const maxWidth=rightX-x;
 for(let i=0;i<lines.length;i++){
  const text=lines[i];if(!text)continue;
  const y=firstY-i*lineHeight;
  const words=text.trim().split(/\s+/);
  if(i===lines.length-1||words.length<2){page.drawText(text,{x,y,font,size,color});continue;}
  const sumWidths=words.reduce((n,w)=>n+font.widthOfTextAtSize(w,size),0);
  const gap=(maxWidth-sumWidths)/(words.length-1);
  if(gap<0){page.drawText(text,{x,y,font,size,color});continue;}
  let cursor=x;
  for(const word of words){page.drawText(word,{x:cursor,y,font,size,color});cursor+=font.widthOfTextAtSize(word,size)+gap;}
 }
}
function drawCheck(page,x,y,color){page.drawLine({start:{x:x-3,y:y-1},end:{x:x-0.5,y:y-4},thickness:1.35,color});page.drawLine({start:{x:x-0.5,y:y-4},end:{x:x+4,y:y+4},thickness:1.35,color});}

// Rapikan tanda tangan yang sudah diotorisasi HANYA saat menggambar PDF.
// Tidak mengubah tanda tangan tersimpan, versi persetujuan, atau data Firestore.
async function compactSignatureForPrint(dataUrl){
  const img=await new Promise((resolve,reject)=>{
    const image=new Image();
    image.onload=()=>resolve(image);
    image.onerror=()=>reject(Error('Gambar tanda tangan tidak dapat dibaca'));
    image.src=dataUrl;
  });
  const w=img.naturalWidth, h=img.naturalHeight;
  const scan=document.createElement('canvas');scan.width=w;scan.height=h;
  const context=scan.getContext('2d',{willReadFrequently:true});
  context.drawImage(img,0,0);
  const rgba=context.getImageData(0,0,w,h).data;
  let minX=w,minY=h,maxX=-1,maxY=-1;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const p=(y*w+x)*4,alpha=rgba[p+3];
    const lum=.2126*rgba[p]+.7152*rgba[p+1]+.0722*rgba[p+2];
    if(alpha>40&&lum<205){
      minX=Math.min(minX,x);minY=Math.min(minY,y);
      maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);
    }
  }
  if(maxX<minX||maxY<minY)throw Error('Goresan tanda tangan tidak terdeteksi');
  const pad=Math.max(4,Math.round(Math.max(maxX-minX,maxY-minY)*.025));
  const left=Math.max(0,minX-pad), top=Math.max(0,minY-pad);
  const right=Math.min(w,maxX+pad+1),bottom=Math.min(h,maxY+pad+1);
  const out=document.createElement('canvas');out.width=right-left;out.height=bottom-top;
  const target=out.getContext('2d');
  target.drawImage(scan,left,top,right-left,bottom-top,0,0,out.width,out.height);
  // Hapus latar putih foto/JPG agar menyatu dengan kertas formulir.
  const pixels=target.getImageData(0,0,out.width,out.height);
  for(let p=0;p<pixels.data.length;p+=4){
    const r=pixels.data[p],g=pixels.data[p+1],b=pixels.data[p+2];
    const darkness=255-(.2126*r+.7152*g+.0722*b);
    const oldAlpha=pixels.data[p+3];
    pixels.data[p]=0;pixels.data[p+1]=0;pixels.data[p+2]=0;
    pixels.data[p+3]=Math.round(oldAlpha*Math.min(1,Math.max(0,(darkness-8)/165)));
  }
  target.putImageData(pixels,0,0);
  return out.toDataURL('image/png');
}

async function stampOriginalPages(pages,item,lib,font,bold,ink,outputDoc){
 const id=String(item.candidate.id||'').toLowerCase();const map=pageMappings[id];
 if(!map)throw Error('Pemetaan koordinat PDF kandidat belum tersedia: '+item.candidate.name);
 const results=allResults(item.assessments,item.decisions,item.decisionApprovals||{});
 const isFinal=Boolean(item.final?.validation==='SERVER_VERIFIED_V1' && item.final?.sourceSha256===item.candidate.sha256 && item.final?.summaryVersion===item.summary?.versionId && Array.isArray(item.final?.scores)&&item.final.scores.length===9 && results.every((r,i)=>r.final===item.final.scores[i]));
 if(item.final && !isFinal)throw Error('PDF FINAL ditolak: data finalisasi tidak cocok dengan penilaian yang tersedia.');
 if(isFinal && (results.length!==9||results.some(r=>![1,2,3,4].includes(r.final))||!item.summary?.summary?.trim()||!item.summary?.recommendation))throw Error('PDF FINAL ditolak: ada isian wajib Wawancara 2 yang kosong.');
 for(const r of results){if(!Number.isInteger(r.final)||r.final<1||r.final>4)continue;const pos=map.rows[r.i];drawCheck(pages[pos.page],map.scoreX[r.final-1],pos.y,ink)}
 // Tidak menambahkan tulisan status DRAF pada halaman formulir asli.
 // Kesimpulan Akhir sengaja dibiarkan kosong: masih ada Wawancara 3.
 // Status FINAL hanya mengesahkan Wawancara 2, bukan keputusan akhir seleksi.
 // Persetujuan tanda tangan Alfian tetap digunakan khusus pada Wawancara 2.
 const consent=isFinal&&item.summaryApprovals?.alfian?.versionId===item.summary?.versionId&&item.summaryApprovals?.alfian?.authorizeFinalSignature===true&&Boolean(item.summaryApprovals?.alfian?.finalSignature);
 // Hasil kolektif tercetak pada ruang WAWANCARA 2 yang kosong di PDF sumber.
 // Semua pengisian bergantung pada keputusan bersama; Wawancara 1 tidak disentuh.
 const page3=pages[2], top=map.w2Top, H=595.4;
 const rec=item.summary?.recommendation;
 const byTop=(t)=>H-t;
 if(typeof item.summary?.summary==='string'&&item.summary.summary.trim()){
  // Teks isi saja: tanpa judul "REKAP BERSAMA" atau nama-nama penilai.
  // Batas kanan x=380 (kotak berakhir kira-kira x=388); 6 baris aman dalam kotak.
  // Tanpa lampiran, teks wajib muat UTUH di kotak komentar Wawancara 2.
  // Ukuran huruf turun sedikit bila perlu; tidak memotong kalimat diam-diam.
  let textSize=7.4;
  let lines=wrap(item.summary.summary,font,textSize,267);
  while(lines.length>6 && textSize>6.4){
   textSize=Math.round((textSize-0.2)*10)/10;
   lines=wrap(item.summary.summary,font,textSize,267);
  }
  if(lines.length>6){
   throw Error('Kesimpulan Kami terlalu panjang untuk kotak Saran/Komentar pada formulir asli. Ringkas menjadi sekitar 35-50 kata, lalu minta persetujuan versi baru sebelum dicetak. Teks tidak dipotong otomatis.');
  }
  drawJustifiedLines(page3,lines,font,textSize,113,380,byTop(top+44),10.5,ink);

 }
  // Posisi kotak berasal dari pengukuran PDF asli (bukan perkiraan label).
  // Tiga pilihan Wawancara 2 terletak pada x=112.8,196.2,277.0 (kotak PDF asli).
  // Draf diberi watermark DRAF di halaman, bukan tambahan teks di sekitar kotak.
  const x2={DITERIMA:116.7,DIPERTIMBANGKAN:200.1,DITOLAK:280.9};
  if(Object.hasOwn(x2,rec))drawCheck(page3,x2[rec],byTop(top+18.3),lib.rgb(0,0,0));

  // Hanya tanggal wawancara yang diverifikasi. Ganti placeholder tanggal di
  // posisi cetakan sumber agar terbaca: Tangerang Selatan, 4 November 2026.
  const verifiedDate=String(item.summary?.interviewDate||'');
  if(/^\d{4}-\d{2}-\d{2}$/.test(verifiedDate)){
   const [yy,mm,dd]=verifiedDate.split('-').map(Number);
   const date=new Date(Date.UTC(yy,mm-1,dd));
   if(date.getUTCFullYear()===yy&&date.getUTCMonth()===mm-1&&date.getUTCDate()===dd){
    const month=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'][mm-1];
    const line='Tangerang Selatan, '+dd+' '+month+' '+yy;
    // Same exact original printed date baseline; cover placeholder and year,
    // but NOT the frame, leaving one single clean line.
    const baseline=byTop(top+9.85);
    page3.drawRectangle({x:388.9,y:byTop(top+12.0),width:194,height:11.0,color:lib.rgb(1,1,1)});
    page3.drawText(line,{x:389.3,y:baseline,font:bold,size:9,color:lib.rgb(0,0,0)});
   }
  }

  // Tanda tangan akhir HANYA berasal dari upload Alfian yang disetujui
  // untuk versi kesimpulan ini dan setelah status finalisasi server valid.
  if(consent){
   const sig=item.summaryApprovals?.alfian?.finalSignature||'';
   if(!/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(sig))throw Error('Upload tanda tangan akhir Alfian tidak tersedia/ tidak sah');
   const trimmed=await compactSignatureForPrint(sig);
   const picture=await outputDoc.embedPng(trimmed);
   // Target visual sebanding dengan tanda tangan Wawancara 1 (~77 x 49 pt).
   // Tinggi 44 pt disesuaikan dengan ruang yang tersisa sebelum nama Alfian.
   const signX=397, signTop=top+30, signWidth=78, signHeight=44;
   page3.drawImage(picture,{x:signX,y:byTop(signTop+signHeight),width:signWidth,height:signHeight});
   // Nama tetap berada di bawah gambar dan di dalam kotak Wawancara 2.
   page3.drawText('Alfian Nugraha',{x:signX,y:byTop(top+85),font:bold,size:9,color:lib.rgb(0,0,0)});
  }
 return {consent,isFinal};
}
export async function makePdf(items){
 const lib=await pdfLib();
 const doc=await lib.PDFDocument.create();
 const normal=await doc.embedFont(lib.StandardFonts.Helvetica);
 const bold=await doc.embedFont(lib.StandardFonts.HelveticaBold);
 const ink=lib.rgb(.10,.20,.32);
 for(const item of items){
  const orig=await lib.PDFDocument.load(item.source);
  if(orig.getPageCount()!==4)throw Error('Jumlah halaman PDF sumber tidak sesuai: '+item.candidate.name);
  const copied=await doc.copyPages(orig,orig.getPageIndices());
  copied.forEach(page=>doc.addPage(page));
  await stampOriginalPages(copied,item,lib,normal,bold,ink,doc);
 }
 // Hanya formulir asli empat halaman per kandidat; tanpa halaman lampiran.
 return new Blob([await doc.save()],{type:'application/pdf'});
}
