import {PDFDocument,PDFName,PDFDict,PDFArray,PDFString,PDFHexString,PDFRawStream,decodePDFRawStream,StandardFonts,rgb} from 'pdf-lib';

// Copy vector text/pages and rebuild named verse destinations across chunks.
export async function mergePDFs(blobs,model) {
  const document = await PDFDocument.create();
  const destinations = [];
  for (const blob of blobs) {
    const source = await PDFDocument.load(await blob.arrayBuffer());
    // Auxiliary shaping glyphs have no independent Unicode character. PDFKit
    // emits empty mappings that some readers misparse; a zero-width mapping
    // preserves selectable neighboring letters without inventing punctuation.
    for (const [,object] of source.context.enumerateIndirectObjects()) {
      if (!(object instanceof PDFDict)) continue;
      const map = object.lookupMaybe(PDFName.of('ToUnicode'),PDFRawStream);
      if (!map) continue;
      const text = new TextDecoder().decode(decodePDFRawStream(map).decode());
      if (text.includes('<>')) object.set(PDFName.of('ToUnicode'),source.context.register(source.context.flateStream(text.replaceAll('<>','<FEFF>'))));
    }
    const originals = source.getPages();
    const copies = await document.copyPages(source,source.getPageIndices());
    for (const page of copies) document.addPage(page);
    const names = source.catalog.lookupMaybe(PDFName.of('Names'),PDFDict);
    const dests = names?.lookupMaybe(PDFName.of('Dests'),PDFDict);
    function walk(tree) {
      const pairs = tree.lookupMaybe(PDFName.of('Names'),PDFArray);
      for (let i=0;pairs && i<pairs.size();i+=2) {
        const name = pairs.lookup(i), dest = pairs.lookup(i+1,PDFArray);
        const index = originals.findIndex(p=>p.ref.toString()===dest.get(0).toString());
        if (index<0 || !(name instanceof PDFString || name instanceof PDFHexString)) continue;
        const array = PDFArray.withContext(document.context); array.push(copies[index].ref);
        for (let j=1;j<dest.size();j++) array.push(dest.get(j).clone(document.context));
        destinations.push([name.decodeText(),array]);
      }
      const kids = tree.lookupMaybe(PDFName.of('Kids'),PDFArray);
      for (let i=0;kids && i<kids.size();i++) walk(kids.lookup(i,PDFDict));
    }
    if (dests) walk(dests);
  }
  if (destinations.length) {
    const pairs = PDFArray.withContext(document.context);
    for (const [name,value] of destinations.sort(([a],[b])=>a<b?-1:1)) { pairs.push(PDFString.of(name)); pairs.push(value); }
    document.catalog.set(PDFName.of('Names'),document.context.obj({Dests:{Names:pairs}}));
  }
  const font = await document.embedFont(StandardFonts.Helvetica);
  const pages = document.getPages();
  pages.forEach((page,i)=>{
    const text = `${i+1} / ${pages.length}`;
    page.drawText(text,{x:(page.getWidth()-font.widthOfTextAtSize(text,9))/2,y:23,size:9,font,color:rgb(.4,.4,.4)});
  });
  document.setTitle(model.title); document.setAuthor('Forqan Archive'); document.setLanguage(model.lang);
  return new Blob([await document.save()],{type:'application/pdf'});
}
