/** カウンターの表示桁。昔のカウンターにならって 7 桁に 0 を詰める。 */
export const counterDigits = (n: number) => String(n).padStart(7, "0");
