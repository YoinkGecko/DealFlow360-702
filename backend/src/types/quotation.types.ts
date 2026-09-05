export interface CreateQuotationItemInput {
  productId: string;
  quantity: number;
  discountPercent: number;
}

export interface CreateQuotationInput {
  customerId: string;
  salesRepId: string;
  items: CreateQuotationItemInput[];
}