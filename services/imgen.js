const fs = require('fs');
const path = require('path');
const { OpenAI, toFile } = require('openai');
const axios = require('axios');
const sharp = require('sharp');

// Путь для постоянного хранения на Render
const PERSISTENT_DATA_PATH = '/data';

/**
 * Функция для сохранения файла в постоянное хранилище
 * @param {string} sourceFilePath Путь к исходному файлу
 * @param {string} fileName Имя файла для сохранения
 * @param {string} subFolder Подпапка (captures, images, fallbacks)
 * @returns {Promise<string>} Путь к сохраненному файлу
 */
async function saveToDataStorage(sourceFilePath, fileName, subFolder) {
  try {
    // Создаем путь к подпапке в /data
    const dataSubfolderPath = path.join(PERSISTENT_DATA_PATH, subFolder);
    
    // Создаем папку, если она не существует
    await fs.promises.mkdir(dataSubfolderPath, { recursive: true });
    
    // Путь к файлу в постоянном хранилище
    const persistentFilePath = path.join(dataSubfolderPath, fileName);
    
    // Копируем файл
    await fs.promises.copyFile(sourceFilePath, persistentFilePath);
    
    console.log(`File saved to persistent storage: ${persistentFilePath}`);
    return persistentFilePath;
  } catch (error) {
    console.error('Error saving to data storage:', error.message);
    return null;
  }
}

/**
 * Функция для добавления логотипа к изображению
 * @param {Buffer} imageBuffer Буфер изображения
 * @param {string} logoPath Путь к логотипу
 * @returns {Promise<Buffer>} Буфер изображения с логотипом
 */
async function addLogoToImage(imageBuffer, logoPath) {
  try {
    // Проверяем, существует ли файл логотипа
    if (!fs.existsSync(logoPath)) {
      console.warn(`Logo file not found at ${logoPath}, skipping logo overlay`);
      return imageBuffer;
    }

    // Получаем метаданные основного изображения
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();
    const { width, height } = metadata;

    // Определяем размер логотипа (15% от ширины основного изображения)
    const logoWidth = Math.floor(width * 0.5);
    
    // Изменяем размер логотипа с сохранением пропорций
    const resizedLogo = await sharp(logoPath)
      .resize(logoWidth, null, {
        withoutEnlargement: true,
        fit: 'inside'
      })
      .png()
      .toBuffer();

    // Получаем размеры измененного логотипа
    const logoMetadata = await sharp(resizedLogo).metadata();
    const logoHeight = logoMetadata.height;

    // Вычисляем позицию для размещения логотипа в нижней центральной части
    const logoLeft = Math.floor((width - logoWidth) / 2);
    const logoTop = height - logoHeight - Math.floor(height * 0.05); // 5% отступ снизу

    console.log(`Adding logo: ${logoWidth}x${logoHeight} at position (${logoLeft}, ${logoTop})`);

    // Накладываем логотип на основное изображение
    const imageWithLogo = await image
      .composite([{
        input: resizedLogo,
        top: logoTop,
        left: logoLeft
      }])
      .png()
      .toBuffer();

    return imageWithLogo;
  } catch (error) {
    console.error('Error adding logo to image:', error.message);
    // В случае ошибки возвращаем оригинальное изображение
    return imageBuffer;
  }
}

/**
 * Функция для стилизации изображения с использованием модели gpt-image-1
 * @param {string} inputImagePath Путь к входному изображению
 * @param {string} styleImagePath Путь к изображению стиля (НЕ ИСПОЛЬЗУЕТСЯ)
 * @param {string} outputDir Директория для сохранения результата
 * @param {string} prompt Пользовательский промпт для стилизации (опционально)
 * @returns {Promise<Object>} Результат операции
 */
