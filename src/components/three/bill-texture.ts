import * as THREE from "three";

/**
 * Draws a stylised sandbox banknote on a canvas. Keeping the bill procedural
 * avoids a large texture download and keeps the scene crisp at any DPI.
 */
export function createBillTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 448;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const base = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  base.addColorStop(0, "#d9efd2");
  base.addColorStop(0.45, "#c3e4b8");
  base.addColorStop(1, "#aed8a4");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "rgba(16, 74, 54, 0.55)";
  ctx.lineWidth = 6;
  ctx.strokeRect(18, 18, canvas.width - 36, canvas.height - 36);
  ctx.lineWidth = 2;
  ctx.strokeRect(38, 38, canvas.width - 76, canvas.height - 76);

  // Guilloche style arcs
  ctx.globalAlpha = 0.16;
  ctx.strokeStyle = "#0f4a36";
  for (let ring = 0; ring < 9; ring += 1) {
    ctx.beginPath();
    ctx.ellipse(512, 224, 150 + ring * 34, 100 + ring * 21, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Center vignette for the emblem
  const vignette = ctx.createRadialGradient(512, 224, 20, 512, 224, 190);
  vignette.addColorStop(0, "rgba(232, 247, 226, 0.92)");
  vignette.addColorStop(1, "rgba(232, 247, 226, 0)");
  ctx.fillStyle = vignette;
  ctx.fillRect(300, 40, 424, 368);

  // Emblem
  ctx.fillStyle = "#0c3b2c";
  ctx.beginPath();
  ctx.arc(512, 214, 96, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(202, 240, 190, 0.85)";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(512, 214, 82, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "#e9f7e2";
  ctx.font = "700 104px Arial, Helvetica, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("$", 512, 212);

  ctx.fillStyle = "rgba(12, 59, 44, 0.92)";
  ctx.font = "700 66px Arial, Helvetica, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("100", 58, 150);
  ctx.textAlign = "right";
  ctx.fillText("100", 966, 320);

  ctx.fillStyle = "rgba(12, 59, 44, 0.88)";
  ctx.font = "700 30px Arial, Helvetica, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("PAYPILOT  SANDBOX  NOTE", 512, 372);
  ctx.font = "500 21px Arial, Helvetica, sans-serif";
  ctx.fillText("PAYABLE ON APPROVAL · NO LIVE FUNDS", 512, 408);

  ctx.textAlign = "left";
  ctx.font = "500 20px monospace";
  ctx.fillText("PP 0426 1188 A", 70, 398);

  ctx.textAlign = "right";
  ctx.font = "700 26px Arial, Helvetica, sans-serif";
  ctx.fillText("AI", 952, 108);

  // Subtle paper grain
  ctx.globalAlpha = 0.08;
  for (let i = 0; i < 900; i += 1) {
    ctx.fillStyle = i % 2 === 0 ? "#0c3b2c" : "#f2fbf0";
    ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 2, 2);
  }
  ctx.globalAlpha = 1;

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}
