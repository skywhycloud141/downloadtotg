declare module 'media-downloader-ez' {
  export interface DownloaderOptions {
    autocrop?: boolean;
    limitSizeMB?: number | null;
    rotation?: 'left' | 'right' | '180' | 'flip' | null;
    YTBmaxduration?: number;
    YTBcookie?: string;
    useInstaOption3?: boolean;
  }

  // Основная функция возвращает строку (имя сохраненного файла)
  function MediaDownloader(url: string, options?: DownloaderOptions): Promise<string>;

  // Библиотека также экспортирует статичный метод для проверки ссылок
  namespace MediaDownloader {
    export function isVideoLink(link: string): boolean;
  }

  export = MediaDownloader;
}