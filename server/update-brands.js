import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Открываем БД
const db = new Database(path.join(__dirname, 'database', 'app.db'));

// Читаем актуальные данные из brands-data.json
const brandsData = JSON.parse(fs.readFileSync(path.join(__dirname, 'database', 'brands-data.json'), 'utf-8'));

// Обновляем каждый бренд
const updateBrand = db.prepare('UPDATE brands SET products = ? WHERE id = ?');

brandsData.brands.forEach(brand => {
  const result = updateBrand.run(JSON.stringify(brand.products), brand.id);
  console.log(`Updated brand ${brand.id}: ${result.changes} rows affected`);
});

console.log('Brands updated successfully!');
db.close();
