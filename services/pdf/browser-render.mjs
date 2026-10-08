import React from 'react';
import {Document,Page,Text,View,Link,Image,Font,pdf} from '@react-pdf/renderer';

const h = React.createElement;
Font.registerHyphenationCallback(word=>[word]);
let registered;
export function registerFonts(origin) {
  if (registered === origin) return;
  Font.register({family:'Vazirmatn',fonts:[
    {src:origin+'/assets/fonts/pdf/Vazirmatn-Regular.ttf',fontWeight:400},
    {src:origin+'/assets/fonts/pdf/Vazirmatn-Bold.ttf',fontWeight:700}
  ]});
  Font.register({family:'Amiri',src:origin+'/assets/fonts/AmiriQuran.ttf'});
  registered = origin;
}
function textStyle(s = {}, paragraph = false) {
  return {fontFamily:s.arabic?'Amiri':'Vazirmatn',fontWeight:s.bold&&!s.arabic?700:400,
    direction:s.direction, ...(paragraph?{textAlign:s.direction==='rtl'?'right':'left'}:{}),
    ...(s.arabic?{fontSize:paragraph?19:13,lineHeight:2.5}:{}),
    ...(s.super?{fontSize:8,verticalAlign:'super'}:{}),...(s.sub?{fontSize:8,verticalAlign:'sub'}:{})};
}
export function reactDocument(model) {
  const fa = model.lang === 'fa';
  let afterContents = model.blocks.some(b=>b.type==='contents');
  function render(node,key) {
    const child = items => items.map((n,i)=>render(n,i));
    if (node.type === 'text') {
      if (!node.runs.some(r=>r.text.trim())) return null;
      const classes = node.classes||[], heading = /^H[1-6]$/.test(node.tag), n = Number(node.tag?.slice(1));
      const s = {marginBottom:10,lineHeight:fa?2:1.9,...textStyle(node.style,true)};
      if (heading) Object.assign(s,{fontWeight:700,fontSize:n===1?21:n===2?16:13,lineHeight:1.65,marginTop:n===1?8:16,marginBottom:8});
      if (classes.includes('arabic-text')) Object.assign(s,{fontSize:24,lineHeight:2.5,marginTop:10,marginBottom:12});
      if (classes.includes('pdf-basmala')) Object.assign(s,{fontFamily:'Amiri',fontSize:24,color:'#806631',textAlign:'center',lineHeight:1.9});
      if (classes.includes('pdf-basmala-translation')) Object.assign(s,{fontSize:11,color:'#596268',textAlign:'center'});
      if (classes.includes('pdf-brand')) Object.assign(s,{fontSize:10,color:'#806631'});
      if (classes.includes('pdf-source')||classes.includes('pdf-attribution')) Object.assign(s,{fontSize:8,color:'#596268'});
      if (classes.includes('ayah-title')) Object.assign(s,{color:'#806631',marginTop:0});
      if (classes.includes('pdf-unavailable')) Object.assign(s,{fontSize:10,color:'#596268'});
      // Font attributes on runs inherit paragraph sizing and preserve shaped Arabic.
      const parts = node.runs.map(r=>({...r,style:{...r.style}}));
      return h(Text,{key,id:node.id||undefined,break:node.pageBreak,style:s,orphans:3,widows:3,minPresenceAhead:heading?45:0},
        parts.map((run,i)=>h(run.style.href?Link:Text,{key:i,src:run.style.href,style:{
          fontFamily:run.style.arabic?'Amiri':s.fontFamily,
          fontWeight:run.style.arabic?400:run.style.bold?700:s.fontWeight||400,
          direction:run.style.direction,
          ...(run.style.href?{color:'#796033',textDecoration:'underline'}:{})
        }},run.text)));
    }
    if (node.type === 'rule') return h(View,{key,style:{borderTopWidth:1,borderColor:'#d8d1c3',marginVertical:12}});
    if (node.type === 'opening') return h(View,{key,wrap:false,style:{marginBottom:18}},child(node.children));
    if (node.type === 'verse') {
      // Flow paragraphs naturally across pages while keeping verse destinations.
      const content = node.children.map((n,i)=>i ? n : {...n,id:node.id,pageBreak:afterContents});
      afterContents = false;
      return h(React.Fragment,{key},child(content));
    }
    if (node.type === 'quote') return h(View,{key,style:{marginVertical:10,paddingHorizontal:12,borderRightWidth:fa?2:0,borderLeftWidth:fa?0:2,borderColor:'#a68955'}},child(node.children));
    if (node.type === 'list') return h(View,{key,style:{marginBottom:8}},node.items.map((item,i)=>h(View,{key:i,style:{flexDirection:fa?'row-reverse':'row',marginBottom:5}},
      h(Text,{style:{width:22,textAlign:fa?'right':'left'}},item.marker),h(View,{style:{flexGrow:1,flexBasis:0}},child(item.children)))));
    if (node.type === 'table') {
      const columns = Math.max(...node.rows.map(row=>row.reduce((n,c)=>n+c.span,0)));
      return h(View,{key,style:{marginVertical:10}},node.rows.map((row,i)=>h(View,{key:i,style:{flexDirection:fa?'row-reverse':'row'},wrap:false},row.map((cell,j)=>h(View,{key:j,style:{width:`${100*cell.span/columns}%`,borderWidth:.5,borderColor:'#c9c6c0',padding:5,fontSize:9,backgroundColor:cell.header?'#f3f1eb':'#ffffff'}},child(cell.children))))));
    }
    if (node.type === 'image') return h(Image,{key,src:node.src,style:{maxWidth:490,maxHeight:600,objectFit:'contain',marginVertical:10}});
    if (node.type === 'contents') return h(View,{key,break:false},
      h(Text,{style:{fontSize:16,fontWeight:700,marginVertical:12}},node.title),
      h(View,{style:{flexDirection:fa?'row-reverse':'row',flexWrap:'wrap'}},node.items.map((item,i)=>h(Link,{key:i,src:item.href,style:{width:'33.333%',fontSize:10,marginBottom:7,color:'#796033',textAlign:fa?'right':'left'}},item.text))));
    throw Error('Unsupported PDF block: '+node.type);
  }
  return h(Document,{title:model.title,author:'Forqan Archive',language:model.lang},h(Page,{size:'A4',style:{paddingTop:48,paddingHorizontal:48,paddingBottom:57,
    fontFamily:'Vazirmatn',fontSize:fa?12:11,color:'#222a2d',direction:fa?'rtl':'ltr'}},
    ...model.blocks.map(render)));
}
export async function renderBrowserPDF(model,origin) {
  registerFonts(origin);
  // Loading explicitly rejects failures before a silently substituted font can render.
  await Promise.all([Font.load({fontFamily:'Vazirmatn',fontWeight:400}),Font.load({fontFamily:'Vazirmatn',fontWeight:700}),Font.load({fontFamily:'Amiri'})]);
  return pdf(reactDocument(model)).toBlob();
}
