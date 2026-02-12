import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType('Review')
export class ReviewType {
  @Field(() => ID)
  id: string;

  @Field()
  status: string;
}