async function styleImage(inputImagePath, styleImagePath, outputDir, prompt) {
  // Используем отдельный API ключ для генерации изображений
  const OPENAI_API_KEY_IMG = process.env.OPENAI_API_KEY_IMG;
  
  if (!OPENAI_API_KEY_IMG) {
    throw new Error('OPENAI_API_KEY_IMG environment variable is not set');
  }

  try {
    // Создаем клиент OpenAI
    const openai = new OpenAI({
      apiKey: OPENAI_API_KEY_IMG
    });
    
    console.log('Preparing file for OpenAI API...');
    
    // Преобразуем только входное изображение (убираем styleImagePath)
    const inputFile = await toFile(
      fs.createReadStream(inputImagePath),
      path.basename(inputImagePath),
      { type: path.extname(inputImagePath) === '.png' ? 'image/png' : 'image/jpeg' }
    );
    
    // Определяем промпт для передачи в API
    // Если промпт не передан, используем стандартный
    const defaultPrompt = "Transform this person into a 3D style render, make it vibrant and stylized";
    const finalPrompt = prompt || defaultPrompt;
    
    console.log(`Sending request to OpenAI API with prompt: "${finalPrompt}"`);
    
    try {
      // Отправляем запрос к API только с одним изображением
      const response = await openai.images.edit({
        model: "gpt-image-1",
        image: inputFile, // Только входное изображение
        prompt: finalPrompt
      });
      
      console.log('Response received!');
      
      // Определяем путь к логотипу
      const logoPath = path.join(path.dirname(__filename), 'logo.png');
      
      // Сохраняем результат
      const timestamp = Date.now();
      const outputFilename = `generated_${timestamp}.png`;
      const outputPath = path.join(outputDir, outputFilename);
      
      let imageBuffer;
      
      if (response.data[0].b64_json) {
        // Получаем изображение из base64
        imageBuffer = Buffer.from(response.data[0].b64_json, 'base64');
        console.log('Image received from base64');
      } else if (response.data[0].url) {
        // Скачиваем изображение по URL
        const imageResponse = await axios.get(response.data[0].url, { 
          responseType: 'arraybuffer' 
        });
        imageBuffer = Buffer.from(imageResponse.data);
        console.log(`Image downloaded from URL ${response.data[0].url}`);
      } else {
        console.error('Unexpected response format:', response.data[0]);
        throw new Error('No image data in API response');
      }
      
      // Добавляем логотип к изображению
      console.log('Adding logo to generated image...');
      const imageWithLogo = await addLogoToImage(imageBuffer, logoPath);
      
      // Сохраняем изображение с логотипом
      fs.writeFileSync(outputPath, imageWithLogo);
      console.log(`Image with logo saved as ${outputPath}`);
      
      // Сохраняем в постоянное хранилище
      await saveToDataStorage(outputPath, outputFilename, 'images');
      
      return {
        success: true,
        filename: outputFilename,
        path: outputPath
      };
    } catch (error) {
      // Проверяем, связана ли ошибка с системой безопасности
      if (error.message && (error.message.includes('safety system') || error.message.includes('moderation') || error.message.includes('rejected'))) {
        console.warn('Safety system rejection detected, trying fallback method...');
        // Используем резервный метод с обрезкой области лица
        return await fallbackImageGeneration(inputImagePath, styleImagePath, outputDir, finalPrompt);
      }
      throw error;
    }
  } catch (error) {
    console.error('Error styling image:', error.message);
    
    if (error.response) {
      console.error('Error details:', error.response.data);
    }
    
    throw error;
  }
}

/**
 * Резервный метод для генерации изображения с обрезкой области лица
 * @param {string} inputImagePath Путь к входному изображению
 * @param {string} styleImagePath Путь к изображению стиля (НЕ ИСПОЛЬЗУЕТСЯ)
 * @param {string} outputDir Директория для сохранения результата
 * @param {string} originalPrompt Исходный промпт для стилизации
 * @returns {Promise<Object>} Результат операции
 */
async function fallbackImageGeneration(inputImagePath, styleImagePath, outputDir, originalPrompt) {
  try {
    console.log('Using fallback image generation with face cropping...');
    
    // 1. Анализируем исходное изображение для получения информации об одежде
    const clothingDescription = await analyzeClothing(inputImagePath);
    
    // 2. Обрезаем область лица из исходного изображения
    const { croppedFacePath, croppedPublicPath } = await cropFaceRegion(inputImagePath, outputDir);
    
    // 3. Формируем улучшенный промпт с информацией об одежде
    const enhancedPrompt = `${originalPrompt}. Person wearing ${clothingDescription}.`;
    console.log(`Enhanced prompt: "${enhancedPrompt}"`);
    
    // 4. Создаем клиент OpenAI
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY_IMG
    });
    
    // 5. Преобразуем только обрезанное изображение (убираем styleImagePath)
    const croppedFaceFile = await toFile(
      fs.createReadStream(croppedFacePath),
      'cropped_face.png',
      { type: 'image/png' }
    );
    
    try {
      // 6. Отправляем запрос к API только с обрезанным изображением
      console.log('Sending fallback request to OpenAI API...');
      const response = await openai.images.edit({
        model: "gpt-image-1",
        image: croppedFaceFile, // Только обрезанное изображение
        prompt: enhancedPrompt
      });
      
      // Определяем путь к логотипу
      const logoPath = path.join(path.dirname(__filename), 'logo.png');
      
      // 7. Сохраняем результат
      const timestamp = Date.now();
      const outputFilename = `generated_fallback_${timestamp}.png`;
      const outputPath = path.join(outputDir, outputFilename);
      
      let imageBuffer;
      
      if (response.data[0].b64_json) {
        imageBuffer = Buffer.from(response.data[0].b64_json, 'base64');
        console.log('Fallback image received from base64');
      } else if (response.data[0].url) {
        const imageResponse = await axios.get(response.data[0].url, { 
          responseType: 'arraybuffer' 
        });
        imageBuffer = Buffer.from(imageResponse.data);
        console.log(`Fallback image downloaded from URL ${response.data[0].url}`);
      } else {
        throw new Error('No image data in fallback API response');
      }
      
      // Добавляем логотип к изображению
      console.log('Adding logo to fallback generated image...');
      const imageWithLogo = await addLogoToImage(imageBuffer, logoPath);
      
      // Сохраняем изображение с логотипом
      fs.writeFileSync(outputPath, imageWithLogo);
      console.log(`Fallback image with logo saved as ${outputPath}`);
      
      // Сохраняем в постоянное хранилище
      await saveToDataStorage(outputPath, outputFilename, 'fallbacks');
      
      // 8. НЕ удаляем временный файл с обрезанным лицом, чтобы можно было проверить
      console.log(`Keeping cropped image for inspection at ${croppedFacePath}`);
      
      return {
        success: true,
        filename: outputFilename,
        path: outputPath,
        usedFallback: true,
        croppedImageUrl: croppedPublicPath // Возвращаем URL обрезанного изображения для отображения
      };
    } catch (error) {
      console.error('Error in fallback image API call:', error.message);
      
      // Возвращаем информацию об ошибке и путь к обрезанному изображению
      return {
        success: false,
        error: error.message,
        usedFallback: true,
        croppedImageUrl: croppedPublicPath,
        needRetry: true // Флаг, что нужна повторная попытка
      };
    }
  } catch (error) {
    console.error('Error in fallback image generation:', error.message);
    throw error;
  }
}

