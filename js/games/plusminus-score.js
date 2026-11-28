/* Shared arithmetic for app and TV. Existing rule: division by zero yields 0. */
(()=>{
function resolvePlusminusValue(slotIndex, slot, partialBefore, smart) {
  if (!slot) return null;
  if (!slot.isGosse) return parseInt(slot.kranzValue ?? slot.value ?? 0, 10) || 0;
  if (!smart) return [0, 0, 9, 0, 9][slotIndex];
  if (slotIndex === 0 || slotIndex === 1) return 0;
  if (slotIndex === 2) return 9;
  if (slotIndex === 3) return partialBefore < 0 ? 9 : 0;
  if (slotIndex === 4) return partialBefore < 0 ? 1 : 9;
  return 0;
}

function computePlusminusResult(row, smart = false) {
  const steps = [];
  let a = resolvePlusminusValue(0, row[0], 0, smart);
  let b = resolvePlusminusValue(1, row[1], a, smart);
  if (a === null || b === null) return { complete: false, result: null, display: '—' };
  let value = a + b;
  steps.push(`${a} + ${b} = ${value}`);
  let c = resolvePlusminusValue(2, row[2], value, smart);
  if (c === null) return { complete: false, result: null, display: '—' };
  value = value - c;
  steps.push(`− ${c} = ${value}`);
  let d = resolvePlusminusValue(3, row[3], value, smart);
  if (d === null) return { complete: false, result: null, display: '—' };
  value = value * d;
  steps.push(`× ${d} = ${value}`);
  let e = resolvePlusminusValue(4, row[4], value, smart);
  if (e === null) return { complete: false, result: null, display: '—' };
  value = e === 0 ? 0 : value / e;
  steps.push(`÷ ${e} = ${value}`);
  return { complete: true, result: value, display: String(value), steps, gutter:row.some(x=>x?.isGosse), divisionByZero:e===0 };
}

window.KCPlusminus=Object.freeze({value:resolvePlusminusValue,compute:computePlusminusResult});
})();
