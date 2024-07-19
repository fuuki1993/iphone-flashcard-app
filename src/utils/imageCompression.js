// src/utils/imageCompression.js
import imageCompression from 'browser-image-compression';

export const compressImage = async (file, options = {}) => {
  try {
    const defaultOptions = {
      maxSizeMB: 1,          // 最大ファイルサイズ（MB）
      maxWidthOrHeight: 1920,// 最大幅または高さ（ピクセル）
      useWebWorker: true,    // WebWorkerを使用（バックグラウンド処理）
      ...options
    };

    console.log('圧縮前のファイルサイズ:', file.size / 1024 / 1024, 'MB');

    const compressedFile = await imageCompression(file, defaultOptions);

    console.log('圧縮後のファイルサイズ:', compressedFile.size / 1024 / 1024, 'MB');

    return compressedFile;
  } catch (error) {
    console.error('画像圧縮中にエラーが発生しました:', error);
    throw error;
  }
};