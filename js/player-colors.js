(function () {
  const defaults = new Map([
    ['simon', '#fde100'], ['simon kreis', '#fde100'], ['marco', '#004d9d'],
    ['peter', '#1d8063'], ['daniel', '#bf374d'], ['marcel', '#087d91'],
    ['artur', '#814aa1'], ['julian', '#c25e12'], ['nico', '#785646'],
    ['alexander', '#a43c77'], ['marius', '#567b25']
  ]);
  const palette = ['#405ab0', '#c45732', '#237b74', '#943c96', '#98641a', '#b43b53', '#377f53', '#536779', '#315d75', '#aa5178', '#7c672d'];
  const nameKey = name => String(name ?? '').trim().toLocaleLowerCase('de').replace(/\s+/g, ' ');

  function normalize(value) {
    return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : '';
  }

  function defaultColor(name) {
    const key = nameKey(name);
    if (defaults.has(key)) return defaults.get(key);
    let hash = 2166136261;
    for (let i = 0; i < key.length; i++) hash = Math.imul(hash ^ key.charCodeAt(i), 16777619);
    return palette[((hash ^ (hash >>> 16)) >>> 0) % palette.length];
  }

  function forPerson(person) {
    return normalize(person.playerColor) || defaultColor(person.name);
  }

  function rgb(color) {
    return [1, 3, 5].map(index => parseInt(color.slice(index, index + 2), 16));
  }

  function tint(color) {
    return 'rgba(' + rgb(color).join(',') + ',0.14)';
  }

  function ink(color) {
    const [red, green, blue] = rgb(color).map(value => {
      const channel = value / 255;
      return channel <= 0.04045 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue > 0.179 ? '#000' : '#fff';
  }

  window.KCPlayerColors = Object.freeze({normalize, defaultColor, forPerson, tint, ink});
})();
