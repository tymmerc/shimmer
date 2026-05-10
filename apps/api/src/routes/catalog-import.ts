/**
 * Catalog Import — Import products from CSV or JSON.
 * Supports: CSV (with headers), JSON array, or Shopify/WooCommerce export format.
 *
 * POST /api/catalog/import      — Import products (JSON body)
 * POST /api/catalog/import/csv  — Import products (CSV body)
 * GET  /api/catalog/stats       — Current catalog stats
 */

import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { getPrisma, logger } from '@shimmer/core';

export const catalogImportRouter = Router();

interface ProductInput {
  name: string;
  sku?: string;
  brand?: string;
  category?: string;
  price: number;
  description?: string;
  image_url?: string;
  specs?: Record<string, unknown>;
  stock?: number;
}

// ── Normalize product from various formats ──────────────

// Split CSV-like values ("magret,cassoulet,gibier") into arrays so downstream
// universe-gen and detection treat each value separately. Only splits when every
// part looks like a short tag (avoids splitting prose/descriptions).
function maybeSplitCsv(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  if (!/[,;]/.test(value)) return value;
  const parts = value.split(/[,;]/).map(s => s.trim()).filter(Boolean);
  if (parts.length < 2) return value;
  const allShort = parts.every(p => p.length >= 2 && p.length <= 50 && !/[.!?]/.test(p));
  return allShort ? parts : value;
}

function normalizeProduct(raw: Record<string, unknown>): ProductInput | null {
  // Handle Shopify format
  const name = String(raw.name || raw.Title || raw.title || raw.product_name || '').trim();
  if (!name) return null;

  const price = Number(raw.price || raw.Price || raw['Variant Price'] || raw.regular_price || 0);
  if (price <= 0) return null;

  const brand = String(raw.brand || raw.Brand || raw.Vendor || raw.vendor || '').trim() || null;
  const category = String(raw.category || raw.Category || raw['Product Type'] || raw.type || '').trim() || null;
  const sku = String(raw.sku || raw.SKU || raw['Variant SKU'] || '').trim() || null;
  const description = String(raw.description || raw.Description || raw['Body (HTML)'] || raw.body_html || '').trim() || null;
  const image = String(raw.image_url || raw.image || raw['Image Src'] || raw.images || '').trim() || null;
  const stock = Number(raw.stock || raw.stock_quantity || raw['Variant Inventory Qty'] || 999);

  // Extract specs from remaining fields
  const knownFields = new Set(['name', 'Title', 'title', 'product_name', 'price', 'Price', 'Variant Price',
    'regular_price', 'brand', 'Brand', 'Vendor', 'vendor', 'category', 'Category', 'Product Type', 'type',
    'sku', 'SKU', 'Variant SKU', 'description', 'Description', 'Body (HTML)', 'body_html',
    'image_url', 'image', 'Image Src', 'images', 'stock', 'stock_quantity', 'Variant Inventory Qty',
    'specs', // already handled below, must not be auto-extracted as a nested "specs.specs"
    'id', 'ID', 'Handle', 'Status', 'Published']);

  const specs: Record<string, unknown> = {};
  if (typeof raw.specs === 'object' && raw.specs !== null) {
    Object.assign(specs, raw.specs);
  }
  // Auto-extract unknown fields as specs
  for (const [k, v] of Object.entries(raw)) {
    if (!knownFields.has(k) && v !== null && v !== '' && v !== undefined) {
      specs[k.toLowerCase().replace(/\s+/g, '_')] = v;
    }
  }
  // Normalize CSV-like multi-value specs into arrays
  for (const [k, v] of Object.entries(specs)) {
    specs[k] = maybeSplitCsv(v);
  }

  return {
    name,
    sku: sku || undefined,
    brand: brand || undefined,
    category: category || undefined,
    price,
    description: description || undefined,
    image_url: image || undefined,
    specs: Object.keys(specs).length > 0 ? specs : undefined,
    stock,
  };
}

