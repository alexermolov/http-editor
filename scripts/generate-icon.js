const PImage = require('pureimage');
const fs = require('fs');
const path = require('path');

(async () => {
  try {
    const size = 128;
    const img = PImage.make(size, size);
    const ctx = img.getContext('2d');

    // Vertical gradient background (brand-like blue variant)
    for (let y = 0; y < size; y++) {
      const t = y / (size - 1);
      const r = Math.round(0x00 + t * (0x06));
      const g = Math.round(0x66 + t * (0xB8 - 0x66));
      const b = Math.round(0xB8 + t * (0xF0 - 0xB8));
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(0, y, size, 1);
    }

    // Ring accent
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(size/2, size/2, size/2 - 10, 0, Math.PI * 2);
    ctx.stroke();

    // Stylized "HTTP" using geometric shapes (no font dependency)
    ctx.fillStyle = '#FFFFFF';
    
    // Calculate optimal scaling to fit text within bounds
    const targetWidth = 100; // desired text width
    const targetHeight = 52; // desired text height
    const baseY = 30;
    const padding = 14; // side padding
    
    // Base dimensions (unscaled)
    const baseDimensions = {
      letterHeight: 52,
      stroke: 8,
      gap: 12,
      H: 24,
      T: 26,
      P: 26
    };
    
    // Calculate total unscaled width
    const unscaledWidth = baseDimensions.H + baseDimensions.gap + 
                          baseDimensions.T + baseDimensions.gap + 
                          baseDimensions.T + baseDimensions.gap + 
                          baseDimensions.P;
    
    // Calculate scale factor to fit within target width
    const scaleFactor = Math.min(1, targetWidth / unscaledWidth);
    
    // Apply scaled dimensions
    const letterHeight = baseDimensions.letterHeight * scaleFactor;
    const stroke = Math.max(4, baseDimensions.stroke * scaleFactor); // minimum 4px stroke
    const gap = baseDimensions.gap * scaleFactor;
    
    let x = padding;
    
    // Function helpers for each letter with scaled dimensions
    const drawH = () => {
      const width = baseDimensions.H * scaleFactor;
      ctx.fillRect(x, baseY, stroke, letterHeight);
      ctx.fillRect(x + width - stroke, baseY, stroke, letterHeight);
      ctx.fillRect(x, baseY + (letterHeight/2 - stroke/2), width, stroke);
      x += width + gap;
    };
    const drawT = () => {
      const width = baseDimensions.T * scaleFactor;
      ctx.fillRect(x, baseY, width, stroke); // top bar
      ctx.fillRect(x + (width/2 - stroke/2), baseY, stroke, letterHeight); // stem
      x += width + gap;
    };
    const drawP = () => {
      const width = baseDimensions.P * scaleFactor;
      const bowlHeight = 24 * scaleFactor;
      ctx.fillRect(x, baseY, stroke, letterHeight); // stem
      ctx.fillRect(x, baseY, width, stroke); // top bar
      ctx.fillRect(x + width - stroke, baseY + stroke, stroke, bowlHeight - stroke); // right side of bowl
      ctx.fillRect(x, baseY + bowlHeight - stroke, width, stroke); // bottom of bowl
      x += width + gap;
    };

    drawH();
    drawT();
    drawT();
    drawP();

    // Arrow (representing request flow) below text
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(24, size - 36);
    ctx.lineTo(size - 28, size - 36);
    ctx.lineTo(size - 46, size - 54);
    ctx.moveTo(size - 28, size - 36);
    ctx.lineTo(size - 46, size - 18);
    ctx.strokeStyle = '#FFFFFF';
    ctx.stroke();

    // Subtle overlay for depth
    ctx.globalAlpha = 0.10;
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(size/2, size/2, size/2 - 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    const outPath = path.join(__dirname, '..', 'icon.png');
    await PImage.encodePNGToStream(img, fs.createWriteStream(outPath));
    console.log('Icon generated at', outPath);
  } catch (err) {
    console.error('Failed to generate icon:', err);
    process.exit(1);
  }
})();
