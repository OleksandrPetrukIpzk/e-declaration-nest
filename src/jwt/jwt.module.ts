import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

@Global()
@Module({
    imports: [
        JwtModule.register({
            secret: '123',
            signOptions: { expiresIn: '5s' },
        }),
    ],
    exports: [JwtModule],
})
export class JwtGlobalModule {}
