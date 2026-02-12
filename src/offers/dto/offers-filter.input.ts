import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class OffersFilterInput {
  @Field({ nullable: true })
  search?: string;

  @Field({ nullable: true })
  category?: string;

  @Field({ nullable: true })
  minPercentage?: number;

  @Field({ nullable: true })
  maxPercentage?: number;

  @Field({ nullable: true })
  userId?: string;
}
