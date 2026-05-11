import { Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreditScoreRecord } from '@bnpl/shared';
import { JsonDataLakeService } from '../../storage/json-data-lake.service';
import { CreditService } from './credit.service';

@ApiTags('credit')
@Controller('credit')
export class CreditController {
  constructor(private readonly credit: CreditService, private readonly storage: JsonDataLakeService) {}

  @Post(':userId/recalculate') recalculate(@Param('userId') userId: string) { return this.credit.calculate(userId); }
  @Get(':userId') history(@Param('userId') userId: string) { return this.storage.query<CreditScoreRecord>('credit_scores', { where: { userId }, sortBy: 'createdAt', sortDirection: 'desc' }); }
}
