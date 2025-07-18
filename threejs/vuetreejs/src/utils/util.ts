const rgbToHex = (r: number, g: number, b: number): string => {
    const clamp = (value) => Math.round(Math.max(0, Math.min(255, value)));
  const red = clamp(r);
  const green = clamp(g);
  const blue = clamp(b);

  // 2. 转换为 2 位十六进制，并拼接
  return `0x${red.toString(16).padStart(2, '0')}${green.toString(16).padStart(2, '0')}${blue.toString(16).padStart(2, '0')}`;
}

export { rgbToHex };