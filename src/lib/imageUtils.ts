// src/lib/imageUtils.ts

export async function fileToBase64Compressed(
  file: File,
  maxDim = 1000,
  quality = 0.75
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas context failed'));

        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedBase64);
      };

      img.onerror = (err) => reject(err);
    };

    reader.onerror = (err) => reject(err);
  });
}

/** 64-bit difference hash. Near-copies stay close even after a mild crop or recompress. */
export async function differenceHash(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 9;
      canvas.height = 8;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas context failed"));
      ctx.drawImage(img, 0, 0, 9, 8);
      const pixels = ctx.getImageData(0, 0, 9, 8).data;
      let bits = "";
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
          const i = (y * 9 + x) * 4;
          const j = (y * 9 + x + 1) * 4;
          const left = pixels[i] * 0.3 + pixels[i + 1] * 0.59 + pixels[i + 2] * 0.11;
          const right = pixels[j] * 0.3 + pixels[j + 1] * 0.59 + pixels[j + 2] * 0.11;
          bits += left > right ? "1" : "0";
        }
      }
      let hex = "";
      for (let i = 0; i < 64; i += 4) {
        hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
      }
      resolve(hex);
    };
    img.onerror = () => reject(new Error("Hash image failed"));
    img.src = dataUrl;
  });
}

export function hammingHex(a: string, b: string): number {
  if (!a || !b || a.length !== b.length) return 64;
  let dist = 0;
  for (let i = 0; i < a.length; i++) {
    let x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    while (x) {
      dist += x & 1;
      x >>= 1;
    }
  }
  return dist;
}

export function isNearDuplicate(a: string, b: string, maxDistance = 10) {
  return hammingHex(a, b) <= maxDistance;
}