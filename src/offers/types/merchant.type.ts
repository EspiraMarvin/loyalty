import { ObjectType, Field, ID } from '@nestjs/graphql';
import { LoyaltyProgramType } from './loyalty-program.type';

@ObjectType('Merchant')
export class MerchantType {
  @Field(() => ID)
  id: string;

  @Field()
  businessName: string;

  @Field({ nullable: true })
  description?: string;

  @Field()
  status: string;

  @Field()
  category: string;

  @Field(() => LoyaltyProgramType, { nullable: true })
  LoyaltyProgram?: LoyaltyProgramType;
}