// ── CSV parser (simple, handles quoted fields) ──────────

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];

  // Parse header
  const headers = parseCSVLine(lines[0]!);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]!);
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]!] = values[j] || '';
    }
    rows.push(row);
  }

  return rows;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if ((ch === ',' || ch === ';') && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

// ── Import products to DB ──────────────────────────────

async function importProducts(storeId: number, products: ProductInput[]) {
  const prisma = getPrisma();
  let imported = 0;
  let updated = 0;
  let skipped = 0;

  for (const p of products) {
    try {
      // Check if product exists (by SKU or name+brand)
      const existing = p.sku
        ? await prisma.product.findFirst({ where: { storeId, sku: p.sku } })
        : await prisma.product.findFirst({ where: { storeId, name: p.name, brand: p.brand || undefined } });

      if (existing) {
        // Update
        await prisma.product.update({
          where: { id: existing.id },
          data: {
            name: p.name,
            brand: p.brand,
            category: p.category,
            price: p.price,
            description: p.description,
            imageUrl: p.image_url,
            specs: p.specs || {},
            stock: p.stock ?? 999,
            isActive: true,
          },
        });
        updated++;
      } else {
        // Create
        await prisma.product.create({
          data: {
            storeId,
            name: p.name,
            sku: p.sku || `AUTO-${Date.now()}-${imported}`,
            brand: p.brand,
            category: p.category,
            price: p.price,
            description: p.description,
            imageUrl: p.image_url,
            specs: p.specs || {},
            stock: p.stock ?? 999,
            isActive: true,
          },
        });
        imported++;
      }
    } catch (err) {
      logger.warn({ product: p.name, err: (err as Error).message }, 'catalog.import.skip');
      skipped++;
    }
  }

  return { imported, updated, skipped, total: products.length };
}

// ── Routes ──────────────────────────────────────────────

// POST /api/catalog/import — JSON array of products
catalogImportRouter.post('/import', async (req: Request, res: Response) => {
  try {
    const storeId = req.storeId!;
    const t0 = Date.now();

    let rawProducts: Record<string, unknown>[];

    if (Array.isArray(req.body)) {
      rawProducts = req.body;
    } else if (req.body.products && Array.isArray(req.body.products)) {
      rawProducts = req.body.products;
    } else {
      return res.status(400).json({ error: 'Body must be a JSON array or { products: [...] }' });
    }

    const normalized = rawProducts.map(normalizeProduct).filter(Boolean) as ProductInput[];
    if (normalized.length === 0) {
      return res.status(400).json({ error: 'No valid products found in input' });
    }

    const result = await importProducts(storeId, normalized);
    const totalMs = Date.now() - t0;

    logger.info({ storeId, ...result, totalMs }, 'catalog.import.done');
    res.json({ success: true, ...result, totalMs });
  } catch (err) {
    logger.error({ err }, 'catalog.import.failed');
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST /api/catalog/import/csv — CSV text body
catalogImportRouter.post('/import/csv', async (req: Request, res: Response) => {
  try {
    const storeId = req.storeId!;
    const t0 = Date.now();

    const csvText = typeof req.body === 'string' ? req.body : req.body.csv;
    if (!csvText) {
      return res.status(400).json({ error: 'Body must contain CSV text or { csv: "..." }' });
    }

    const rows = parseCSV(csvText);
    if (rows.length === 0) {
      return res.status(400).json({ error: 'No rows found in CSV' });
    }

    const normalized = rows.map(r => normalizeProduct(r as Record<string, unknown>)).filter(Boolean) as ProductInput[];
    if (normalized.length === 0) {
      return res.status(400).json({ error: 'No valid products found in CSV' });
    }

    const result = await importProducts(storeId, normalized);
    const totalMs = Date.now() - t0;

    logger.info({ storeId, ...result, totalMs }, 'catalog.import.csv.done');
    res.json({ success: true, ...result, totalMs });
  } catch (err) {
    logger.error({ err }, 'catalog.import.csv.failed');
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/catalog/products — paginated list (filter: category, brand, q)
catalogImportRouter.get('/products', async (req: Request, res: Response) => {
  try {
    const storeId = req.storeId!;
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    const brand = typeof req.query.brand === 'string' ? req.query.brand : undefined;
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';

    const prisma = getPrisma();
    const where: Record<string, unknown> = { storeId };
    if (category) where.category = category;
    if (brand) where.brand = brand;
    if (q.length >= 2) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { sku: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.product.findMany({ where, take: limit, skip: offset, orderBy: { id: 'asc' } }),
      prisma.product.count({ where }),
    ]);

    res.json({ items, total, limit, offset });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/catalog/products/:id — single product
catalogImportRouter.get('/products/:id', async (req: Request, res: Response) => {
  try {
    const storeId = req.storeId!;
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: 'Invalid product id' });
      return;
    }
    const prisma = getPrisma();
    const product = await prisma.product.findFirst({ where: { id, storeId } });
    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// PATCH /api/catalog/products/:id — partial update (price, stock, isActive, specs, ...)
const productUpdateSchema = z.object({
  name: z.string().min(1).max(500).optional(),
  brand: z.string().max(200).nullable().optional(),
  category: z.string().max(200).nullable().optional(),
  description: z.string().max(5000).nullable().optional(),
  price: z.number().positive().optional(),
  stock: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  imageUrl: z.string().url().nullable().optional(),
  specs: z.record(z.unknown()).optional(),
}).strict();

catalogImportRouter.patch('/products/:id', async (req: Request, res: Response) => {
  try {
    const storeId = req.storeId!;
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: 'Invalid product id' });
      return;
    }
    const body = productUpdateSchema.parse(req.body);
    const prisma = getPrisma();
    const existing = await prisma.product.findFirst({ where: { id, storeId } });
    if (!existing) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    // Normalize incoming specs (CSV → arrays). Merge with existing if partial.
    let nextSpecs = existing.specs as Record<string, unknown> | null;
    if (body.specs !== undefined) {
      const merged: Record<string, unknown> = { ...(nextSpecs || {}) };
      for (const [k, v] of Object.entries(body.specs)) {
        merged[k] = maybeSplitCsv(v);
      }
      nextSpecs = merged;
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.brand !== undefined && { brand: body.brand }),
        ...(body.category !== undefined && { category: body.category }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.price !== undefined && { price: body.price }),
        ...(body.stock !== undefined && { stock: body.stock }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
        ...(body.imageUrl !== undefined && { imageUrl: body.imageUrl }),
        ...(body.specs !== undefined && { specs: (nextSpecs as object) || {} }),
      },
    });

    logger.info({ storeId, productId: id, fields: Object.keys(body) }, 'catalog.product.update');
    res.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    res.status(500).json({ error: (err as Error).message });
  }
});

// DELETE /api/catalog/products/:id — soft delete (isActive = false)
catalogImportRouter.delete('/products/:id', async (req: Request, res: Response) => {
  try {
    const storeId = req.storeId!;
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: 'Invalid product id' });
      return;
    }
    const prisma = getPrisma();
    const existing = await prisma.product.findFirst({ where: { id, storeId } });
    if (!existing) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }
    const updated = await prisma.product.update({
      where: { id },
      data: { isActive: false },
    });
    logger.info({ storeId, productId: id }, 'catalog.product.softDelete');
    res.json({ success: true, product: updated });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST /api/catalog/normalize-specs — convert legacy CSV-string specs to arrays
//   for products imported before maybeSplitCsv was introduced. Idempotent.
catalogImportRouter.post('/normalize-specs', async (req: Request, res: Response) => {
  try {
    const storeId = req.storeId!;
    const prisma = getPrisma();

    const products = await prisma.product.findMany({
      where: { storeId },
      select: { id: true, specs: true },
    });

    let updatedCount = 0;
    let touchedSpecs = 0;
    for (const p of products) {
      const original = (p.specs as Record<string, unknown>) || null;
      if (!original) continue;
      const next: Record<string, unknown> = {};
      let changed = false;
      for (const [k, v] of Object.entries(original)) {
        const normalized = maybeSplitCsv(v);
        if (Array.isArray(normalized) && !Array.isArray(v)) {
          changed = true;
          touchedSpecs += 1;
        }
        next[k] = normalized;
      }
      if (changed) {
        await prisma.product.update({ where: { id: p.id }, data: { specs: next } });
        updatedCount += 1;
      }
    }

    logger.info({ storeId, updatedCount, touchedSpecs }, 'catalog.normalize.done');
    res.json({ success: true, productsUpdated: updatedCount, specsConverted: touchedSpecs });
  } catch (err) {
    logger.error({ err }, 'catalog.normalize.failed');
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/catalog/stats — catalog stats
catalogImportRouter.get('/stats', async (req: Request, res: Response) => {
  try {
    const storeId = req.storeId!;
    const prisma = getPrisma();

    const [total, byCategory, byBrand] = await Promise.all([
      prisma.product.count({ where: { storeId, isActive: true } }),
      prisma.$queryRawUnsafe<{ category: string; count: bigint }[]>(
        `SELECT category, COUNT(*) as count FROM products WHERE store_id = $1 AND is_active = true GROUP BY category ORDER BY count DESC`,
        storeId,
      ),
      prisma.$queryRawUnsafe<{ brand: string; count: bigint }[]>(
        `SELECT brand, COUNT(*) as count FROM products WHERE store_id = $1 AND is_active = true AND brand IS NOT NULL GROUP BY brand ORDER BY count DESC LIMIT 20`,
        storeId,
      ),
    ]);

    res.json({
      totalProducts: total,
      categories: byCategory.map(c => ({ name: c.category, count: Number(c.count) })),
      topBrands: byBrand.map(b => ({ name: b.brand, count: Number(b.count) })),
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});
