const sharp=require('sharp');
module.exports=async (svgStr)=>{const s=svgStr.replace(/<rect width="1024" height="1024" rx="224" fill="url\(#g\)"\/>/,'');
const {data}=await sharp(Buffer.from(s)).resize(1024,1024).ensureAlpha().raw().toBuffer({resolveWithObject:true});
let x0=1e9,y0=1e9,x1=0,y1=0,sx=0,sy=0,n=0;
for(let y=0;y<1024;y++)for(let x=0;x<1024;x++){if(data[(y*1024+x)*4+3]>128){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);sx+=x;sy+=y;n++}}
return {bx:(x0+x1)/2,by:(y0+y1)/2,mx:sx/n,my:sy/n,L:x0,R:1023-x1,T:y0,B:1023-y1};};