/**
 * Функция для анализа одежды на изображении с помощью OpenAI Vision
 * @param {string} imagePath Путь к изображению
 * @returns {Promise<string>} Описание одежды
 */
async function analyzeClothing(imagePath) {
  try {
    // Получаем API ключ
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    
    if (!OPENAI_API_KEY) {
      console.warn('OPENAI_API_KEY not set, using generic clothing description');
      return "casual clothing";
    }
    
    // Читаем изображение и конвертируем в base64
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    
    // Отправляем запрос к OpenAI Vision API
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Describe only the clothing and attire of the person in this image in 10 words or less."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                  detail: "low"
                }
              }
            ]
          }
        ],
        max_tokens: 50
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        }
      }
    );
    
    // Извлекаем описание одежды
    const clothingDescription = response.data.choices[0].message.content.trim();
    console.log(`Clothing description: ${clothingDescription}`);
    
    return clothingDescription;
  } catch (error) {
    console.error('Error analyzing clothing:', error.message);
    // В случае ошибки возвращаем общее описание
    return "casual clothing";
  }
}

/**
 * Функция для обрезки области лица с запасом вокруг него
 * ОБНОВЛЕНО: Обрезаем сверху и по бокам, снизу НЕ обрезаем
 * @param {string} imagePath Путь к изображению
 * @param {string} outputDir Директория для публичных файлов
 * @returns {Promise<Object>} Путь к обрезанному изображению и публичный URL
 */
async function cropFaceRegion(imagePath, outputDir) {
  try {
    // Получаем информацию об изображении
    const metadata = await sharp(imagePath).metadata();
    
    const imageWidth = metadata.width;
    const imageHeight = metadata.height;
    
    // НОВАЯ ЛОГИКА ОБРЕЗКИ: сверху и по бокам, снизу не обрезаем
    // Обрезаем 15% сверху и по 10% с каждой стороны
    const cropTop = Math.floor(imageHeight * 0.15); // 15% сверху
    const cropLeft = Math.floor(imageWidth * 0.1);  // 10% слева
    const cropRight = Math.floor(imageWidth * 0.1); // 10% справа
    
    // Вычисляем новые размеры
    const newWidth = imageWidth - cropLeft - cropRight;
    const newHeight = imageHeight - cropTop; // Снизу не обрезаем
    
    // Выводим информацию о размерах
    console.log(`Original image dimensions: ${imageWidth}x${imageHeight}`);
    console.log(`Cropping: top=${cropTop}, left=${cropLeft}, right=${cropRight}, bottom=0`);
    console.log(`New dimensions: ${newWidth}x${newHeight}`);
    
    // Формируем имя файла с временной меткой
    const timestamp = Date.now();
    const croppedFilename = `cropped_face_${timestamp}.png`;
    
    // Обрезаем изображение и сохраняем в каталог captures
    const croppedFacePath = path.join(path.dirname(imagePath), croppedFilename);
    
    await sharp(imagePath)
      .extract({ 
        left: cropLeft, 
        top: cropTop, 
        width: newWidth, 
        height: newHeight 
      })
      .toFile(croppedFacePath);
    
    console.log(`Face region cropped and saved to ${croppedFacePath}`);
    
    // Копируем обрезанное изображение в публичную директорию для отображения на фронтенде
    const publicCroppedPath = path.join(outputDir, croppedFilename);
    
    // Копируем файл
    fs.copyFileSync(croppedFacePath, publicCroppedPath);
    
    // Сохраняем в постоянное хранилище
    await saveToDataStorage(croppedFacePath, croppedFilename, 'cropped');
    
    // Формируем публичный путь
    const croppedPublicPath = `/images/${croppedFilename}`;
    
    return {
      croppedFacePath,
      croppedPublicPath
    };
  } catch (error) {
    console.error('Error cropping face region:', error.message);
    // В случае ошибки возвращаем пустые пути
    return {
      croppedFacePath: imagePath,
      croppedPublicPath: null
    };
  }
}

module.exports = { styleImage };