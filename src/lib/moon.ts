const day = 86400000;
const synodicMonth = 29.530588853;
const knownNewMoon = Date.UTC(2000, 0, 6, 18, 14);
const fullMoonAge = synodicMonth / 2;
const radius = 28;

export function moonAge(date: Date) {
  const age = ((date.getTime() - knownNewMoon) / day) % synodicMonth;
  return age < 0 ? age + synodicMonth : age;
}
export function moonName(age: number) {
  if (age < 1.5) return "新月";
  if (age < 5.5) return "三日月";
  if (age < 9) return "上弦の月";
  if (age < 13.5) return "十三夜";
  if (age < 16) return "満月";
  if (age < 20) return "寝待月";
  if (age < 24) return "下弦の月";
  if (age < 28) return "有明の月";
  return "新月";
}
export function nextFullMoon(date: Date) {
  const wait = fullMoonAge - moonAge(date);
  return new Date(date.getTime() + (wait < 0 ? wait + synodicMonth : wait) * day);
}
/** 64×64 の viewBox に、照らされている部分を描く path。 */
export function moonPath(age: number) {
  const phase = age / synodicMonth;
  const terminator = (Math.abs(Math.cos(2 * Math.PI * phase)) * radius).toFixed(2);
  const waxing = phase < 0.5;
  const limb = waxing ? 1 : 0;
  const bulge = (waxing ? phase >= 0.25 : phase >= 0.75) ? 1 : 0;
  return `M32 4 A${radius} ${radius} 0 0 ${limb} 32 60 A${terminator} ${radius} 0 0 ${bulge} 32 4 Z`;
}
