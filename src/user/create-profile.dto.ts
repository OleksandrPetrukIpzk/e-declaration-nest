import { IsEmail, IsNotEmpty, MinLength, Validate, MaxLength, IsString } from 'class-validator';
export class createProfileDto {
    @IsEmail()
    @IsNotEmpty()
    @MaxLength(50)
    email: string;

    @MinLength(6)
    password: string;

    @MaxLength(20)
    @IsNotEmpty()
    firstName?: string | null;

    @MaxLength(20)
    lastName?: string | null;

    @IsNotEmpty()
    role?: number | null;
}