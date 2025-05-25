import { OnModuleInit, Injectable } from '@nestjs/common';
import { Worker } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { GlobalProcessService } from './processor.service';

@Injectable()
export class GlobalProcessWorker implements OnModuleInit {
  constructor(
    private readonly configService: ConfigService,
    private readonly globalProcessService: GlobalProcessService,
  ) {}

  async onModuleInit() {
    const connection = {
      host: this.configService.get('REDIS_HOST'),
      port: +this.configService.get('REDIS_PORT'),
			password: this.configService.get('REDIS_PASSWORD'),
    };

    new Worker(
      'global-process',
      async (job) => {
        await this.globalProcessService.handle(job);
      },
      {
        concurrency: 100,
        connection,
      },
    );
  }
}
