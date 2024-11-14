import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import {DocumentModule} from "./document/document.module";
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [DocumentModule,TypeOrmModule.forRoot({
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    username: 'postgres',
    password: 'rootPass',
    database: 'eDeclaration',
    entities: [__dirname + '/../**/*.entity.{js,ts}'],
    synchronize: true,
  }),],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
