export enum CustomerTypeEnum {
  NonCustomer = 'NonCustomer',
  New = 'New',
  Infrequent = 'Infrequent',
  Occasional = 'Occasional',
  Regular = 'Regular',
  Vip = 'Vip',
}

export const ORDERED_CUSTOMER_TYPES: Record<CustomerTypeEnum, number> = {
  [CustomerTypeEnum.NonCustomer]: 0,
  [CustomerTypeEnum.New]: 1,
  [CustomerTypeEnum.Infrequent]: 2,
  [CustomerTypeEnum.Occasional]: 3,
  [CustomerTypeEnum.Regular]: 4,
  [CustomerTypeEnum.Vip]: 5,
};

export function getEligibleCustomerTypes(
  customerType: CustomerTypeEnum,
): CustomerTypeEnum[] {
  const typeLevel = ORDERED_CUSTOMER_TYPES[customerType];
  return Object.entries(ORDERED_CUSTOMER_TYPES)
    .filter(([, level]) => level <= typeLevel)
    .map(([type]) => type as CustomerTypeEnum);
}
