import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RootController } from './modules/root/root.controller';
import { RootService } from './modules/root/root.service';

describe('RootController', () => {
  let app: TestingModule;

  beforeAll(async () => {
    app = await Test.createTestingModule({
      controllers: [RootController],
      providers: [
        RootService,
        {
          provide: ConfigService,
          useValue: { get: () => '1.2.3' },
        },
      ],
    }).compile();
  });

  describe('getRoot', () => {
    it('should return version from config', () => {
      const controller = app.get(RootController);
      expect(controller.getRoot()).toBe('1.2.3');
    });
  });
});
