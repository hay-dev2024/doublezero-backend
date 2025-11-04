import { Module } from '@nestjs/common';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { NavigationModule } from './navigation/navigation.module';
import { HistoryModule } from './history/history.module';
import { CommonModule } from './common/common.module';

@Module({
  imports: [
    UsersModule, AuthModule, NavigationModule, HistoryModule, CommonModule
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
