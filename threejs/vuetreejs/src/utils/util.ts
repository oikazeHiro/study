const rgbToHex = (r: number, g: number, b: number): string => {
    const clamp = (value) => Math.round(Math.max(0, Math.min(255, value)));
  const red = clamp(r);
  const green = clamp(g);
  const blue = clamp(b);

  // 2. 转换为 2 位十六进制，并拼接
  return `0x${red.toString(16).padStart(2, '0')}${green.toString(16).padStart(2, '0')}${blue.toString(16).padStart(2, '0')}`;
}

// 获取静态资源的完整 URL
const getStaticUrl = (url: string): string => {
    // 处理 ~/ 开头的路径
    if (url.startsWith('~/')) {
        return new URL(url.replace('~/', '/src/'), import.meta.url).href;
    }

    // 处理其他路径
    return new URL(url, import.meta.url).href;
}

export { rgbToHex, getStaticUrl };
