import { Module } from '@nestjs/common';
import { JsonDataLakeService } from './json-data-lake.service';

@Module({
  providers: [JsonDataLakeService],
  exports: [JsonDataLakeService]
})
export class StorageModule {}
