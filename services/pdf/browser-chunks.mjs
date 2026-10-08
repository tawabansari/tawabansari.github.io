function textLength(node) {
  if (node.runs) return node.runs.reduce((n,r)=>n+r.text.length,0);
  return (node.children || node.items || node.rows?.flat() || []).reduce((n,c)=>n+textLength(c),0);
}
export function documentChunks(model, limit = 10000) {
  const blocks = model.blocks.flatMap(node=>node.type==='verse'
    ? node.children.map((child,i)=>i ? child : {...child,id:node.id}) : [node]);
  const chunks = []; let current = [], size = 0, afterContents = false;
  for (const node of blocks) {
    const count = textLength(node);
    if (current.length && (size + count > limit || afterContents)) {
      chunks.push({...model,blocks:current,text:undefined}); current = []; size = 0;
    }
    current.push(node); size += count; afterContents = node.type==='contents';
  }
  if (current.length) chunks.push({...model,blocks:current,text:undefined});
  return chunks;
}
