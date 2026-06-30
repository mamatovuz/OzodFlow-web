function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Renders a branded document (quote / invoice) to a PNG and downloads it.
export async function downloadDocImage({ fileName, heading, lines = [], highlight, accent = "#2563eb" }) {
  const W = 1080;
  const pad = 80;
  const lineH = 48;
  const headerH = 280;
  const highlightH = highlight ? 150 : 0;
  const footerH = 110;
  const H = headerH + lines.length * lineH + highlightH + footerH;

  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);

  // background + top accent
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, W, 12);

  // logo + brand (centered at top, with clear vertical spacing)
  const logo = await loadImage("/logo-mark.png");
  const logoSize = 84;
  if (logo) {
    roundRect(ctx, (W - logoSize) / 2, 40, logoSize, logoSize, 20);
    ctx.save();
    ctx.clip();
    ctx.drawImage(logo, (W - logoSize) / 2, 40, logoSize, logoSize);
    ctx.restore();
  }
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#0b1530";
  ctx.font = "700 40px Arial";
  ctx.fillText("OzodFlow", W / 2, 168); // below logo (logo ends at 124)
  ctx.fillStyle = "#64748b";
  ctx.font = "400 20px Arial";
  ctx.fillText("Raqamli yechimlar — sayt, bot, CRM", W / 2, 198);

  // heading
  ctx.fillStyle = accent;
  ctx.font = "700 26px Arial";
  ctx.fillText(heading.toUpperCase(), W / 2, 244);

  // body lines (left aligned)
  ctx.textAlign = "left";
  let y = headerH + 44;
  lines.forEach((line) => {
    const bold = line.startsWith("*");
    const text = bold ? line.slice(1) : line;
    ctx.fillStyle = bold ? "#0b1530" : "#334155";
    ctx.font = `${bold ? "700" : "400"} 24px Arial`;
    ctx.fillText(text, pad, y);
    y += lineH;
  });

  // highlight box (total)
  if (highlight) {
    const boxY = y + 6;
    ctx.fillStyle = accent;
    roundRect(ctx, pad, boxY, W - pad * 2, 104, 18);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.font = "400 22px Arial";
    ctx.fillText(highlight.label, pad + 32, boxY + 44);
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 42px Arial";
    ctx.fillText(highlight.value, pad + 32, boxY + 86);
    y = boxY + 124;
  }

  // footer
  ctx.fillStyle = "#94a3b8";
  ctx.font = "400 20px Arial";
  ctx.textAlign = "center";
  ctx.fillText("+998 93 230 34 10   |   @OzodFlow_uz   |   ozodflow.uz", W / 2, H - 44);

  await new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(url);
      }
      resolve();
    }, "image/png");
  });
}
