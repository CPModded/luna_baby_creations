import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
export async function makeInvoice(order:any){
 const pdf=await PDFDocument.create();const page=pdf.addPage([595,842]);const font=await pdf.embedFont(StandardFonts.Helvetica);const bold=await pdf.embedFont(StandardFonts.HelveticaBold)
 const draw=(text:string,x:number,y:number,size=10,boldFont=false)=>page.drawText(text,{x,y,size,font:boldFont?bold:font,color:rgb(.32,.27,.24)})
 draw('Luna Baby Créations',48,790,20,true);draw('FACTURE',430,790,15,true);draw(`N° ${order.invoiceNumber}`,430,770,9);draw(`Date : ${new Date(order.createdAt).toLocaleDateString('fr-FR')}`,430,754,9)
 draw('Client',48,735,11,true);draw(order.customerName||'Client',48,718);draw(order.email,48,702)
 let y=655;draw('Produit',48,y,10,true);draw('Qté',365,y,10,true);draw('Prix',450,y,10,true);y-=24
 for(const item of order.items){draw(item.name,48,y);draw(String(item.quantity),365,y);draw((item.unitPrice/100).toFixed(2)+' €',450,y);y-=22}
 page.drawLine({start:{x:48,y:y-5},end:{x:547,y:y-5},thickness:1,color:rgb(.88,.84,.81)});y-=35
 draw('Sous-total',360,y);draw((order.subtotal/100).toFixed(2)+' €',450,y);y-=22;draw('Livraison',360,y);draw((order.shipping/100).toFixed(2)+' €',450,y);y-=22;draw('TVA',360,y);draw((order.tax/100).toFixed(2)+' €',450,y);y-=30;draw('TOTAL',360,y,12,true);draw((order.total/100).toFixed(2)+' €',450,y,12,true)
 draw('Merci pour votre commande ♡',48,70,11);draw('Luna Baby Créations · Paiement sécurisé · Créations faites main en France',48,50,8)
 return pdf.save()
}