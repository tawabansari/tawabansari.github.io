import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {normalize} from '../assets/js/search-utils.mjs';
const source=(await readFile(new URL('../assets/js/principles.mjs',import.meta.url),'utf8')).replace("import {normalize} from './search-utils.mjs';",'');
for(const lang of ['en','fa']){
 const elements=Object.fromEntries(['q','category','polarity','sort'].map(key=>[key,{value:key==='sort'?'suggested':''}]));
 const handlers={},status={};
 const form={elements,addEventListener:(type,fn)=>handlers[type]=fn};
 const groups=['positive','negative'].map(polarity=>{
  const list={children:[],append(row){this.children=this.children.filter(r=>r!==row);this.children.push(row);}};
  return {dataset:{polarity},list,querySelector:()=>list};
 });
 const data=[['Zulu',1,'faith justice','positive'],['Alpha',3,'justice','positive'],['Beta',2,'faith','positive'],['Gamma',4,'faith','negative']];
 const rows=data.map(([name,order,categories,polarity])=>{
  const group=groups.find(g=>g.dataset.polarity===polarity),label={},alias={textContent:name==='Zulu'?'uniquealias':''};
  const row={name,label,hidden:false,dataset:{title:(lang==='fa'?'اصل ':'The Principle of ')+name,order:String(order),categories,verse:`2:${order}`,search:'description'},
   querySelector:selector=>selector==='[data-principle-label]'?label:alias,closest:()=>group};
  group.list.children.push(row);return row;
 });
 const directory={lang,querySelector:selector=>selector==='form'?form:status,querySelectorAll:selector=>selector==='.principles-group'?groups:rows};
 const document={querySelector:selector=>selector==='[data-principles]'?directory:null};
 runInNewContext(source,{document,location:{search:''},Intl,URLSearchParams,normalize});
 const visible=()=>groups.flatMap(g=>g.list.children).filter(r=>!r.hidden);
 const check=names=>{
  assert.deepEqual(visible().map(r=>r.name),names);
  visible().forEach((row,index)=>assert.equal(row.label.textContent,(lang==='fa'?`اصل ${(index+1).toLocaleString('fa')}`:`Principle ${index+1}`)+`: ${row.name}`));
 };
 const change=(name,value)=>{elements[name].value=value;handlers.change({target:{tagName:'SELECT'}});};
 const search=value=>{elements.q.value=value;handlers.input({target:{name:'q'}});};
 check(['Zulu','Beta','Alpha','Gamma']);
 change('category','justice');check(['Zulu','Alpha']);
 change('category','faith');check(['Zulu','Beta','Gamma']); // Zulu appears in both topics, once per list.
 change('polarity','negative');check(['Gamma']);
 change('polarity','');change('category','');change('sort','alphabetical');check(['Alpha','Beta','Zulu','Gamma']);
 search('uniquealias');check(['Zulu']);
 search('1');check([]); // Generated numbers must never become search content.
 search('');change('sort','verse');check(['Zulu','Beta','Alpha','Gamma']);
 change('category','justice');check(['Zulu','Alpha']);
 assert.ok(rows.every(r=>!r.dataset.title.includes(':')),'Stored titles must remain unchanged');
}
console.log('Passed bilingual consecutive numbering after sorting, topic overlap, polarity filtering, alias search, empty results, and reset.');
