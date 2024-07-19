// src/utils/imageCompression.js
import imageCompression from 'browser-image-compression';

export const compressImage = async (file) => {
  const options = {
    maxSizeMB: 0.3,
    maxWidthOrHeight: 600,
    useWebWorker: true
  };
  
  try {
    const compressedFile = await imageCompression(file, options);
    return compressedFile;
  } catch (error) {
    console.error("Error compressing image:", error);
    throw error;
  }
};