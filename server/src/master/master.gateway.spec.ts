import { Test, TestingModule } from '@nestjs/testing';
import { MasterGateway } from './master.gateway';

describe('MasterGateway', () => {
  let gateway: MasterGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MasterGateway],
    }).compile();

    gateway = module.get<MasterGateway>(MasterGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
