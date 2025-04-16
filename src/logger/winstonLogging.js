import { createLogger, format, transports } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

// Определение уровней логирования
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Определение цветов для уровней логирования (для консоли)
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Добавление цветов в winston
format.colorize().addColors(colors);

// Формат сообщений
const logFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.errors({ stack: true }), // Включаем стек ошибок
  format.printf(({ level, message, timestamp, stack, ...metadata }) => {
    let msg = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }
    if (stack) {
      msg += `\n${stack}`;
    }
    return msg;
  })
);

// Настройка логгера
const logger = createLogger({
  levels,
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info', // В development логируем всё, в production только info и выше
  format: logFormat,
  transports: [
    // Логирование в консоль
    new transports.Console({
      format: format.combine(
        format.colorize({ all: true }), // Добавляем цвета для консоли
        logFormat
      ),
    }),
    // Логирование в файл (все логи)
    new DailyRotateFile({
      filename: 'logs/application-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true, // Архивировать старые логи
      maxSize: '20m', // Максимальный размер файла 20MB
      maxFiles: '14d', // Хранить логи 14 дней
    }),
    // Логирование ошибок в отдельный файл
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d', // Хранить ошибки 30 дней
    }),
  ],
});

// Экспорт логгера
export default logger;