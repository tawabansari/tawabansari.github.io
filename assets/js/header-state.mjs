export function headerState(previous, y, height, engaged=false) {
  y=Math.max(0,y);
  if(engaged||y<height+24)return {y,turn:y,direction:0,hidden:false};
  const delta=y-previous.y;
  if(Math.abs(delta)<2)return {...previous,y};
  const direction=Math.sign(delta);
  const turn=direction===previous.direction?previous.turn:previous.y;
  const hidden=Math.abs(y-turn)>12?direction>0:previous.hidden;
  return {y,turn,direction,hidden};
}
