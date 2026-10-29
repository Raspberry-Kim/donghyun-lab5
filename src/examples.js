/* 동현콥 속도 예제. 동현랭이 출력한 정수 하나가 헬리콥터의 속도(%)다. 100 = 원본 그대로(초당 30프레임). */
function expression(n){
  if(n===0)return '도옹ㅠ';
  if(n<0)return 'ㅠ '+expression(-n);
  if(n<=10)return '도'+'오'.repeat(n-1)+'옹';
  for(let a=10;a>=2;a--)if(n%a===0)return expression(a)+' '+expression(n/a);
  return '도'+'오'.repeat(n-1)+'옹';
}
const examples=[
 {id:'original',title:'01 · 원본 그대로',note:'원본과 같은 속도 100(초당 30프레임)으로 난다. 출력하는 숫자를 바꾸면 더 빠르거나 느리게 난다. 50부터 200까지 된다.',
  code:['나는 동현이냐?','ㅋㅋ 속도 100 · 원본 그대로 · 50부터 200까지','뿡뿡 '+expression(100)+'~뿡뿡뿡','동현이구나'].join('\n')}
];
if(typeof module!=='undefined')module.exports={examples,expression};
