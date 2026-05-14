-- CreateIndex
CREATE INDEX "product_variants_product_id_is_active_idx" ON "product_variants"("product_id", "is_active");

-- CreateIndex
CREATE INDEX "product_variants_stock_idx" ON "product_variants"("stock");

-- CreateIndex
CREATE INDEX "products_is_active_deleted_at_idx" ON "products"("is_active", "deleted_at");

-- CreateIndex
CREATE INDEX "products_slug_idx" ON "products"("slug");

-- CreateIndex
CREATE INDEX "products_base_price_idx" ON "products"("base_price");

-- CreateIndex
CREATE INDEX "products_avg_rating_idx" ON "products"("avg_rating");

-- CreateIndex
CREATE INDEX "products_created_at_idx" ON "products"("created_at");
